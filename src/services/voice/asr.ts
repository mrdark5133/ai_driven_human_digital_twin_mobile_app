import { Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  ExpoSpeechRecognitionResultEvent,
  ExpoSpeechRecognitionErrorEvent,
} from 'expo-speech-recognition';

export type AsrLocale = 'en-IN' | 'ta-IN';

// Default locale for casual Tanglish recognition (switchable to 'ta-IN' for Tamil)
export const DEFAULT_ASR_LOCALE: AsrLocale = 'en-IN';

export interface AsrCallbacks {
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onEnd?: (cycleMaxVolume: number) => void;
  onSilence?: () => void;
  onError?: (error: string, code?: string) => void;
  onVolumeChange?: (volume: number, maxVolume: number) => void;
}

export type AsrSessionState = 'idle' | 'starting' | 'listening' | 'stopping';

let activeLocale: AsrLocale = DEFAULT_ASR_LOCALE;
let sessionState: AsrSessionState = 'idle';
let currentSessionId = 0;
let callbacks: AsrCallbacks = {};
let cleanupSubscriptions: (() => void)[] = [];

let cycleMaxVolume = -2;
let lastInterimTranscript = '';
let hasDeliveredFinal = false;
let interimSilenceDebounceTimer: any = null;
let silenceDetectedInSession = false;

// Benign teardown tracking
let isManualStop = false;

// Retry & recovery tracking
let audioCaptureRetryCount = 0;
let retriedOnlineForLanguage = false;
let networkRetryUsed = false;

// Mutex / Synchronization for end event
let endEventResolver: (() => void) | null = null;
let endSafetyTimer: any = null;

// Listening scheduler state (250ms debounce & single flight)
let restartDebounceTimer: any = null;
let isStartingListeningFlight = false;

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
 * Resets active ASR language locale back to default 'en-IN'.
 */
export function resetAsrLocale(): void {
  activeLocale = DEFAULT_ASR_LOCALE;
}

/**
 * Resets transient error counters (e.g. on new call start or user manual retry).
 */
export function resetAsrRetries(): void {
  audioCaptureRetryCount = 0;
  retriedOnlineForLanguage = false;
  networkRetryUsed = false;
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
 * Checks whether on-device speech recognition is supported on this device.
 */
export async function checkOnDeviceSupport(): Promise<boolean> {
  try {
    return ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
  } catch {
    return false;
  }
}

/**
 * Checks whether the offline language pack for the specified locale is installed on Android.
 */
export async function checkOfflineLocaleInstalled(locale: AsrLocale): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const supported = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
    if (!supported) return false;

    const res = await ExpoSpeechRecognitionModule.getSupportedLocales({});
    const target = locale.toLowerCase().replace('_', '-');
    const installed = (res.installedLocales || []).map((l) => l.toLowerCase().replace('_', '-'));
    return installed.some((l) => l === target || l.startsWith(target));
  } catch {
    return false;
  }
}

/**
 * Inspects default voice recognition service and queries all available services.
 * Prefers Google App ('com.google.android.googlequicksearchbox') over Google TTS ('com.google.android.tts').
 */
