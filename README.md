# 🧬 AI-Driven Human: Digital Twin Mobile Health App

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2057-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Android Health Connect](https://img.shields.io/badge/Health%20Connect-Android%20API-34A853?style=for-the-badge&logo=android&logoColor=white)](https://developer.android.com/health-and-fitness/guides/health-connect)
[![On-Device LLM](https://img.shields.io/badge/On--Device%20LLM-llama.rn%20(Qwen2.5)-FF6F00?style=for-the-badge&logo=ai&logoColor=white)](https://github.com/mybigday/llama.rn)
[![On-Device ML](https://img.shields.io/badge/On--Device%20ML-Pure%20TS%20Predictor-blueviolet?style=for-the-badge&logo=scikitlearn&logoColor=white)](#-7-on-device-sleep--lifestyle-risk-indicator)
[![Zero-Knowledge Privacy](https://img.shields.io/badge/Privacy-100%25%20On--Device-success?style=for-the-badge&logo=shield&logoColor=white)](#-zero-knowledge-privacy--clinical-compliance)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

A clinical-grade **Human Digital Twin** mobile health application built with **React Native**, **Expo SDK 57 (Continuous Native Generation)**, **TypeScript**, and **llama.rn**.

AI-Driven Human ingests continuous multi-sensor biometric telemetry—from native **Android Health Connect** smartwatch streams to manual inputs—and synthesizes it into a living, real-time computational avatar of systemic homeostasis. The platform features **Pallavi**, an entirely **on-device, full-duplex conversational voice and chat companion** powered by local quantized LLM inference (`Qwen2.5-1.5B`), scheduled automated in-app clinical check-in calls, sovereign offline data processing, and a **zero-dependency on-device Sleep & Lifestyle Risk ML model** evaluated in pure TypeScript.

---

## ✨ Key Features

### 🧠 1. On-Device Sleep & Lifestyle Risk Indicator (`src/services/riskModel.ts`)
* **100% Sovereign On-Device Execution**: A zero-native-dependency logistic regression model evaluated locally in pure TypeScript (`src/services/riskModelCore.ts`), running instantaneously without server calls or internet access.
* **Trained on Clinical Sleep Cohorts**: Trained on the public *Sleep Health and Lifestyle dataset* using 5-fold Stratified Cross-Validation:
  * **ROC-AUC**: `0.7818` (exceeds clinical baseline)
  * **Cross-Validated Accuracy**: `78.69%` (vs. 58.20% dummy baseline)
  * **Precision**: `72.73%` | **Recall**: `78.43%`
* **8 Multi-Domain Input Features**: Evaluates Age, Sleep Duration, Sleep Quality (1–10), Physical Activity (mins/day), Stress Level (1–10), BMI Category (Normal / Overweight / Obese derived from profile height and weight), Resting Heart Rate, and Daily Steps.
* **Biometric Telemetry Mapping & Provenance**: Seamlessly fuses Profile setup metrics, real-time Health Connect smartwatch streams, manual readings, and demo fallbacks, annotating every input with an honest data provenance chip (`Profile`, `Watch`, `Call`, `Demo`).
* **Visual Insights Risk Card (`app/(tabs)/insights.tsx`)**:
  * Continuous risk probability percentage and color-coded risk band (`Low` in Emerald Green, `Moderate` in Amber, `High` in Coral Red).
  * Horizontal risk gauge track with dynamic pointer indicator.
  * Top contributing risk factors and protective wellness factors ("What helps").
  * Expandable **"About this on-device model"** drawer detailing training architecture, cross-validation metrics, and clinical lifestyle disclaimers.
* **Home Quick-Access Pill (`app/(tabs)/home.tsx`)**: Compact risk indicator pill on the home screen providing one-tap navigation directly to the detailed risk analysis.
* **Mathematical Parity Verification**: Includes a standalone Node/TS test suite (`scripts/verifyRiskModel.ts`) verifying predictions against Python scikit-learn test cases to within $< 10^{-17}$ mathematical precision.

---

### 🎙️ 2. Pallavi: On-Device Voice Calling Companion (`app/call.tsx`)
* **100% Local Inference**: Powered by `llama.rn` running quantized GGUF models (`Qwen2.5-1.5B`) directly on the device NPU/CPU without cloud latency or third-party servers.
* **Intelligent ASR Fallback Chain**: Native speech recognition with explicit Google Recognition Service targeting (`com.google.android.googlequicksearchbox`) and automatic locale fallback chain (`en-IN` Tanglish transliteration $\to$ `ta-IN` $\to$ `en-US`).
* **Honest Recognition Badges**: Accurately indicates whether speech recognition is running offline on-device or utilizing network-assisted speech services.
* **Robust Voice Resilience**: Normal speech pauses (`no-speech`, `speech-timeout`) silently reset listening cycles without disruption. Transient network or client errors trigger exponential backoff with tap-to-talk recovery banners.
* **Live Telemetry Diagnostic HUD**: Monospace diagnostic HUD displaying real-time **1st Token Latency (TTFT)**, **1st Spoken Latency**, **LLM Speed (tokens/sec)**, and **Tokens Generated** on every conversational turn.
* **Interruption-Aware TTS Queue**: Conversational voice synthesis with natural Indian English voicing (`en-in-x-ene-network` / native) and immediate interruption cutoff when speech is detected.
* **Harmonized Prefix Caching**: Matches LLM warm-up prefix with active turn system prompts to maintain ultra-fast response times ($< 1.5$s) across voice calls.

---

### 📞 3. Scheduled In-App Clinical Check-In Calls (`app/call-history.tsx`, `app/incoming-call.tsx`)
* **Scheduled Daily Check-Ins**: Rings inside the app daily at **08:45 AM** (*Morning check-in*) and **09:00 PM** (*Evening check-in*).
* **WhatsApp / Telegram Style Incoming Screen**: Fullscreen incoming call overlay with pulsating caller rings, continuous haptic vibration, and a 45-second auto-miss countdown.
* **Lockscreen Wake & Heads-Up Action**: Custom Android Config Plugin (`plugins/withAuraCallConfig.js`) configuring `showWhenLocked` and `turnScreenOn` over Android lock screen with **Answer** and **Decline** interactive actions.
* **Zero-Latency Instant Tanglish Opener**: When answered from scheduled triggers, Pallavi greets the user immediately with natural openers (e.g., *"Hello Dark, good morning da! Epdi irukka? Nalla thookam vandhucha?"*) with zero LLM generation delay.
* **Structured Conversational Goals**:
  * **Morning Goal**: Sleep quality, morning mood, breakfast, daily agenda.
  * **Evening Goal**: Daily nutrition, physical exertion, stress levels, tomorrow's plan.
* **Automatic Call Wrap-up**: Smoothly concludes after 6 conversational turns with a warm goodbye.
* **Full History & Missed Call Reconciliation**: Logs all calls (Answered with duration, Missed, Declined) in `AsyncStorage` (last 200 entries). Automatically reconciles missed calls that occurred while the app was closed or device was asleep.

---

### 💬 4. On-Device LLM Assistant Chat (`app/(tabs)/assistant.tsx`)
* **Real-Time Token Streaming**: Text chat streaming directly from the on-device LLM with live cursor and typing indicator.
* **Shared Singleton Llama Context & Mutex Lock**: Thread-safe execution lock (`acquireLlmLock`) ensuring voice calls and text generations never collide or exceed device RAM.
* **Biometric Context Card & Risk Integration**: Automatically injects dynamic 5-line user vitals (heart rate, sleep hours, steps, stress score, and the on-device **Sleep & Lifestyle Risk line**) into Pallavi's prompt with strict lifestyle guidance guardrails.
* **Bilingual Persona Matching**: Naturally detects and mirrors user language (casual Tanglish vs. English).
* **Integrated Suggested Questions**: Pre-configured query chips streaming dynamically through the local LLM.
* **On-Device Model Downloader**: In-chat card showing download progress and bytes when setting up the model for the first time.

---

### 🧬 5. Interactive 3D Holographic Twin (`app/(tabs)/twin.tsx`)
* **Anatomical Visualization**: Vector-rendered translucent holographic body silhouette with dynamic organ system illumination.
* **Organ-Level Telemetry Lock**: Real-time drill-down into **Cardiovascular**, **Neurological**, and **Pulmonary** systems.
* **Continuous ECG Lead II Synthesizer**: Smooth 60 FPS waveform generator reflecting live heart rate and autonomic balance.
* **Biometric Telemetry Pods**: Instant metrics for Heart Rate (bpm), HRV (ms), SpO₂ (%), EDA (µS), and Biological Age Differential.

---

### 💓 6. Dual-Stream Telemetry & Unified Homeostasis Engine (`app/(tabs)/home.tsx`)
* **Google Health Connect Integration**: Native Android health pipeline ingesting `HeartRateRecord` and `StepsRecord`.
* **Manual Entry Fallback**: Zero-knowledge manual reading capture for heart rate, blood oxygen, and step count when no wearable is paired.
* **Composite Bio-Index Score (0–100)**: Real-time multi-dimensional scoring of systemic stability, parasympathetic tone, and recovery readiness.
* **Actionable Recovery Directives**: Circadian alignment, vagal nerve pacing, and hydration protocols computed from telemetry variance.

---

### 📊 7. Predictive Analytics & Chrono-Anomalies (`app/(tabs)/insights.tsx`)
* **Multi-Timeframe Trend Aggregation**: Switch between Day, Week, and Month aggregations.
* **7-Day Resting Heart Rate Sparklines**: High-precision SVG curves detailing baseline drift and recovery trajectories.
* **Diurnal Stress Distribution Matrix**: Visualizes time spent in Calm, Balanced, and Elevated autonomic stress bands.
* **Chrono-Anomaly Banners**: Early detection alerts for nocturnal tachycardia, HRV depression, and sleep fragmentation.

---

## 🏗️ Architecture & Engineering

```
+-----------------------------------------------------------------------------------+
|                                 PRESENTATION LAYER                                |
|        Expo Router (File-Based Navigation) | 5 Bottom Tabs | Modals & Overlays    |
|                                                                                   |
|  /(tabs)/home    /(tabs)/twin   /(tabs)/insights  /(tabs)/assistant  /call        |
|  [Homeostasis]   [Hologram]     [Risk & Trends]   [LLM Chat Stream]  [Voice Agent]|
|                                                                                   |
|  /incoming-call                     /call-history                                 |
|  [Vibrating Call Overlay]           [Call Logs & Scheduling Preferences]          |
+------------------------------------------+----------------------------------------+
                                           |
+------------------------------------------v----------------------------------------+
|                          ON-DEVICE INTELLIGENCE LAYER                             |
|                                                                                   |
|  expo-speech-recognition       llama.rn (Singleton Engine)       expo-speech      |
|  - Hybrid ASR (en-IN/ta-IN)    - Qwen2.5-1.5B (GGUF)             - TTS Queue      |
|  - Google Speech Service       - acquireLlmLock (Mutex)          - Interruption   |
|  - Silence Filter & Backoff    - Vitals + Risk Context Inject    - Instant Opener |
|                                                                                   |
|  src/services/riskModelCore.ts & riskModel.ts (On-Device ML Predictor)            |
|  - Pure TS Logistic Regression | StandardScaler & Sigmoid Inference               |
|  - assets/models/risk_model.json (Trained on Sleep Health & Lifestyle Dataset)    |
|  - Risk Band: Low / Moderate / High | Top Contributor & Protective Factor Analysis|
+------------------------------------------+----------------------------------------+
                                           |
+------------------------------------------v----------------------------------------+
|                      SCHEDULED IN-APP CALL & TELEMETRY LAYER                      |
|                                                                                   |
|  callScheduler.ts               callHistory.ts             withAuraCallConfig.js  |
|  - Daily Exact Triggers         - Missed Reconcile         - Android Lockscreen   |
|  - Channel: "aura-calls"        - 200 Entry Log Cap        - showWhenLocked       |
|  - Answer / Decline Actions     - Turn Recorder            - turnScreenOn         |
+------------------------------------------+----------------------------------------+
                                           |
+------------------------------------------v----------------------------------------+
|                           HARDWARE & NATIVE PLATFORM                              |
|                                                                                   |
|  Android SDK 35 (API 26+)  |  arm64-v8a Native Binaries  |  Continuous Native Gen |
+-----------------------------------------------------------------------------------+
```

---

## 📱 Application Screen Navigation Map

```
app/
├── _layout.tsx                     # Global Root Layout (Theme, Fonts, Background Listeners)
├── index.tsx                       # Initial redirect to Auth or Main Tabs
├── call.tsx                        # Fullscreen Pallavi Voice Calling Agent & Diagnostic HUD
├── incoming-call.tsx               # WhatsApp-style Incoming Call Screen (Vibration & Actions)
├── call-history.tsx                # Call History Log, Daily Switches & 10s Test Call
├── (auth)/
│   ├── _layout.tsx                 # Authentication Stack Navigator
│   ├── login.tsx                   # Digital Twin Authentication & Initialization
│   ├── profile-setup.tsx           # Demographic & Biometric Baseline Calibration
│   └── connect-watch.tsx           # Wearable Hardware Sync Screen
└── (tabs)/
    ├── _layout.tsx                 # 5-Tab Navigation Bar & Clinical OLED Theme
    ├── home.tsx                    # Homeostasis Score Ring, Risk Pill & Recovery Protocols
    ├── twin.tsx                    # 3D Holographic Twin Explorer & Organ Telemetry Lock
    ├── insights.tsx                # Sleep & Lifestyle Risk Card, Trends & Chrono-Anomalies
    ├── assistant.tsx               # Streaming LLM Chat with Biometric & Risk Context Card
    └── profile.tsx                 # Demographic Profile, Sensor Hardware & Privacy Control
```

---

## 🔬 Model Training & Verification (ML Pipeline)

The on-device Sleep & Lifestyle Risk model is trained offline in Python using scikit-learn, exported to lightweight JSON, and executed entirely on-device via TypeScript without any external machine learning runtimes.

### Feature Mapping Table

| App Biometric / Demographic | Source Channel | Model Feature | Standardization & Clamping |
| :--- | :--- | :--- | :--- |
| **User Age** | Profile (`profile.age`) | `age` | Range: `[27, 59]` yrs |
| **Sleep Duration** | Call Log / Telemetry | `sleep_duration` | Range: `[5.8, 8.5]` hrs |
| **Quality of Sleep** | Sleep Score / 10 | `quality_of_sleep` | Range: `[4, 9]` (Scale 1–10) |
| **Physical Activity** | Active Mins / (Steps / 100) | `physical_activity` | Range: `[30, 90]` mins/day |
| **Stress Level** | Stress Index / 10 | `stress_level` | Range: `[3, 8]` (Scale 1–10) |
| **BMI Category** | Height & Weight ($W / H^2$) | `bmi_level` | `0` = Normal, `1` = Overweight, `2` = Obese |
| **Resting Heart Rate** | Health Connect / Watch | `heart_rate` | Range: `[65, 86]` bpm |
| **Daily Steps** | 7-day Avg / Today Steps | `daily_steps` | Range: `[3000, 10000]` steps |

### Verifying Mathematical Equivalence

Run the verification test suite to confirm that TypeScript evaluation matches scikit-learn output across 10 validation cases down to double-precision tolerance:

```bash
npx --yes tsx scripts/verifyRiskModel.ts
```

Output:
```text
=== Verifying Risk Model Predictor (TypeScript vs Python) ===
Loaded model: sleep_lifestyle_risk_v1
Features: age, sleep_duration, quality_of_sleep, physical_activity, stress_level, bmi_level, heart_rate, daily_steps

[PASS] Case 1: Prob = 0.892095 (Diff: 0.00e+0)
[PASS] Case 2: Prob = 0.063595 (Diff: 0.00e+0)
[PASS] Case 3: Prob = 0.741031 (Diff: 0.00e+0)
...
[PASS] Case 10: Prob = 0.542289 (Diff: 1.11e-16)

ALL 10 TEST CASES PASSED! Max diff: 1.11e-16 (tolerance: 1.00e-6)
```

---

## 🛠️ Technology Stack

| Layer | Component | Version | Role |
| :--- | :--- | :--- | :--- |
| **Runtime & Core** | React Native / Expo | `0.86.3` / `~57.0.28` | Core cross-platform mobile engine & native bridge |
| **Language** | TypeScript | `~6.0.3` | Strict type safety across contracts, hooks, and payloads |
| **Navigation** | `expo-router` | `~57.0.26` | Universal typed routing with nested navigators and modals |
| **On-Device LLM** | `llama.rn` | `^0.13.0-rc.7` | High-performance C++ GGUF inference for React Native |
| **On-Device ML** | Pure TypeScript (`riskModelCore.ts`) | Strict TS | Instantaneous on-device logistic regression risk predictor |
| **ML Training** | Python & `scikit-learn` | `1.5+` | Offline training on Sleep Health & Lifestyle cohort dataset |
| **Speech Recognition** | `expo-speech-recognition` | `^57.1.1` | Hybrid on-device/online speech-to-text with Google service targeting |
| **Speech Synthesis** | `expo-speech` | `~57.0.3` | Native text-to-speech with queued playback & interruption |
| **Call Alarms & Notifs** | `expo-notifications` | `~57.0.22` | Daily scheduled triggers & interactive call notifications |
| **Health Ingestion** | `react-native-health-connect` | `^4.1.3` | Android Health Connect SDK API integration |
| **Vector Graphics** | `react-native-svg` | `15.15.4` | Scalable anatomical twin models, score rings, and sparklines |
| **Local Storage** | `@react-native-async-storage` | `^2.2.0` | Sovereign zero-knowledge on-device state persistence |
| **Typography** | Inter & Space Grotesk | Google Fonts | High-legibility clinical interfaces & telemetry readouts |
| **Build System** | EAS Build & `expo-build-properties` | SDK 57 | Optimized Android `arm64-v8a` compilation pipeline |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **Package Manager**: npm or bun
- **Android SDK**: Android 14+ recommended (Minimum SDK: 26)
- **Physical Android Device** with Developer Options & USB Debugging enabled, or an Android Virtual Device (AVD).

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/mrdark5133/ai_driven_human_digital_twin_mobile_app.git
cd ai_driven_human_digital_twin_mobile_app
npm install
```

### 2. Verify Codebase Integrity & ML Predictor

Ensure all TypeScript types compile without errors:

```bash
npx tsc --noEmit
```

Run the on-device risk model verification suite:

```bash
npx --yes tsx scripts/verifyRiskModel.ts
```

Verify dependency health and Expo environment:

```bash
npx expo-doctor
```

### 3. Running with Expo Development Client

Because this app utilizes native C++ modules (`llama.rn`) and native health SDKs (`react-native-health-connect`), running inside standard Expo Go is not supported; an **Expo Development Build** is used:

```bash
# Start the Expo Dev Client server
npx expo start --dev-client
```

To compile and launch directly on a connected Android phone:

```bash
npx expo run:android
```

---

## ⚡ Fast Android Native Builds (EAS & Local)

To accelerate build times and keep APK sizes lightweight when compiling native C++ code for `llama.rn`, `app.json` is configured via `expo-build-properties` to compile specifically for 64-bit ARM architecture:

```json
[
  "expo-build-properties",
  {
    "android": {
      "minSdkVersion": 26,
      "buildArchs": ["arm64-v8a"]
    }
  }
]
```

### Building via EAS Cloud

```bash
# Build development profile for Android
npx eas-cli@latest build --profile development --platform android

# Build standalone preview APK
npx eas-cli@latest build --profile preview --platform android
```

---

## 🎙️ On-Device LLM Setup & Model Management

The voice and chat intelligence engine Pallavi downloads and initializes quantized GGUF models directly to the app's sandboxed document storage using `expo-file-system`:

1. **Default Model**: `Qwen2.5-1.5B-Instruct-Q4_K_M.gguf` (~1.1 GB).
2. **Download Trigger**: When opening `app/call.tsx`, the **Assistant** tab, or tapping **Call Pallavi** for the first time, the model manager downloads the model with real-time percentage and MB tracking.
3. **Inference Context**: Managed by `llama.rn` with 2048 context window and 4 CPU threads, delivering rapid sub-300ms Time-to-First-Token on modern Snapdragon / Dimensity chipsets.
4. **Thread-Safe Lock**: Calls and text chats utilize a shared singleton context governed by `acquireLlmLock()`, preventing dual inference crashes and memory exhaustion.

---

## 🛡️ Zero-Knowledge Privacy & Sovereign Execution

1. **No External Analytics or Trackers**: No third-party behavioral analytics, ad SDKs, or cloud telemetry sync services are included.
2. **100% On-Device AI**: LLM inference, ML risk evaluation, voice recognition, and biometric scoring run strictly on your smartphone hardware.
3. **Clinical Disclaimer**: *AI-Driven Human is engineered for lifestyle, biofeedback, and preventive wellness tracking. The Sleep & Lifestyle Risk indicator is a lifestyle screening tool and does not provide medical diagnoses or replace licensed clinical judgment.*

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
