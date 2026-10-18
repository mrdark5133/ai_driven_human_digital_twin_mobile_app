import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestListening,
  stopListening,
  abortListening,
  setAsrLocale,
  checkDefaultRecognizer,
  resetAsrRetries,
  resetFallbackChain,
  getAsrDiagnostics,
  AsrLocale,
} from './asr';
import { streamLlmResponse, ChatTurn, initLlmContext } from './llm';
import { speakSentence, stopTts, setTtsOnDone } from './tts';
import { CallSlotId } from '../../config/callSchedule';
import { appendTurnToCallEntry, updateCallEntry } from '../callHistory';
import { ASSISTANT_NAME } from '../../config/appConfig';
import { MORNING_GOAL, EVENING_GOAL } from './persona';

export type CallAgentState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export const MAX_TURNS = 6;
const TAP_TO_TALK_STORAGE_KEY = '@aura_call_tap_to_talk';

export interface CallDebugMetrics {
  timeToFirstTokenMs: number | null;
  timeToFirstSpokenSentenceMs: number | null;
  tokensPerSecond: number | null;
  tokensGenerated: number | null;
}

export interface CallAgentEvent {
  state: CallAgentState;
  userTranscript: string;
  aiResponse: string;
  debugMetrics: CallDebugMetrics;
  errorMessage: string | null;
  isMuted: boolean;
  turnCount: number;
  micLevel: number;
  cycleMaxLevel: number;
  tapToTalkMode: boolean; // Persisted user setting
  micActive: boolean;     // Active recording button state
  isTapToTalk: boolean;   // Backward compatibility alias for tapToTalkMode
  requiresSettings: boolean;
  notGoogleRecognizer: boolean;
  recognizerPackage: string;
  // Honest diagnostics & dynamic badge
  asrMode: 'offline' | 'online';
  activeLocale: string;
  isAllLocal: boolean;
  isLanguagePackMissing: boolean;
}

export interface StartCallOptions {
  slot?: CallSlotId;
  historyId?: string;
  opener?: string;
}

export type CallAgentListener = (event: CallAgentEvent) => void;

const CASUAL_FILLERS = [
  'Hmm...',
  'Okay okay...',
  'Sari...',
  'Ammam...',
  'Sari da...',
];

const MORNING_OPENERS = [
  'Hello Dark, good morning da! Epdi irukka? Nalla thookam vandhucha?',
  'Good morning Dark! Epdi irukkeenga? Kaalaile fresh ah irukka?',
  'Morning Dark! Thookam nalla pocha? Udambu epdi irukku innaiku?',
];

const EVENING_OPENERS = [
  'Hello Dark! Innaiku day epdi pochu? Saapteengala?',
  'Hai Dark! Innaiku work lam epdi pochu? Dinner mudinjutha?',
  'Hello Dark da! Day romba busy ah irundhucha? Epdi feel panreenga?',
];

class CallAgentService {
  private state: CallAgentState = 'idle';
  private conversationHistory: ChatTurn[] = [];
  private userTranscript = '';
  private aiResponse = '';
  private errorMessage: string | null = null;
  private isMuted = false;
  private isCallActive = false;
  private listeners: Set<CallAgentListener> = new Set();

  private activeSlot?: CallSlotId;
  private activeHistoryId?: string;
  private auraTurnCount = 0;
  private callStartTimestamp = 0;

  private isProcessingUtterance = false;

  // Mic metering & recognizer
  private micLevel = -2;
  private cycleMaxLevel = -2;

  // Separate states: tapToTalkMode (persisted setting) vs micActive (button state)
  private tapToTalkMode = false;
  private micActive = false;

  private requiresSettings = false;
  private isLanguagePackMissing = false;
  private notGoogleRecognizer = false;
  private recognizerPackage = '';

  private debugMetrics: CallDebugMetrics = {
    timeToFirstTokenMs: null,
    timeToFirstSpokenSentenceMs: null,
    tokensPerSecond: null,
    tokensGenerated: null,
  };

  private endOfUserSpeechTimestamp: number | null = null;
  private firstSentenceSpokenRecorded = false;