export function checkDefaultRecognizer(): {
  isGoogle: boolean;
  packageName: string;
  selectedPackage?: string;
} {
  if (Platform.OS !== 'android') {
    return { isGoogle: true, packageName: 'apple-speech', selectedPackage: 'apple-speech' };
  }

  try {
    const service = ExpoSpeechRecognitionModule.getDefaultRecognitionService();
    const defaultPackage = service?.packageName || '';
    console.log(`[ASR] getDefaultRecognitionService().packageName: "${defaultPackage}"`);

    let services: string[] = [];
    try {
      services = ExpoSpeechRecognitionModule.getSpeechRecognitionServices() || [];
      console.log(`[ASR] Available recognition services:`, services);
    } catch {}

    // Priority: com.google.android.googlequicksearchbox > non-TTS Google package > defaultPackage
    let selectedPackage: string | undefined = undefined;
    if (services.includes('com.google.android.googlequicksearchbox')) {
      selectedPackage = 'com.google.android.googlequicksearchbox';
    } else if (services.some((s) => s.toLowerCase().includes('googlequicksearchbox'))) {
      selectedPackage = services.find((s) => s.toLowerCase().includes('googlequicksearchbox'));
    } else if (services.some((s) => s.toLowerCase().includes('google') && !s.toLowerCase().includes('tts'))) {
      selectedPackage = services.find((s) => s.toLowerCase().includes('google') && !s.toLowerCase().includes('tts'));
    } else if (defaultPackage && !defaultPackage.toLowerCase().includes('tts')) {
      selectedPackage = defaultPackage;
    }

    if (selectedPackage) {
      console.log(`[ASR] Selected recognizer package: "${selectedPackage}" (avoiding TTS package)`);
    } else {
      console.log(`[ASR] Using system default recognizer: "${defaultPackage}"`);
    }

    const effectivePkg = selectedPackage || defaultPackage;
    const isGoogle = effectivePkg.toLowerCase().includes('google');
    return {
      isGoogle,
      packageName: effectivePkg,
      selectedPackage,
    };
  } catch (err) {
    console.warn('[ASR] Recognizer check error:', err);
    return { isGoogle: true, packageName: '', selectedPackage: undefined };
  }
}

/**
 * Triggers offline speech recognition model download for Android (API 13+).
 */
export async function triggerOfflineModelDownload(locale: AsrLocale): Promise<{
  status: 'download_success' | 'opened_dialog' | 'download_scheduled';
  message: string;
}> {
  if (Platform.OS !== 'android') {
    return {
      status: 'download_success',
      message: 'On-device download not required on this platform.',
    };
  }

  return await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
    locale,
  });
}

/**
 * Returns whether ASR is currently actively listening.
 */
export function isAsrListening(): boolean {
  return sessionState === 'listening' || sessionState === 'starting';
}

/**
 * Sets or updates ASR event callbacks.
 */
export function setAsrCallbacks(cb: AsrCallbacks): void {
  callbacks = { ...callbacks, ...cb };
}

function clearSubscriptions(): void {
  cleanupSubscriptions.forEach((unsub) => {
    try {
      unsub();
    } catch {}
  });
  cleanupSubscriptions = [];
}

/**
 * Ensures that any previous ASR session has completely emitted its "end" event
 * and waited an additional 300ms cool-down period before starting a new session.
 */
async function ensurePreviousSessionFullyEnded(): Promise<void> {
  if (sessionState === 'idle') {
    return;
  }

  console.log(`[ASR #${currentSessionId}] Waiting for previous session to fully end (state: ${sessionState})...`);

  await new Promise<void>((resolve) => {
    const prevResolver = endEventResolver;
    endEventResolver = () => {
      if (endSafetyTimer) {
        clearTimeout(endSafetyTimer);
        endSafetyTimer = null;
      }
      prevResolver?.();
      resolve();
    };

    if (!endSafetyTimer) {
      endSafetyTimer = setTimeout(() => {
        console.warn(`[ASR #${currentSessionId}] Safety timeout (1.5s) waiting for end event, forcing idle`);
        sessionState = 'idle';
        if (endEventResolver) {
          const r = endEventResolver;
          endEventResolver = null;
          r();
        }
      }, 1500);
    }
  });

  // Additional 300ms hardware settle time after the end event
  await new Promise((r) => setTimeout(r, 300));
}

/**
 * Unified listening scheduler with single-flight guard and 250ms debounce.
 * Every restart reason (TTS finished, no-speech, end without transcript, retry, tap) goes through it.
 * Only one pending restart can exist; a new request replaces the old one.
 * If a session is active or stopping, it waits for its "end" event, then starts.
 */
