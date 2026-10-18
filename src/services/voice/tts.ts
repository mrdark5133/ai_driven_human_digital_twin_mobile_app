import * as Speech from 'expo-speech';

export const TTS_LOCALE = 'en-IN';

interface QueueItem {
  text: string;
  onSentenceStart?: () => void;
}

let sentenceQueue: QueueItem[] = [];
let isCurrentlySpeaking = false;
let globalOnDoneCallback: (() => void) | null = null;
let activeFallbackTimer: any = null;
let selectedVoiceIdentifier: string | undefined = undefined;
let voiceResolved = false;

/**
 * Discovers and selects an en-IN female voice using expo-speech, or falls back to default.
 */
async function ensureFemaleVoice(): Promise<void> {
  if (voiceResolved) return;
  voiceResolved = true;

  try {
    const available = await Speech.getAvailableVoicesAsync();
    // Filter voices matching en-IN
    const enInVoices = available.filter((v) => {
      const lang = (v.language || '').toLowerCase().replace('_', '-');
      return lang === 'en-in' || lang.startsWith('en-in');
    });

    // Look for female-sounding voice by name/identifier heuristics
    const femaleVoice = enInVoices.find((v) => {
      const tag = `${v.name || ''} ${v.identifier || ''}`.toLowerCase();
      return (
        tag.includes('female') ||
        tag.includes('woman') ||
        tag.includes('girl') ||
        tag.includes('-c-') ||
        tag.includes('-d-') ||
        tag.includes('-f-')
      );
    });

    const chosen = femaleVoice || enInVoices[0];
    if (chosen) {
      selectedVoiceIdentifier = chosen.identifier;
      console.log(`[TTS] Selected female en-IN voice: "${chosen.name}" (${chosen.identifier})`);
    } else {
      console.log(`[TTS] No specific en-IN voice identified, using default voice for ${TTS_LOCALE}`);
      selectedVoiceIdentifier = undefined;
    }
  } catch (err) {
    console.warn('[TTS] Failed to query available voices, using default:', err);
    selectedVoiceIdentifier = undefined;
  }
}

// Eagerly resolve voice on load
ensureFemaleVoice().catch(() => {});

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
  globalOnDoneCallback = null;
  clearTimeout(activeFallbackTimer);
  activeFallbackTimer = null;
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
  clearTimeout(activeFallbackTimer);
  activeFallbackTimer = null;

  if (sentenceQueue.length === 0) {
    isCurrentlySpeaking = false;
    console.log('[TTS] TTS done');
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
  console.log(`[TTS] TTS start: "${item.text}"`);

  // Fallback timer: estimated speech time + 1s buffer (min 1500ms, max 10000ms)
  // ~15 characters per second in conversational Tanglish speech
  const estimatedDurationMs = Math.max(
    1500,
    Math.min(10000, Math.round((item.text.length / 15) * 1000) + 1000)
  );

  let finished = false;
  const finishItem = () => {
    if (finished) return;
    finished = true;
    clearTimeout(activeFallbackTimer);
    activeFallbackTimer = null;
    playNextInQueue();
  };

  activeFallbackTimer = setTimeout(() => {
    console.warn(`[TTS] Fallback timer triggered after ${estimatedDurationMs}ms (onDone was dropped)`);
    finishItem();
  }, estimatedDurationMs);

  const speakOptions: Speech.SpeechOptions = {
    language: TTS_LOCALE,
    rate: 1.0,
    pitch: 1.05, // Friendly, natural tone
    onDone: () => {
      finishItem();
    },
    onStopped: () => {
      finished = true;
      clearTimeout(activeFallbackTimer);
      activeFallbackTimer = null;
      isCurrentlySpeaking = false;
    },
    onError: (err) => {
      console.warn('[TTS] Speech error:', err);
      finishItem();
    },
  };

  if (selectedVoiceIdentifier) {
    speakOptions.voice = selectedVoiceIdentifier;
  }

  Speech.speak(item.text, speakOptions);
}
