import re

with open(r'd:\IFMS_Material\ifms_material_management_V2.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find NAV array
nav_idx = content.find('var NAV = [')
if nav_idx != -1:
    print("--- NAV Definition ---")
    print(content[nav_idx:nav_idx+2000])

# Find SCREENS keys
screens_idx = content.find('var SCREENS = {')
if screens_idx != -1:
    print("\n--- SCREENS keys ---")
    # find all keys inside SCREENS
    screens_block = content[screens_idx:screens_idx+3000]
    keys = re.findall(r'[\'"]([a-zA-Z0-9_\-\/]+)[\'"]\s*:\s*function', content[screens_idx:])
    print(f"Total screens defined in SCREENS: {len(keys)}")
    for k in keys:
        print(f"  - '{k}'")
