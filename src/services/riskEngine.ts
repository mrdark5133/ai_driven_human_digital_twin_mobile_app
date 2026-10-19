/**
 * On-Device Rule-Based Risk Engine
 * Pure TypeScript with ZERO external dependencies or native modules.
 * Evaluates lifestyle and biometric risks across 4 distinct health categories:
 * - Cardiovascular
 * - Metabolic
 * - Respiratory
 * - Lifestyle
 */

export interface RiskInput {
  avgSteps?: number;
  avgSleepHours?: number;
  sleepDebtHours?: number;
  smokingPerDay?: number;
  bmi?: number;
  lateNightMealRatio?: number; // 0 to 1
  avgExerciseMins?: number;
  restingHeartRate?: number;
}

export type RiskCategory = 'Cardiovascular' | 'Metabolic' | 'Respiratory' | 'Lifestyle';

export type RiskLevel = 'Low' | 'Moderate' | 'Elevated' | 'Unknown';

export type RiskConfidence = 'full' | 'partial';

export interface RiskCategoryResult {
  category: RiskCategory;
  score: number; // 0.05 to 0.95
  level: RiskLevel;
  confidence: RiskConfidence;
  color: string;
  explanation: string;
  drivers: string[];
  missing: string[];
  displayText: string;
}

const LEVEL_COLORS: Record<RiskLevel, string> = {
  Low: '#10B981',
  Moderate: '#F59E0B',
  Elevated: '#EF4444',
  Unknown: '#9CA3AF',
};

function clampScore(score: number): number {
  return Number(Math.max(0.05, Math.min(0.95, score)).toFixed(2));
}

function resolveLevel(score: number): RiskLevel {
  if (score < 0.35) return 'Low';
  if (score < 0.65) return 'Moderate';
  return 'Elevated';
}

/**
 * Evaluates Cardiovascular Risk.
 * Inputs: steps, smoking, bmi, sleepDebt
 * Base: 0.15
 * Rules:
 *   steps < 4000: +0.22
 *   steps < 6500: +0.10
 *   steps > 9000: -0.08
 *   smoking > 0: + min(0.35, 0.12 + smoking * 0.04)
 *   bmi >= 30: +0.20
 *   bmi >= 25: +0.10
 *   bmi < 18.5: +0.05
 *   sleepDebt > 1.5: +0.12
 *
 * NOTE: Heart rate alone must not create a risk score.
 */
