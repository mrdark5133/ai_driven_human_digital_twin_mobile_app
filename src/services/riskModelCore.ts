/**
 * Core mathematical evaluation for Sleep & Lifestyle Risk Model.
 * Pure TypeScript with ZERO React Native / native dependencies so it can run
 * seamlessly in Node.js, CLI scripts, or inside the mobile app.
 */

export interface RiskModelDefinition {
  version: number;
  name: string;
  target: string;
  features: string[];
  mean: number[];
  scale: number[];
  coef: number[];
  intercept: number;
  ranges: Record<string, [number, number]>;
  bmi_levels: Record<string, number>;
  bands: {
    low_max: number;
    moderate_max: number;
  };
  metrics: {
    cv_accuracy: number;
    cv_roc_auc: number;
    cv_precision: number;
    cv_recall: number;
    majority_baseline_accuracy: number;
    rows_used: number;
    at_risk_share: number;
  };
  disclaimer: string;
}

export interface RiskInputs {
  age: number;
  sleep_duration: number;
  quality_of_sleep: number;
  physical_activity: number;
  stress_level: number;
  bmi_level: number;
  heart_rate: number;
  daily_steps: number;
}

export interface FeatureContribution {
  feature: keyof RiskInputs;
  value: number;
  clampedValue: number;
  standardizedValue: number;
  coef: number;
  contribution: number;
}

export interface RiskPredictionResult {
  probability: number;
  contributions: Record<keyof RiskInputs, number>;
  detailedContributions: FeatureContribution[];
}

/**
 * Evaluates logistic regression risk model from pre-trained coefficients and scaling parameters.
 * Clamps inputs to training range, standardizes, computes logit z, and applies sigmoid activation.
 */
export function predictRiskFromModel(
  model: RiskModelDefinition,
  inputs: RiskInputs
): RiskPredictionResult {
  const contributions: Partial<Record<keyof RiskInputs, number>> = {};
  const detailedContributions: FeatureContribution[] = [];

  let z = model.intercept;

  for (let i = 0; i < model.features.length; i++) {
    const featName = model.features[i] as keyof RiskInputs;
    const rawVal = typeof inputs[featName] === 'number' ? inputs[featName] : 0;

    // 1. Clamp to training range
    const range = model.ranges[featName];
    const clampedVal = range
      ? Math.max(range[0], Math.min(range[1], rawVal))
      : rawVal;

    // 2. Standardize: (clamped - mean) / scale
    const mean = model.mean[i];
    const scale = model.scale[i];
    const standardized = scale !== 0 ? (clampedVal - mean) / scale : 0;

    // 3. Contribution = coef * standardized
    const coef = model.coef[i];
    const contrib = coef * standardized;

    contributions[featName] = contrib;
    detailedContributions.push({
      feature: featName,
      value: rawVal,
      clampedValue: clampedVal,
      standardizedValue: standardized,
      coef,
      contribution: contrib,
    });

    z += contrib;
  }

  // 4. Sigmoid activation: 1 / (1 + exp(-z))
  const probability = 1 / (1 + Math.exp(-z));

  return {
    probability,
    contributions: contributions as Record<keyof RiskInputs, number>,
    detailedContributions,
  };
}
