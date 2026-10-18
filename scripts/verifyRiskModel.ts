/**
 * Verification script:
 * Loads assets/models/risk_model.json and assets/models/risk_model_testcases.json,
 * evaluates predictRiskFromModel() for each test case, and verifies that the output
 * matches Python's logistic regression probabilities within 1e-6 tolerance.
 */

import modelJson from '../assets/models/risk_model.json';
import testcasesJson from '../assets/models/risk_model_testcases.json';
import {
  predictRiskFromModel,
  RiskModelDefinition,
  RiskInputs,
} from '../src/services/riskModelCore';

declare const process: any;

interface TestCase {
  input: RiskInputs;
  probability: number;
}

function runVerification() {
  const model = modelJson as unknown as RiskModelDefinition;
  const testcases = testcasesJson as unknown as TestCase[];

  console.log(`Loaded model "${model.name}" with ${model.features.length} features.`);
  console.log(`Verifying ${testcases.length} test cases from Python export...\n`);

  let allPassed = true;
  const TOLERANCE = 1e-6;

  testcases.forEach((tc, idx) => {
    const result = predictRiskFromModel(model, tc.input);
    const diff = Math.abs(result.probability - tc.probability);
    const passed = diff <= TOLERANCE;

    if (!passed) {
      allPassed = false;
    }

    const status = passed ? 'PASS' : 'FAIL';
    console.log(
      `Case #${idx + 1}: ${status} | Py: ${tc.probability.toFixed(6)} | TS: ${result.probability.toFixed(6)} | diff: ${diff.toExponential(3)}`
    );
  });

  console.log('\n----------------------------------------');
  if (allPassed) {
    console.log(`RESULT: ALL ${testcases.length} TEST CASES PASSED (diff <= 1e-6)!`);
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(0);
    }
  } else {
    console.error('RESULT: ONE OR MORE TEST CASES FAILED!');
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1);
    }
  }
}

runVerification();
