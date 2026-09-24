import re

with open(r'd:\IFMS_Material\ifms_material_management_V2.html', 'r', encoding='utf-8') as f:
    content = f.read()

styles = re.findall(r'<style>(.*?)</style>', content, re.DOTALL)
if styles:
    raw_css = styles[0].strip()
    with open(r'd:\IFMS_Material\frontend\src\raw_reference.css', 'w', encoding='utf-8') as out:
        out.write(raw_css)
    print("Saved raw_reference.css, length:", len(raw_css))
