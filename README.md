# 🫀 AI-Driven Human: Digital Twin Mobile Health App

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2057-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Android Health Connect](https://img.shields.io/badge/Health%20Connect-Android%20API-34A853?style=for-the-badge&logo=android&logoColor=white)](https://developer.android.com/health-and-fitness/guides/health-connect)
[![On-Device LLM](https://img.shields.io/badge/On--Device%20LLM-llama.rn%20(GGUF)-FF6F00?style=for-the-badge&logo=ai&logoColor=white)](https://github.com/mybigday/llama.rn)
[![Zero-Knowledge Privacy](https://img.shields.io/badge/Privacy-100%25%20On--Device-success?style=for-the-badge&logo=shield&logoColor=white)](#-zero-knowledge-privacy--clinical-compliance)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

A clinical-grade **Human Digital Twin** mobile health application built with **React Native**, **Expo SDK 57 (Continuous Native Generation)**, **TypeScript**, and **llama.rn**.

AI-Driven Human ingests continuous multi-sensor biometric telemetry—from native **Android Health Connect** smartwatch streams to manual inputs—and synthesizes it into a living, real-time computational avatar of systemic homeostasis. The app includes **AURA**, an entirely **on-device, full-duplex voice calling agent** powered by local quantized LLM inference, ensuring zero latency, zero cloud dependency, and total sovereign data privacy.

---

## ✨ Key Features

### 🧬 1. Interactive 3D Holographic Twin (`/(tabs)/twin`)
* **Anatomical Visualization**: Vector-rendered translucent holographic body silhouette with dynamic organ system illumination.
* **Organ-Level Telemetry Lock**: Real-time drill-down into **Cardiovascular**, **Neurological**, and **Pulmonary** systems.
* **Continuous ECG Lead II Synthesizer**: Smooth 60 FPS waveform generator reflecting live heart rate and autonomic balance.
* **Biometric Telemetry Pods**: Instant metrics for Heart Rate (bpm), HRV (ms), SpO₂ (%), EDA (µS), and Biological Age Differential.

### 🎙️ 2. AURA: On-Device Voice Calling Agent (`app/call.tsx`)
* **100% Local Inference**: Powered by `llama.rn` running quantized GGUF models (e.g. SmolLM2-360M / Qwen2.5-0.5B) directly on the device NPU/CPU.
* **Real-Time Speech-to-Text (ASR)**: High-speed on-device speech recognition via `expo-speech-recognition` with auto-stop on silence.
* **Full-Duplex Speech Queue (TTS)**: Conversational voice response with interruption detection—speaking halts immediately when you speak.
* **Live Audio Spectrum Visualizer**: Dynamic pulsating waveform orb responding to microphone amplitude and speech synthesis.
* **Real-Time Latency Telemetry Overlay**: Monospace diagnostic HUD displaying ASR time, LLM Time-to-First-Token (TTFT), total generation latency, and TTS response duration.
* **Emergency Escalation Protocol**: Configurable clinical triggers (e.g., severe arrhythmia, dyspnea) prompting immediate physician dispatch (*Dr. Reynolds*).

### 💓 3. Dual-Stream Telemetry & Unified Homeostasis Engine (`/(tabs)/home`)
* **Google Health Connect Integration**: Native Android health pipeline ingesting `HeartRateRecord` and `StepsRecord`.
* **Manual Entry Fallback**: Zero-knowledge manual reading capture for heart rate, blood oxygen, and step count when no wearable is paired.
* **Composite Bio-Index Score (0–100)**: Real-time multi-dimensional scoring of systemic stability, parasympathetic tone, and recovery readiness.
* **Actionable Recovery Directives**: Circadian alignment, vagal nerve pacing, and hydration protocols computed from telemetry variance.

### 📊 4. Predictive Analytics & Chrono-Anomalies (`/(tabs)/insights`)
* **Multi-Timeframe Trend Aggregation**: Switch between Day, Week, and Month aggregations.
* **7-Day Resting Heart Rate Sparklines**: High-precision SVG curves detailing baseline drift and recovery trajectories.
* **Diurnal Stress Distribution Matrix**: Visualizes time spent in Calm, Balanced, and Elevated autonomic stress bands.
* **Chrono-Anomaly Banners**: Early detection alerts for nocturnal tachycardia, HRV depression, and sleep fragmentation.

### 🔒 5. Sovereign Data Privacy (`/(tabs)/profile`)
* **Zero Cloud Dependence**: Telemetry, biometrics, logs, and conversational LLM tokens never leave the physical smartphone.
* **Local Sandboxing**: Persistent data is encrypted and saved strictly in local device sandbox storage (`AsyncStorage`).

---

## 🏗️ Architecture & Engineering

```
+-----------------------------------------------------------------------------------+
|                                 PRESENTATION LAYER                                |
|        Expo Router (File-Based Navigation) | 5 Bottom Tabs | Calling Modal         |
|                                                                                   |
|  /(tabs)/home      /(tabs)/twin     /(tabs)/insights    /(tabs)/assistant  /call  |
|  [Homeostasis]     [3D Silhouette]  [Stress Trends]     [Clinical Chat]    [AURA] |
+------------------------------------------+----------------------------------------+
                                           |
+------------------------------------------v----------------------------------------+
|                          ON-DEVICE VOICE & AI ENGINE                              |
|                                                                                   |
|  expo-speech-recognition       llama.rn (GGUF Engine)            expo-speech      |
|  [On-Device ASR STT]    ───►   [Local Qwen / SmolLM LLM]   ───►  [Speech Queue]   |
|                                [Streaming Inference]             [Auto-Interrupt] |
+------------------------------------------+----------------------------------------+
                                           |
+------------------------------------------v----------------------------------------+
|                            UNIFIED TELEMETRY LAYER                                |
|                                                                                   |
|  services/vitals.ts            services/healthConnect.ts    services/manualReadings|
|  [Reactive Telemetry Bus] ◄──  [Android Health Connect] ◄── [AsyncStorage Local]  |
+------------------------------------------+----------------------------------------+
                                           |
+------------------------------------------v----------------------------------------+
|                           HARDWARE & NATIVE PLATFORM                              |
|                                                                                   |
|  Android SDK 35 (API 26+)  |  arm64-v8a Native Binaries  |  Continuous CNG Prebuild|
+-----------------------------------------------------------------------------------+
```

---

## 📱 Application Screen Navigation Map

```
app/
├── _layout.tsx                     # Global Root Layout (Theme, Fonts, Navigation Stack)
├── index.tsx                       # Initial redirect to Auth or Main Tabs
├── call.tsx                        # Fullscreen AURA Voice Calling Agent & Diagnostic HUD
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
    ├── assistant.tsx               # AURA Assistant Chat, Voice Orb & "Call AURA" Entry
    └── profile.tsx                 # Longevity Differential, Sensor Hardware & Privacy Control
```

---

## 🛠️ Technology Stack

| Layer | Component | Version | Role |
| :--- | :--- | :--- | :--- |
| **Runtime & Core** | React Native / Expo | `0.86.3` / `57.0.26` | Core cross-platform mobile engine & native bridge |
| **Language** | TypeScript | `~6.0.3` | Strict type safety across contracts, hooks, and payloads |
| **Navigation** | `expo-router` | `~57.0.24` | Universal typed routing with nested navigators and modals |
| **Voice AI / LLM** | `llama.rn` | `^0.13.0-rc.7` | High-performance C++ GGUF LLM inference for React Native |
| **Speech Recognition** | `expo-speech-recognition` | `^57.1.1` | Native Android on-device speech-to-text |
| **Speech Synthesis** | `expo-speech` | `~57.0.3` | Native text-to-speech with queued playback |
| **Health Ingestion** | `react-native-health-connect` | `^4.1.3` | Android Health Connect SDK API integration |
| **Vector Graphics** | `react-native-svg` | `15.15.4` | Scalable anatomical twin models, score rings, and sparklines |
| **Local Storage** | `@react-native-async-storage` | `^2.2.0` | Sovereign zero-knowledge on-device state persistence |
| **Typography** | Inter & Space Grotesk | Google Fonts | High-legibility clinical interfaces & telemetry monospace readouts |
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

Verify your Expo project configuration:

```bash
npx expo config --type public
```

### 3. Running with Expo Development Client

Because this app utilizes native C++ modules (`llama.rn`) and native health SDKs (`react-native-health-connect`), running inside standard Expo Go is not supported; an **Expo Development Build** is used:

```bash
# Start the Expo Dev Client server
npx expo start --dev-client
```

To compile and launch directly on a connected Android phone or emulator:

```bash
npx expo run:android
```

---

## ⚡ Fast Android Native Builds (EAS & Local)

To accelerate build times and keep APK sizes lightweight when compiling native C++ code for `llama.rn`, `app.json` is configured via `expo-build-properties` to compile specifically for the modern 64-bit ARM architecture:

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

The voice calling agent AURA downloads and initializes quantized GGUF models directly to the app's sandboxed document storage using `expo-file-system`:

1. **Default Model**: `SmolLM2-360M-Instruct.Q4_K_M.gguf` (~230 MB) or `Qwen2.5-0.5B-Instruct-Q4_K_M.gguf` (~350 MB).
2. **Download Trigger**: When opening `app/call.tsx` or tapping **Call AURA** for the first time, the model manager downloads the model with real-time percentage tracking.
3. **Inference Context**: Managed by `llama.rn` with 2048 context window and 4 threads, delivering rapid sub-300ms Time-to-First-Token on modern Snapdragon / Dimensity chipsets.

---

## 🛡️ Zero-Knowledge Privacy & Clinical Compliance

1. **No External Analytics or Trackers**: No third-party behavioral analytics, ad SDKs, or cloud telemetry sync services are included.
2. **100% On-Device AI**: LLM inference, voice recognition, and biometric scoring run strictly on your smartphone hardware.
3. **Clinical Disclaimer**: *AI-Driven Human is engineered for lifestyle, biofeedback, and preventive wellness tracking. It does not provide medical diagnoses or replace licensed clinical judgment.*

---

## 📂 Project Structure

```
.
├── app/                            # Expo Router screens and layouts
│   ├── (auth)/                     # Auth stack (login, profile-setup, connect-watch)
│   ├── (tabs)/                     # 5 Primary app tabs (home, twin, insights, assistant, profile)
│   ├── call.tsx                    # Fullscreen AURA on-device voice calling agent
│   └── _layout.tsx                 # Root layout and global theme provider
├── components/                     # Reusable clinical UI and SVG components
│   ├── BodyFigure.tsx              # Vector holographic human twin
│   ├── HealthScoreRing.tsx         # SVG composite score ring
│   ├── Sparkline.tsx               # High-frequency telemetry waveform sparklines
│   ├── LineChart.tsx               # Multi-day aggregated trend charts
│   ├── StressBarChart.tsx          # Segmented diurnal stress distribution
│   ├── VitalsCard.tsx              # Reusable telemetry pod
│   ├── AnomalyBanner.tsx           # Warning cards for chrono-anomalies
│   └── InterventionCard.tsx        # Clinical lifestyle directive recommendations
├── services/                       # Data services & telemetry proxies
├── src/
│   └── services/
│       ├── healthConnect.ts        # Android Health Connect client
│       ├── manualReadings.ts       # AsyncStorage manual entry store
│       ├── vitals.ts               # Multi-source telemetry resolver
│       └── voice/                  # AURA Voice AI engine
│           ├── asr.ts              # Speech recognition service
│           ├── callAgent.ts        # Full-duplex conversational state machine
│           ├── llm.ts              # llama.rn GGUF inference client
│           ├── modelManager.ts     # GGUF model download and sandbox cache
│           ├── persona.ts          # Clinical AI persona prompt & emergency triggers
│           └── tts.ts              # Speech synthesis queue & interruption handler
├── theme/                          # Clinical OLED dark design tokens
├── types/                          # TypeScript interfaces and contracts
├── app.json                        # Expo configuration & native build plugins
├── eas.json                        # EAS build profiles (development, preview, production)
└── package.json                    # Project dependencies and run scripts
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