  constructor() {
    // Eagerly restore tap to talk setting from persistent storage
    AsyncStorage.getItem(TAP_TO_TALK_STORAGE_KEY)
      .then((val) => {
        if (val !== null) {
          this.tapToTalkMode = val === 'true';
        }
      })
      .catch(() => {});
  }

  public subscribe(listener: CallAgentListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const asrDiag = getAsrDiagnostics();
    const event: CallAgentEvent = {
      state: this.state,
      userTranscript: this.userTranscript,
      aiResponse: this.aiResponse,
      debugMetrics: { ...this.debugMetrics },
      errorMessage: this.errorMessage,
      isMuted: this.isMuted,
      turnCount: this.auraTurnCount,
      micLevel: this.micLevel,
      cycleMaxLevel: this.cycleMaxLevel,
      tapToTalkMode: this.tapToTalkMode,
      micActive: this.micActive,
      isTapToTalk: this.tapToTalkMode,
      requiresSettings: this.requiresSettings,
      notGoogleRecognizer: this.notGoogleRecognizer,
      recognizerPackage: asrDiag.servicePackage || this.recognizerPackage,
      asrMode: asrDiag.mode,
      activeLocale: asrDiag.locale,
      isAllLocal: asrDiag.isAllLocal,
      isLanguagePackMissing: this.isLanguagePackMissing,
    };
    this.listeners.forEach((fn) => fn(event));
  }

  private setState(newState: CallAgentState): void {
    console.log(`[CallAgent] State -> ${newState}`);
    this.state = newState;
    this.notify();
  }

  /**
   * Updates persisted tapToTalkMode setting (changed ONLY by user mode toggle).
   */
  public async setTapToTalkMode(enabled: boolean): Promise<void> {
    this.tapToTalkMode = enabled;
    await AsyncStorage.setItem(TAP_TO_TALK_STORAGE_KEY, String(enabled)).catch(() => {});
    console.log(`[CallAgent] tapToTalkMode set to: ${enabled}`);

    if (this.tapToTalkMode) {
      if (this.state === 'listening') {
        this.micActive = false;
        await stopListening();
        this.setState('idle');
      }
    } else {
      if (this.isCallActive && this.state === 'idle' && !this.isMuted) {
        this.scheduleListening('switched to hands-free');
      }
    }
    this.notify();
  }

  public async toggleTapToTalkMode(): Promise<void> {
    await this.setTapToTalkMode(!this.tapToTalkMode);
  }

  public async toggleTapToTalk(): Promise<void> {
    await this.toggleTapToTalkMode();
  }

  public getTapToTalkMode(): boolean {
    return this.tapToTalkMode;
  }

  public getTapToTalk(): boolean {
    return this.tapToTalkMode;
  }

  /**
   * Starts the conversational phone call loop.
   */
  public async startCall(options?: StartCallOptions): Promise<void> {
    if (this.isCallActive) return;

    this.isCallActive = true;
    this.isMuted = false;
    this.micActive = false;
    this.isProcessingUtterance = false;
    this.activeSlot = options?.slot;
    this.activeHistoryId = options?.historyId;
    this.auraTurnCount = 0;
    this.callStartTimestamp = Date.now();
    this.conversationHistory = [];
    this.userTranscript = '';
    this.aiResponse = '';
    this.errorMessage = null;
    this.requiresSettings = false;
    this.isLanguagePackMissing = false;
    this.firstSentenceSpokenRecorded = false;
    this.micLevel = -2;
    this.cycleMaxLevel = -2;

    resetAsrRetries();
    resetFallbackChain();
    stopTts();

    // Reset ASR locale to default en-IN for call
    setAsrLocale('en-IN');

    // Check recognizer service
    const rec = checkDefaultRecognizer();
    this.recognizerPackage = rec.selectedPackage || rec.packageName;
    this.notGoogleRecognizer = !rec.isGoogle && Platform.OS === 'android';
    if (this.notGoogleRecognizer) {
      console.warn(`[CallAgent] Non-Google default voice recognizer: ${this.recognizerPackage}`);
    }

    console.log(
      `[CallAgent] Starting call (slot: ${options?.slot || 'manual'}, historyId: ${options?.historyId || 'none'}, recognizer: ${this.recognizerPackage || 'system'})`
    );

    // Reset debug metrics
    this.debugMetrics = {
      timeToFirstTokenMs: null,
      timeToFirstSpokenSentenceMs: null,
      tokensPerSecond: null,
      tokensGenerated: null,
    };

    try {
      this.setState('thinking');
      // Ensure model context is ready
      await initLlmContext();

      // If scheduled call, assistant speaks first with instant Tanglish opener
      if (this.activeSlot) {
        await this.handleScheduledCallOpener();
      } else {
        // Normal user-initiated call: if hands-free, begin listening; if tap-to-talk, wait in idle
        if (this.tapToTalkMode) {
          this.setState('idle');
        } else {
          this.scheduleListening('initial call start');
        }
      }
    } catch (err: any) {
      this.errorMessage = err?.message || `Failed to start ${ASSISTANT_NAME} call agent.`;
      this.setState('error');
    }
  }

