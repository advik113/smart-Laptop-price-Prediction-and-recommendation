import sys
import os

# Set relative paths
SCRATCH_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRATCH_DIR)
sys.path.append(BASE_DIR)

import pickle
import pandas as pd
import numpy as np
import xgboost as xgb

MODEL_PATH = os.path.join(BASE_DIR, "models", "xgb_model.pkl")
COLUMNS_PATH = os.path.join(BASE_DIR, "models", "columns.pkl")

with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

with open(COLUMNS_PATH, "rb") as f:
    columns = pickle.load(f)

# Create a sample row
from utils.data_loader import build_feature_row
inputs = {
    "company": "Dell", "typename": "Notebook", "os": "Windows", "ram": 8,
    "cpu_brand": "Intel Core i5", "cpu_speed": 2.5, "gpu_brand": "Intel",
    "weight": 2.0, "ssd": 256, "hdd": 0, "hybrid": 0, "flash_storage": 0,
    "touchscreen": False, "ips": True, "ppi": 141.2, "inches": 15.6
}
row = build_feature_row(inputs, columns)

# Get predictions contributions
try:
    booster = model.get_booster()
    dmat = xgb.DMatrix(row)
    contribs = booster.predict(dmat, pred_contribs=True)
    print("Success! Contributions shape:", contribs.shape)
    print("Contributions values:", contribs)
    # The last value is the bias (base value)
    print("Sum of contributions:", np.sum(contribs))
    print("Model prediction:", model.predict(row)[0])
except Exception as e:
    print("Error getting contributions:", e)
