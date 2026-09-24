import re

with open(r'd:\IFMS_Material\ifms_material_management_V2.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Inspect Store definition and seedDB
store_idx = content.find('var Store =')
if store_idx == -1:
    store_idx = content.find('Store =')
print("--- STORE / DB DEFINITIONS ---")
print(content[store_idx:store_idx+2000])

# Inspect API or save logic
save_idx = content.find('function save(')
print("\n--- SAVE FUNCTION ---")
print(content[save_idx:save_idx+1000])