export function requestListening(
  reason: string,
  customCallbacks?: AsrCallbacks,
  options?: { forceOnline?: boolean }
): void {
  console.log(`[ASR] requestListening scheduled (reason: "${reason}", debounce: 250ms)`);

  if (customCallbacks) {
    callbacks = { ...callbacks, ...customCallbacks };
  }

  // Clear any existing pending restart (only one pending restart exists; new replaces old)
  if (restartDebounceTimer) {
    clearTimeout(restartDebounceTimer);
    restartDebounceTimer = null;
  }

  restartDebounceTimer = setTimeout(async () => {
    restartDebounceTimer = null;
    await executeListeningSession(reason, options);
  }, 250);
}

/**
 * Internal worker that executes a clean speech recognition session.
 */
async function executeListeningSession(
  reason: string,
  options?: { forceOnline?: boolean }
): Promise<void> {
  // Single-flight guard: prevent overlapping execution
  if (isStartingListeningFlight) {
    console.log(`[ASR] Launch already in flight, skipping overlapping execution for "${reason}"`);
    return;
  }
  isStartingListeningFlight = true;

  try {
    // 1. If an active session is currently running or stopping, wait for its "end" event
    await ensurePreviousSessionFullyEnded();

    // 2. Ensure permissions
    const hasPerm = await requestAsrPermissions();
    if (!hasPerm) {
      console.log('[ASR] ASR error (not-allowed): Microphone or speech recognition permission was denied.');
      sessionState = 'idle';
      callbacks.onError?.('Microphone or speech recognition permission was denied.', 'not-allowed');
      return;
    }

    // 3. Increment session ID & reset state
    currentSessionId++;
    const sid = currentSessionId;
    sessionState = 'starting';
    isManualStop = false; // Fresh session: our own code has not stopped it yet

    cycleMaxVolume = -2;
    lastInterimTranscript = '';
    hasDeliveredFinal = false;
    silenceDetectedInSession = false;
    clearTimeout(interimSilenceDebounceTimer);
    clearSubscriptions();

    const deliverFinal = (text: string, source: string) => {
      clearTimeout(interimSilenceDebounceTimer);
      if (hasDeliveredFinal) return;
      hasDeliveredFinal = true;
      const trimmed = text.trim();
      lastInterimTranscript = '';
      if (!trimmed) return;

      console.log(`[ASR #${sid}] final result (${source}): "${trimmed}"`);
      // Hands-free continuous sessions must end right after the final result is submitted to the LLM
      stopListening();
      callbacks.onFinalResult?.(trimmed);
    };

    // 4. Register event listeners tagged with session ID (stale events are discarded)
    const subResult = ExpoSpeechRecognitionModule.addListener(
      'result',
      (event: ExpoSpeechRecognitionResultEvent) => {
        if (sid !== currentSessionId) {
          console.log(`[ASR #${sid}] ignoring result for stale session (active is #${currentSessionId})`);
          return;
        }

        const topResult = event.results?.[0]?.transcript || '';
        if (!topResult.trim()) return;
        const text = topResult.trim();

        if (event.isFinal) {
          deliverFinal(text, 'native isFinal');
        } else {
          lastInterimTranscript = text;
          console.log(`[ASR #${sid}] interim result: "${text}"`);
          callbacks.onInterimResult?.(text);

          // Turn-end debounce: if no change in interim transcript for 1200ms, deliver final
          clearTimeout(interimSilenceDebounceTimer);
          interimSilenceDebounceTimer = setTimeout(() => {
            if (!hasDeliveredFinal && sessionState === 'listening' && lastInterimTranscript.trim()) {
              deliverFinal(lastInterimTranscript, '1200ms interim silence debounce');
            }
          }, 1200);
        }
      }
    );

    const subVolume = ExpoSpeechRecognitionModule.addListener('volumechange', (event) => {
      if (sid !== currentSessionId) return;
      const val = typeof event?.value === 'number' ? event.value : -2;
      if (val > cycleMaxVolume) {
        cycleMaxVolume = val;
      }
      callbacks.onVolumeChange?.(val, cycleMaxVolume);
    });

    const subSpeechStart = ExpoSpeechRecognitionModule.addListener('speechstart', () => {
      if (sid !== currentSessionId) return;
      console.log(`[ASR #${sid}] speechstart`);
      callbacks.onSpeechStart?.();
    });

    const subSpeechEnd = ExpoSpeechRecognitionModule.addListener('speechend', () => {
      if (sid !== currentSessionId) return;
      console.log(`[ASR #${sid}] speechend`);
      callbacks.onSpeechEnd?.();
    });

    const subError = ExpoSpeechRecognitionModule.addListener(
      'error',
      (event: ExpoSpeechRecognitionErrorEvent) => {
        if (sid !== currentSessionId) {
          console.log(`[ASR #${sid}] ignoring error for stale session (active is #${currentSessionId})`);
          return;
        }

        clearTimeout(interimSilenceDebounceTimer);
        const errCode = event.error || 'unknown';
        const errMsg = event.message || `Speech recognition error: ${errCode}`;

        // PART 3.c: If MY code stopped or aborted the recognizer, client or aborted errors are benign
        if (isManualStop && (errCode === 'client' || errCode === 'aborted')) {
          console.log(`[ASR #${sid}] benign client error after own stop (${errCode})`);
          return;
        }

        console.log(`[ASR #${sid}] ASR error (${errCode}): ${errMsg}`);

        if (errCode === 'no-speech' || errCode === 'speech-timeout') {
          // Flag silence. Do NOT restart immediately; wait for native "end" event!
          silenceDetectedInSession = true;
          return;
        }

        if (errCode === 'audio-capture') {
          if (audioCaptureRetryCount < 3) {
            audioCaptureRetryCount++;
            console.log(
              `[ASR #${sid}] audio-capture error, will retry in 1000ms (attempt ${audioCaptureRetryCount}/3)`
            );
            setTimeout(() => {
              requestListening('audio-capture retry', undefined, { forceOnline: options?.forceOnline });
            }, 1000);
            return;
          }
        }

        if (errCode === 'language-not-supported' && !retriedOnlineForLanguage) {
          retriedOnlineForLanguage = true;
          console.log(`[ASR #${sid}] language-not-supported, retrying once with online recognition...`);
          requestListening('language fallback online', undefined, { forceOnline: true });
          return;
        }

        // PART 3.d: "network: Server disconnected": retry once after 800 ms, then show calm notice
        if (errCode === 'network') {
          if (!networkRetryUsed) {
            networkRetryUsed = true;
            console.log(`[ASR #${sid}] ASR network disconnect, retrying once after 800ms...`);
            setTimeout(() => {
              requestListening('network disconnect retry');
            }, 800);
            return;
          } else {
            console.warn(`[ASR #${sid}] Network disconnect persistent after retry`);
            callbacks.onError?.('Network disconnected. Tap Retry to connect.', 'network');
            return;
          }
        }

        callbacks.onError?.(errMsg, errCode);
      }
    );

    const subEnd = ExpoSpeechRecognitionModule.addListener('end', () => {
      if (sid !== currentSessionId) {
        console.log(`[ASR #${sid}] ignoring end event for stale session (active is #${currentSessionId})`);
        return;
      }

      console.log(`[ASR #${sid}] ASR end`);
      console.log(`[ASR #${sid}] cycle max level: ${cycleMaxVolume.toFixed(1)}`);

      clearTimeout(interimSilenceDebounceTimer);
      clearSubscriptions();
      sessionState = 'idle';
      isManualStop = false;

      // Release any pending session-end waiter
      if (endEventResolver) {
        const r = endEventResolver;
        endEventResolver = null;
        if (endSafetyTimer) {
          clearTimeout(endSafetyTimer);
          endSafetyTimer = null;
        }
        r();
      }

      // 1. If the session ended with an interim transcript but no final result, deliver it!
      if (!hasDeliveredFinal && lastInterimTranscript.trim()) {
        deliverFinal(lastInterimTranscript, 'end event fallback');
        return;
      }

      // 2. If silence was detected, notify silence handler (will route through requestListening)
      if (silenceDetectedInSession) {
        callbacks.onSilence?.();
        return;
      }

      // 3. Otherwise emit standard onEnd
      callbacks.onEnd?.(cycleMaxVolume);
    });

    cleanupSubscriptions = [
      () => subResult.remove(),
      () => subVolume.remove(),
      () => subSpeechStart.remove(),
      () => subSpeechEnd.remove(),
      () => subError.remove(),
      () => subEnd.remove(),
    ];

    // 5. Select recognition service package (Google App, avoiding TTS package)
    const recognizer = checkDefaultRecognizer();

    let isOfflineInstalled = false;
    if (!options?.forceOnline) {
      isOfflineInstalled = await checkOfflineLocaleInstalled(activeLocale);
    }
    const useOnDevice = options?.forceOnline ? false : isOfflineInstalled;

    console.log(
      `[ASR #${sid}] start (reason: "${reason}", locale: ${activeLocale}, onDevice: ${useOnDevice}, continuous: true, pkg: ${recognizer.selectedPackage || recognizer.packageName})`
    );

    sessionState = 'listening';
    audioCaptureRetryCount = 0;

    const startOptions: any = {
      lang: activeLocale,
      interimResults: true,
      continuous: true,
      requiresOnDeviceRecognition: useOnDevice,
      addsPunctuation: false,
      androidIntentOptions: {
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1800,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
      },
      volumeChangeEventOptions: {
        enabled: true,
        intervalMillis: 150,
      },
    };

    if (Platform.OS === 'android' && recognizer.selectedPackage) {
      startOptions.androidRecognitionServicePackage = recognizer.selectedPackage;
    }

    ExpoSpeechRecognitionModule.start(startOptions);
  } catch (err: any) {
    sessionState = 'idle';
    clearSubscriptions();
    const msg = `Failed to start speech recognizer: ${err?.message || String(err)}`;
    console.log(`[ASR #${currentSessionId}] ASR error (client): ${msg}`);
    callbacks.onError?.(msg, 'client');
  } finally {
    isStartingListeningFlight = false;
  }
}

