import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TTS_LOCALE = 'en-IN';
export const TTS_VOICE_STORAGE_KEY = '@aura_tts_selected_voice';

let selectedVoiceIdentifier: string | undefined = undefined;
let voiceResolved = false;

// Native utterance queue tracking
let pendingUtterances = 0;
let utteranceSeq = 0;
let isCurrentlySpeaking = false;
let globalOnDoneCallback: (() => void) | null = null;
let pollInterval: any = null;
let globalSafetyTimer: any = null;

/**
 * Returns all local (offline) en-IN voices available on this device.
 */
export async function getLocalVoicesAsync(): Promise<Speech.Voice[]> {
  try {
    const available = await Speech.getAvailableVoicesAsync();
    return available.filter((v) => {
      const lang = (v.language || '').toLowerCase().replace('_', '-');
      const isEnIn = lang === 'en-in' || lang.startsWith('en-in');
      const id = (v.identifier || '').toLowerCase();
      return isEnIn && id.includes('local') && !id.includes('network');
    });
  } catch {
    return [];
  }
}

/**
 * Gets the currently selected voice identifier.
 */
export function getSelectedVoice(): string | undefined {
  return selectedVoiceIdentifier;
}

/**
 * Selects and persists the chosen voice identifier.
 */
export async function setSelectedVoice(identifier: string): Promise<void> {
  selectedVoiceIdentifier = identifier;
  await AsyncStorage.setItem(TTS_VOICE_STORAGE_KEY, identifier).catch(() => {});
  console.log(`[TTS] User selected voice: ${identifier}`);
}

/**
 * Plays a short voice sample to let the user hear the chosen voice.
 */
export async function playVoiceSample(identifier: string): Promise<void> {
  try {
    Speech.stop();
    Speech.speak('Hello Dark, naan Pallavi pesuren.', {
      language: TTS_LOCALE,
      voice: identifier,
      rate: 1.0,
      pitch: 1.05,
    });
  } catch (err) {
    console.warn('[TTS] Failed to play voice sample:', err);
  }
}

/**
 * Discovers and selects an en-IN voice.
 * Priority:
 * 1. Saved preference in AsyncStorage
 * 2. en-in-x-ena-local (standard Indian English female voice in Google TTS)
 * 3. en-in-x-ene-local
 * 4. Any other local en-IN voice
 * 5. Network fallback
 */
async function ensureVoiceSelected(): Promise<void> {
  if (voiceResolved) return;
  voiceResolved = true;

  try {
    // 1. Check persisted user choice
    const savedVoice = await AsyncStorage.getItem(TTS_VOICE_STORAGE_KEY).catch(() => null);
    const available = await Speech.getAvailableVoicesAsync();

    const enInVoices = available.filter((v) => {
      const lang = (v.language || '').toLowerCase().replace('_', '-');
      return lang === 'en-in' || lang.startsWith('en-in');
    });

    console.log(`[TTS] Found ${enInVoices.length} en-IN voices:`);
    enInVoices.forEach((v) => {
      console.log(`[TTS] en-IN voice: identifier="${v.identifier}", quality="${v.quality}", name="${v.name}"`);
    });

    if (savedVoice && enInVoices.some((v) => v.identifier === savedVoice)) {
      selectedVoiceIdentifier = savedVoice;
      console.log(`[TTS] Using saved voice from settings: "${selectedVoiceIdentifier}"`);
      return;
    }

    const localVoices = enInVoices.filter((v) => {
      const id = (v.identifier || '').toLowerCase();
      return id.includes('local') && !id.includes('network');
    });

    // 2. Try default preference: en-in-x-ena-local, then en-in-x-ene-local, then any local
    const preferredOrder = ['en-in-x-ena-local', 'en-in-x-ene-local'];
    let chosen: Speech.Voice | undefined;

    for (const pref of preferredOrder) {
      chosen = localVoices.find((v) => (v.identifier || '').toLowerCase().includes(pref));
      if (chosen) break;
    }

    if (!chosen && localVoices.length > 0) {
      chosen = localVoices[0];
    }

    if (!chosen && enInVoices.length > 0) {
      chosen = enInVoices[0];
    }

    if (chosen) {
      selectedVoiceIdentifier = chosen.identifier;
      console.log(`[TTS] Default selected voice: "${chosen.identifier}" (name: "${chosen.name}")`);
    } else {
      selectedVoiceIdentifier = undefined;
    }
  } catch (err) {
    console.warn('[TTS] Voice discovery failed, using system default:', err);
    selectedVoiceIdentifier = undefined;
  }
}

