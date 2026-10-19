/**
 * Single Data Service & Mock Store
 * Provides all biological twin telemetry, user profile data, AI directives, and chat state.
 * Includes hooks for future Health Connect, SQLite persistence, and on-device ML models.
 */

import {
  UserProfile,
  WatchDevice,
  VitalsMetrics,
  OrganSystemKey,
  OrganDetail,
  AnomalyEvent,
  AIRecommendation,
  ChatMessage,
  InsightsTimeframe,
  HeartRateHistoryPoint,
  StressHistoryDay,
  TelemetrySettings,
} from '../types';

// ==========================================
// MOCK STATE STORAGE
// ==========================================

let profileState: UserProfile = {
  id: '#SYN-89410',
  name: 'Dark',
  email: 'dark@digitaltwin.bio',
  avatarUrl: '',
  chronologicalAge: 28,
  bioTwinAge: 26.2,
  rejuvenationYears: 1.8,
  heightCm: 178,
  weightKg: 71.0,
  restingMrKcal: 1740,
  bmi: 22.4,
  cellularAge: 26.2,
  isPro: true,
};

let watchState: WatchDevice = {
  id: 'device-noise-01',
  name: 'Noise ColorFit Watch',
  connectionType: 'Android Health Connect',
  bleVersion: 'BLE 5.3 Active',
  batteryPercent: 0,
  lastSyncedText: 'No data yet',
  isConnected: false,
};

let vitalsState: VitalsMetrics = {
  bioIndex: 0,
  bioIndexStatus: 'Awaiting data',
  predictiveVariance: 0,
  cardioScore: 0,
  cardioTrend: 'Awaiting readings',
  recoveryScore: 0,
  recoveryTrend: 'Awaiting readings',
  metabolicScore: 0,
  metabolicTrend: 'Awaiting data',

  heartRate: 0,
  heartRateTrend: 'Awaiting readings',
  stressIndex: 0,
  stressStatus: 'Awaiting data',
  hrv: 0,

  // Sleep breakdown
  sleepHours: 0,
  sleepMinutes: 0,
  sleepScore: 0,
  sleepDeep: '0m',
  sleepLight: '0m',
  sleepAwake: '0m',
  sleepRem: '0m',
  sleepSummaryText: 'Awaiting sleep data',

  steps: 0,
  stepGoal: 10000,
  activeKcal: 0,
  activityPercent: 0,

  // SpO2 Flag
  showSpO2: true,
  spo2: 0,
  respiratoryRate: 0,
  lungVolumeLiters: 0,
  neuralLoadPercent: 0,
  alphaWavesHz: 0,
  circadianPhase: 'Awaiting data',
};

let settingsState: TelemetrySettings = {
  continuousPpg: true,
  edaSensor: true,
  spo2Sensor: true,
  accelerometer: true,
  autoStream: true,
  anomalyPush: true,
  circadianReminders: true,
  dailyDigest: true,
  emergencyContactName: 'Dr. Reynolds (Emergency)',
  emergencyContactPhone: '+1 (555) 019-2834',
  language: 'English (US)',
};

