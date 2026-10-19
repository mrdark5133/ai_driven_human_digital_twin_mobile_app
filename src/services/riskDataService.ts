/**
 * Real Data Aggregator for On-Device Rule-Based Risk Engine.
 * Wires real data ONLY:
 * - Steps: Phone step counter (average of last available days)
 * - Heart rate: Android Health Connect
 * - BMI: Height & weight from Profile (if not set, missing)
 * - Sleep & Meals: Pallavi's saved call transcripts (if they exist, else missing)
 * - Smoking: Profile toggle / number ("Smoking per day", default not set)
 *
 * NEVER uses made-up default / demo values.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodaySteps, getLatestHeartRate } from './healthConnect';
import { getCurrentVitals } from './vitals';
import { getCallHistory, CallHistoryEntry } from './callHistory';
import { DataService } from '../../services/dataService';
import { RiskInput, evaluateRisks, RiskCategoryResult } from './riskEngine';

const DAILY_STEPS_STORAGE_KEY = '@phone_daily_steps_history';
const SMOKING_STORAGE_KEY = '@profile_smoking_per_day';

interface StepHistoryMap {
  [dateStr: string]: number;
}

/**
 * Updates daily step storage with today's count and returns average of last available recorded days.
 */
async function getAverageStepsFromPhone(): Promise<number | undefined> {
  let todayCount: number | null = null;

  try {
    const todayRes = await getTodaySteps();
    if (todayRes && typeof todayRes.count === 'number' && !isNaN(todayRes.count)) {
      todayCount = todayRes.count;
    }
  } catch (err) {
    console.warn('[RiskData] Failed to fetch today steps from Health Connect:', err);
  }

  try {
    const raw = await AsyncStorage.getItem(DAILY_STEPS_STORAGE_KEY);
    const history: StepHistoryMap = raw ? JSON.parse(raw) : {};

    const todayKey = new Date().toISOString().slice(0, 10);
    if (todayCount !== null) {
      history[todayKey] = todayCount;
      // Retain max 14 days
      const keys = Object.keys(history).sort();
      if (keys.length > 14) {
        const trimmed: StepHistoryMap = {};
        keys.slice(-14).forEach((k) => {
          trimmed[k] = history[k];
        });
        await AsyncStorage.setItem(DAILY_STEPS_STORAGE_KEY, JSON.stringify(trimmed));
      } else {
        await AsyncStorage.setItem(DAILY_STEPS_STORAGE_KEY, JSON.stringify(history));
      }
    }

    const availableDays = Object.values(history).filter(
      (val) => typeof val === 'number' && !isNaN(val) && val > 0
    );

    if (availableDays.length > 0) {
      const sum = availableDays.reduce((acc, curr) => acc + curr, 0);
      return Math.round(sum / availableDays.length);
    }

    if (todayCount !== null && todayCount > 0) {
      return todayCount;
    }
  } catch (err) {
    console.warn('[RiskData] Step history processing error:', err);
    if (todayCount !== null && todayCount > 0) return todayCount;
  }

  return undefined;
}

/**
 * Gets real resting heart rate from Health Connect.
 * Note: Heart rate alone will never create a risk score in the risk engine.
 */
async function getRealHealthConnectHeartRate(): Promise<number | undefined> {
  try {
    const hcLatest = await getLatestHeartRate();
    if (hcLatest && typeof hcLatest.bpm === 'number' && !isNaN(hcLatest.bpm)) {
      return hcLatest.bpm;
    }
  } catch (err) {
    console.warn('[RiskData] Error fetching Health Connect heart rate:', err);
  }

  try {
    const vitals = await getCurrentVitals();
    if (
      vitals.heartRate &&
      vitals.heartRate.source === 'Health Connect' &&
      typeof vitals.heartRate.value === 'number' &&
      !isNaN(vitals.heartRate.value)
    ) {
      return vitals.heartRate.value;
    }
  } catch (err) {
    console.warn('[RiskData] Error reading vitals for Health Connect heart rate:', err);
  }

  return undefined;
}

/**
 * Calculates BMI from profile height and weight.
 * If either is not set, returns undefined (marked missing).
 */
function getRealProfileBmi(): number | undefined {
  const profile = DataService.getProfile();
  if (
    typeof profile.heightCm === 'number' &&
    profile.heightCm > 50 &&
    typeof profile.weightKg === 'number' &&
    profile.weightKg > 20
  ) {
    const heightInMeters = profile.heightCm / 100;
    const bmiVal = profile.weightKg / (heightInMeters * heightInMeters);
    return Number(bmiVal.toFixed(1));
  }
  return undefined;
}

/**
 * Gets smoking per day from Profile or AsyncStorage.
 * Default is undefined (not set).
 */
async function getRealSmokingPerDay(): Promise<number | undefined> {
  const profile = DataService.getProfile();
  if (typeof profile.smokingPerDay === 'number' && !isNaN(profile.smokingPerDay)) {
    return profile.smokingPerDay;
  }

  try {
    const stored = await AsyncStorage.getItem(SMOKING_STORAGE_KEY);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[RiskData] Failed to get smoking status from AsyncStorage:', err);
  }

  return undefined;
}

interface TranscriptBiometrics {
  avgSleepHours?: number;
  sleepDebtHours?: number;
  lateNightMealRatio?: number;
  avgExerciseMins?: number;
}

/**
 * Analyzes answered call transcripts with Pallavi to extract sleep and meal timing.
 * If no calls or transcripts exist, returns undefined fields (missing).
 */
