/**
 * TypeScript Data Models & Contracts
 * AI-Driven Human (Human Digital Twin Health Platform)
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  chronologicalAge: number;
  bioTwinAge: number;
  rejuvenationYears: number;
  heightCm: number;
  weightKg: number;
  restingMrKcal: number;
  bmi: number;
  cellularAge: number;
  isPro: boolean;
}

export interface WatchDevice {
  id: string;
  name: string;
  connectionType: string;
  bleVersion: string;
  batteryPercent: number;
  lastSyncedText: string;
  isConnected: boolean;
}

export interface VitalsMetrics {
  bioIndex: number;
  bioIndexStatus: string;
  predictiveVariance: number;
  cardioScore: number;
  cardioTrend: string;
  recoveryScore: number;
  recoveryTrend: string;
  metabolicScore: number;
  metabolicTrend: string;
  
  // Real-time Vitals
  heartRate: number;
  heartRateTrend: string;
  stressIndex: number;
  stressStatus: string;
  hrv: number;
  
  // Sleep Telemetry
  sleepHours: number;
  sleepMinutes: number;
  sleepScore: number;
  sleepDeep: string;
  sleepLight: string;
  sleepAwake: string;
  sleepRem: string;
  sleepSummaryText: string;
  
  // Activity
  steps: number;
  stepGoal: number;
  activeKcal: number;
  activityPercent: number;

  // Organ & SpO2
  showSpO2: boolean;
  spo2: number;
  respiratoryRate: number;
  lungVolumeLiters: number;
  neuralLoadPercent: number;
  alphaWavesHz: number;
  circadianPhase: string;
}

export type OrganSystemKey = 'all' | 'cardio' | 'neuro' | 'pulmo';

export interface OrganDetail {
  key: OrganSystemKey;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  badgeText: string;
  badgeColor: string;
  m1Label: string;
  m1Val: string;
  m1Unit: string;
  m1Sub: string;
  m2Label: string;
  m2Val: string;
  m2Unit: string;
  m2Sub: string;
  m3Label: string;
  m3Val: string;
  m3Unit: string;
  m3Sub: string;
  diagnosticText: string;
}

export interface AnomalyEvent {
  id: string;
  timeStr: string;
  title: string;
  tag: string;
  description: string;
  severity: 'amber' | 'cyan' | 'rose';
}

export type RecommendationCategory = 'all' | 'sleep' | 'stress' | 'hydration' | 'activity';

export interface AIRecommendation {
  id: string;
  category: 'sleep' | 'stress' | 'hydration' | 'activity';
  priorityLabel: string;
  timeHint: string;
  title: string;
  prediction: string;
  rationale: string;
  actionLabel: string;
  actionIcon: string;
  accentColor: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'aura';
  text: string;
  timeStr: string;
  isVoice?: boolean;
  telemetryWidget?: {
    label: string;
    value: string;
    targetStrain: string;
  };
}

export type InsightsTimeframe = 'day' | 'week' | 'month';

export interface HeartRateHistoryPoint {
  day: string;
  bpm: number;
}

export interface StressHistoryDay {
  dayLabel: string;
  calmPercent: number;
  elevatedPercent: number;
}

export interface TelemetrySettings {
  continuousPpg: boolean;
  edaSensor: boolean;
  spo2Sensor: boolean;
  accelerometer: boolean;
  autoStream: boolean;
  anomalyPush: boolean;
  circadianReminders: boolean;
  dailyDigest: boolean;
  emergencyContactName: string;
  emergencyContactPhone: string;
  language: string;
}
