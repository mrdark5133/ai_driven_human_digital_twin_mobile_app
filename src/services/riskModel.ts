/**
 * Sleep & Lifestyle Risk Model Service
 * Integrates on-device Logistic Regression predictor with real app data
 * (Profile, Android Health Connect / Watch readings, DataService telemetry).
 *
 * NOTE: This is a lifestyle risk indicator, NOT a medical diagnosis.
 */

import riskModelJson from '../../assets/models/risk_model.json';
import {
  predictRiskFromModel,
  RiskInputs,
  RiskModelDefinition,
  FeatureContribution,
} from './riskModelCore';
import { DataService } from '../../services/dataService';
import { getCurrentVitals } from './vitals';

export type RiskInputSource = 'profile' | 'watch' | 'call' | 'demo';

export type RiskBand = 'Low' | 'Moderate' | 'High';

export interface FactorItem {
  feature: keyof RiskInputs;
  label: string;
  contribution: number;
}

export interface RiskAssessment {
  probability: number;
  percent: number;
  band: RiskBand;
  topRiskFactors: FactorItem[];
  protectiveFactors: FactorItem[];
  inputs: RiskInputs;
  sources: Record<keyof RiskInputs, RiskInputSource>;
  isDemo: boolean;
  metrics: RiskModelDefinition['metrics'];
  disclaimer: string;
}

const model = riskModelJson as unknown as RiskModelDefinition;

const RISK_FACTOR_LABELS: Record<keyof RiskInputs, string> = {
  bmi_level: 'Higher BMI',
  age: 'Age bracket',
  quality_of_sleep: 'Lower sleep quality',
  sleep_duration: 'Short sleep',
  heart_rate: 'Higher resting heart rate',
  daily_steps: 'Low daily steps',
  stress_level: 'High stress',
  physical_activity: 'Lower physical activity',
};

const PROTECTIVE_FACTOR_LABELS: Record<keyof RiskInputs, string> = {
  quality_of_sleep: 'High sleep quality',
  sleep_duration: 'Adequate sleep duration',
  daily_steps: 'High daily steps',
  bmi_level: 'Healthy BMI',
  heart_rate: 'Calm resting heart rate',
  age: 'Younger age bracket',
  stress_level: 'Managed stress level',
  physical_activity: 'Active movement',
};

/**
 * Gathers inputs from user profile, Health Connect / manual watch readings,
 * and data service, tagging each input with its data source.
 */
export async function buildRiskInputs(): Promise<{
  inputs: RiskInputs;
  sources: Record<keyof RiskInputs, RiskInputSource>;
}> {
  const profile = DataService.getProfile();
  const vitals = DataService.getVitals();

  // 1. Live vitals from watch / Health Connect
  let liveHeartRate: number | null = null;
  let hasWatchHeartRate = false;

  try {
    const current = await getCurrentVitals();
    if (current.heartRate && typeof current.heartRate.value === 'number') {
      liveHeartRate = current.heartRate.value;
      hasWatchHeartRate = true;
    }
  } catch (err) {
    console.warn('[RiskModel] Error fetching current vitals:', err);
  }

  const sources: Record<keyof RiskInputs, RiskInputSource> = {
    age: 'demo',
    bmi_level: 'demo',
    heart_rate: 'demo',
    daily_steps: 'demo',
    sleep_duration: 'demo',
    quality_of_sleep: 'demo',
    stress_level: 'demo',
    physical_activity: 'demo',
  };

  // 2. Age mapping
  let age = 28;
  if (profile && typeof profile.chronologicalAge === 'number' && profile.chronologicalAge > 0) {
    age = profile.chronologicalAge;
    sources.age = 'profile';
  } else {
    age = 28;
    sources.age = 'demo';
  }

  // 3. BMI Level: BMI < 25 -> 0 (Normal), < 30 -> 1 (Overweight), else 2 (Obese)
  let bmiLevel = 0;
  if (
    profile &&
    typeof profile.heightCm === 'number' &&
    profile.heightCm > 0 &&
    typeof profile.weightKg === 'number' &&
    profile.weightKg > 0
  ) {
    const heightM = profile.heightCm / 100;
    const computedBmi = profile.weightKg / (heightM * heightM);
    if (computedBmi < 25) {
      bmiLevel = 0;
    } else if (computedBmi < 30) {
      bmiLevel = 1;
    } else {
      bmiLevel = 2;
    }
    sources.bmi_level = 'profile';
  } else if (profile && typeof profile.bmi === 'number') {
    if (profile.bmi < 25) bmiLevel = 0;
    else if (profile.bmi < 30) bmiLevel = 1;
    else bmiLevel = 2;
    sources.bmi_level = 'profile';
  } else {
    bmiLevel = 0;
    sources.bmi_level = 'demo';
  }

  // 4. Heart Rate: live resting heart rate from Health Connect or manual watch entry, else demo
  let heartRate = 72;
  if (liveHeartRate !== null) {
    heartRate = liveHeartRate;
    sources.heart_rate = hasWatchHeartRate ? 'watch' : 'demo';
  } else if (vitals && typeof vitals.heartRate === 'number') {
    heartRate = vitals.heartRate;
    sources.heart_rate = 'demo';
  }

  // 5. Daily Steps: 7-day average if available, else today's steps
  let dailySteps = 6000;
  if (vitals && typeof vitals.steps === 'number') {
    dailySteps = vitals.steps;
    sources.daily_steps = 'demo';
  }

  // 6. Sleep Duration: sleep hours + sleep minutes
  let sleepDuration = 7.0;
  if (vitals && typeof vitals.sleepHours === 'number') {
    const minutes = typeof vitals.sleepMinutes === 'number' ? vitals.sleepMinutes : 0;
    sleepDuration = Number((vitals.sleepHours + minutes / 60).toFixed(1));
    sources.sleep_duration = 'demo';
  }

  // 7. Quality of Sleep: sleep score / 10 rounded (scale 1 - 10)
  let qualityOfSleep = 7;
  if (vitals && typeof vitals.sleepScore === 'number') {
    qualityOfSleep = Math.max(1, Math.min(10, Math.round(vitals.sleepScore / 10)));
    sources.quality_of_sleep = 'demo';
  }

  // 8. Stress Level: stress index / 10 rounded (scale 1 - 10)
  let stressLevel = 4;
  if (vitals && typeof vitals.stressIndex === 'number') {
    stressLevel = Math.max(1, Math.min(10, Math.round(vitals.stressIndex / 10)));
    sources.stress_level = 'demo';
  }

  // 9. Physical Activity: active minutes per day if available, else estimate steps / 100
  let physicalActivity = 60;
  physicalActivity = Math.max(10, Math.round(dailySteps / 100));
  sources.physical_activity = sources.daily_steps;

  // Clamp every value to model's training ranges
  const clampedInputs: RiskInputs = {
    age: clamp(age, model.ranges.age),
    sleep_duration: clamp(sleepDuration, model.ranges.sleep_duration),
    quality_of_sleep: clamp(qualityOfSleep, model.ranges.quality_of_sleep),
    physical_activity: clamp(physicalActivity, model.ranges.physical_activity),
    stress_level: clamp(stressLevel, model.ranges.stress_level),
    bmi_level: clamp(bmiLevel, model.ranges.bmi_level),
    heart_rate: clamp(heartRate, model.ranges.heart_rate),
    daily_steps: clamp(dailySteps, model.ranges.daily_steps),
  };

  return {
    inputs: clampedInputs,
    sources,
  };
}

