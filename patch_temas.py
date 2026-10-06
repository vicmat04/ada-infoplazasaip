import os
import re

file_path = 'src/components/dashboard/CapacitacionesAnalytics.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove export line
content = re.sub(r"add\('Temas principales', d\.temas_top\.map\(\(t\) => \(\{.*?\}\)\)\);\n\s*", "", content, flags=re.DOTALL)

# 2. Update subtitle
content = content.replace('subtitle="Participantes, sesiones y horas por categora, evolucin mensual y temas con mayor alcance."', 'subtitle="Participantes, sesiones y horas por categora y evolucin mensual."')
content = content.replace('subtitle="Participantes, sesiones y horas por categoría, evolución mensual y temas con mayor alcance."', 'subtitle="Participantes, sesiones y horas por categoría y evolución mensual."')

# 3. Remove temas_top block
pattern = r"\{data\.temas_top\.length > 0 && \(\s*<div className=\"mt-6\">\s*<p className=\"text-sm font-medium text-\[var\(--foreground\)\] mb-2\">Temas con.*?</div>\s*</div>\s*\)\}"
content = re.sub(pattern, "", content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