async function parsePallaviCallTranscripts(): Promise<TranscriptBiometrics> {
  try {
    const history: CallHistoryEntry[] = await getCallHistory();
    const answeredCalls = history.filter(
      (c) => c.status === 'answered' && Array.isArray(c.turns) && c.turns.length > 0
    );

    if (answeredCalls.length === 0) {
      return {};
    }

    const sleepValues: number[] = [];
    let totalMealMentions = 0;
    let lateMealMentions = 0;
    const exerciseValues: number[] = [];

    // Regex matchers
    const sleepHourRegex =
      /(?:slept|sleep|sleeping)(?:\s+for)?\s+(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|mani)?\b/i;
    const directSleepRegex =
      /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*(?:of\s+sleep|sleep|rest)\b/i;
    const mealMentionRegex =
      /\b(?:dinner|meal|ate|eating|food|snack|biryani|rice|sapad|lunch)\b/i;
    const lateKeywordRegex =
      /\b(?:late|10\s*pm|11\s*pm|12\s*am|midnight|night meal|10:30|11:|past 10|after 10)\b/i;
    const exerciseRegex =
      /(\d+)\s*(?:mins?|minutes?)\s*(?:of\s*)?(?:walk|walking|exercise|gym|workout|jog|running)\b/i;
    const exerciseRegex2 =
      /\b(?:walked|walk|exercise|workout|gym)\s*(?:for)?\s*(\d+)\s*(?:mins?|minutes?)\b/i;

    for (const call of answeredCalls) {
      if (!call.turns) continue;

      for (const turn of call.turns) {
        const text = turn.text || '';

        // 1. Sleep extraction
        const sMatch = text.match(sleepHourRegex) || text.match(directSleepRegex);
        if (sMatch && sMatch[1]) {
          const val = parseFloat(sMatch[1]);
          if (!isNaN(val) && val >= 1 && val <= 18) {
            sleepValues.push(val);
          }
        }

        // 2. Meal extraction
        if (mealMentionRegex.test(text)) {
          totalMealMentions += 1;
          if (lateKeywordRegex.test(text)) {
            lateMealMentions += 1;
          }
        }

        // 3. Exercise extraction
        const eMatch = text.match(exerciseRegex) || text.match(exerciseRegex2);
        if (eMatch && eMatch[1]) {
          const val = parseInt(eMatch[1], 10);
          if (!isNaN(val) && val >= 5 && val <= 240) {
            exerciseValues.push(val);
          }
        }
      }
    }

    let avgSleepHours: number | undefined = undefined;
    let sleepDebtHours: number | undefined = undefined;
    if (sleepValues.length > 0) {
      const avg = sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length;
      avgSleepHours = Number(avg.toFixed(1));
      sleepDebtHours = avgSleepHours < 8 ? Number((8 - avgSleepHours).toFixed(1)) : 0;
    }

    let lateNightMealRatio: number | undefined = undefined;
    if (totalMealMentions > 0) {
      lateNightMealRatio = Number((lateMealMentions / totalMealMentions).toFixed(2));
    }

    let avgExerciseMins: number | undefined = undefined;
    if (exerciseValues.length > 0) {
      const avgEx = exerciseValues.reduce((a, b) => a + b, 0) / exerciseValues.length;
      avgExerciseMins = Math.round(avgEx);
    }

    return {
      avgSleepHours,
      sleepDebtHours,
      lateNightMealRatio,
      avgExerciseMins,
    };
  } catch (err) {
    console.warn('[RiskData] Error parsing call transcripts:', err);
    return {};
  }
}

/**
 * Gathers all real data inputs from phone step counter, Health Connect, Profile,
 * and Pallavi's saved call transcripts.
 */
export async function collectRealRiskInputs(): Promise<RiskInput> {
  const [avgSteps, restingHeartRate, smokingPerDay, transcriptBio] = await Promise.all([
    getAverageStepsFromPhone(),
    getRealHealthConnectHeartRate(),
    getRealSmokingPerDay(),
    parsePallaviCallTranscripts(),
  ]);

  const bmi = getRealProfileBmi();

  return {
    avgSteps,
    restingHeartRate,
    smokingPerDay,
    bmi,
    avgSleepHours: transcriptBio.avgSleepHours,
    sleepDebtHours: transcriptBio.sleepDebtHours,
    lateNightMealRatio: transcriptBio.lateNightMealRatio,
    avgExerciseMins: transcriptBio.avgExerciseMins,
  };
}

/**
 * Computes on-device risk assessment from purely real device data.
 */
export async function computeRealDeviceRisks(): Promise<{
  inputs: RiskInput;
  results: RiskCategoryResult[];
  hasAnyComputedRisk: boolean;
  highestRiskLevel: 'Low' | 'Moderate' | 'Elevated' | null;
  highestRiskColor: string;
}> {
  const inputs = await collectRealRiskInputs();
  const results = evaluateRisks(inputs);

  const computedCategories = results.filter((r) => r.level !== 'Unknown');
  const hasAnyComputedRisk = computedCategories.length > 0;

  let highestRiskLevel: 'Low' | 'Moderate' | 'Elevated' | null = null;
  let highestRiskColor = '#9CA3AF';

  if (hasAnyComputedRisk) {
    const hasElevated = computedCategories.some((r) => r.level === 'Elevated');
    const hasModerate = computedCategories.some((r) => r.level === 'Moderate');

    if (hasElevated) {
      highestRiskLevel = 'Elevated';
      highestRiskColor = '#EF4444';
    } else if (hasModerate) {
      highestRiskLevel = 'Moderate';
      highestRiskColor = '#F59E0B';
    } else {
      highestRiskLevel = 'Low';
      highestRiskColor = '#10B981';
    }
  }

  return {
    inputs,
    results,
    hasAnyComputedRisk,
    highestRiskLevel,
    highestRiskColor,
  };
}
