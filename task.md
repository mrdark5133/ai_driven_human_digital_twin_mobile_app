# Task Checklist: On-Device Sleep & Lifestyle Risk Model

## Phase A: Train and export the model (Python)
- [x] Check that `ml/train_risk_model.py` and CSV in `ml/data/` exist
- [x] Run `python ml/train_risk_model.py --csv "ml/data/Sleep_health_and_lifestyle_dataset.csv"`
- [x] Verify cross-validation metrics (cv_roc_auc >= 0.65: 0.7818, cv_accuracy: 0.7869)
- [x] Copy `ml/output/risk_model.json` to `assets/models/risk_model.json` and `ml/output/risk_model_testcases.json` to `assets/models/risk_model_testcases.json`

## Phase B: TypeScript predictor
- [x] Create `src/services/riskModelCore.ts`:
  - [x] Pure TypeScript, no React Native imports
  - [x] `RiskInputs` type (`age`, `sleep_duration`, `quality_of_sleep`, `physical_activity`, `stress_level`, `bmi_level`, `heart_rate`, `daily_steps`)
  - [x] `predictRiskFromModel(model, inputs)`: clamp to ranges, standardize with mean/scale, $z = \text{intercept} + \sum (\text{coef} \times \text{std})$, $\text{probability} = 1 / (1 + e^{-z})$, calculate feature contributions
- [x] Create `src/services/riskModel.ts`:
  - [x] Import `assets/models/risk_model.json`
  - [x] `buildRiskInputs()`: gather profile age/height/weight (BMI < 25 -> 0, < 30 -> 1, else 2), live heart rate (watch/Health Connect), 7d/daily steps, sleep hours, sleep score/10, stress index/10, active minutes or steps/100; tag sources ("profile" | "watch" | "call" | "demo")
  - [x] `getRiskAssessment()`: returns `{ probability, percent, band, topRiskFactors, protectiveFactors, inputs, sources, isDemo }`
  - [x] `getRiskContextLine()`: short single line for Pallavi context card
- [x] Create verification script `scripts/verifyRiskModel.ts` and verify with `npx --yes tsx scripts/verifyRiskModel.ts` (pass/fail per test case, diff < 1e-6)

## Phase C: Show it in the app
- [x] Add "Sleep & Lifestyle Risk" card to `app/(tabs)/insights.tsx` near top:
  - [x] Percent and band (Low = green, Moderate = amber, High = red)
  - [x] Horizontal bar indicator
  - [x] 2-3 "Main reasons" and 1 "What helps" line
  - [x] Source chips for inputs (Profile / Watch / Call / Demo)
  - [x] "About this model" expandable section / modal with training data info, CV metrics, and disclaimer
  - [x] Demo notice when `isDemo` is true ("Based partly on demo data")
  - [x] Disclaimer: "Lifestyle risk indicator, not medical advice."
- [x] Home screen: add small risk indicator pill linking directly to Insights

## Phase D: Give it to Pallavi
- [x] Add `getRiskContextLine()` to the context card used by assistant chat (`app/(tabs)/assistant.tsx`) and voice call prompts (`src/services/voice/callAgent.ts`, `llm.ts`)
- [x] Update system prompt instructions: "If Dark asks about his health risk, explain it simply in the same style he writes (Tanglish or English), using only the risk line you were given. It is a lifestyle indicator, not a diagnosis. Suggest one small habit. Never invent numbers."
- [x] Ensure LLM prefix warm-up uses identical context card text for KV cache validity
- [x] Ensure risk line does not appear in scheduled call openers

## Verification & Strict Checks
- [x] Run `npx tsc --noEmit` (0 errors)
- [x] Verify test checklist
