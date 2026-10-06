
import os
import re

file_path = "src/components/dashboard/CapacitacionesAnalytics.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(r"className=\{([^\}]+?ext-xs[^\}]+?)\}", r"className={`\1`}", content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("fixed")