function evaluateCardiovascular(input: RiskInput): RiskCategoryResult {
  const { avgSteps, smokingPerDay, bmi, sleepDebtHours } = input;

  const hasRealInput =
    (avgSteps !== undefined && !isNaN(avgSteps)) ||
    (smokingPerDay !== undefined && !isNaN(smokingPerDay)) ||
    (bmi !== undefined && !isNaN(bmi)) ||
    (sleepDebtHours !== undefined && !isNaN(sleepDebtHours));

  const explanation =
    'Cardiovascular risk evaluates heart and vascular strain based on daily steps, smoking exposure, body mass index, and sleep recovery debt.';

  if (!hasRealInput) {
    const missing: string[] = [];
    if (avgSteps === undefined) missing.push('steps from phone step counter');
    if (smokingPerDay === undefined) missing.push('smoking status in Profile');
    if (bmi === undefined) missing.push('BMI from Profile');
    if (sleepDebtHours === undefined) missing.push('sleep debt from Pallavi call');

    return {
      category: 'Cardiovascular',
      score: clampScore(0.15),
      level: 'Unknown',
      confidence: 'partial',
      color: LEVEL_COLORS.Unknown,
      explanation,
      drivers: [],
      missing,
      displayText: 'Need data',
    };
  }

  let score = 0.15;
  const drivers: string[] = [];
  const missing: string[] = [];

  // Steps
  if (typeof avgSteps === 'number' && !isNaN(avgSteps)) {
    if (avgSteps < 4000) {
      score += 0.22;
      drivers.push(`Daily steps below 4,000 (${Math.round(avgSteps).toLocaleString()} steps)`);
    } else if (avgSteps < 6500) {
      score += 0.10;
      drivers.push(`Daily steps below 6,500 (${Math.round(avgSteps).toLocaleString()} steps)`);
    } else if (avgSteps > 9000) {
      score -= 0.08;
      drivers.push(`Daily steps above 9,000 (${Math.round(avgSteps).toLocaleString()} steps)`);
    }
  } else {
    missing.push('steps from phone step counter');
  }

  // Smoking
  if (typeof smokingPerDay === 'number' && !isNaN(smokingPerDay)) {
    if (smokingPerDay > 0) {
      const penalty = Math.min(0.35, 0.12 + smokingPerDay * 0.04);
      score += penalty;
      drivers.push(`Smoking ${smokingPerDay} cigs/day (+${penalty.toFixed(2)})`);
    }
  } else {
    missing.push('smoking status in Profile');
  }

  // BMI
  if (typeof bmi === 'number' && !isNaN(bmi)) {
    if (bmi >= 30) {
      score += 0.20;
      drivers.push(`BMI >= 30 (${bmi.toFixed(1)})`);
    } else if (bmi >= 25) {
      score += 0.10;
      drivers.push(`BMI >= 25 (${bmi.toFixed(1)})`);
    } else if (bmi < 18.5) {
      score += 0.05;
      drivers.push(`BMI < 18.5 (${bmi.toFixed(1)})`);
    }
  } else {
    missing.push('BMI from Profile');
  }

  // Sleep Debt
  if (typeof sleepDebtHours === 'number' && !isNaN(sleepDebtHours)) {
    if (sleepDebtHours > 1.5) {
      score += 0.12;
      drivers.push(`Sleep debt > 1.5h (${sleepDebtHours.toFixed(1)}h)`);
    }
  } else {
    missing.push('sleep debt from Pallavi call');
  }

  const finalScore = clampScore(score);
  const level = resolveLevel(finalScore);
  const confidence: RiskConfidence = missing.length === 0 ? 'full' : 'partial';
  const isPartialLow = level === 'Low' && confidence === 'partial';
  const color = isPartialLow ? LEVEL_COLORS.Unknown : LEVEL_COLORS[level];
  const displayText = isPartialLow ? 'Low (limited data)' : level;

  return {
    category: 'Cardiovascular',
    score: finalScore,
    level,
    confidence,
    color,
    explanation,
    drivers,
    missing,
    displayText,
  };
}

/**
 * Evaluates Metabolic Risk.
 * Inputs: bmi, lateNightMealRatio, steps
 * Base: 0.18
 * Rules:
 *   bmi >= 30: +0.25
 *   bmi >= 25: +0.14
 *   lateNightMealRatio > 0.3: +0.18
 *   lateNightMealRatio > 0.1: +0.08
 *   steps < 3000: +0.15
 *   steps > 7500: -0.08
 */
