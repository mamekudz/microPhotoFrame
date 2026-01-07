#!/usr/bin/env python3
"""
Extract inline <script type="module"> from index.html and create app.mjs
"""

# Read the git temp file
with open('index.html.temp', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the script section
script_start = None
script_end = None
for i, line in enumerate(lines):
    if '<script type="module">' in line:
        script_start = i + 1  # Start from the line after <script>
    elif script_start is not None and '</script>' in line:
        script_end = i
        break

if script_start is None or script_end is None:
    print("ERROR: Could not find <script type=\"module\"> section!")
    exit(1)

print(f"Found script from line {script_start+1} to {script_end+1}")

# Extract the script content
script_content = ''.join(lines[script_start:script_end])

# Replace paths: ./src/ should become ./libs/ for our moved files
# But we need to be careful - in the extracted module, these are already ./src/libs/
# Just remove the leading ./ for some paths
script_content = script_content.replace('"./src/microLib/', '"./microLib/')

# Write to app.mjs
with open('src/app.mjs', 'w', encoding='utf-8') as f:
    f.write(script_content)

print(f"Successfully created src/app.mjs with {len(script_content)} characters")
print(f"Script lines: {script_end - script_start}")
