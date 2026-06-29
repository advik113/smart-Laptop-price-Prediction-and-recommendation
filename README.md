# Smart Laptop Advisor 💻

A Final Year Data Science Capstone project — an end-to-end ML system that estimates fair market prices for laptops from real specifications, powered by a tuned XGBoost regression model (R² = 0.918).

## Features

- **Price Prediction** — Enter specs, get an instant estimated market price
- **Analytics Dashboard** — Explore distributions, correlations and brand breakdowns
- **Model Performance** — Compare all trained model candidates
- **Feature Importance** — Understand what the model learned
- **Recommendation Engine** — Find the best laptop for your budget and use case
- **Laptop Comparison** — Configure two laptops and compare specs side-by-side
- **Dark / Light Mode** — Persistent theme switching

## Project Structure

```
Laptop Price Project/
├── serve.py                      # Local web server entry point
├── requirements.txt              # ML training dependencies
├── index.html                    # Homepage (Overview)
├── dashboard.html                # App Dashboard
├── prediction.html               # Price Prediction page
├── analytics.html                # BI Analytics page
├── recommendation.html           # Recommendations page
├── comparison.html               # Compare Laptops page
├── about.html                    # About Project page
├── assets/
│   ├── css/                      # Stylesheets (style.css, themes.css, responsive.css)
│   └── js/                       # App logic & charts (app.js, sidebar.js, theme.js)
├── data/
│   └── laptop_data.csv           # Dataset (1,303 rows)
├── models/
│   ├── xgb_model.pkl             # Trained XGBoost model
│   └── columns.pkl               # Feature column schema
└── train.py                      # Retraining pipeline script
```

## Running the App

Start the lightweight Python server to run the application locally:

```bash
python serve.py
```

This will automatically serve the website on `http://localhost:8000` and open it in your browser.

## Tech Stack

- **HTML5 & CSS3** — Premium SaaS interface design system with Dark/Light modes
- **JavaScript (Vanilla)** — Client-side app routing, data processing, search, recommendations, and prediction heuristics
- **Python** — Machine Learning pipeline (`train.py`)
- **XGBoost** — Final tuned regression model (R² = 0.918)
- **Scikit-learn** — Preprocessing, train/test split, baseline models
- **Pandas / NumPy** — Data wrangling & feature engineering
- **Chart.js** — Interactive charts & dashboards (via CDN in JS)

## Model Details

The XGBoost model was trained on a double-log encoded price target:

```
stored_value = ln(ln(actual_price_in_rupees))
```

Inference inverts this with `real_price = exp(exp(model.predict(row)))`.

---

*Built with HTML/CSS/JS · Chart.js · XGBoost | © 2026 Smart Laptop Advisor*

