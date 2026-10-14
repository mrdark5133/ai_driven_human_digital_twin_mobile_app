# Task Checklist: Fix 2 Bugs & Add Scheduled In-App Calls (AURA)

## Part A: Fix Speech Recognition (JS only)
- [x] Inspect & verify `expo-speech-recognition` APIs for `getSupportedLocales` and `androidTriggerOfflineModelDownload`
- [x] Update `src/services/voice/asr.ts`:
  - [x] Default locale = "en-IN", retain "ta-IN" toggle
  - [x] Add `checkOfflineLocaleInstalled(locale)` using `getSupportedLocales`
  - [x] Set `requiresOnDeviceRecognition` ONLY if the locale is installed offline, else false (online recognition)
  - [x] Export `triggerOfflineModelDownload(locale)` wrapping `androidTriggerOfflineModelDownload`
  - [x] Fix retry loop: silently restart on "no-speech" / "speech-timeout" without incrementing error count. On real errors, retry max 3 times with backoff (500ms, 1s, 2s), then report friendly error
- [x] Update `app/call.tsx`:
  - [x] Small "Download offline speech pack" button shown only when offline pack for active locale is missing
  - [x] Clear label for locale switcher ("en-IN (Tanglish)" vs "ta-IN (Tamil)")
  - [x] Ensure debug telemetry (1st token, 1st spoken, tokens/sec) updates after each turn
- [x] Verify Part A type safety (`npx tsc --noEmit` passed with 0 errors)

## Part B: On-Device LLM for Assistant Text Chat (JS only)
- [x] Update `src/services/voice/llm.ts`:
  - [x] Implement robust Singleton lock (`acquireLlmLock`) for LlamaContext so it never initializes twice or runs concurrent generations
  - [x] Export helper for streaming text chat with custom system prompts & generation params
- [x] Update `app/(tabs)/assistant.tsx`:
  - [x] Replace hardcoded reply with on-device LLM stream from `src/services/voice/llm.ts`
  - [x] Build 3-4 line vitals "context card" from `DataService.getVitals()` (HR, sleep, steps, stress) in the system prompt
  - [x] Chat system prompt: friendly, 2-3 short sentences, match user's Tanglish or English style, no diagnosis / medical advice
  - [x] Show typing indicator, stream tokens into bubble
  - [x] Handle errors: model not downloaded -> show card with download button; generation failed -> friendly retry
  - [x] Route suggested-question chips through the LLM path
  - [x] Keep "Demo data" pill/behavior intact
- [x] Verify Part B type safety (`npx tsc --noEmit` passed with 0 errors)

## Part C: Scheduled In-App Calls & Call History
- [x] C0: Verify `@notifee/react-native` vs `expo-notifications` compatibility on Expo SDK 57 / RN 0.86 New Architecture:
  - `@notifee/react-native` is archived by Invertase, fails Gradle compilation on RN 0.86 (`app.notifee:core:+`), and lacks New Architecture support.
  - Safely fallen back to SDK-compatible `expo-notifications`.
  - Lazy loading implemented inside try/catch behind `isNotificationAvailable()` flag to ensure current APK without native module never crashes on import. Shows "Update the app build to enable scheduled calls" notice.
- [x] C1: Create `src/config/callSchedule.ts` with MORNING (08:45) and EVENING (21:00) slots
- [x] C2: Create `src/services/callScheduler.ts` with notification channels, permissions, daily triggers, handlers, and `testCallIn(seconds)`
- [x] C3: Create `app/incoming-call.tsx` (WhatsApp/Telegram style incoming call screen with pulsing orb, vibration, Answer/Decline, 45s timeout)
- [x] C4: Update `app/call.tsx` and `src/services/voice/callAgent.ts` for scheduled call flow:
  - [x] Instant Tanglish opener spoken first
  - [x] Morning vs Evening goal in system prompt
  - [x] Automatic end after MAX_TURNS = 6 with warm goodbye
  - [x] Turn recording and history saving
- [x] C5: Create `src/services/callHistory.ts` with AsyncStorage persistence and `reconcile()` on start/resume
- [x] C6: Create `app/call-history.tsx` and add History icon button to `app/(tabs)/assistant.tsx`
- [x] Android config / plugins / permissions (`app.json` and `plugins/withAuraCallConfig.js` for `showWhenLocked` + `turnScreenOn`)
- [x] Verification: `npx tsc --noEmit` (0 errors) and `npx expo-doctor` (21/21 passed)
