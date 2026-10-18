import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ExpoSpeechRecognitionModule,
  ExpoSpeechRecognitionResultEvent,
  ExpoSpeechRecognitionErrorEvent,
} from 'expo-speech-recognition';

export type AsrLocale = 'en-IN' | 'ta-IN';

// Default locale for casual Tanglish recognition (switchable to 'ta-IN' for Tamil)
export const DEFAULT_ASR_LOCALE: AsrLocale = 'en-IN';
export const ASR_WORKING_LOCALE_KEY = '@asr_working_locale';
export const GOOGLE_SEARCH_PACKAGE = 'com.google.android.googlequicksearchbox';

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

export interface FallbackStep {
  locale: string;
  useDefaultService: boolean;
  forceOnline: boolean;
}

export type FallbackChainStep = FallbackStep;

// Fallback chain: en-IN online -> en-US online -> en-GB online -> en-IN with default service
const BASE_FALLBACK_CHAIN: FallbackStep[] = [
  { locale: 'en-IN', useDefaultService: false, forceOnline: true },
  { locale: 'en-US', useDefaultService: false, forceOnline: true },
  { locale: 'en-GB', useDefaultService: false, forceOnline: true },
  { locale: 'en-IN', useDefaultService: true, forceOnline: true },
];

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
let networkRetryUsed = false;

// Fallback chain state
let rememberedWorkingLocale: string | null = null;
let currentChainIndex = 0;
let pendingFallbackStep: FallbackStep | null = null;

// Diagnostics tracking for honest badge and debug panel
let currentActiveMode: 'offline' | 'online' = 'online';
let currentActiveLocale: string = DEFAULT_ASR_LOCALE;
let currentActiveService = '';
let isCurrentSessionOnDevice = false;

// Mutex / Synchronization for end event
let endEventResolver: (() => void) | null = null;
let endSafetyTimer: any = null;

// Listening scheduler state (250ms debounce & single flight)
let restartDebounceTimer: any = null;
let isStartingListeningFlight = false;

// Restore remembered working locale on module initialization
AsyncStorage.getItem(ASR_WORKING_LOCALE_KEY)
  .then((saved) => {
    if (saved) {
      rememberedWorkingLocale = saved;
      console.log(`[ASR] Loaded remembered working locale: "${saved}"`);
    }
  })
  .catch(() => {});

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
 * Resets transient error counters and fallback chain to beginning.
 */
export function resetAsrRetries(): void {
  audioCaptureRetryCount = 0;
  networkRetryUsed = false;
}

/**
 * Resets the locale and service fallback chain to start from the beginning.
 */
export function resetFallbackChain(): void {
  currentChainIndex = 0;
  pendingFallbackStep = null;
  audioCaptureRetryCount = 0;
  networkRetryUsed = false;
  console.log('[ASR] Fallback chain reset to beginning (attempt #1)');
}

/**
 * Returns current ASR diagnostics for honest UI badge and debug panel.
 */
