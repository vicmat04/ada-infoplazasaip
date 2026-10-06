
import os
import re

file_path = "src/components/dashboard/CapacitacionesAnalytics.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(r"className=\{[\t\s]+ext-xs", r"className={`text-xs", content)
content = re.sub(r"whitespace-nowrap ml-3 \}", r"whitespace-nowrap ml-3 ${drawerData.type === 'no_entrega' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}", content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("fixed")

