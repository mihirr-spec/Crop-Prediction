"""Top-k crop recommendation using the trained Random Forest model."""
from pathlib import Path

import joblib
import pandas as pd

MODEL_PATH = Path(__file__).with_name("crop_rf_model.pkl")

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

# Min/max of each feature in Crop_recommendation.csv
TRAINING_RANGES = {
    "N": (0, 140),
    "P": (5, 145),
    "K": (5, 205),
    "temperature": (8.8, 43.7),
    "humidity": (14.3, 100),
    "ph": (3.5, 9.9),
    "rainfall": (20.2, 298.6),
}

_model = None


def load_model():
    """Load the model once and reuse it."""
    global _model
    if _model is None:
        _model = joblib.load(MODEL_PATH)
    return _model


def recommend_top_k(values, k=3):
    """Return the k most likely crops for the given soil/climate values.

    values: dict with keys N, P, K, temperature, humidity, ph, rainfall
    returns: {"top": [{"crop": str, "confidence": float}, ...],
              "warnings": [str, ...]}
    """
    missing = [f for f in FEATURES if f not in values]
    if missing:
        raise ValueError(f"Missing fields: {', '.join(missing)}")

    row = {f: float(values[f]) for f in FEATURES}

    warnings = []
    for f, (lo, hi) in TRAINING_RANGES.items():
        if not lo <= row[f] <= hi:
            warnings.append(f"{f} outside training range ({lo}-{hi})")

    model = load_model()
    proba = model.predict_proba(pd.DataFrame([row], columns=FEATURES))[0]
    top_idx = proba.argsort()[::-1][:k]

    top = [
        {"crop": str(model.classes_[i]), "confidence": round(float(proba[i]), 4)}
        for i in top_idx
    ]
    return {"top": top, "warnings": warnings}


if __name__ == "__main__":
    sample = {"N": 90, "P": 42, "K": 43, "temperature": 20.9,
              "humidity": 82, "ph": 6.5, "rainfall": 203}
    result = recommend_top_k(sample)
    for rank, item in enumerate(result["top"], 1):
        print(f"{rank}. {item['crop']:<12} {item['confidence']:.1%}")
    for w in result["warnings"]:
        print("Warning:", w)
