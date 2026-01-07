#!/usr/bin/env python3
"""
Create a minimal index.html with:
1. External script tags for TensorFlow, COCO-SSD, and app.mjs
2. HTML structure (header, pages, loading overlay)
3. CSS embedded or external (we'll keep embedded since it's not huge)
4. NO inline script (moved to app.mjs)
"""

# Read the current index.html
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the parts we need to keep
# Start of file to just before <script type="module">
start_idx = content.find('<head>')
script_start_idx = content.find('<script type="module">')
style_start_idx = content.find('<style>')
closing_style_idx = content.find('</style>')
body_start_idx = content.find('<body>')

# Build the new index.html
new_html = content[:start_idx] + """<head>
    <title>microPhotoFrame Control</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- TensorFlow.js Version 3.11.0 -->
    <script src="./src/libs/tf.min.js"></script>
    <script src="./src/libs/tf-backend-cpu.min.js"></script>
    <script src="./src/libs/tf-backend-webgl.min.js"></script>
    <script src="./src/libs/cocossd.min.js"></script>

"""

# Add the CSS section (extract from original)
css_start = content.find('<style>')
css_end = content.find('</style>') + len('</style>')
new_html += content[css_start:css_end] + "\n\n</head>\n\n"

# Add the body with HTML structure
# Find where body starts
body_content_start = content.find('<body>')
# Find where the closing </html> tag is (we need everything between body and before </html>)
html_end = content.rfind('</html>')

# Extract the body content (everything from <body> to the end before </html>)
body_content = content[body_content_start:html_end]

# Remove the inline <script type="module"> section from body content
# Find the script tag and remove it
script_start_in_body = body_content.find('<script type="module">')
script_end_in_body = body_content.find('</script>', script_start_in_body)

if script_start_in_body >= 0 and script_end_in_body >= 0:
    # Remove the entire script section
    body_content = body_content[:script_start_in_body] + body_content[script_end_in_body + len('</script>'):]

# Clean up extra whitespace
body_content = body_content.replace('\n\n\n', '\n\n')

new_html += body_content

# Add the module script import at the end (before closing html)
new_html += """
    <!-- Application module -->
    <script type="module" src="./src/app.mjs"></script>

</html>"""

# Write the new index.html
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("Successfully created minimal index.html!")
print(f"New file size: {len(new_html)} characters")
print(f"Old file size was approximately 179000+ characters (removed inline script)")
