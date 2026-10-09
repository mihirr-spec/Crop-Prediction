# CropWise: Crop Recommendation System

SEM 5 mini project. A Random Forest model recommends the best crops for a field
from 7 values: soil nitrogen, phosphorus, potassium and pH, plus temperature,
humidity and rainfall. The website shows the top 3 crops with confidence, in 8
languages (English, Hindi, Odia, Bengali, Tamil, Telugu, Kannada, Malayalam).

Live site: https://crop-prediction-amber.vercel.app

## Project structure

```
app.py                  Flask web app (pages + /api/predict)
cropwise/
  predict.py            loads the model, returns the top-3 crops
  crops.py              22 crops, their groups, averages and sample values
  i18n.py               all website text in 8 languages
model/crop_rf_model.pkl trained Random Forest
data/                   Crop_recommendation.csv (2,200 rows, 22 crops)
notebooks/              training notebook (EDA, models, evaluation)
docs/                   project report (PDF)
templates/, static/     HTML, CSS, JavaScript, crop photos
```

## Run locally

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
python app.py
```

Then open http://127.0.0.1:5000

## Model

| Model | Train accuracy | Test accuracy |
|---|---|---|
| Logistic Regression | 97.4% | 97.3% |
| Random Forest (200 trees) | 100% | 99.5% |

Crop photos are from Wikimedia Commons; authors and licences are listed at `/credits`.
