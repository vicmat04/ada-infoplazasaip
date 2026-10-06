
import os
import re

file_path = "src/components/dashboard/CapacitacionesAnalytics.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(r"a\.download = \$\{([^\}]+)\}\.csv;", r"a.download = `${\1}.csv`;", content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("fixed")