function evaluateMetabolic(input: RiskInput): RiskCategoryResult {
  const { bmi, lateNightMealRatio, avgSteps } = input;

  const hasRealInput =
    (bmi !== undefined && !isNaN(bmi)) ||
    (lateNightMealRatio !== undefined && !isNaN(lateNightMealRatio)) ||
    (avgSteps !== undefined && !isNaN(avgSteps));

  const explanation =
    'Metabolic risk reflects insulin response and cardiometabolic stress influenced by body weight, late meal timing, and physical movement.';

  if (!hasRealInput) {
    const missing: string[] = [];
    if (bmi === undefined) missing.push('BMI from Profile');
    if (lateNightMealRatio === undefined) missing.push('meal timing from Pallavi call');
    if (avgSteps === undefined) missing.push('steps from phone step counter');

    return {
      category: 'Metabolic',
      score: clampScore(0.18),
      level: 'Unknown',
      confidence: 'partial',
      color: LEVEL_COLORS.Unknown,
      explanation,
      drivers: [],
      missing,
      displayText: 'Need data',
    };
  }

  let score = 0.18;
  const drivers: string[] = [];
  const missing: string[] = [];

  // BMI
  if (typeof bmi === 'number' && !isNaN(bmi)) {
    if (bmi >= 30) {
      score += 0.25;
      drivers.push(`BMI >= 30 (${bmi.toFixed(1)})`);
    } else if (bmi >= 25) {
      score += 0.14;
      drivers.push(`BMI >= 25 (${bmi.toFixed(1)})`);
    }
  } else {
    missing.push('BMI from Profile');
  }

  // Late Night Meal Ratio
  if (typeof lateNightMealRatio === 'number' && !isNaN(lateNightMealRatio)) {
    if (lateNightMealRatio > 0.3) {
      score += 0.18;
      drivers.push(`Frequent late-night meals (>${Math.round(lateNightMealRatio * 100)}%)`);
    } else if (lateNightMealRatio > 0.1) {
      score += 0.08;
      drivers.push(`Occasional late-night meals (>${Math.round(lateNightMealRatio * 100)}%)`);
    }
  } else {
    missing.push('meal timing from Pallavi call');
  }

  // Steps
  if (typeof avgSteps === 'number' && !isNaN(avgSteps)) {
    if (avgSteps < 3000) {
      score += 0.15;
      drivers.push(`Daily steps below 3,000 (${Math.round(avgSteps).toLocaleString()} steps)`);
    } else if (avgSteps > 7500) {
      score -= 0.08;
      drivers.push(`Daily steps above 7,500 (${Math.round(avgSteps).toLocaleString()} steps)`);
    }
  } else {
    missing.push('steps from phone step counter');
  }

  const finalScore = clampScore(score);
  const level = resolveLevel(finalScore);
  const confidence: RiskConfidence = missing.length === 0 ? 'full' : 'partial';
  const isPartialLow = level === 'Low' && confidence === 'partial';
  const color = isPartialLow ? LEVEL_COLORS.Unknown : LEVEL_COLORS[level];
  const displayText = isPartialLow ? 'Low (limited data)' : level;

  return {
    category: 'Metabolic',
    score: finalScore,
    level,
    confidence,
    color,
    explanation,
    drivers,
    missing,
    displayText,
  };
}

/**
 * Evaluates Respiratory Risk.
 * Inputs: smoking, avgExerciseMins, steps
 * Base: 0.12
 * Rules:
 *   smoking > 5: +0.55
 *   smoking > 0: +0.30
 *   avgExerciseMins < 15: +0.10
 *   avgExerciseMins > 35: -0.08
 */
function evaluateRespiratory(input: RiskInput): RiskCategoryResult {
  const { smokingPerDay, avgExerciseMins, avgSteps } = input;

  const hasRealInput =
    (smokingPerDay !== undefined && !isNaN(smokingPerDay)) ||
    (avgExerciseMins !== undefined && !isNaN(avgExerciseMins)) ||
    (avgSteps !== undefined && !isNaN(avgSteps));

  const explanation =
    'Respiratory risk estimates pulmonary load and airway resistance derived from active smoking habits and aerobic exercise conditioning.';

  if (!hasRealInput) {
    const missing: string[] = [];
    if (smokingPerDay === undefined) missing.push('smoking status in Profile');
    if (avgExerciseMins === undefined) missing.push('exercise minutes from activity / call');
    if (avgSteps === undefined) missing.push('steps from phone step counter');

    return {
      category: 'Respiratory',
      score: clampScore(0.12),
      level: 'Unknown',
      confidence: 'partial',
      color: LEVEL_COLORS.Unknown,
      explanation,
      drivers: [],
      missing,
      displayText: 'Need data',
    };
  }

  let score = 0.12;
  const drivers: string[] = [];
  const missing: string[] = [];

  // Smoking
  if (typeof smokingPerDay === 'number' && !isNaN(smokingPerDay)) {
    if (smokingPerDay > 5) {
      score += 0.55;
      drivers.push(`Heavy smoking (${smokingPerDay} cigs/day)`);
    } else if (smokingPerDay > 0) {
      score += 0.30;
      drivers.push(`Smoking ${smokingPerDay} cigs/day`);
    }
  } else {
    missing.push('smoking status in Profile');
  }

  // Exercise
  if (typeof avgExerciseMins === 'number' && !isNaN(avgExerciseMins)) {
    if (avgExerciseMins < 15) {
      score += 0.10;
      drivers.push(`Daily exercise below 15 mins (${avgExerciseMins}m)`);
    } else if (avgExerciseMins > 35) {
      score -= 0.08;
      drivers.push(`Daily exercise above 35 mins (${avgExerciseMins}m)`);
    }
  } else {
    missing.push('exercise minutes from activity / call');
  }

  // Steps check for confidence
  if (typeof avgSteps !== 'number' || isNaN(avgSteps)) {
    missing.push('steps from phone step counter');
  }

  const finalScore = clampScore(score);
  const level = resolveLevel(finalScore);
  const confidence: RiskConfidence = missing.length === 0 ? 'full' : 'partial';
  const isPartialLow = level === 'Low' && confidence === 'partial';
  const color = isPartialLow ? LEVEL_COLORS.Unknown : LEVEL_COLORS[level];
  const displayText = isPartialLow ? 'Low (limited data)' : level;

  return {
    category: 'Respiratory',
    score: finalScore,
    level,
    confidence,
    color,
    explanation,
    drivers,
    missing,
    displayText,
  };
}