const organDetailsMap: Record<OrganSystemKey, OrganDetail> = {
  all: {
    key: 'all',
    title: 'Holistic Biometric Twin',
    subtitle: 'Full Systemic Multi-Organ Synthesis',
    icon: 'view_in_ar',
    iconColor: '#4cd7f6',
    badgeText: 'HOMEOSTASIS NOMINAL',
    badgeColor: '#00bd85',
    m1Label: 'Bio-Index',
    m1Val: '88',
    m1Unit: '/100',
    m1Sub: 'Systemic stability',
    m2Label: 'Resting HR',
    m2Val: '72',
    m2Unit: 'BPM',
    m2Sub: 'Resting range 60-80 bpm',
    m3Label: 'Neural Load',
    m3Val: '32%',
    m3Unit: '',
    m3Sub: 'Low cognitive fatigue',
    diagnosticText: 'All primary organ vectors exhibit coherent harmonic coupling. Cellular recovery trajectory is currently pacing 1.8 years ahead of chronological baseline.',
  },
  cardio: {
    key: 'cardio',
    title: 'Cardiovascular Node',
    subtitle: 'Heart & Vascular Network Structure',
    icon: 'favorite',
    iconColor: '#ffb4ab',
    badgeText: 'HEALTHY & REGULAR',
    badgeColor: '#00bd85',
    m1Label: 'HRV',
    m1Val: '64',
    m1Unit: 'ms',
    m1Sub: 'High vagal reserve',
    m2Label: 'Pulse',
    m2Val: '72',
    m2Unit: 'BPM',
    m2Sub: 'Resting range 60-80 bpm',
    m3Label: 'Arrhythmia',
    m3Val: '<2.1%',
    m3Unit: '',
    m3Sub: 'Low AI predicted risk',
    diagnosticText: 'Left ventricular stroke volume stable. No ectopic beat patterns detected during recent continuous baseline telemetry. Resting rhythm comfortably within 60-80 bpm.',
  },
  neuro: {
    key: 'neuro',
    title: 'Neurological Matrix',
    subtitle: 'Prefrontal Cortex & Autonomic Trunk',
    icon: 'psychology',
    iconColor: '#4cd7f6',
    badgeText: 'OPTIMAL ATTENTION',
    badgeColor: '#06b6d4',
    m1Label: 'Alpha Waves',
    m1Val: '10.4',
    m1Unit: 'Hz',
    m1Sub: 'Calm alert focus',
    m2Label: 'Neural Load',
    m2Val: '32%',
    m2Unit: '',
    m2Sub: 'Nominal threshold',
    m3Label: 'Circadian',
    m3Val: 'Phase 3',
    m3Unit: '',
    m3Sub: 'Peak day alertness',
    diagnosticText: 'Cerebral oxygenation high at 98.2%. Autonomic sympathetic-parasympathetic balance exhibits healthy homeostatic resilience.',
  },
  pulmo: {
    key: 'pulmo',
    title: 'Pulmonary Apparatus',
    subtitle: 'Bronchial Tree & Alveolar Exchange',
    icon: 'air',
    iconColor: '#45dfa4',
    badgeText: 'CLEAR & EFFICIENT',
    badgeColor: '#00bd85',
    m1Label: 'SpO2 Sat',
    m1Val: '98.8',
    m1Unit: '%',
    m1Sub: 'Optimal hemoglobin sat',
    m2Label: 'Resp Rate',
    m2Val: '14',
    m2Unit: '/min',
    m2Sub: 'Rhythmic & tidal',
    m3Label: 'Lung Vol',
    m3Val: '4.8',
    m3Unit: 'L',
    m3Sub: 'Peak capacity 102%',
    diagnosticText: 'Bilateral alveolar diffusion capacity index at optimal 99.4%. Expiratory flow rates indicate clean unobstructed airway integrity.',
  },
};

const anomaliesList: AnomalyEvent[] = [];

const recommendationsList: AIRecommendation[] = [];

let chatMessages: ChatMessage[] = [];

// Listeners for reactivity
type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

// ==========================================
// PUBLIC SERVICE API
// ==========================================

