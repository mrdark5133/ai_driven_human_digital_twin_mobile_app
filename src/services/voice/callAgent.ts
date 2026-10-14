import { startListening, stopListening, abortListening } from './asr';
import { streamLlmResponse, ChatTurn, initLlmContext } from './llm';
import { speakSentence, stopTts, setTtsOnDone } from './tts';
import { CallSlotId } from '../../config/callSchedule';
import { appendTurnToCallEntry, updateCallEntry } from '../callHistory';

export type CallAgentState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export const MAX_TURNS = 6;

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

const MORNING_GOAL = `You are having a morning check-in call with Dark.
Goal: Inquire how he slept, how he feels today, whether he had breakfast, and his plans for today.
Ask only ONE simple question at a time in casual Tanglish. Keep answers short (1-2 sentences). Do not give medical diagnoses.`;

const EVENING_GOAL = `You are having an evening check-in call with Dark.
Goal: Inquire what he ate today, his physical activity, his stress or mood level, and his plans for tomorrow.
Ask only ONE simple question at a time in casual Tanglish. Keep answers short (1-2 sentences). Do not give medical diagnoses.`;

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

  private asrRetryCount = 0;
  private asrRetryTimer: any = null;

  private debugMetrics: CallDebugMetrics = {
    timeToFirstTokenMs: null,
    timeToFirstSpokenSentenceMs: null,
    tokensPerSecond: null,
    tokensGenerated: null,
  };

  private endOfUserSpeechTimestamp: number | null = null;
  private firstSentenceSpokenRecorded = false;

  public subscribe(listener: CallAgentListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const event: CallAgentEvent = {
      state: this.state,
      userTranscript: this.userTranscript,
      aiResponse: this.aiResponse,
      debugMetrics: { ...this.debugMetrics },
      errorMessage: this.errorMessage,
      isMuted: this.isMuted,
      turnCount: this.auraTurnCount,
    };
    this.listeners.forEach((fn) => fn(event));
  }

  private setState(newState: CallAgentState): void {
    this.state = newState;
    this.notify();
  }

  /**
   * Starts the conversational phone call loop.
   */
  public async startCall(options?: StartCallOptions): Promise<void> {
    if (this.isCallActive) return;

    this.isCallActive = true;
    this.activeSlot = options?.slot;
    this.activeHistoryId = options?.historyId;
    this.auraTurnCount = 0;
    this.callStartTimestamp = Date.now();
    this.conversationHistory = [];
    this.userTranscript = '';
    this.aiResponse = '';
    this.errorMessage = null;
    this.firstSentenceSpokenRecorded = false;
    this.asrRetryCount = 0;
    clearTimeout(this.asrRetryTimer);

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

      // If scheduled call, AURA speaks first with instant Tanglish opener
      if (this.activeSlot) {
        await this.handleScheduledCallOpener();
      } else {
        // Normal user-initiated call, begin listening cycle
        await this.startListeningCycle();
      }
    } catch (err: any) {
      this.errorMessage = err?.message || 'Failed to start AURA call agent.';
      this.setState('error');
    }
  }

  /**
   * Plays the instant Tanglish opener for scheduled check-in calls.
   */
  private async handleScheduledCallOpener(): Promise<void> {
    const openerList = this.activeSlot === 'morning' ? MORNING_OPENERS : EVENING_OPENERS;
    const chosenOpener = openerList[Math.floor(Math.random() * openerList.length)];

    this.auraTurnCount = 1;
    this.aiResponse = chosenOpener;
    this.recordTurn('assistant', chosenOpener);
    this.setState('speaking');

    speakSentence(chosenOpener);

    setTtsOnDone(() => {
      if (this.isCallActive && !this.isMuted) {
        this.startListeningCycle();
      } else {
        this.setState('idle');
      }
    });
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
    clearTimeout(this.asrRetryTimer);
    stopTts();
    await abortListening();

    const endedAt = Date.now();
    const durationSec = Math.max(0, Math.round((endedAt - this.callStartTimestamp) / 1000));

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
      await stopListening();
      if (this.state === 'listening') {
        this.setState('idle');
      }
    } else {
      if (this.isCallActive && this.state !== 'speaking' && this.state !== 'thinking') {
        await this.startListeningCycle();
      }
    }
    this.notify();
  }

  /**
   * Starts a new speech recognition listening cycle with resilient retry and silence handling.
   */
  private async startListeningCycle(): Promise<void> {
    if (!this.isCallActive || this.isMuted) return;

    this.userTranscript = '';
    this.setState('listening');

    await startListening({
      onInterimResult: (transcript) => {
        if (!this.isCallActive) return;
        this.asrRetryCount = 0; // speech received, reset error count
        this.userTranscript = transcript;
        this.notify();
      },
      onFinalResult: async (finalTranscript) => {
        if (!this.isCallActive) return;
        this.asrRetryCount = 0; // valid turn completed

        const trimmed = finalTranscript.trim();
        if (!trimmed) {
          // Empty result, loop back to listen
          if (this.state === 'listening') {
            await this.startListeningCycle();
          }
          return;
        }

        this.userTranscript = trimmed;
        await this.handleUserUtterance(trimmed);
      },
      onSilence: () => {
        if (!this.isCallActive || this.isMuted) return;
        // Normal silence (no-speech or speech-timeout): silently restart listening without error count
        if (this.state === 'listening') {
          this.startListeningCycle();
        }
      },
      onError: (errorMsg, errorCode) => {
        if (!this.isCallActive || this.isMuted) return;

        // Exponential backoff retry for transient errors (up to 3 times: 500ms, 1s, 2s)
        if (this.asrRetryCount < 3) {
          const delays = [500, 1000, 2000];
          const delay = delays[this.asrRetryCount] || 2000;
          this.asrRetryCount++;

          clearTimeout(this.asrRetryTimer);
          this.asrRetryTimer = setTimeout(() => {
            if (this.isCallActive && !this.isMuted && this.state === 'listening') {
              this.startListeningCycle();
            }
          }, delay);
        } else {
          // Reached max 3 retries: stop and show user-friendly message
          let friendly = 'Speech recognition stopped unexpectedly.';
          if (errorCode === 'network') {
            friendly = 'No internet connection for speech recognition. Connect to internet or download offline speech pack.';
          } else if (errorCode === 'language-not-supported') {
            friendly = 'Selected language is not supported or offline pack is missing.';
          } else if (errorCode === 'not-allowed') {
            friendly = 'Microphone or speech recognition permission was denied.';
          } else if (errorCode === 'service-not-allowed') {
            friendly = 'Speech recognition service is unavailable on this device.';
          } else if (errorMsg) {
            friendly = errorMsg;
          }

          this.errorMessage = friendly;
          this.setState('error');
        }
      },
    });
  }

  /**
   * Handles user speech completion and drives LLM + TTS pipeline.
   */
  private async handleUserUtterance(userInput: string): Promise<void> {
    // 1. Immediately STOP listening while AI speaks
    await stopListening();
    this.endOfUserSpeechTimestamp = Date.now();
    this.firstSentenceSpokenRecorded = false;

    this.setState('thinking');

    // 2. Play an immediate conversational filler to mask LLM latency
    const filler = CASUAL_FILLERS[Math.floor(Math.random() * CASUAL_FILLERS.length)];
    speakSentence(filler);

    // 3. Record user turn
    this.recordTurn('user', userInput);

    // Check if max turns reached (AURA turns)
    if (this.auraTurnCount >= MAX_TURNS) {
      await this.handleCallWrapUp();
      return;
    }

    // 4. Stream LLM generation
    let sentenceBuffer = '';
    this.aiResponse = '';

    // Determine custom system prompt based on scheduled slot goal
    let customSystemPrompt: string | undefined;
    if (this.activeSlot === 'morning') {
      customSystemPrompt = MORNING_GOAL;
    } else if (this.activeSlot === 'evening') {
      customSystemPrompt = EVENING_GOAL;
    }

    try {
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
                this.debugMetrics.timeToFirstSpokenSentenceMs =
                  Date.now() - this.endOfUserSpeechTimestamp;
                this.firstSentenceSpokenRecorded = true;
              }

              this.setState('speaking');
              speakSentence(sentenceToSpeak);
            }
          }
        },
        {
          systemPrompt: customSystemPrompt,
          onFirstToken: (ttftMs) => {
            if (!this.isCallActive) return;
            this.debugMetrics.timeToFirstTokenMs = ttftMs;
            this.notify();
          },
        }
      );

      // Enqueue any remaining buffer text
      const remaining = sentenceBuffer.trim();
      if (remaining.length > 0) {
        if (!this.firstSentenceSpokenRecorded && this.endOfUserSpeechTimestamp) {
          this.debugMetrics.timeToFirstSpokenSentenceMs =
            Date.now() - this.endOfUserSpeechTimestamp;
          this.firstSentenceSpokenRecorded = true;
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

      // 5. When all sentences finish speaking, loop back to listening or wrap up
      setTtsOnDone(() => {
        if (!this.isCallActive) return;

        if (this.auraTurnCount >= MAX_TURNS) {
          this.handleCallWrapUp();
        } else if (!this.isMuted) {
          this.startListeningCycle();
        } else {
          this.setState('idle');
        }
      });
    } catch (err: any) {
      console.error('[CallAgent] Generation error:', err);
      this.errorMessage = err?.message || 'Error generating AI response.';
      this.setState('error');
    }
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
