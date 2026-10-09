# Crop Recommender — Web Pages Specification

This document describes the web pages for the Crop Recommendation System.
The pages are a front end for the trained Random Forest model (`crop_rf_model.pkl`).
The user enters soil and climate readings, and the site recommends the best crops.

---

## 0. Overall Structure

| # | Page | URL | Purpose |
|---|------|-----|---------|
| 1 | Home | `/` | Introduce the project and link to the predictor |
| 2 | Recommend | `/recommend` | Input form where the user enters soil and climate values |
| 3 | Result | `/result` | Show the top-3 recommended crops with confidence |
| 4 | Crop Library | `/crops` | Browse all 22 crops the model knows about |
| 5 | Insights | `/insights` | Dataset stats and model performance (good for the viva/report) |
| 6 | About | `/about` | Team, tech stack, methodology |

**Every page has:**
- **Navbar:** logo/title "CropWise" (or your own name), with links to Home, Recommend, Crop Library, Insights, About.
- **Footer:** project name, "SEM 5 Mini Project", team names, year.
- **Responsive layout:** must work at phone width (360px) as well as on desktop.
- **Theme:** green and earthy colours (for example, `#2E7D32` primary, `#F1F8E9` background, `#795548` accent).

---

## 1. Home Page (`/`)

**Goal:** Make clear within 5 seconds what the site does.

**Sections, from top to bottom:**
1. **Hero banner**
   - Heading: "Find the Right Crop for Your Soil"
   - Subtext: "Enter your soil nutrients and local climate, and our machine-learning model recommends the crops most likely to thrive."
   - Primary button: **Get Recommendation** → `/recommend`
   - Background: a farm or field image.
2. **How it works:** 3 steps shown as cards with icons
   1. Enter soil values (N, P, K, pH)
   2. Enter climate values (temperature, humidity, rainfall)
   3. Get your top crop matches instantly
3. **Quick stats strip:** "22 crops · 2,200 samples · 99.5% test accuracy"
4. **Call to action** repeated at the bottom.

---

## 2. Recommend Page (`/recommend`) — main page

**Goal:** Collect the 7 inputs the model needs.

### Form fields
All fields are required and numeric. The ranges below come from the training dataset.
Values outside a range should show a warning, but the form should still submit.

| Field | Label shown to user | Unit | Min | Max | Example |
|-------|--------------------|------|-----|-----|---------|
| `N` | Nitrogen | kg/ha | 0 | 140 | 90 |
| `P` | Phosphorus | kg/ha | 5 | 145 | 42 |
| `K` | Potassium | kg/ha | 5 | 205 | 43 |
| `temperature` | Temperature | °C | 8.8 | 43.7 | 20.9 |
| `humidity` | Humidity | % | 14 | 100 | 82 |
| `ph` | Soil pH | — | 3.5 | 9.9 | 6.5 |
| `rainfall` | Rainfall | mm | 20 | 299 | 203 |

> **Important:** The field names and their order must exactly match the model's training columns:
> `N, P, K, temperature, humidity, ph, rainfall`

### Layout
- Two grouped cards:
  - **Soil Nutrients:** N, P, K, pH
  - **Climate Conditions:** Temperature, Humidity, Rainfall
- Each input shows its unit and a small hint text with the valid range.
- Optionally, add a slider next to each number box.
- Buttons:
  - **Recommend Crop** (primary): submits the form.
  - **Fill Sample Values** (secondary): fills in the example column, which is handy for demos.
  - **Reset**: clears the form.

### Validation
- Empty field → "This field is required"
- Non-numeric value → "Enter a number"
- Out of range → yellow warning: "Outside training range; prediction may be less reliable"

---

## 3. Result Page (`/result`)

**Goal:** Show the recommendation clearly, with confidence.

**Sections:**
1. **Top recommendation card** (large)
   - Crop image + crop name (e.g. "Rice")
   - Confidence: e.g. "92% match", shown as a progress bar
   - A 1–2 line description of the crop
2. **Other good options:** 2 smaller cards for crops #2 and #3 with their confidence values.
   These come from the model's `predict_proba`.
3. **Your inputs:** a summary table of the 7 values the user entered.
4. **Comparison (optional, nice to have):** a bar chart comparing the user's values with the average values for the recommended crop.
5. Buttons:
   - **Try Again** → back to `/recommend`, with the previous values kept
   - **Learn about this crop** → `/crops#<crop>`

