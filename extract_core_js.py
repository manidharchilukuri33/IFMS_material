import os
import re

with open(r'd:\IFMS_Material\ifms_material_management_V2.html', 'r', encoding='utf-8') as f:
    content = f.read()

os.makedirs(r'd:\IFMS_Material\frontend\src\services', exist_ok=True)

scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)
if scripts:
    js_code = scripts[0]
    print(f"Extracted JS code length: {len(js_code)}")
    with open(r'd:\IFMS_Material\frontend\src\services\ifms_core.js', 'w', encoding='utf-8') as f_out:
        f_out.write(js_code)
    print("Saved d:\\IFMS_Material\\frontend\\src\\services\\ifms_core.js successfully!")
