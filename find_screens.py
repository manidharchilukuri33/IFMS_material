with open(r'd:\IFMS_Material\ifms_material_management_V2.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Find full NAV definition
nav_idx = content.find('var NAV = [')
nav_end = content.find('];', nav_idx)
print("--- FULL NAV ARRAY ---")
print(content[nav_idx:nav_end+2])

# Find how SCREENS is populated
screens_idx = content.find('var SCREENS = ')
if screens_idx != -1:
    print("\n--- SCREENS DEFINITION (first 1000 chars) ---")
    print(content[screens_idx:screens_idx+1000])

# Find all occurrences of SCREENS['...'] = or '...': function
screen_assignments = re.findall(r"SCREENS\[['\"]([^'\"]+)['\"]\]\s*=", content)
screen_assignments += re.findall(r"['\"]([a-zA-Z0-9_\-\/]+)['\"]\s*:\s*function", content)
print("\n--- ALL SCREENS ASSIGNED ---", len(screen_assignments))
for s in sorted(list(set(screen_assignments))):
    print(f"  {s}")
