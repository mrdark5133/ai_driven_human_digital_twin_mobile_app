/**
 * Unit-style verification tests for Risk Engine.
 * Tests confidence ratings ("full" vs "partial"), limited data pill display,
 * and rule-based risk evaluation across sample profiles.
 */

import { evaluateRisks, RiskInput } from './riskEngine';

function runTests() {
  console.log('=====================================================');
  console.log('🧪 RUNNING ON-DEVICE RISK ENGINE TESTS');
  console.log('=====================================================\n');

  // TEST 1: Full-Data Healthy Profile (Test 4b)
  const fullHealthyInput: RiskInput = {
    avgSteps: 10000,
    avgSleepHours: 7.5,
    sleepDebtHours: 0,
    smokingPerDay: 0,
    bmi: 22.0,
    lateNightMealRatio: 0,
    avgExerciseMins: 45,
    restingHeartRate: 64,
  };

  console.log('--- TEST 1: Full-Data Healthy Profile (Target: confidence="full" & normal green Low) ---');
  console.log('Input:', JSON.stringify(fullHealthyInput, null, 2));
  const fullHealthyResults = evaluateRisks(fullHealthyInput);
  console.log('Results:');
  fullHealthyResults.forEach((res) => {
    console.log(
      `  [${res.category}] Level: ${res.level} | Confidence: "${res.confidence}" | DisplayText: "${res.displayText}" | Color: ${res.color}`
    );
    if (res.drivers.length > 0) console.log(`    Drivers: ${res.drivers.join('; ')}`);
    if (res.missing.length > 0) console.log(`    Missing: ${res.missing.join('; ')}`);
  });

  // Verification 4b assertions
  const allFull = fullHealthyResults.every((r) => r.confidence === 'full');
  const allGreenLow = fullHealthyResults.every((r) => r.level === 'Low' && r.color === '#10B981');
  console.log(
    `👉 VERIFICATION (b): All categories confidence="full": ${allFull ? 'PASSED ✅' : 'FAILED ❌'}`
  );
  console.log(
    `👉 VERIFICATION (b): All categories normal green Low: ${allGreenLow ? 'PASSED ✅' : 'FAILED ❌'}`
  );
  console.log('\n');

  // TEST 2: Smoker with Low Steps (Target: Metabolic confidence="partial" & display "Low (limited data)")
  const smokerInput: RiskInput = {
    avgSteps: 2500,
    smokingPerDay: 10,
    avgExerciseMins: 10,
    avgSleepHours: 5.5,
    sleepDebtHours: 2.5,
  };

  console.log('--- TEST 2: Smoker with Low Steps (Target: Metabolic confidence="partial" & "Low (limited data)") ---');
  console.log('Input:', JSON.stringify(smokerInput, null, 2));
  const smokerResults = evaluateRisks(smokerInput);
  console.log('Results:');
  smokerResults.forEach((res) => {
    console.log(
      `  [${res.category}] Level: ${res.level} | Confidence: "${res.confidence}" | DisplayText: "${res.displayText}" | Color: ${res.color}`
    );
    if (res.drivers.length > 0) console.log(`    Drivers: ${res.drivers.join('; ')}`);
    if (res.missing.length > 0) console.log(`    Missing: ${res.missing.join('; ')}`);
  });

  // Verification 4a assertions
  const metabolicRes = smokerResults.find((r) => r.category === 'Metabolic');
  const isMetabolicPartial = metabolicRes?.confidence === 'partial';
  const isMetabolicLowLimited = metabolicRes?.displayText === 'Low (limited data)';
  const isMetabolicGrey = metabolicRes?.color === '#9CA3AF';
  console.log(
    `👉 VERIFICATION (a): Test 2 Metabolic confidence="partial": ${isMetabolicPartial ? 'PASSED ✅' : 'FAILED ❌'}`
  );
  console.log(
    `👉 VERIFICATION (a): Test 2 Metabolic displays "Low (limited data)": ${isMetabolicLowLimited ? 'PASSED ✅' : 'FAILED ❌'}`
  );
  console.log(
    `👉 VERIFICATION (a): Test 2 Metabolic grey outline color (#9CA3AF): ${isMetabolicGrey ? 'PASSED ✅' : 'FAILED ❌'}`
  );
  console.log('\n');

  // TEST 3: High BMI with Late Meals
  const highBmiInput: RiskInput = {
    bmi: 32.5,
    lateNightMealRatio: 0.45,
    avgSteps: 3500,
    sleepDebtHours: 2.0,
  };

  console.log('--- TEST 3: High BMI with Late Meals ---');
  console.log('Input:', JSON.stringify(highBmiInput, null, 2));
  const highBmiResults = evaluateRisks(highBmiInput);
  console.log('Results:');
  highBmiResults.forEach((res) => {
    console.log(
      `  [${res.category}] Level: ${res.level} | Confidence: "${res.confidence}" | DisplayText: "${res.displayText}" | Color: ${res.color}`
    );
    if (res.drivers.length > 0) console.log(`    Drivers: ${res.drivers.join('; ')}`);
    if (res.missing.length > 0) console.log(`    Missing: ${res.missing.join('; ')}`);
  });
  console.log('\n');

  // TEST 4: No Real Inputs (Heart Rate alone must NOT create a risk score)
  const hrOnlyInput: RiskInput = {
    restingHeartRate: 74,
  };

  console.log('--- TEST 4: Heart Rate Only (Must be "Unknown" with displayText="Need data") ---');
  console.log('Input:', JSON.stringify(hrOnlyInput, null, 2));
  const hrOnlyResults = evaluateRisks(hrOnlyInput);
  console.log('Results:');
  hrOnlyResults.forEach((res) => {
    console.log(
      `  [${res.category}] Level: ${res.level} | Confidence: "${res.confidence}" | DisplayText: "${res.displayText}" | Color: ${res.color}`
    );
    if (res.drivers.length > 0) console.log(`    Drivers: ${res.drivers.join('; ')}`);
    if (res.missing.length > 0) console.log(`    Missing: ${res.missing.join('; ')}`);
  });
  console.log('\n');
}

// Auto-run when invoked
runTests();