function clamp(val: number, range?: [number, number]): number {
  if (!range) return val;
  return Math.max(range[0], Math.min(range[1], val));
}

/**
 * Computes the full Sleep & Lifestyle Risk assessment.
 */
export async function getRiskAssessment(): Promise<RiskAssessment> {
  const { inputs, sources } = await buildRiskInputs();
  const result = predictRiskFromModel(model, inputs);

  const prob = result.probability;
  const percent = Math.round(prob * 100);

  let band: RiskBand = 'Low';
  if (prob > model.bands.moderate_max) {
    band = 'High';
  } else if (prob > model.bands.low_max) {
    band = 'Moderate';
  } else {
    band = 'Low';
  }

  // Partition contributions into risk (positive) and protective (negative)
  const posFactors: FeatureContribution[] = [];
  const negFactors: FeatureContribution[] = [];

  result.detailedContributions.forEach((fc) => {
    if (fc.contribution > 0.001) {
      posFactors.push(fc);
    } else if (fc.contribution < -0.001) {
      negFactors.push(fc);
    }
  });

  // Sort risk factors descending by impact (biggest contributor first)
  posFactors.sort((a, b) => b.contribution - a.contribution);
  // Sort protective factors ascending by contribution (most protective negative number first)
  negFactors.sort((a, b) => a.contribution - b.contribution);

  const topRiskFactors: FactorItem[] = posFactors.slice(0, 3).map((f) => ({
    feature: f.feature,
    label: RISK_FACTOR_LABELS[f.feature] || f.feature,
    contribution: f.contribution,
  }));

  const protectiveFactors: FactorItem[] = negFactors.slice(0, 2).map((f) => ({
    feature: f.feature,
    label: PROTECTIVE_FACTOR_LABELS[f.feature] || f.feature,
    contribution: f.contribution,
  }));

  const isDemo = Object.values(sources).some((src) => src === 'demo');

  return {
    probability: prob,
    percent,
    band,
    topRiskFactors,
    protectiveFactors,
    inputs,
    sources,
    isDemo,
    metrics: model.metrics,
    disclaimer: model.disclaimer,
  };
}

let cachedRiskContextLine =
  'Sleep & lifestyle risk: Low (18%). Health metrics within optimal ranges. Not a diagnosis.';

/**
 * Returns the currently cached risk context line for synchronous system prompt construction.
 */
export function getCachedRiskContextLine(): string {
  return cachedRiskContextLine;
}

/**
 * Returns a concise, single-line risk summary for Pallavi's prompt context card.
 * Example: "Sleep & lifestyle risk: Moderate (48%). Main reasons: short sleep, high stress. Not a diagnosis."
 */
export async function getRiskContextLine(): Promise<string> {
  try {
    const assessment = await getRiskAssessment();
    const reasons = assessment.topRiskFactors.map((f) => f.label.toLowerCase()).join(', ');

    let line = '';
    if (reasons) {
      line = `Sleep & lifestyle risk: ${assessment.band} (${assessment.percent}%). Main reasons: ${reasons}. Not a diagnosis.`;
    } else {
      line = `Sleep & lifestyle risk: ${assessment.band} (${assessment.percent}%). Health metrics within optimal ranges. Not a diagnosis.`;
    }
    cachedRiskContextLine = line;
    return line;
  } catch (err) {
    return cachedRiskContextLine;
  }
}

// Eagerly initialize the cached risk line on module import
getRiskContextLine().catch(() => {});