/**
 * Legacy startListening wrapper that directly executes or delegates to requestListening.
 */
export async function startListening(
  customCallbacks?: AsrCallbacks,
  options?: { forceOnline?: boolean }
): Promise<void> {
  requestListening('startListening called', customCallbacks, options);
}

/**
 * Stops listening and attempts to finalize any pending speech input.
 * Sets isManualStop to ensure subsequent client/aborted events are treated as benign.
 */
export async function stopListening(): Promise<void> {
  clearTimeout(interimSilenceDebounceTimer);
  if (restartDebounceTimer) {
    clearTimeout(restartDebounceTimer);
    restartDebounceTimer = null;
  }

  if (sessionState === 'idle') return;
  isManualStop = true;
  sessionState = 'stopping';
  console.log(`[ASR #${currentSessionId}] stopListening initiated by app (isManualStop=true)`);
  try {
    ExpoSpeechRecognitionModule.stop();
  } catch (err) {
    console.warn(`[ASR #${currentSessionId}] Error stopping recognizer:`, err);
  }
}

/**
 * Immediately cancels listening without processing the final result.
 * Sets isManualStop to ensure subsequent client/aborted events are treated as benign.
 */
export async function abortListening(): Promise<void> {
  clearTimeout(interimSilenceDebounceTimer);
  if (restartDebounceTimer) {
    clearTimeout(restartDebounceTimer);
    restartDebounceTimer = null;
  }

  hasDeliveredFinal = true;
  lastInterimTranscript = '';
  silenceDetectedInSession = false;

  if (sessionState === 'idle') return;
  isManualStop = true;
  sessionState = 'stopping';
  clearSubscriptions();
  try {
    ExpoSpeechRecognitionModule.abort();
  } catch (err) {
    console.warn(`[ASR #${currentSessionId}] Error aborting recognizer:`, err);
  } finally {
    sessionState = 'idle';
    if (endEventResolver) {
      const r = endEventResolver;
      endEventResolver = null;
      if (endSafetyTimer) {
        clearTimeout(endSafetyTimer);
        endSafetyTimer = null;
      }
      r();
    }
  }
}
