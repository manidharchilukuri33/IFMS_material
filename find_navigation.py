with open(r'd:\IFMS_Material\ifms_material_management_V2.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's search for function definitions or router logic
import re
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'router' in line.lower() or 'navigate' in line.lower() or 'currentpage' in line.lower() or 'curroute' in line.lower() or 'sidebar' in line.lower() and 'function' in line.lower() or 'nav(' in line or 'route' in line and 'function' in line:
        print(f"Line {i+1}: {line[:120]}")

# Also print lines around the HTML body and sidebar definition
print("\n--- HTML Layout (lines 100 to 220) ---")
for i in range(100, min(220, len(lines))):
    print(f"{i+1}: {lines[i]}")
