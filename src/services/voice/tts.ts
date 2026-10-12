import * as Speech from 'expo-speech';

export const TTS_LOCALE = 'en-IN';

interface QueueItem {
  text: string;
  onSentenceStart?: () => void;
}

let sentenceQueue: QueueItem[] = [];
let isCurrentlySpeaking = false;
let globalOnDoneCallback: (() => void) | null = null;

/**
 * Sets the callback invoked when the entire speech queue has finished playing.
 */
export function setTtsOnDone(callback: (() => void) | null): void {
  globalOnDoneCallback = callback;
}

/**
 * Checks whether TTS is currently speaking.
 */
export function isTtsSpeaking(): boolean {
  return isCurrentlySpeaking;
}

/**
 * Clears the queue and immediately interrupts any ongoing speech.
 */
export function stopTts(): void {
  sentenceQueue = [];
  isCurrentlySpeaking = false;
  try {
    Speech.stop();
  } catch (err) {
    console.warn('[TTS] Error stopping speech:', err);
  }
}

/**
 * Enqueues a sentence to be spoken sequentially.
 * If TTS is currently idle, playback begins immediately.
 */
export function speakSentence(
  sentence: string,
  onSentenceStart?: () => void
): void {
  const trimmed = sentence.trim();
  if (!trimmed) return;

  sentenceQueue.push({ text: trimmed, onSentenceStart });

  if (!isCurrentlySpeaking) {
    playNextInQueue();
  }
}

function playNextInQueue(): void {
  if (sentenceQueue.length === 0) {
    isCurrentlySpeaking = false;
    if (globalOnDoneCallback) {
      const cb = globalOnDoneCallback;
      globalOnDoneCallback = null;
      cb();
    }
    return;
  }

  isCurrentlySpeaking = true;
  const item = sentenceQueue.shift();
  if (!item) {
    isCurrentlySpeaking = false;
    return;
  }

  item.onSentenceStart?.();

  Speech.speak(item.text, {
    language: TTS_LOCALE,
    rate: 1.0,
    pitch: 1.05, // Slightly brighter, friendly voice
    onDone: () => {
      playNextInQueue();
    },
    onStopped: () => {
      isCurrentlySpeaking = false;
    },
    onError: (err) => {
      console.warn('[TTS] Speech error:', err);
      playNextInQueue();
    },
  });
}
