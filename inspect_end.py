with open(r'd:\IFMS_Material\frontend\src\services\ifms_core.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Inspect the last 2500 characters
print("--- END OF IFMS_CORE.JS ---")
print(code[-2500:])
