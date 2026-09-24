import re

with open(r'd:\IFMS_Material\ifms_material_management_V2.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all SCREENS['...'] assignments and their line numbers
pattern = r"SCREENS\[['\"]([^'\"]+)['\"]\]\s*=\s*function\s*\(\)\s*\{"
matches = list(re.finditer(pattern, content))
print(f"Total screen function blocks found: {len(matches)}")

screens_dict = {}
for i, m in enumerate(matches):
    route = m.group(1)
    start_pos = m.start()
    end_pos = matches[i+1].start() if i + 1 < len(matches) else len(content)
    code = content[start_pos:end_pos]
    screens_dict[route] = {
        'start': start_pos,
        'len': len(code),
        'preview': code[:200]
    }

print("\n--- Summary of Screens Extracted ---")
for r, info in sorted(screens_dict.items()):
    print(f"Route: {r:25} | Length: {info['len']:5} chars")