// Eagerly resolve voice on module load
ensureVoiceSelected().catch(() => {});

/**
 * Sets the callback invoked when all queued speech has completely finished.
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
 * Clears pending queue and immediately stops any ongoing speech.
 */
export function stopTts(): void {
  pendingUtterances = 0;
  isCurrentlySpeaking = false;
  globalOnDoneCallback = null;

  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (globalSafetyTimer) {
    clearTimeout(globalSafetyTimer);
    globalSafetyTimer = null;
  }

  try {
    Speech.stop();
  } catch (err) {
    console.warn('[TTS] Error stopping speech:', err);
  }
}

/**
 * Enqueues a sentence into the native expo-speech queue IMMEDIATELY as it arrives
 * from the LLM stream without blocking or awaiting prior sentences.
 */
export function speakSentence(
  sentence: string,
  onSentenceStart?: () => void
): void {
  const trimmed = sentence.trim();
  if (!trimmed) return;

  utteranceSeq++;
  const uId = `utt-${utteranceSeq}`;
  pendingUtterances++;
  isCurrentlySpeaking = true;

  console.log(`[TTS #${uId}] Queueing into native Speech: "${trimmed.slice(0, 35)}..." (pending: ${pendingUtterances})`);

  const speakOptions: Speech.SpeechOptions = {
    language: TTS_LOCALE,
    rate: 1.0,
    pitch: 1.05,
    onStart: () => {
      console.log(`[TTS #${uId}] onStart`);
      onSentenceStart?.();
    },
    onDone: () => {
      console.log(`[TTS #${uId}] onDone`);
      handleUtteranceCompleted(uId);
    },
    onStopped: () => {
      console.log(`[TTS #${uId}] onStopped`);
      handleUtteranceCompleted(uId);
    },
    onError: (err) => {
      console.warn(`[TTS #${uId}] onError:`, err);
      handleUtteranceCompleted(uId);
    },
  };

  if (selectedVoiceIdentifier) {
    speakOptions.voice = selectedVoiceIdentifier;
  }

  try {
    Speech.speak(trimmed, speakOptions);
  } catch (err) {
    console.warn(`[TTS #${uId}] Speech.speak throw:`, err);
    handleUtteranceCompleted(uId);
  }

  startCompletionWatcher();
}

function handleUtteranceCompleted(id: string): void {
  pendingUtterances = Math.max(0, pendingUtterances - 1);
  console.log(`[TTS #${id}] completed (remaining pending: ${pendingUtterances})`);

  if (pendingUtterances === 0) {
    // When pending count reaches 0, check if audio is still actively playing
    Speech.isSpeakingAsync().then((speaking) => {
      if (!speaking && pendingUtterances === 0) {
        finalizeSpeechSession();
      }
    });
  }
}

/**
 * Starts polling Speech.isSpeakingAsync() every 150ms after a 400ms grace period.
 * Completes immediately when audio has stopped and pending count is 0.
 * Protected by a single global 20s safety timeout.
 */
function startCompletionWatcher(): void {
  // Global 20s safety timeout
  if (!globalSafetyTimer) {
    globalSafetyTimer = setTimeout(() => {
      console.warn('[TTS] Global safety timeout (20s) reached, finalizing speech session');
      finalizeSpeechSession();
    }, 20000);
  }

  // Poll isSpeakingAsync every 150ms after a 400ms grace period
  if (!pollInterval) {
    setTimeout(() => {
      if (!isCurrentlySpeaking) return;
      if (pollInterval) return;

      pollInterval = setInterval(async () => {
        try {
          const speaking = await Speech.isSpeakingAsync();
          if (!speaking && pendingUtterances <= 0 && isCurrentlySpeaking) {
            console.log('[TTS] Native isSpeakingAsync is false and queue empty -> Speech finished');
            finalizeSpeechSession();
          }
        } catch {}
      }, 150);
    }, 400);
  }
}

function finalizeSpeechSession(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (globalSafetyTimer) {
    clearTimeout(globalSafetyTimer);
    globalSafetyTimer = null;
  }

  pendingUtterances = 0;
  isCurrentlySpeaking = false;
  console.log('[TTS] All queued utterances finished speaking');

  if (globalOnDoneCallback) {
    const cb = globalOnDoneCallback;
    globalOnDoneCallback = null;
    cb();
  }
}
