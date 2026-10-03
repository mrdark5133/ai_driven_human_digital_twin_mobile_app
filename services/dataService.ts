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
  batteryPercent: 84,
  lastSyncedText: 'Noise ColorFit • Synced 2m ago',
  isConnected: true,
};

let vitalsState: VitalsMetrics = {
  bioIndex: 78,
  bioIndexStatus: 'Optimal',
  predictiveVariance: 1.4,
  cardioScore: 91,
  cardioTrend: '↑ +2%',
  recoveryScore: 84,
  recoveryTrend: '↓ -4%',
  metabolicScore: 89,
  metabolicTrend: 'Steady',

  heartRate: 72,
  heartRateTrend: '+3 bpm vs 7d avg',
  stressIndex: 38,
  stressStatus: 'Calm Sympathetic Tone',
  hrv: 64,

  // Sleep breakdown matching user requirement
  sleepHours: 6,
  sleepMinutes: 40,
  sleepScore: 89,
  sleepDeep: '1h 15m',
  sleepLight: '4h 30m',
  sleepAwake: '55m',
  sleepRem: '2h 10m',
  sleepSummaryText: 'Score 89 • Rejuvenated',

  steps: 5840,
  stepGoal: 10000,
  activeKcal: 340,
  activityPercent: 58,

  // SpO2 Flag
  showSpO2: true,
  spo2: 98.8,
  respiratoryRate: 14,
  lungVolumeLiters: 4.8,
  neuralLoadPercent: 32,
  alphaWavesHz: 10.4,
  circadianPhase: 'Phase 3 (Peak Alertness)',
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

const anomaliesList: AnomalyEvent[] = [
  {
    id: 'anom-1',
    timeStr: '04:12 AM Today',
    title: 'Elevated resting heart rate spike (+18 bpm) sustained for 14m during REM cycle.',
    tag: 'Tachycardia In REM',
    description: 'Heart rate spiked to 90 BPM for 14 mins without physical acceleration cues during REM.',
    severity: 'amber',
  },
  {
    id: 'anom-2',
    timeStr: '18:45 Yesterday',
    title: 'Sympathetic tone surge during evening commute window.',
    tag: 'Acute Stress Peak',
    description: 'Electrodermal activity (EDA) and reduced HRV indicated acute sympathetic stress surge.',
    severity: 'cyan',
  },
  {
    id: 'anom-3',
    timeStr: '02:30 Oct 01',
    title: 'SpO2 momentarily dipped during stage 3 rest.',
    tag: 'Respiration Dipper',
    description: 'Blood peripheral oxygen saturation (SpO2) momentarily dipped to 94% during stage 3 rest.',
    severity: 'amber',
  },
];

const recommendationsList: AIRecommendation[] = [
  {
    id: 'rec-1',
    category: 'sleep',
    priorityLabel: 'HIGH PRIORITY • SLEEP',
    timeHint: 'Est. 22:30',
    title: 'Shift Bedtime Target to 22:30',
    prediction: '+18m Deep Sleep Predicted',
    rationale: 'Your heart rate variability dip indicates residual CNS fatigue from late sleep onset over the past 3 nights.',
    actionLabel: 'Schedule Wind-down Reminder',
    actionIcon: 'bedtime',
    accentColor: '#fbbf24',
  },
  {
    id: 'rec-2',
    category: 'stress',
    priorityLabel: 'HIGH PRIORITY • STRESS',
    timeHint: 'Spike @ 13:10',
    title: '5-Minute Box Breathing Protocol',
    prediction: 'Lowers sympathetic tone by ~22%',
    // Fixed: Removed cortisol claim
    rationale: 'Elevated Galvanic Skin Response detected at 13:10. Initiating vagal activation supports autonomic recovery.',
    actionLabel: 'Start Guided Session',
    actionIcon: 'self-improvement',
    accentColor: '#5de6ff',
  },
  {
    id: 'rec-3',
    category: 'hydration',
    priorityLabel: 'MEDIUM PRIORITY • HYDRATION',
    timeHint: '600ml Deficit',
    title: 'Electrolyte Replenishment (600ml)',
    prediction: 'Maintains optimal blood volume index',
    rationale: 'Slight blood viscosity simulation indicates dehydration following morning aerobic activity.',
    actionLabel: 'Log 600ml Consumed',
    actionIcon: 'water-drop',
    accentColor: '#45dfa4',
  },
  {
    id: 'rec-4',
    category: 'activity',
    priorityLabel: 'MAINTENANCE • ACTIVITY',
    timeHint: 'Zone 2 • 20 Min',
    title: 'Zone 2 Cardio Interval (20 Mins)',
    prediction: 'Boosts mitochondrial density score',
    rationale: 'Sustained aerobic baseline in Zone 2 accelerates lactate clearance and builds capillary density.',
    actionLabel: 'View Route',
    actionIcon: 'map',
    accentColor: '#869397',
  },
];

let chatMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'aura',
    text: 'Hello Alex. I noticed an elevated pulse spike at 4:12 AM during your sleep cycle. Your vagal tone has since recovered to 64ms (resting HR within nominal 60-80 bpm range). How are you feeling this morning?',
    timeStr: '08:14 AM',
  },
  {
    id: 'msg-2',
    sender: 'user',
    text: 'I woke up feeling slightly dehydrated, but otherwise fine. Should I do my workout today?',
    timeStr: '08:15 AM',
    isVoice: true,
  },
  {
    id: 'msg-3',
    sender: 'aura',
    text: 'Your digital twin predicts a 12% reduction in peak performance capacity. I recommend a light Zone 1 recovery session rather than high-intensity intervals.',
    timeStr: '08:15 AM',
    telemetryWidget: {
      label: 'Biometric Recovery',
      value: '68%',
      targetStrain: 'Zone 1 (95-115 BPM)',
    },
  },
];

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
    // TODO: [Health Connect] Hook into Android Health Connect SDK to read continuous records
    return new Promise((resolve) => {
      setTimeout(() => {
        watchState = {
          ...watchState,
          lastSyncedText: 'WATCH CONNECTED, SYNCED JUST NOW',
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
    if (timeframe === 'day') {
      return {
        avgBpm: 68,
        minBpm: 56,
        maxBpm: 92,
        riskPercent: 12,
        heartRatePoints: [
          { day: '00:00', bpm: 58 },
          { day: '04:00', bpm: 90 },
          { day: '08:00', bpm: 72 },
          { day: '12:00', bpm: 78 },
          { day: '16:00', bpm: 74 },
          { day: '20:00', bpm: 66 },
          { day: 'Now', bpm: 72 },
        ],
        stressDays: [
          { dayLabel: '04h', calmPercent: 90, elevatedPercent: 10 },
          { dayLabel: '08h', calmPercent: 75, elevatedPercent: 25 },
          { dayLabel: '12h', calmPercent: 60, elevatedPercent: 40 },
          { dayLabel: '16h', calmPercent: 80, elevatedPercent: 20 },
          { dayLabel: '20h', calmPercent: 85, elevatedPercent: 15 },
          { dayLabel: '22h', calmPercent: 95, elevatedPercent: 5 },
          { dayLabel: 'Now', calmPercent: 80, elevatedPercent: 20 },
        ],
      };
    }

    if (timeframe === 'month') {
      return {
        avgBpm: 59,
        minBpm: 49,
        maxBpm: 88,
        riskPercent: 15,
        heartRatePoints: [
          { day: 'W1', bpm: 60 },
          { day: 'W2', bpm: 58 },
          { day: 'W3', bpm: 62 },
          { day: 'W4', bpm: 57 },
        ],
        stressDays: [
          { dayLabel: 'W1', calmPercent: 70, elevatedPercent: 30 },
          { dayLabel: 'W2', calmPercent: 85, elevatedPercent: 15 },
          { dayLabel: 'W3', calmPercent: 65, elevatedPercent: 35 },
          { dayLabel: 'W4', calmPercent: 80, elevatedPercent: 20 },
        ],
      };
    }

    // Default: 'week'
    return {
      avgBpm: 58,
      minBpm: 52,
      maxBpm: 84,
      riskPercent: 14,
      heartRatePoints: [
        { day: 'MON', bpm: 60 },
        { day: 'TUE', bpm: 57 },
        { day: 'WED', bpm: 64 },
        { day: 'THU', bpm: 55 },
        { day: 'FRI', bpm: 59 },
        { day: 'SAT', bpm: 53 },
        { day: 'TODAY', bpm: 58 },
      ],
      stressDays: [
        { dayLabel: 'M', calmPercent: 80, elevatedPercent: 20 },
        { dayLabel: 'T', calmPercent: 60, elevatedPercent: 40 },
        { dayLabel: 'W', calmPercent: 85, elevatedPercent: 15 },
        { dayLabel: 'T', calmPercent: 45, elevatedPercent: 55 },
        { dayLabel: 'F', calmPercent: 75, elevatedPercent: 25 },
        { dayLabel: 'S', calmPercent: 90, elevatedPercent: 10 },
        { dayLabel: 'S', calmPercent: 80, elevatedPercent: 20 },
      ],
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
