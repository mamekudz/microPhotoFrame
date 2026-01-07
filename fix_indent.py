#!/usr/bin/env python3
"""
Fix indentation in app.mjs - remove leading 8 spaces from every line
"""

with open('src/app.mjs', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove leading 8 spaces from each line
fixed_lines = []
for line in lines:
    # Only remove the leading spaces if they're at the start
    if line.startswith('        '):  # 8 spaces
        fixed_lines.append(line[8:])
    elif line.startswith('    '):  # 4 spaces (for nested content)
        fixed_lines.append(line[4:])
    else:
        fixed_lines.append(line)

# Write back
with open('src/app.mjs', 'w', encoding='utf-8') as f:
    f.writelines(fixed_lines)

print("Fixed indentation in src/app.mjs")
