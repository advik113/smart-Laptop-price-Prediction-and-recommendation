"""
train.py
----------------------------------------------------------------------
Model Retraining Pipeline (Task 1)
Ingests data/laptop_data.csv, decodes double-logged prices, trains
multiple models on standard single-log targets y = ln(Price),
evaluates cross-validation performance, and exports the champion model.
----------------------------------------------------------------------
"""

import os
import sys
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import KFold
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass


# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "laptop_data.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "xgb_model.pkl")
COLUMNS_PATH = os.path.join(MODEL_DIR, "columns.pkl")

# Target Columns from models/columns.pkl
COLUMNS_SCHEMA = [
    'Inches', 'Ram', 'Weight', 'Touchscreen', 'IPS', 'PPI', 'SSD', 'HDD',
    'Hybrid', 'Flash_Storage', 'CPU_Speed', 'Company_Apple', 'Company_Asus',
    'Company_Chuwi', 'Company_Dell', 'Company_Fujitsu', 'Company_Google',
    'Company_HP', 'Company_Huawei', 'Company_LG', 'Company_Lenovo',
    'Company_MSI', 'Company_Mediacom', 'Company_Microsoft', 'Company_Razer',
    'Company_Samsung', 'Company_Toshiba', 'Company_Vero', 'Company_Xiaomi',
    'TypeName_Gaming', 'TypeName_Netbook', 'TypeName_Notebook',
    'TypeName_Ultrabook', 'TypeName_Workstation', 'CPU_Brand_Intel Core i3',
    'CPU_Brand_Intel Core i5', 'CPU_Brand_Intel Core i7',
    'CPU_Brand_Other Intel Processor', 'GPU_Brand_ARM', 'GPU_Brand_Intel',
    'GPU_Brand_Nvidia', 'OS_Category_Linux', 'OS_Category_Mac',
    'OS_Category_Other', 'OS_Category_Windows'
]

def decode_double_log_price(double_log_p):
    """Invert double-log: Price_INR = exp(exp(double_log_p))"""
    return np.exp(np.exp(double_log_p))

def preprocess_data(df, columns):
    """
    Construct feature matrix X to match the exact schema of columns.pkl.
    """
    X = pd.DataFrame(0.0, index=df.index, columns=columns)
    
    # Copy numerical columns
    num_cols = ['Inches', 'Ram', 'Weight', 'Touchscreen', 'IPS', 'PPI', 'SSD', 'HDD', 'Hybrid', 'Flash_Storage', 'CPU_Speed']
    for col in num_cols:
        if col in df.columns:
            X[col] = df[col].astype(float)
            
    # Map categorical features to dummy columns
    categorical_groups = {
        "Company": "Company",
        "TypeName": "TypeName",
        "CPU_Brand": "CPU_Brand",
        "GPU_Brand": "GPU_Brand",
        "OS_Category": "OS_Category"
    }
    
    for prefix, df_col in categorical_groups.items():
        for i, val in enumerate(df[df_col]):
            dummy_col = f"{prefix}_{val}"
            if dummy_col in columns:
                X.loc[df.index[i], dummy_col] = 1.0
                
    return X

def train_and_evaluate():
    print("--- Starting Model Retraining Pipeline ---")
    
    # 1. Load data
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")
        
    print(f"Loading dataset from: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"Dataset loaded successfully. Shape: {df.shape}")
    
    # 2. Use single-log target directly
    y = df['Price']
    
    # 3. Preprocess features to match columns schema
    print("Preprocessing feature columns...")
    X = preprocess_data(df, COLUMNS_SCHEMA)
    print(f"Feature matrix shape: {X.shape}")
    
    # Define models
    models = {
        "Linear Regression": LinearRegression(),
        "Decision Tree": DecisionTreeRegressor(random_state=42),
        "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
        "XGBoost Regressor": XGBRegressor(n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42, n_jobs=-1)
    }
    
    # 4. Cross-validation evaluation
    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    
    for name, model in models.items():
        print(f"\nEvaluating {name} using 5-Fold Cross Validation...")
        r2_list, mae_list, rmse_list = [], [], []
        
        for train_idx, test_idx in kf.split(X):
            X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
            y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
            
            model.fit(X_train, y_train)
            pred_log = model.predict(X_test)
            
            # Decode predictions and actuals to raw INR
            pred_inr = np.exp(pred_log)
            actual_inr = np.exp(y_test)
            
            r2_list.append(r2_score(actual_inr, pred_inr))
            mae_list.append(mean_absolute_error(actual_inr, pred_inr))
            rmse_list.append(np.sqrt(mean_squared_error(actual_inr, pred_inr)))
            
        print(f"  R² Score: {np.mean(r2_list):.4f} (+/- {np.std(r2_list):.4f})")
        print(f"  MAE:      Rs. {np.mean(mae_list):,.2f}")
        print(f"  RMSE:     Rs. {np.mean(rmse_list):,.2f}")
        
    # 5. Fit champion model (XGBoost Regressor) on entire dataset and save
    print("\nTraining final champion XGBoost model on the complete dataset...")
    xgb_champion = XGBRegressor(n_estimators=120, max_depth=6, learning_rate=0.08, random_state=42, n_jobs=-1)
    xgb_champion.fit(X, y)
    
    # Create models directory if it doesn't exist
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # Save model and columns schema
    print(f"Saving final XGBoost model to: {MODEL_PATH}")
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(xgb_champion, f)
        
    print(f"Saving columns schema to: {COLUMNS_PATH}")
    with open(COLUMNS_PATH, "wb") as f:
        pickle.dump(COLUMNS_SCHEMA, f)
        
    print("\n--- Pipeline Completed Successfully! ---")

if __name__ == "__main__":
    train_and_evaluate()
