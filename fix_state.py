
import os

file_path = "src/components/dashboard/CapacitacionesAnalytics.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

state_new = "  const [mostrarTablaActCat, setMostrarTablaActCat] = useState(true);\n  const [isDrawerOpen, setIsDrawerOpen] = useState(false);\n  const [drawerData, setDrawerData] = useState<any>(null);"

content = content.replace("  const [mostrarTablaActCat, setMostrarTablaActCat] = useState(true);", state_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("fixed")

