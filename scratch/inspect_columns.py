import pickle
import os

import os

SCRATCH_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRATCH_DIR)
COLUMNS_PATH = os.path.join(BASE_DIR, "models", "columns.pkl")

with open(COLUMNS_PATH, "rb") as f:
    cols = pickle.load(f)

print("Columns in models/columns.pkl (Count: {}):".format(len(cols)))
print(cols)
