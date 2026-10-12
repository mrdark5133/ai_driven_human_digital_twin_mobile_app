import { startListening, stopListening, abortListening, isAsrListening } from './asr';
import { streamLlmResponse, ChatTurn, LlmGenerationMetrics, initLlmContext, releaseLlmContext } from './llm';
import { speakSentence, stopTts, setTtsOnDone, isTtsSpeaking } from './tts';

export type CallAgentState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

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
}

export type CallAgentListener = (event: CallAgentEvent) => void;

const CASUAL_FILLERS = [
  'Hmm...',
  'Okay okay...',
  'Sari...',
  'Ammam...',
  'Sari da...',
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
  public async startCall(): Promise<void> {
    if (this.isCallActive) return;

    this.isCallActive = true;
    this.conversationHistory = [];
    this.userTranscript = '';
    this.aiResponse = '';
    this.errorMessage = null;
    this.firstSentenceSpokenRecorded = false;

    try {
      this.setState('thinking');
      // Ensure model context is ready
      await initLlmContext();

      // Begin listening cycle
      await this.startListeningCycle();
    } catch (err: any) {
      this.errorMessage = err?.message || 'Failed to start AURA call agent.';
      this.setState('error');
    }
  }

  /**
   * Ends the call, cancels all audio and releases memory.
   */
  public async endCall(): Promise<void> {
    this.isCallActive = false;
    stopTts();
    await abortListening();
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
   * Starts a new speech recognition listening cycle.
   */
  private async startListeningCycle(): Promise<void> {
    if (!this.isCallActive || this.isMuted) return;

    this.userTranscript = '';
    this.setState('listening');

    await startListening({
      onInterimResult: (transcript) => {
        if (!this.isCallActive) return;
        this.userTranscript = transcript;
        this.notify();
      },
      onFinalResult: async (finalTranscript) => {
        if (!this.isCallActive) return;

        const trimmed = finalTranscript.trim();
        if (!trimmed) {
          // If silent or no speech detected, loop back to listen
          if (this.state === 'listening') {
            await this.startListeningCycle();
          }
          return;
        }

        this.userTranscript = trimmed;
        await this.handleUserUtterance(trimmed);
      },
      onError: (error) => {
        if (!this.isCallActive) return;
        console.warn('[CallAgent] ASR Error:', error);
        // On recoverable error, attempt re-listen if call is still active
        if (this.isCallActive && !this.isMuted) {
          setTimeout(() => {
            if (this.isCallActive && this.state === 'listening') {
              this.startListeningCycle();
            }
          }, 600);
        }
      },
    });
  }

  /**
   * Handles user speech completion and drives LLM + TTS pipeline.
   */
  private async handleUserUtterance(userInput: string): Promise<void> {
    // 1. Immediately STOP listening while AI speaks (prevents hearing own voice)
    await stopListening();
    this.endOfUserSpeechTimestamp = Date.now();
    this.firstSentenceSpokenRecorded = false;

    this.setState('thinking');

    // 2. Play an immediate conversational filler to mask LLM latency
    const filler = CASUAL_FILLERS[Math.floor(Math.random() * CASUAL_FILLERS.length)];
    speakSentence(filler);

    // 3. Record turn in conversation history
    this.conversationHistory.push({ role: 'user', content: userInput });

    // 4. Stream LLM generation
    let sentenceBuffer = '';
    this.aiResponse = '';

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

      // Update metrics
      this.debugMetrics.timeToFirstTokenMs = metrics.timeToFirstTokenMs;
      this.debugMetrics.tokensPerSecond = metrics.tokensPerSecond;
      this.debugMetrics.tokensGenerated = metrics.tokensGenerated;
      this.notify();

      // Record assistant reply in history
      this.conversationHistory.push({ role: 'assistant', content: text });

      // 5. When all sentences finish speaking, loop back to listening
      setTtsOnDone(() => {
        if (this.isCallActive && !this.isMuted) {
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
}

export const callAgent = new CallAgentService();
