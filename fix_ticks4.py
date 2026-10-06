
import os

file_path = "src/components/dashboard/CapacitacionesAnalytics.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("a.download = ${drawerData.title.replace(/\s+/g, '_')}.csv;", "a.download = `${drawerData.title.replace(/\\\\s+/g, '_')}.csv`;")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("fixed")

