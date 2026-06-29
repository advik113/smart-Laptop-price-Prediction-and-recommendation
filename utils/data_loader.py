import pandas as pd

def build_feature_row(inputs, columns):
    """
    Constructs a 1-row DataFrame matching the 45 preprocessed features
    in models/columns.pkl from raw input values.
    """
    X = pd.DataFrame(0.0, index=[0], columns=columns)
    
    # Numerical columns mapping
    num_cols = {
        'Inches': ['Inches', 'inches'],
        'Ram': ['Ram', 'ram', 'RAM'],
        'Weight': ['Weight', 'weight'],
        'Touchscreen': ['Touchscreen', 'touchscreen'],
        'IPS': ['IPS', 'ips'],
        'PPI': ['PPI', 'ppi'],
        'SSD': ['SSD', 'ssd'],
        'HDD': ['HDD', 'hdd'],
        'Hybrid': ['Hybrid', 'hybrid'],
        'Flash_Storage': ['Flash_Storage', 'flash_storage', 'flash'],
        'CPU_Speed': ['CPU_Speed', 'cpu_speed']
    }
    
    for col, keys in num_cols.items():
        for k in keys:
            if k in inputs:
                val = inputs[k]
                if isinstance(val, bool):
                    X.loc[0, col] = 1.0 if val else 0.0
                else:
                    X.loc[0, col] = float(val)
                break
                
    # Categorical columns dummy mapping
    cat_cols = {
        'Company': ['Company', 'company'],
        'TypeName': ['TypeName', 'typename'],
        'CPU_Brand': ['CPU_Brand', 'cpu_brand'],
        'GPU_Brand': ['GPU_Brand', 'gpu_brand'],
        'OS_Category': ['OS_Category', 'os_category', 'os', 'OS']
    }
    
    for col, keys in cat_cols.items():
        for k in keys:
            if k in inputs:
                val = inputs[k]
                dummy_col = f"{col}_{val}"
                if dummy_col in columns:
                    X.loc[0, dummy_col] = 1.0
                break
                
    return X
