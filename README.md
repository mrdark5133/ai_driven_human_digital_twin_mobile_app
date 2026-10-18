#  AI-Driven Human: Digital Twin Mobile Health App

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2057-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Android Health Connect](https://img.shields.io/badge/Health%20Connect-Android%20API-34A853?style=for-the-badge&logo=android&logoColor=white)](https://developer.android.com/health-and-fitness/guides/health-connect)
[![On-Device LLM](https://img.shields.io/badge/On--Device%20LLM-llama.rn%20(Qwen2.5)-FF6F00?style=for-the-badge&logo=ai&logoColor=white)](https://github.com/mybigday/llama.rn)
[![Zero-Knowledge Privacy](https://img.shields.io/badge/Privacy-100%25%20On--Device-success?style=for-the-badge&logo=shield&logoColor=white)](#-zero-knowledge-privacy--clinical-compliance)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

A clinical-grade **Human Digital Twin** mobile health application built with **React Native**, **Expo SDK 57 (Continuous Native Generation)**, **TypeScript**, and **llama.rn**.

AI-Driven Human ingests continuous multi-sensor biometric telemetry—from native **Android Health Connect** smartwatch streams to manual inputs—and synthesizes it into a living, real-time computational avatar of systemic homeostasis. The platform features **AURA**, an entirely **on-device, full-duplex conversational voice and chat companion** powered by local quantized LLM inference (`Qwen2.5-1.5B`), scheduled automated in-app clinical check-in calls, and sovereign offline data processing.

---

## ✨ Key Features

### 🎙️ 1. AURA: On-Device Voice Calling Agent (`app/call.tsx`)
* **100% Local Inference**: Powered by `llama.rn` running quantized GGUF models (`Qwen2.5-1.5B`) directly on the device NPU/CPU without cloud servers or latency.
* **Smart Hybrid Speech-to-Text (ASR)**: Native recognition with default `en-IN` (Tanglish transliteration) and `ta-IN` toggle. Dynamically inspects installed offline packs (`getSupportedLocales`) and only enforces `requiresOnDeviceRecognition` when downloaded, falling back seamlessly to online ASR.
* **Offline Speech Pack Manager**: One-tap in-call trigger (`androidTriggerOfflineModelDownload`) to install offline voice packs directly on Android.
* **Resilient Silence & Error Recovery**: Normal pauses (`no-speech`, `speech-timeout`) silently reset listening cycles; transient errors feature exponential backoff (500ms, 1s, 2s) with user-friendly error banners.
* **Live Telemetry Diagnostic HUD**: Monospace diagnostic HUD displaying real-time **1st Token Latency (TTFT)**, **1st Spoken Latency**, **LLM Speed (tokens/sec)**, and **Tokens Generated** on every turn.
* **Full-Duplex Speech Queue (TTS)**: Conversational voice response with interruption detection—speaking halts immediately when user voice is detected.

---

### 📞 2. Scheduled In-App Clinical Calls & History (`app/call-history.tsx`, `app/incoming-call.tsx`)
* **Scheduled Daily Check-Ins**: Rings inside the app daily at **08:45 AM** (*Morning check-in*) and **09:00 PM** (*Evening check-in*).
* **WhatsApp / Telegram Style Incoming Screen**: Fullscreen incoming call overlay with pulsating caller rings, continuous haptic vibration, and a 45-second auto-miss countdown.
* **Lockscreen Wake & Heads-Up Action**: Custom Android Config Plugin (`plugins/withAuraCallConfig.js`) configuring `showWhenLocked` and `turnScreenOn` over Android lock screen with **Answer** and **Decline** interactive actions.
* **Zero-Latency Instant Tanglish Opener**: When answered from scheduled triggers, AURA greets the user immediately with natural openers (e.g., *"Hello Dark, good morning da! Epdi irukka? Nalla thookam vandhucha?"*) with zero LLM generation delay.
* **Structured Conversational Goals**:
  * **Morning Goal**: Sleep quality, morning mood, breakfast, daily agenda.
  * **Evening Goal**: Daily nutrition, physical exertion, stress levels, tomorrow's plan.
* **Automatic Call Wrap-up**: Smoothly concludes after 6 conversational turns with a warm goodbye.
* **Full History & Missed Call Reconciliation**: Logs all calls (Answered with duration, Missed, Declined) in `AsyncStorage` (last 200 entries). Automatically reconciles missed calls that occurred while the app was closed or device was asleep.

---

### 💬 3. On-Device LLM Assistant Chat (`/(tabs)/assistant`)
* **Real-Time Token Streaming**: Text chat streaming directly from the on-device LLM with live cursor and typing indicator.
* **Shared Singleton Llama Context & Mutex Lock**: Thread-safe execution lock (`acquireLlmLock`) ensuring voice calls and text generations never collide or exceed device RAM.
* **Biometric Context Card**: Injects dynamic 4-line user vitals (heart rate, sleep hours, steps, stress score) into the system prompt with strict clinical anti-hallucination guardrails.
* **Bilingual Persona Matching**: Naturally detects and mirrors user language (casual Tanglish vs. English).
* **Integrated Suggested Questions**: Pre-configured query chips streaming dynamically through the local LLM.
* **On-Device Model Downloader**: In-chat card showing download progress and bytes when setting up the model for the first time.

---

### 🧬 4. Interactive 3D Holographic Twin (`/(tabs)/twin`)
* **Anatomical Visualization**: Vector-rendered translucent holographic body silhouette with dynamic organ system illumination.
* **Organ-Level Telemetry Lock**: Real-time drill-down into **Cardiovascular**, **Neurological**, and **Pulmonary** systems.
* **Continuous ECG Lead II Synthesizer**: Smooth 60 FPS waveform generator reflecting live heart rate and autonomic balance.
* **Biometric Telemetry Pods**: Instant metrics for Heart Rate (bpm), HRV (ms), SpO₂ (%), EDA (µS), and Biological Age Differential.

---

### 💓 5. Dual-Stream Telemetry & Unified Homeostasis Engine (`/(tabs)/home`)
* **Google Health Connect Integration**: Native Android health pipeline ingesting `HeartRateRecord` and `StepsRecord`.
* **Manual Entry Fallback**: Zero-knowledge manual reading capture for heart rate, blood oxygen, and step count when no wearable is paired.
* **Composite Bio-Index Score (0–100)**: Real-time multi-dimensional scoring of systemic stability, parasympathetic tone, and recovery readiness.
* **Actionable Recovery Directives**: Circadian alignment, vagal nerve pacing, and hydration protocols computed from telemetry variance.

---

### 📊 6. Predictive Analytics & Chrono-Anomalies (`/(tabs)/insights`)
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
|  [Homeostasis]   [Hologram]     [Stress Trends]   [LLM Chat Stream]  [Voice AURA] |
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
|  - Offline Model Download      - acquireLlmLock (Mutex)          - Interruption   |
|  - Silence Filter & Backoff    - Vitals Context Injection        - Instant Opener |
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
├── call.tsx                        # Fullscreen AURA Voice Calling Agent & Diagnostic HUD
├── incoming-call.tsx               # WhatsApp-style Incoming Call Screen (Vibration & Actions)
├── call-history.tsx                # Call History Log, Daily Switches & 10s Test Call
├── (auth)/
│   ├── _layout.tsx                 # Authentication Stack Navigator
│   ├── login.tsx                   # Digital Twin Authentication & Initialization
│   ├── profile-setup.tsx           # Demographic & Biometric Baseline Calibration
│   └── connect-watch.tsx           # Wearable Hardware Sync Screen
└── (tabs)/
    ├── _layout.tsx                 # 5-Tab Navigation Bar & Clinical OLED Theme
    ├── home.tsx                    # Homeostasis Score Ring, Vitals Grid & Recovery Protocols
    ├── twin.tsx                    # 3D Holographic Twin Explorer & Organ Telemetry Lock
    ├── insights.tsx                # Multi-Timeframe Trends, Stress Matrix & Chrono-Anomalies
    ├── assistant.tsx               # Streaming LLM Chat, Voice Orb & Call / History Entry
    └── profile.tsx                 # Longevity Differential, Sensor Hardware & Privacy Control
```

---

## 🛠️ Technology Stack

| Layer | Component | Version | Role |
| :--- | :--- | :--- | :--- |
| **Runtime & Core** | React Native / Expo | `0.86.3` / `~57.0.28` | Core cross-platform mobile engine & native bridge |
| **Language** | TypeScript | `~6.0.3` | Strict type safety across contracts, hooks, and payloads |
| **Navigation** | `expo-router` | `~57.0.26` | Universal typed routing with nested navigators and modals |
| **On-Device LLM** | `llama.rn` | `^0.13.0-rc.7` | High-performance C++ GGUF inference for React Native |
| **Speech Recognition** | `expo-speech-recognition` | `^57.1.1` | Hybrid on-device/online speech-to-text with model download |
| **Speech Synthesis** | `expo-speech` | `~57.0.3` | Native text-to-speech with queued playback |
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

### 2. Verify Codebase Integrity

Ensure all TypeScript types compile without errors:

```bash
npx tsc --noEmit
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

The voice and chat intelligence engine AURA downloads and initializes quantized GGUF models directly to the app's sandboxed document storage using `expo-file-system`:

1. **Default Model**: `Qwen2.5-1.5B-Instruct-Q4_K_M.gguf` (~1.1 GB).
2. **Download Trigger**: When opening `app/call.tsx`, the **Assistant** tab, or tapping **Call AURA** for the first time, the model manager downloads the model with real-time percentage and MB tracking.
3. **Inference Context**: Managed by `llama.rn` with 2048 context window and 4 CPU threads, delivering rapid sub-300ms Time-to-First-Token on modern Snapdragon / Dimensity chipsets.
4. **Thread-Safe Lock**: Calls and text chats utilize a shared singleton context governed by `acquireLlmLock()`, preventing dual inference crashes and memory exhaustion.

---

## 🛡️ Zero-Knowledge Privacy & Sovereign Execution

1. **No External Analytics or Trackers**: No third-party behavioral analytics, ad SDKs, or cloud telemetry sync services are included.
2. **100% On-Device AI**: LLM inference, voice recognition, and biometric scoring run strictly on your smartphone hardware.
3. **Clinical Disclaimer**: *AI-Driven Human is engineered for lifestyle, biofeedback, and preventive wellness tracking. It does not provide medical diagnoses or replace licensed clinical judgment.*

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