  /**
   * Plays the instant Tanglish opener for scheduled check-in calls.
   */
  private async handleScheduledCallOpener(): Promise<void> {
    const openerList = this.activeSlot === 'morning' ? MORNING_OPENERS : EVENING_OPENERS;
    const chosenOpener = openerList[Math.floor(Math.random() * openerList.length)];

    console.log(`[CallAgent] Scheduled call opener: "${chosenOpener}"`);
    this.auraTurnCount = 1;
    this.aiResponse = chosenOpener;
    this.recordTurn('assistant', chosenOpener);
    this.setState('speaking');

    setTtsOnDone(() => {
      if (!this.isCallActive) return;

      if (this.tapToTalkMode) {
        console.log('[CallAgent] Opener finished in Tap-to-Talk mode -> idle');
        this.micActive = false;
        this.setState('idle');
      } else if (!this.isMuted) {
        console.log('[CallAgent] Opener TTS finished, waiting 300ms before starting listening');
        this.setState('idle');
        this.scheduleListening('TTS finished', 300);
      } else {
        this.setState('idle');
      }
    });

    speakSentence(chosenOpener);
  }

  /**
   * Records a conversation turn into memory and AsyncStorage history.
   */
  private recordTurn(role: 'user' | 'assistant', text: string): void {
    const ts = Date.now();
    this.conversationHistory.push({ role, content: text });

    if (this.activeHistoryId) {
      appendTurnToCallEntry(this.activeHistoryId, { role, text, ts }).catch((err) => {
        console.warn('[CallAgent] Failed to record turn in history:', err);
      });
    }
  }

  /**
   * Ends the call, cancels all audio and updates history metrics.
   */
  public async endCall(): Promise<void> {
    if (!this.isCallActive) return;

    this.isCallActive = false;
    this.isProcessingUtterance = false;
    this.micActive = false;
    stopTts();
    await abortListening();

    const endedAt = Date.now();
    const durationSec = Math.max(0, Math.round((endedAt - this.callStartTimestamp) / 1000));
    console.log(`[CallAgent] Call ended, duration: ${durationSec}s`);

    if (this.activeHistoryId) {
      updateCallEntry(this.activeHistoryId, {
        status: 'answered',
        answeredAt: this.callStartTimestamp,
        endedAt,
        durationSec,
      }).catch((err) => {
        console.warn('[CallAgent] Failed to update call history on end:', err);
      });
    }

    this.setState('idle');
  }

