import json

notebook_path = r"c:\Users\user\Downloads\Laptop Price Prediction And Recommendation\model or dataset\Laptop.ipynb"

with open(notebook_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

# Print cells from index 28 to 35
for idx in range(28, min(36, len(nb.get("cells", [])))):
    cell = nb["cells"][idx]
    print(f"=== Cell {idx} ({cell.get('cell_type')}) ===")
    source = "".join(cell.get("source", []))
    print(source)
    outputs = cell.get("outputs", [])
    if outputs:
        print("--- Outputs ---")
        for out in outputs:
            if "text" in out:
                print("".join(out["text"]))
            elif "data" in out and "text/plain" in out["data"]:
                print("".join(out["data"]["text/plain"]))
    print("=" * 40)