export function getAsrDiagnostics(): {
  mode: 'offline' | 'online';
  locale: string;
  servicePackage: string;
  isAllLocal: boolean;
} {
  return {
    mode: currentActiveMode,
    locale: currentActiveLocale,
    servicePackage: currentActiveService,
    isAllLocal: isCurrentSessionOnDevice,
  };
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
export async function checkOfflineLocaleInstalled(locale: string): Promise<boolean> {
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
 * Checks if com.google.android.googlequicksearchbox is installed on device.
 * Verified via ExpoSpeechRecognitionModule.getSpeechRecognitionServices().
 */
export function isGoogleQuickSearchInstalled(): boolean {
  if (Platform.OS !== 'android') return false;

  try {
    const services = ExpoSpeechRecognitionModule.getSpeechRecognitionServices() || [];
    return services.includes(GOOGLE_SEARCH_PACKAGE);
  } catch {
    return false;
  }
}

/**
 * Inspects default voice recognition service and queries all available services.
 */
export function checkDefaultRecognizer(): {
  isGoogle: boolean;
  packageName: string;
  selectedPackage?: string;
  hasGoogleQuickSearch: boolean;
} {
  if (Platform.OS !== 'android') {
    return {
      isGoogle: true,
      packageName: 'apple-speech',
      selectedPackage: 'apple-speech',
      hasGoogleQuickSearch: false,
    };
  }

  try {
    const service = ExpoSpeechRecognitionModule.getDefaultRecognitionService();
    const defaultPackage = service?.packageName || '';
    const hasGoogleQuickSearch = isGoogleQuickSearchInstalled();

    const selectedPackage = hasGoogleQuickSearch ? GOOGLE_SEARCH_PACKAGE : defaultPackage;
    const isGoogle = (selectedPackage || defaultPackage).toLowerCase().includes('google');

    return {
      isGoogle,
      packageName: defaultPackage,
      selectedPackage: hasGoogleQuickSearch ? GOOGLE_SEARCH_PACKAGE : undefined,
      hasGoogleQuickSearch,
    };
  } catch (err) {
    console.warn('[ASR] Recognizer check error:', err);
    return { isGoogle: true, packageName: '', selectedPackage: undefined, hasGoogleQuickSearch: false };
  }
}

/**
 * Triggers offline speech recognition model download for Android (API 13+).
 */
export async function triggerOfflineModelDownload(locale: string): Promise<{
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
 * Builds the fallback chain, placing the remembered working locale first if available.
 */
function buildFallbackChain(): FallbackStep[] {
  if (!rememberedWorkingLocale || rememberedWorkingLocale === 'en-IN') {
    return BASE_FALLBACK_CHAIN;
  }

  const preferredStep: FallbackStep = {
    locale: rememberedWorkingLocale,
    useDefaultService: false,
    forceOnline: true,
  };

  const remaining = BASE_FALLBACK_CHAIN.filter((s) => s.locale !== rememberedWorkingLocale);
  return [preferredStep, ...remaining];
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

export interface RequestListeningOptions {
  forceOnline?: boolean;
  fallbackStep?: FallbackStep;
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
  options?: RequestListeningOptions
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
 * Internal worker executing a speech recognition attempt according to the fallback chain.
 */
async function executeListeningSession(
  reason: string,
  options?: RequestListeningOptions
): Promise<void> {
  // Single-flight guard: prevent overlapping execution
  if (isStartingListeningFlight) {
    console.log(`[ASR] Launch already in flight, skipping overlapping execution for "${reason}"`);
    return;
  }
  isStartingListeningFlight = true;

  try {
    // 1. Wait for any active or stopping session to completely end
    await ensurePreviousSessionFullyEnded();

    // 2. Ensure permissions
    const hasPerm = await requestAsrPermissions();
    if (!hasPerm) {
      console.log('[ASR] ASR error (not-allowed): Microphone or speech recognition permission was denied.');
      sessionState = 'idle';
      callbacks.onError?.('Microphone or speech recognition permission was denied.', 'not-allowed');
      return;
    }

    // 3. Determine current attempt from fallback chain
    const chain = buildFallbackChain();
    let currentStep: FallbackStep;

    if (options?.fallbackStep) {
      currentStep = options.fallbackStep;
    } else {
      if (currentChainIndex >= chain.length) {
        currentChainIndex = 0;
      }
      currentStep = chain[currentChainIndex];
    }

    // Determine recognition service package
    const defaultRec = checkDefaultRecognizer();
    let servicePackage: string | undefined = undefined;

    if (Platform.OS === 'android') {
      if (currentStep.useDefaultService) {
        servicePackage = undefined; // use system default service
      } else if (defaultRec.hasGoogleQuickSearch) {
        servicePackage = GOOGLE_SEARCH_PACKAGE;
      } else {
        servicePackage = undefined;
      }
    }

    // Determine offline vs online
    let useOnDevice = false;
    if (!currentStep.forceOnline && !options?.forceOnline) {
      useOnDevice = await checkOfflineLocaleInstalled(currentStep.locale);
    }

    // Update active diagnostics
    currentActiveMode = useOnDevice ? 'offline' : 'online';
    currentActiveLocale = currentStep.locale;
    currentActiveService = servicePackage || defaultRec.packageName || 'system default';
    isCurrentSessionOnDevice = useOnDevice;

    // 4. Increment session ID & reset state
    currentSessionId++;
    const sid = currentSessionId;
    sessionState = 'starting';
    isManualStop = false;

    cycleMaxVolume = -2;
    lastInterimTranscript = '';
    hasDeliveredFinal = false;
    silenceDetectedInSession = false;
    clearTimeout(interimSilenceDebounceTimer);
    clearSubscriptions();

    const currentAttemptInfo = `locale=${currentStep.locale}, service=${servicePackage || 'default'}`;

    // PART 1.5: Log attempt initiation
    console.log(`[ASR] attempt: ${currentAttemptInfo}, result=in-progress`);
    console.log(`[ASR #${sid}] Service used: ${servicePackage ? `explicit (${servicePackage})` : `default (${defaultRec.packageName})`}`);

    const deliverFinal = (text: string, source: string) => {
      clearTimeout(interimSilenceDebounceTimer);
      if (hasDeliveredFinal) return;
      hasDeliveredFinal = true;
      const trimmed = text.trim();
      lastInterimTranscript = '';
      if (!trimmed) return;

      console.log(`[ASR #${sid}] final result (${source}): "${trimmed}"`);

      // PART 1.2: Remember the locale that works in AsyncStorage and start with it next time
      if (currentStep.locale !== rememberedWorkingLocale) {
        rememberedWorkingLocale = currentStep.locale;
        AsyncStorage.setItem(ASR_WORKING_LOCALE_KEY, currentStep.locale).catch(() => {});
        console.log(`[ASR] Saved working locale to AsyncStorage: "${currentStep.locale}"`);
      }

      // Successful recognition: reset chain index for future turns
      currentChainIndex = 0;
      pendingFallbackStep = null;

      stopListening();
      callbacks.onFinalResult?.(trimmed);
    };

    // 5. Register event listeners tagged with session ID
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

        // Successful recognition heard: log success
        console.log(`[ASR] attempt: ${currentAttemptInfo}, result=success`);

        // Remember working locale on first recognized text
        if (currentStep.locale !== rememberedWorkingLocale) {
          rememberedWorkingLocale = currentStep.locale;
          AsyncStorage.setItem(ASR_WORKING_LOCALE_KEY, currentStep.locale).catch(() => {});
        }

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

        // PART 3: If code stopped or aborted recognizer, error is benign
        if (isManualStop && (errCode === 'client' || errCode === 'aborted')) {
          console.log(`[ASR #${sid}] benign client error after own stop (${errCode})`);
          return;
        }

        // Check for Android language unavailable / not downloaded error
        const isLanguageError =
          errCode === 'language-not-supported' ||
          errMsg.toLowerCase().includes('not yet downloaded') ||
          errMsg.toLowerCase().includes('not supported') ||
          errMsg.toLowerCase().includes('language');

        if (isLanguageError) {
          // PART 1.5: Log attempt failure
          console.log(`[ASR] attempt: ${currentAttemptInfo}, result=language-not-supported`);

          // PART 1.2: Advance to next entry in the fallback chain for the same turn without showing banner
          currentChainIndex++;
          if (currentChainIndex < chain.length) {
            pendingFallbackStep = chain[currentChainIndex];
            console.log(
              `[ASR] Auto-trying next chain entry #${currentChainIndex + 1}: locale=${pendingFallbackStep.locale}, defaultService=${pendingFallbackStep.useDefaultService}`
            );
            return;
          } else {
            // PART 1.3: Every entry in the fallback chain has failed. Now and only now show the banner.
            console.warn(`[ASR] attempt: ${currentAttemptInfo}, result=all_fallback_chain_failed`);
            callbacks.onError?.(
              'Speech recognition needs a language pack. Download English offline in Android settings.',
              'language-pack-missing'
            );
            return;
          }
        }

        // Standard error logging
        console.log(`[ASR] attempt: ${currentAttemptInfo}, result=${errCode} (${errMsg})`);

        if (errCode === 'no-speech' || errCode === 'speech-timeout') {
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
              requestListening('audio-capture retry', undefined, options);
            }, 1000);
            return;
          }
        }

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

      console.log(`[ASR #${sid}] ASR end (cycle max level: ${cycleMaxVolume.toFixed(1)})`);

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

      // If a fallback step was queued due to language error, launch it immediately
      if (pendingFallbackStep) {
        const nextStep = pendingFallbackStep;
        pendingFallbackStep = null;
        console.log(`[ASR] Executing pending fallback step: ${nextStep.locale}`);
        setTimeout(() => {
          requestListening(`fallback: ${nextStep.locale}`, undefined, { fallbackStep: nextStep });
        }, 150);
        return;
      }

      // 1. If the session ended with an interim transcript but no final result, deliver it!
      if (!hasDeliveredFinal && lastInterimTranscript.trim()) {
        deliverFinal(lastInterimTranscript, 'end event fallback');
        return;
      }

      // 2. If silence was detected, notify silence handler
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

    sessionState = 'listening';
    audioCaptureRetryCount = 0;

    const startOptions: any = {
      lang: currentStep.locale,
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

    if (Platform.OS === 'android' && servicePackage) {
      startOptions.androidRecognitionServicePackage = servicePackage;
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
 * Legacy startListening wrapper that directly delegates to requestListening.
 */
export async function startListening(
  customCallbacks?: AsrCallbacks,
  options?: RequestListeningOptions
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