export const DataService = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getProfile(): UserProfile {
    return { ...profileState };
  },

  updateProfile(updates: Partial<UserProfile>): void {
    profileState = { ...profileState, ...updates };
    notify();
  },

  getWatch(): WatchDevice {
    return { ...watchState };
  },

  getVitals(): VitalsMetrics {
    return { ...vitalsState };
  },

  setSpO2Visibility(show: boolean): void {
    vitalsState.showSpO2 = show;
    notify();
  },

  getOrganDetails(key: OrganSystemKey): OrganDetail {
    return organDetailsMap[key] || organDetailsMap.cardio;
  },

  getAnomalies(): AnomalyEvent[] {
    return [...anomaliesList];
  },

  getRecommendations(category: string = 'all'): AIRecommendation[] {
    if (category === 'all') return [...recommendationsList];
    return recommendationsList.filter((r) => r.category === category);
  },

  getChatHistory(): ChatMessage[] {
    return [...chatMessages];
  },

  addChatMessage(msg: ChatMessage): void {
    chatMessages.push(msg);
    notify();
  },

  updateChatMessage(id: string, text: string): void {
    const target = chatMessages.find((m) => m.id === id);
    if (target) {
      target.text = text;
      notify();
    }
  },

  getSettings(): TelemetrySettings {
    return { ...settingsState };
  },

  updateSettings(updates: Partial<TelemetrySettings>): void {
    settingsState = { ...settingsState, ...updates };
    notify();
  },

  // ==========================================
  // ACTIONS & INTERACTIONS
  // ==========================================

  sendChatMessage(userText: string): Promise<ChatMessage> {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: userText,
      timeStr,
    };
    chatMessages.push(userMsg);
    notify();

    // Generate intelligent contextual response
    return new Promise((resolve) => {
      setTimeout(() => {
        const query = userText.toLowerCase();
        let reply = "I've synthesized your continuous physiological telemetry. Your autonomic nervous system is stabilizing smoothly within baseline parameters.";
        let widget = undefined;

        if (query.includes('score') || query.includes('readiness')) {
          reply = `Your holistic Continuous Bio-Index sits at ${vitalsState.bioIndex}/100 today. Sleep quality scored ${vitalsState.sleepScore}%, with strong cardio resilience (resting HR 60-80 bpm range).`;
          widget = {
            label: 'Bio-Index',
            value: `${vitalsState.bioIndex}/100`,
            targetStrain: 'Optimal Homeostasis',
          };
        } else if (query.includes('sleep') || query.includes('rest')) {
          // Fixed: Matches exact Home sleep numbers
          reply = `Last night's sleep breakdown: Deep ${vitalsState.sleepDeep}, Light ${vitalsState.sleepLight}, Awake ${vitalsState.sleepAwake} (Total ${vitalsState.sleepHours}h ${vitalsState.sleepMinutes}m). Sleep score is ${vitalsState.sleepScore}%.`;
        } else if (query.includes('spike') || query.includes('heart rate')) {
          reply = `Analysis indicates the 04:12 AM spike reached 90 BPM during REM. Your vagal tone has since stabilized back to ${vitalsState.hrv}ms, and resting HR is steady at ${vitalsState.heartRate} BPM (nominal range 60-80 bpm).`;
        } else if (query.includes('emergency') || query.includes('doctor') || query.includes('call') || query.includes('reynolds')) {
          const contact = settingsState.emergencyContactName;
          reply = `Emergency alert packet compiled for ${contact}. High-priority telemetry channel opened via encrypted link.`;
        } else if (query.includes('lung') || query.includes('spo2') || query.includes('oxygen')) {
          reply = `Your pulmonary digital twin reports normal airway resistance with SpO2 at ${vitalsState.spo2}% and respiratory rate of ${vitalsState.respiratoryRate} breaths/min.`;
        }

        const auraMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: 'aura',
          text: reply,
          timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          telemetryWidget: widget,
        };
        chatMessages.push(auraMsg);
        notify();
        resolve(auraMsg);
      }, 600);
    });
  },

  async triggerWatchSync(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        watchState = {
          ...watchState,
          lastSyncedText: 'Synced just now',
        };
        notify();
        resolve();
      }, 1000);
    });
  },

  getInsightsChartData(timeframe: InsightsTimeframe): {
    avgBpm: number;
    minBpm: number;
    maxBpm: number;
    riskPercent: number;
    heartRatePoints: HeartRateHistoryPoint[];
    stressDays: StressHistoryDay[];
  } {
    return {
      avgBpm: 0,
      minBpm: 0,
      maxBpm: 0,
      riskPercent: 0,
      heartRatePoints: [],
      stressDays: [],
    };
  },
};

// ==========================================
// TODO HOOKS FOR FUTURE PHASES:
// ==========================================

// TODO: [Health Connect] Connect to Health Connect Client via expo module / native module:
// export async function syncWithHealthConnectClient(): Promise<void> { ... }

// TODO: [SQLite] Initialize local database for storing offline raw PPG waveforms & sleep stages:
// export async function initSQLiteTelemetryDatabase(): Promise<void> { ... }

// TODO: [ML Models] Run on-device TFLite / ONNX models for real-time arrhythmia prediction:
// export async function evaluateArrhythmiaRiskModel(ecgPoints: number[]): Promise<number> { ... }

// TODO: [Voice Agent] Stream real-time microphone buffer to WebSocket / Gemini Multimodal Live API:
// export async function startLiveAuraVoiceStream(): Promise<void> { ... }
