"""
Train a small, explainable "sleep & lifestyle risk" model and export it as JSON
so the React Native app can run it in plain TypeScript (no native ML runtime).

Run from your project folder (PowerShell):
    pip install pandas numpy scikit-learn
    python ml/train_risk_model.py --csv "ml/data/Sleep_health_and_lifestyle_dataset.csv"

Outputs (in ml/output/):
    risk_model.json            -> model numbers + metrics for the app
    risk_model_testcases.json  -> sample rows + Python probabilities, used later
                                  to check that the TypeScript predictor matches
"""
import argparse
import json
import os
import sys

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

# Only features the phone app can really get:
#   age + height/weight (profile), heart rate + steps (Health Connect),
#   sleep hours / sleep quality / stress / activity (Pallavi's calls + stress index)
# Blood pressure, gender and occupation are NOT used on purpose.
FEATURES = [
    "age",
    "sleep_duration",
    "quality_of_sleep",
    "physical_activity",
    "stress_level",
    "bmi_level",
    "heart_rate",
    "daily_steps",
]

ALIASES = {
    "age": ["age"],
    "sleep_duration": ["sleep_duration", "sleep_hours"],
    "quality_of_sleep": ["quality_of_sleep", "sleep_quality"],
    "physical_activity": ["physical_activity_level", "physical_activity", "activity_level"],
    "stress_level": ["stress_level", "stress"],
    "bmi": ["bmi_category", "bmi"],
    "heart_rate": ["heart_rate", "resting_heart_rate", "rhr"],
    "daily_steps": ["daily_steps", "steps"],
    "target": ["sleep_disorder", "disorder"],
}


def find_col(df, key):
    for name in ALIASES[key]:
        if name in df.columns:
            return name
    return None


