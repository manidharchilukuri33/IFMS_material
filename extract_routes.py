import re

with open(r'd:\IFMS_Material\ifms_material_management_V2.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Search for navigation router or switch
routes_match = re.findall(r'case\s+[\'"]([^\'"]+)[\'"]:', content)
print("Switch cases (Routes) found:", len(routes_match))
print(routes_match)

# Search for render functions
render_funcs = re.findall(r'function\s+(render[a-zA-Z0-9_]*|show[a-zA-Z0-9_]*|open[a-zA-Z0-9_]*)\s*\(', content)
print("\nRender / Show / Open Functions:", len(render_funcs))
print(render_funcs)

# Look for sidebar structure in HTML
body_markup = content.split('<script>')[0]
print("\nBody markup length:", len(body_markup))
# Find sidebar links or items
sidebar_items = re.findall(r'nav\([\'"]([^\'"]+)[\'"]\)', content)
print("\nnav('...') calls found:", len(sidebar_items), set(sidebar_items))
