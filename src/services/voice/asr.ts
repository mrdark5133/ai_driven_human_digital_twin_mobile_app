import {
  ExpoSpeechRecognitionModule,
  ExpoSpeechRecognitionResultEvent,
  ExpoSpeechRecognitionErrorEvent,
} from 'expo-speech-recognition';

export type AsrLocale = 'en-IN' | 'ta-IN';

// Default locale for casual Tanglish recognition (switchable to 'ta-IN' for testing)
export const DEFAULT_ASR_LOCALE: AsrLocale = 'en-IN';

export interface AsrCallbacks {
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onError?: (error: string) => void;
  onVolumeChange?: (volume: number) => void;
}

let activeLocale: AsrLocale = DEFAULT_ASR_LOCALE;
let isCurrentlyListening = false;
let callbacks: AsrCallbacks = {};
let cleanupSubscriptions: (() => void)[] = [];
let accumulatedTranscript = '';

/**
 * Gets the current ASR language locale.
 */
export function getAsrLocale(): AsrLocale {
  return activeLocale;
}

/**
 * Sets the active ASR language locale ('en-IN' or 'ta-IN').
 */
export function setAsrLocale(locale: AsrLocale): void {
  activeLocale = locale;
}

/**
 * Requests speech recognition and microphone permissions.
 */
export async function requestAsrPermissions(): Promise<boolean> {
  try {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return perm.granted;
  } catch (err) {
    console.warn('[ASR] Permission request failed:', err);
    return false;
  }
}

/**
 * Checks whether on-device speech recognition is supported on this Android device.
 */
export async function checkOnDeviceSupport(): Promise<boolean> {
  try {
    return ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
  } catch {
    return false;
  }
}

/**
 * Returns whether ASR is currently actively listening.
 */
export function isAsrListening(): boolean {
  return isCurrentlyListening;
}

/**
 * Sets or updates ASR event callbacks.
 */
export function setAsrCallbacks(cb: AsrCallbacks): void {
  callbacks = { ...callbacks, ...cb };
}

function clearSubscriptions(): void {
  cleanupSubscriptions.forEach((unsub) => unsub());
  cleanupSubscriptions = [];
}

/**
 * Starts listening to speech input with the configured locale and callbacks.
 */
export async function startListening(customCallbacks?: AsrCallbacks): Promise<void> {
  if (customCallbacks) {
    callbacks = { ...callbacks, ...customCallbacks };
  }

  // 1. Ensure permissions
  const hasPerm = await requestAsrPermissions();
  if (!hasPerm) {
    callbacks.onError?.('Microphone or speech recognition permission was denied.');
    return;
  }

  // 2. Stop any existing session
  if (isCurrentlyListening) {
    await stopListening();
  }

  accumulatedTranscript = '';
  clearSubscriptions();

  // 3. Register native event listeners
  const subResult = ExpoSpeechRecognitionModule.addListener(
    'result',
    (event: ExpoSpeechRecognitionResultEvent) => {
      const topResult = event.results?.[0]?.transcript || '';
      if (!topResult.trim()) return;

      if (event.isFinal) {
        accumulatedTranscript = topResult.trim();
        callbacks.onFinalResult?.(accumulatedTranscript);
      } else {
        callbacks.onInterimResult?.(topResult.trim());
      }
    }
  );

  const subSpeechStart = ExpoSpeechRecognitionModule.addListener('speechstart', () => {
    callbacks.onSpeechStart?.();
  });

  const subSpeechEnd = ExpoSpeechRecognitionModule.addListener('speechend', () => {
    callbacks.onSpeechEnd?.();
  });

  const subVolume = ExpoSpeechRecognitionModule.addListener('volumechange', (event) => {
    callbacks.onVolumeChange?.(event.value);
  });

  const subError = ExpoSpeechRecognitionModule.addListener(
    'error',
    (event: ExpoSpeechRecognitionErrorEvent) => {
      isCurrentlyListening = false;
      // "no-speech" is normal when user is silent; do not surface as fatal crash
      if (event.error === 'no-speech') {
        callbacks.onFinalResult?.('');
        return;
      }
      callbacks.onError?.(event.message || `Speech recognition error: ${event.error}`);
    }
  );

  const subEnd = ExpoSpeechRecognitionModule.addListener('end', () => {
    isCurrentlyListening = false;
  });

  cleanupSubscriptions = [
    () => subResult.remove(),
    () => subSpeechStart.remove(),
    () => subSpeechEnd.remove(),
    () => subVolume.remove(),
    () => subError.remove(),
    () => subEnd.remove(),
  ];

  // 4. Check for on-device recognition support
  const onDeviceSupported = await checkOnDeviceSupport();

  // 5. Start recognition with optimized options
  try {
    isCurrentlyListening = true;
    ExpoSpeechRecognitionModule.start({
      lang: activeLocale,
      interimResults: true,
      continuous: false,
      requiresOnDeviceRecognition: onDeviceSupported,
      addsPunctuation: true,
      androidIntentOptions: {
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1200,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 900,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 800,
      },
    });
  } catch (err: any) {
    isCurrentlyListening = false;
    clearSubscriptions();
    callbacks.onError?.(`Failed to start speech recognizer: ${err?.message || String(err)}`);
  }
}

/**
 * Stops listening and finalizes speech input.
 */
export async function stopListening(): Promise<void> {
  if (!isCurrentlyListening) return;
  isCurrentlyListening = false;
  try {
    ExpoSpeechRecognitionModule.stop();
  } catch (err) {
    console.warn('[ASR] Error stopping recognizer:', err);
  }
}

/**
 * Immediately cancels listening without waiting for final result.
 */
export async function abortListening(): Promise<void> {
  isCurrentlyListening = false;
  clearSubscriptions();
  try {
    ExpoSpeechRecognitionModule.abort();
  } catch (err) {
    console.warn('[ASR] Error aborting recognizer:', err);
  }
}
