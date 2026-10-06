
import os
import re

file_path = "src/components/dashboard/ReporteIndividualSection.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("pixelRatio: 2, quality: 0.8, backgroundColor: '#ffffff'", "pixelRatio: 2, backgroundColor: '#ffffff'")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("fixed")

