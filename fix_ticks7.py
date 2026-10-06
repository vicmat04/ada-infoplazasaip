
import os

file_path = "src/components/dashboard/CapacitacionesAnalytics.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("".join(lines[:100]))

