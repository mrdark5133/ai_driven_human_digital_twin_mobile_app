# AI-Driven Human (Human Digital Twin Mobile Health App)

A clinical-grade **Human Digital Twin** mobile health application built with **React Native**, **Expo (dev build ready)**, and **TypeScript**.

## 📱 Architecture & Tech Stack

- **Framework**: React Native + Expo (SDK 57) + TypeScript
- **Navigation**: `expo-router` with typed routes
  - **Auth Stack**: `/(auth)/login`, `/(auth)/profile-setup`, `/(auth)/connect-watch`
  - **Bottom Tabs (5 Tabs)**:
    1. `Home` (`/(tabs)/home`): Homeostasis score ring, continuous bio-index, real-time vitals grid, daily recovery protocols.
    2. `Twin` (`/(tabs)/twin`): 3D holographic digital twin model, live telemetry lock, lead II waveform synthesizer, interactive organ system inspection (Cardiovascular, Neurological, Pulmonary).
    3. `Insights` (`/(tabs)/insights`): Predictive trends, multi-timeframe aggregation (Day, Week, Month), 7-day RHR sparkline chart, stress distribution matrix, detected chrono-anomalies, AI directives.
    4. `Assistant` (`/(tabs)/assistant`): AURA Biometric Clinical Agent, holographic voice visualizer orb, continuous listening toggle, suggested inquiries chips, conversational health stream.
    5. `Profile` (`/(tabs)/profile`): Digital twin longevity matrix, biological age differential, sensor hardware streams (PPG, EDA, SpO2, Accelerometer), local zero-knowledge data privacy.
- **Styling**: Pure `StyleSheet` driven by a unified clinical design system theme in `theme/index.ts`.
- **Data Visualization**: `react-native-svg` (custom health score ring, multi-node sparklines, continuous ECG synthesizer, 3D holographic body silhouette).
- **Typography & Icons**: Inter (`@expo-google-fonts/inter`), Space Grotesk (`@expo-google-fonts/space-grotesk`), and `@expo/vector-icons`.
- **Data Layer**: Centralized `services/dataService.ts` with mock data models and hooks for future Health Connect, SQLite, and ML models.

---

## 🎨 Applied Design Fixes & Calibrations

1. **Profile > Health Connect Sync**: Row description set to *"Reads data from your watch"* and status chip displays *"Connected"*.
2. **Profile > Data Privacy**: Strictest sovereign notice applied: *"All your data stays on this phone."*
3. **Login & Home**: Removed the legacy *"Student sync"* label. Dynamically renders the current real weekday (e.g. *Thursday, Oct 24*) and displays neutral sleep analysis matching telemetry.
4. **Assistant**: Uses dynamically configured emergency contact (*Dr. Reynolds (Emergency)*), removed unverified cortisol claim from the vagal stress protocol, and aligned sleep telemetry with Home numbers (Deep 1h 15m, Light 4h 30m, Awake 55m).
5. **Twin Live Render**: Translucent holographic body silhouette rendered with crisp high-visibility teal/slate strokes (`#4cd7f6` / `#869397`), *CARDIO: 72 BPM | NORM* pinned to single-line pill, and standard resting range calibrated to 60-80 bpm across all nodes.
6. **Blood Oxygen (SpO2)**: Flagged via `showSpO2` toggle in the data service.
7. **Medical Compliance**: Preserved standard notice across Insights: *"For information only, not medical advice."*

---

## 🚀 Running the App

### Prerequisites
- Node.js (v18+)
- Android SDK installed (`ANDROID_HOME` configured)
- An Android device with **USB Debugging enabled** connected via USB, or an Android emulator.

### Steps

1. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

2. **Start Expo Development Server**:
   ```bash
   npx expo start
   ```

3. **Run on Android Device via USB**:
   ```bash
   # Make sure your device is detected
   adb devices

   # Launch directly on Android
   npx expo run:android
   # or with Expo development build / Go
   npx expo start --android
   ```

---

## 📂 Project Structure

```
d:/mobile app/
├── app/
│   ├── _layout.tsx           # Global Root Layout (Fonts, StatusBar, Stack)
│   ├── index.tsx             # Root router redirect
│   ├── (auth)/
│   │   ├── _layout.tsx       # Auth Stack Layout
│   │   ├── login.tsx         # Login & Create Twin Screen
│   │   ├── profile-setup.tsx # Biometric Baseline Calibration Screen
│   │   └── connect-watch.tsx # Smartwatch Hardware Pairing Screen
│   └── (tabs)/
│       ├── _layout.tsx       # 5 Bottom Tabs Layout & Styling
│       ├── home.tsx          # Home Dashboard Screen
│       ├── twin.tsx          # Digital Twin Explorer Screen
│       ├── insights.tsx      # Predictive Insights & AI Directives Screen
│       ├── assistant.tsx     # AURA Voice & Clinical Chat Assistant Screen
│       └── profile.tsx       # Profile, Longevity Matrix & Settings Screen
├── components/
│   ├── Header.tsx            # Global Top Header with Live Pulse Badge
│   ├── HealthScoreRing.tsx   # SVG Continuous Bio-Index Score Ring
│   ├── Sparkline.tsx         # SVG Real-time Waveform Sparkline
│   ├── LineChart.tsx         # SVG Multi-Day Aggregation Trend Line
│   ├── StressBarChart.tsx    # SVG Segmented Calm/Elevated Stress Bars
│   ├── BodyFigure.tsx        # 3D Holographic Translucent Body Model
│   ├── VitalsCard.tsx        # Reusable Biometric Telemetry Pod
│   ├── InterventionCard.tsx  # AI Recommendation Directive Card
│   └── AnomalyBanner.tsx     # Chrono-Anomaly Alert Warning Card
├── services/
│   └── dataService.ts        # Central Data Store & Service with TODO Hooks
├── theme/
│   └── index.ts              # Theme Tokens (Colors, Typography, Spacing, Radii)
├── types/
│   └── index.ts              # TypeScript Type Definitions & Interfaces
├── app.json
├── package.json
└── tsconfig.json
```