/**
 * Evaluates Lifestyle Risk.
 * Inputs: sleepHours, steps
 * Base: 0.15
 * Rules:
 *   sleepHours < 6: +0.28
 *   sleepHours < 7: +0.14
 *   steps < 4000: +0.15
 */
function evaluateLifestyle(input: RiskInput): RiskCategoryResult {
  const { avgSleepHours, avgSteps } = input;

  const hasRealInput =
    (avgSleepHours !== undefined && !isNaN(avgSleepHours)) ||
    (avgSteps !== undefined && !isNaN(avgSteps));

  const explanation =
    'Lifestyle risk aggregates foundational daily behaviors, primarily focusing on restorative sleep duration and baseline physical movement.';

  if (!hasRealInput) {
    const missing: string[] = [];
    if (avgSleepHours === undefined) missing.push('sleep from Pallavi call');
    if (avgSteps === undefined) missing.push('steps from phone step counter');

    return {
      category: 'Lifestyle',
      score: clampScore(0.15),
      level: 'Unknown',
      confidence: 'partial',
      color: LEVEL_COLORS.Unknown,
      explanation,
      drivers: [],
      missing,
      displayText: 'Need data',
    };
  }

  let score = 0.15;
  const drivers: string[] = [];
  const missing: string[] = [];

  // Sleep hours
  if (typeof avgSleepHours === 'number' && !isNaN(avgSleepHours)) {
    if (avgSleepHours < 6) {
      score += 0.28;
      drivers.push(`Sleep under 6 hours (${avgSleepHours.toFixed(1)}h)`);
    } else if (avgSleepHours < 7) {
      score += 0.14;
      drivers.push(`Sleep under 7 hours (${avgSleepHours.toFixed(1)}h)`);
    }
  } else {
    missing.push('sleep from Pallavi call');
  }

  // Steps
  if (typeof avgSteps === 'number' && !isNaN(avgSteps)) {
    if (avgSteps < 4000) {
      score += 0.15;
      drivers.push(`Daily steps below 4,000 (${Math.round(avgSteps).toLocaleString()} steps)`);
    }
  } else {
    missing.push('steps from phone step counter');
  }

  const finalScore = clampScore(score);
  const level = resolveLevel(finalScore);
  const confidence: RiskConfidence = missing.length === 0 ? 'full' : 'partial';
  const isPartialLow = level === 'Low' && confidence === 'partial';
  const color = isPartialLow ? LEVEL_COLORS.Unknown : LEVEL_COLORS[level];
  const displayText = isPartialLow ? 'Low (limited data)' : level;

  return {
    category: 'Lifestyle',
    score: finalScore,
    level,
    confidence,
    color,
    explanation,
    drivers,
    missing,
    displayText,
  };
}

/**
 * Evaluates the full set of 4 risk categories from the provided RiskInput.
 * Pure TypeScript, synchronous, zero external dependencies.
 */
export function evaluateRisks(input: RiskInput = {}): RiskCategoryResult[] {
  return [
    evaluateCardiovascular(input),
    evaluateMetabolic(input),
    evaluateRespiratory(input),
    evaluateLifestyle(input),
  ];
}