def bmi_to_level(series):
    """0 = normal, 1 = overweight, 2 = obese. Works for text categories or real BMI numbers."""
    if pd.api.types.is_numeric_dtype(series):
        return pd.cut(series, bins=[-np.inf, 24.99, 29.99, np.inf], labels=[0, 1, 2]).astype(float)
    mapping = {"normal": 0, "normal weight": 0, "overweight": 1, "obese": 2}
    return series.astype(str).str.strip().str.lower().map(mapping)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, help="Path to the Sleep Health CSV")
    parser.add_argument("--out", default="ml/output", help="Output folder")
    args = parser.parse_args()

    if not os.path.exists(args.csv):
        sys.exit(f"CSV not found: {args.csv}")

    # keep_default_na=False: otherwise pandas turns the text "None" (no sleep disorder) into NaN
    raw = pd.read_csv(args.csv, keep_default_na=False, na_values=[""])
    raw.columns = [c.strip().lower().replace(" ", "_") for c in raw.columns]
    print("Columns found:", list(raw.columns))
    print("Rows:", len(raw))

    cols = {k: find_col(raw, k) for k in ALIASES}
    missing = [k for k, v in cols.items() if v is None]
    if missing:
        sys.exit(
            f"These needed columns were not found: {missing}\n"
            f"Tell me the column names printed above and I will adjust the script."
        )

    df = pd.DataFrame()
    df["age"] = pd.to_numeric(raw[cols["age"]], errors="coerce")
    df["sleep_duration"] = pd.to_numeric(raw[cols["sleep_duration"]], errors="coerce")
    df["quality_of_sleep"] = pd.to_numeric(raw[cols["quality_of_sleep"]], errors="coerce")
    df["physical_activity"] = pd.to_numeric(raw[cols["physical_activity"]], errors="coerce")
    df["stress_level"] = pd.to_numeric(raw[cols["stress_level"]], errors="coerce")
    df["bmi_level"] = bmi_to_level(raw[cols["bmi"]])
    df["heart_rate"] = pd.to_numeric(raw[cols["heart_rate"]], errors="coerce")
    df["daily_steps"] = pd.to_numeric(raw[cols["daily_steps"]], errors="coerce")

    target_text = raw[cols["target"]].astype(str).str.strip().str.lower().replace("", "none")
    print("Target values:", target_text.value_counts().to_dict())
    df["target"] = (target_text != "none").astype(int)

    before = len(df)
    df = df.dropna(subset=FEATURES + ["target"])
    print(f"Dropped {before - len(df)} rows with missing values")

    # Many rows in this dataset repeat. Duplicates make cross-validation look too good.
    before = len(df)
    df = df.drop_duplicates(subset=FEATURES + ["target"]).reset_index(drop=True)
    print(f"Dropped {before - len(df)} duplicate rows -> {len(df)} unique rows used")

    X = df[FEATURES].values.astype(float)
    y = df["target"].values
    positive_rate = float(y.mean())
    print(f"At-risk share (Insomnia or Sleep Apnea): {positive_rate:.2%}")
    if len(df) < 60 or y.sum() < 15 or (len(y) - y.sum()) < 15:
        sys.exit("Too few rows in one class to train a reliable model.")

    model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000, C=1.0))

    # Honest evaluation: 5-fold cross-validation (each row is predicted by a model that never saw it)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    proba = cross_val_predict(model, X, y, cv=cv, method="predict_proba")[:, 1]
    pred = (proba >= 0.5).astype(int)
    baseline = max(positive_rate, 1 - positive_rate)
    metrics = {
        "cv_accuracy": round(float(accuracy_score(y, pred)), 4),
        "cv_roc_auc": round(float(roc_auc_score(y, proba)), 4),
        "cv_precision": round(float(precision_score(y, pred, zero_division=0)), 4),
        "cv_recall": round(float(recall_score(y, pred, zero_division=0)), 4),
        "majority_baseline_accuracy": round(float(baseline), 4),
        "rows_used": int(len(df)),
        "at_risk_share": round(positive_rate, 4),
    }
    tn, fp, fn, tp = confusion_matrix(y, pred).ravel()
    print("\n=== Cross-validated results (5-fold) ===")
    for k, v in metrics.items():
        print(f"  {k}: {v}")
    print(f"  confusion matrix: TN={tn} FP={fp} FN={fn} TP={tp}")

    # Final model trained on all rows
    model.fit(X, y)
    scaler = model.named_steps["standardscaler"]
    lr = model.named_steps["logisticregression"]

    print("\n=== What the model relies on (bigger = stronger, sign = direction) ===")
    order = np.argsort(-np.abs(lr.coef_[0]))
    for i in order:
        print(f"  {FEATURES[i]:<20} {lr.coef_[0][i]:+.3f}")

    os.makedirs(args.out, exist_ok=True)
    export = {
        "version": 1,
        "name": "sleep_lifestyle_risk_logreg",
        "target": "Sleep disorder present (Insomnia or Sleep Apnea) in the training data",
        "features": FEATURES,
        "mean": [float(v) for v in scaler.mean_],
        "scale": [float(v) for v in scaler.scale_],
        "coef": [float(v) for v in lr.coef_[0]],
        "intercept": float(lr.intercept_[0]),
        "ranges": {f: [float(df[f].min()), float(df[f].max())] for f in FEATURES},
        "bmi_levels": {"normal": 0, "overweight": 1, "obese": 2},
        "bands": {"low_max": 0.35, "moderate_max": 0.65},
        "metrics": metrics,
        "disclaimer": "Lifestyle risk indicator trained on a small public dataset. Not a medical diagnosis.",
    }
    with open(os.path.join(args.out, "risk_model.json"), "w", encoding="utf-8") as f:
        json.dump(export, f, indent=2)

    # Sample rows so the TypeScript version can be checked against Python
    sample = df.sample(n=min(10, len(df)), random_state=7)
    cases = []
    for _, row in sample.iterrows():
        x = row[FEATURES].values.astype(float).reshape(1, -1)
        cases.append(
            {
                "input": {f: float(row[f]) for f in FEATURES},
                "probability": float(model.predict_proba(x)[0, 1]),
            }
        )
    with open(os.path.join(args.out, "risk_model_testcases.json"), "w", encoding="utf-8") as f:
        json.dump(cases, f, indent=2)

    print(f"\nSaved: {os.path.join(args.out, 'risk_model.json')}")
    print(f"Saved: {os.path.join(args.out, 'risk_model_testcases.json')}")


if __name__ == "__main__":
    main()
