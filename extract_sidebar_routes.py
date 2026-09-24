import re

with open(r'd:\IFMS_Material\ifms_material_management_V2.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find goto definition
goto_idx = content.find('function goto(')
if goto_idx != -1:
    print("--- goto function ---")
    print(content[goto_idx:goto_idx+3500])

# Let's find buildSidebar definition
sidebar_idx = content.find('function buildSidebar(')
if sidebar_idx != -1:
    print("--- buildSidebar function ---")
    print(content[sidebar_idx:sidebar_idx+4000])