**Edge case:** If the top confidence is below 50%, show a note:
"The model is not very confident. These conditions don't closely match any crop in the dataset."

---

## 4. Crop Library Page (`/crops`)

**Goal:** Reference information for all 22 crops.

- A search box at the top, plus filter chips: Cereals, Pulses, Fruits, Cash crops.
- A grid of cards, one per crop. Each card shows:
  - Image and name
  - The ideal ranges for that crop, using the dataset averages (N, P, K, temperature, humidity, pH, rainfall)
  - Season, if known (Kharif / Rabi / Zaid)
- Each card has an anchor id (e.g. `#rice`) so the Result page can link straight to it.

**The 22 crops:** apple, banana, blackgram, chickpea, coconut, coffee, cotton, grapes, jute,
kidneybeans, lentil, maize, mango, mothbeans, mungbean, muskmelon, orange, papaya,
pigeonpeas, pomegranate, rice, watermelon

**Crop groups for the filter chips:**
- **Cereals:** rice, maize
- **Pulses:** blackgram, chickpea, kidneybeans, lentil, mothbeans, mungbean, pigeonpeas
- **Fruits:** apple, banana, grapes, mango, muskmelon, orange, papaya, pomegranate, watermelon, coconut
- **Cash crops:** coffee, cotton, jute

---

## 5. Insights Page (`/insights`)

**Goal:** Show the ML work. This page is useful when presenting to faculty.

**Sections:**
1. **Dataset overview:** 2,200 rows, 7 features, 22 balanced classes (100 rows each), no missing values.
2. **Model comparison table:**

   | Model | Train Accuracy | Test Accuracy |
   |-------|---------------|---------------|
   | Logistic Regression | 97.4% | 97.3% |
   | Random Forest (tuned) | 100% | 99.5% |

3. **Feature importance chart:** a bar chart from `rf.feature_importances_`, showing which inputs matter most.
4. **Confusion matrix:** an image exported from the notebook.
5. **ROC curve:** an image exported from the notebook, after we fix the AUC label.
6. **Methodology steps:**
   1. 80/20 split that keeps the same crop mix in train and test
   2. Feature scaling (for Logistic Regression only)
   3. Random Forest tuned with a 5-fold grid search
   4. Best settings: `n_estimators=200`, `max_depth=None`

---

## 6. About Page (`/about`)

- Problem statement: farmers often pick crops by habit rather than by matching them to their soil and climate data.
- Objective of the project
- Tech stack: Python, scikit-learn, pandas, plus whatever web framework you choose (Flask / Streamlit / React + FastAPI)
- Team members with roles
- Dataset source: Kaggle "Crop Recommendation Dataset"
- Future scope:
  - Live weather API to fill in temperature, humidity and rainfall automatically
  - Fertilizer suggestions
  - Support for regional languages

---

## 7. Backend / API Contract (what the pages talk to)

The pages need one prediction endpoint.

**`POST /api/predict`**

Request JSON:
```json
{ "N": 90, "P": 42, "K": 43, "temperature": 20.9, "humidity": 82, "ph": 6.5, "rainfall": 203 }
```

Response JSON:
```json
{
  "top": [
    { "crop": "rice",  "confidence": 0.92 },
    { "crop": "jute",  "confidence": 0.05 },
    { "crop": "maize", "confidence": 0.01 }
  ],
  "warnings": ["rainfall outside training range"]
}
```

**Optional: `GET /api/crops`** returns the per-crop average values for the Crop Library and the comparison chart.

> The backend loads `crop_rf_model.pkl` with `joblib.load` once, at startup.
> Random Forest does **not** need the scaler, so raw values go straight into the model.

---

## 8. Assets Needed

- 22 crop images. Name them the same as the crop: `static/images/crops/rice.jpg`, etc.
- 1 hero image (farm field)
- Icons for soil, climate and result (e.g. from Font Awesome or Material Icons)
- `confusion_matrix.png` and `roc_curve.png` exported from the notebook

---

## 9. Suggested Folder Layout (if using Flask)

```
Recommender SEM5 project/
├── app.py                  # Flask app + /api/predict
├── crop_rf_model.pkl
├── Crop_recommendation.csv
├── requirements.txt
├── templates/
│   ├── base.html           # navbar + footer
│   ├── index.html
│   ├── recommend.html
│   ├── result.html
│   ├── crops.html
│   ├── insights.html
│   └── about.html
└── static/
    ├── css/style.css
    ├── js/main.js
    └── images/
```