  /**
   * Toggles microphone mute state during the call.
   */
  public async toggleMute(): Promise<void> {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.micActive = false;
      await stopListening();
      if (this.state === 'listening') {
        this.setState('idle');
      }
    } else {
      if (this.isCallActive && this.state !== 'speaking' && this.state !== 'thinking') {
        if (!this.tapToTalkMode) {
          this.scheduleListening('unmute');
        }
      }
    }
    this.notify();
  }

  /**
   * Handles user tapping the mic in "Tap to talk" mode.
   * If idle: activates mic and starts listening.
   * If listening: deactivates mic and stops listening.
   * Note: The mic button NEVER changes tapToTalkMode!
   */
  public async handleTapToTalkPress(): Promise<void> {
    if (!this.isCallActive) return;
    if (this.state === 'speaking' || this.state === 'thinking') {
      return; // Can't talk while assistant is responding
    }

    if (this.state === 'listening' || this.micActive) {
      console.log('[CallAgent] micActive changed to: false (user tapped to stop listening)');
      this.micActive = false;
      this.notify();
      await stopListening();
    } else {
      console.log('[CallAgent] micActive changed to: true (user tapped to start listening)');
      this.micActive = true;
      this.userTranscript = '';
      this.errorMessage = null;
      this.isLanguagePackMissing = false;
      this.notify();
      this.scheduleListening('tap');
    }
  }

  /**
   * Called when user taps the Retry button after an error notice.
   * Restarts the fallback chain from the beginning, clears errors,
   * and puts the mic state cleanly back to normal.
   */
  public async retryAfterError(): Promise<void> {
    if (!this.isCallActive) return;
    this.errorMessage = null;
    this.isLanguagePackMissing = false;
    this.micActive = false;
    resetAsrRetries();
    resetFallbackChain();

    if (this.tapToTalkMode) {
      console.log('[CallAgent] Retry pressed in Tap-to-Talk mode: micActive false, state idle');
      this.setState('idle');
      this.notify();
    } else {
      console.log('[CallAgent] Retry pressed in Hands-Free mode: restarting fallback chain from beginning');
      this.scheduleListening('user retry button');
    }
  }

  /**
   * Routes listening requests through single unified scheduler with cool-down delay.
   */
  private scheduleListening(reason: string, delayMs = 0): void {
    if (!this.isCallActive || this.isMuted) return;
    if (this.state === 'speaking' || this.state === 'thinking') {
      console.log(`[CallAgent] scheduleListening deferred for "${reason}": assistant is active`);
      return;
    }

    if (this.tapToTalkMode && reason !== 'tap') {
      console.log(`[CallAgent] scheduleListening skipped for "${reason}": tapToTalkMode is active`);
      this.micActive = false;
      this.setState('idle');
      return;
    }

    if (delayMs > 0) {
      setTimeout(() => {
        if (this.isCallActive && !this.isMuted && this.state !== 'speaking' && this.state !== 'thinking') {
          this.executeListening(reason);
        }
      }, delayMs);
    } else {
      this.executeListening(reason);
    }
  }

  /**
   * Executes listening through requestListening with session callbacks.
   */
  private executeListening(reason: string): void {
    if (!this.isCallActive || this.isMuted) return;
    if (this.state === 'speaking' || this.state === 'thinking') return;

    this.micActive = true;
    this.setState('listening');
    console.log(`[CallAgent] Listening cycle started (reason: "${reason}")`);

    requestListening(
      reason,
      {
        onInterimResult: (transcript) => {
          if (!this.isCallActive) return;
          this.userTranscript = transcript;
          this.notify();
        },
        onFinalResult: async (finalTranscript) => {
          if (!this.isCallActive) return;
          this.micActive = false;

          const trimmed = finalTranscript.trim();
          if (!trimmed) {
            if (this.state === 'listening') {
              this.setState('idle');
              if (!this.tapToTalkMode) {
                this.scheduleListening('empty transcript', 300);
              }
            }
            return;
          }

          this.userTranscript = trimmed;
          await this.handleUserUtterance(trimmed);
        },
        onVolumeChange: (vol, maxVol) => {
          if (!this.isCallActive) return;
          this.micLevel = vol;
          this.cycleMaxLevel = maxVol;
          this.notify();
        },
        onSilence: () => {
          if (!this.isCallActive || this.isMuted) return;
          this.micActive = false;

          if (this.tapToTalkMode) {
            console.log('[CallAgent] Tap-to-Talk: silence detected, returning to idle');
            this.setState('idle');
            return;
          }

          console.log('[CallAgent] ASR silence detected, silently waiting 300ms before restarting');
          this.setState('idle');
          this.scheduleListening('no-speech', 300);
        },
        onEnd: () => {
          if (!this.isCallActive || this.isMuted) return;
          this.micActive = false;

          if (this.tapToTalkMode) {
            if (this.state === 'listening') {
              this.setState('idle');
            }
            return;
          }

          if (this.state === 'listening') {
            console.log('[CallAgent] ASR end with no transcript, restarting after 300ms');
            this.setState('idle');
            this.scheduleListening('end without transcript', 300);
          }
        },
        onError: (errorMsg, errorCode) => {
          if (!this.isCallActive || this.isMuted) return;

          // PART 3: Always reset micActive to false so button is not stuck!
          this.micActive = false;

          if (errorCode === 'language-pack-missing') {
            this.isLanguagePackMissing = true;
            this.errorMessage =
              'Speech recognition needs a language pack. Download English offline in Android settings.';
            this.setState('error');
            return;
          }

          if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
            this.requiresSettings = true;
            this.errorMessage =
              errorCode === 'not-allowed'
                ? 'Microphone permission was denied. Tap to open Settings.'
                : 'Speech recognition service is unavailable. Set Google as default voice input.';
            this.setState('error');
            return;
          }

          if (errorCode === 'network') {
            this.errorMessage = 'Network disconnected. Tap Retry to connect.';
            this.setState('error');
            return;
          }

          // PART 3: In Tap-to-Talk mode, NEVER auto-restart the recognizer!
          if (this.tapToTalkMode) {
            this.errorMessage = errorMsg || 'Speech input interrupted. Tap to talk again.';
            this.setState('idle');
            return;
          }

          console.log(`[CallAgent] ASR error (${errorCode}), retrying via requestListening...`);
          this.scheduleListening('retry', 800);
        },
      }
    );
  }

  /**
   * Handles user speech completion and drives LLM + TTS pipeline.
   */
  private async handleUserUtterance(userInput: string): Promise<void> {
    if (this.isProcessingUtterance) return;
    this.isProcessingUtterance = true;

    const turnSubmittedTimestamp = Date.now();
    let fillerTimer: any = null;
    let fillerPlayed = false;

    try {
      // 1. Immediately STOP listening while AI is thinking and speaking
      await stopListening();
      this.micActive = false;
      this.endOfUserSpeechTimestamp = Date.now();
      this.firstSentenceSpokenRecorded = false;
      this.errorMessage = null;

      this.setState('thinking');

      // 2. Play filler word ONLY if the first token takes longer than 700ms
      fillerTimer = setTimeout(() => {
        if (!this.isCallActive || this.state !== 'thinking') return;
        fillerPlayed = true;
        const filler = CASUAL_FILLERS[Math.floor(Math.random() * CASUAL_FILLERS.length)];
        console.log(`[CallAgent] filler played: "${filler}"`);
        speakSentence(filler);
      }, 700);

      // 3. Record user turn
      this.recordTurn('user', userInput);

      // Check if max turns reached (AURA turns)
      if (this.auraTurnCount >= MAX_TURNS) {
        if (fillerTimer) clearTimeout(fillerTimer);
        await this.handleCallWrapUp();
        return;
      }

      // 4. Stream LLM generation
      let sentenceBuffer = '';
      this.aiResponse = '';

      let customSystemPrompt: string | undefined;
      if (this.activeSlot === 'morning') {
        customSystemPrompt = MORNING_GOAL;
      } else if (this.activeSlot === 'evening') {
        customSystemPrompt = EVENING_GOAL;
      }

      const { text, metrics } = await streamLlmResponse(
        this.conversationHistory,
        (token) => {
          if (!this.isCallActive) return;

          this.aiResponse += token;
          sentenceBuffer += token;
          this.notify();

          // Sentence boundary detection: [.!?\n]+
          const match = sentenceBuffer.match(/^(.*?[.!?\n]+)([\s\S]*)$/);
          if (match) {
            const sentenceToSpeak = match[1].trim();
            sentenceBuffer = match[2];

            if (sentenceToSpeak.length > 0) {
              if (!this.firstSentenceSpokenRecorded && this.endOfUserSpeechTimestamp) {
                const ttfsMs = Date.now() - this.endOfUserSpeechTimestamp;
                this.debugMetrics.timeToFirstSpokenSentenceMs = ttfsMs;
                this.firstSentenceSpokenRecorded = true;

                const ttftMs = this.debugMetrics.timeToFirstTokenMs ?? 0;
                console.log(
                  `[CallAgent] Timing: end of speech -> LLM first token (${ttftMs}ms) -> first sentence spoken (${ttfsMs}ms)`
                );
              }

              this.setState('speaking');
              speakSentence(sentenceToSpeak);
            }
          }
        },
        {
          systemPrompt: customSystemPrompt,
          maxTokens: 50,
          temperature: 0.5,
          onFirstToken: (ttftMs) => {
            if (!this.isCallActive) return;

            const elapsedSinceSubmit = Date.now() - turnSubmittedTimestamp;
            if (fillerTimer) {
              clearTimeout(fillerTimer);
              fillerTimer = null;
            }

            if (fillerPlayed) {
              console.log(`[CallAgent] first token arrived in ${elapsedSinceSubmit}ms (filler played)`);
            } else {
              console.log(`[CallAgent] filler skipped, first token in ${elapsedSinceSubmit}ms`);
            }

            this.debugMetrics.timeToFirstTokenMs = ttftMs;
            this.notify();
          },
        }
      );

      // Enqueue any remaining buffer text immediately
      const remaining = sentenceBuffer.trim();
      if (remaining.length > 0) {
        if (!this.firstSentenceSpokenRecorded && this.endOfUserSpeechTimestamp) {
          const ttfsMs = Date.now() - this.endOfUserSpeechTimestamp;
          this.debugMetrics.timeToFirstSpokenSentenceMs = ttfsMs;
          this.firstSentenceSpokenRecorded = true;
          const ttftMs = this.debugMetrics.timeToFirstTokenMs ?? 0;
          console.log(
            `[CallAgent] Timing: end of speech -> LLM first token (${ttftMs}ms) -> first sentence spoken (${ttfsMs}ms)`
          );
        }
        speakSentence(remaining);
      }

      // Update final turn metrics
      this.debugMetrics.timeToFirstTokenMs = metrics.timeToFirstTokenMs;
      this.debugMetrics.tokensPerSecond = metrics.tokensPerSecond;
      this.debugMetrics.tokensGenerated = metrics.tokensGenerated;
      this.auraTurnCount += 1;
      this.notify();

      // Record assistant reply in history
      this.recordTurn('assistant', text);

      // 5. When all queued sentences finish speaking, start next session after 300 ms cool-down
      setTtsOnDone(() => {
        if (!this.isCallActive) return;

        if (this.auraTurnCount >= MAX_TURNS) {
          this.handleCallWrapUp();
          return;
        }

        if (this.tapToTalkMode) {
          console.log('[CallAgent] Assistant finished speaking in Tap-to-Talk mode -> idle');
          this.micActive = false;
          this.setState('idle');
          return;
        }

        if (!this.isMuted) {
          console.log('[CallAgent] Assistant finished speaking, waiting 300ms before starting listening');
          this.setState('idle');
          this.scheduleListening('TTS finished', 300);
        } else {
          this.setState('idle');
        }
      });
    } catch (err: any) {
      console.error('[CallAgent] Generation error:', err);
      this.errorMessage = err?.message || 'Error generating AI response.';
      this.setState('error');
    } finally {
      this.isProcessingUtterance = false;
    }
  }

  /**
   * DEV-only testing method: routes typed text through the exact same
   * pipeline as a spoken user turn (LLM -> TTS -> next turn).
   */
  public async sendDevUtterance(userInput: string): Promise<void> {
    if (!this.isCallActive) return;
    const trimmed = userInput.trim();
    if (!trimmed) return;

    console.log(`[CallAgent] DEV manual utterance submitted: "${trimmed}"`);
    this.userTranscript = trimmed;
    this.notify();
    await this.handleUserUtterance(trimmed);
  }

  /**
   * Speaks a warm goodbye when MAX_TURNS is reached and gracefully ends the call.
   */
  private async handleCallWrapUp(): Promise<void> {
    const goodbye =
      this.activeSlot === 'evening'
        ? 'Sari Dark, nalla rest edunga da. Good night, sweet dreams!'
        : 'Sari Dark, take care da! Udamba paathuko, have a great day ahead!';

    this.aiResponse = goodbye;
    this.recordTurn('assistant', goodbye);
    this.setState('speaking');
    speakSentence(goodbye);

    setTtsOnDone(async () => {
      await this.endCall();
    });
  }
}

export const callAgent = new CallAgentService();
