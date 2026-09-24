import re

with open(r'd:\IFMS_Material\ifms_material_management_V2.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract CSS rules
styles = re.findall(r'<style>(.*?)</style>', content, re.DOTALL)
print(f"Styles length: {len(styles[0]) if styles else 0}")

# 2. Extract Navigation & Route IDs
nav_items = re.findall(r'onclick="nav\(\'([^\']+)\'\)"', content)
nav_items += re.findall(r'data-view="([^"]+)"', content)
nav_items += re.findall(r'data-route="([^"]+)"', content)
unique_nav = sorted(list(set(nav_items)))
print(f"Unique Nav Routes ({len(unique_nav)}):")
for r in unique_nav:
    print(f"  - {r}")

# 3. Extract Section / View Containers
view_containers = re.findall(r'<div[^>]+id="([^"]+)"[^>]*class="[^"]*view[^"]*"', content)
view_containers += re.findall(r'<section[^>]+id="([^"]+)"', content)
view_containers += re.findall(r'<div[^>]+class="[^"]*page-content[^"]*"[^>]*id="([^"]+)"', content)
print(f"\nView/Section IDs ({len(view_containers)}):", view_containers)

# 4. Extract Modals
modals = re.findall(r'<div[^>]+class="[^"]*modal[^"]*"[^>]*id="([^"]+)"', content)
print(f"\nModals ({len(modals)}):", modals)

# 5. Extract Sample Data Objects or JSON structures in the script
scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)
print(f"\nScript blocks: {len(scripts)}")
if scripts:
    main_script = scripts[-1]
    print(f"Main Script length: {len(main_script)}")
    # Find functions
    funcs = re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', main_script)
    print(f"Functions defined ({len(funcs)}): {funcs[:30]}...")
