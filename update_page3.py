import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add the new tab button
content = re.sub(
    r"(<button\s+onClick=\{\(\) => setActiveTab\('cuatrimestral'\)\}.*?>\s*Análisis Cuatrimestral\s*</button>)",
    r"\1\n            <button \n              onClick={() => setActiveTab('capacitaciones')}\n              className={whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm transition-colors }\n            >\n              Capacitaciones y Actividades\n            </button>",
    content,
    flags=re.DOTALL
)

# Render the new tab
content = re.sub(
    r"(\{activeTab === 'cuatrimestral' && \(\s*<CuatrimestreAnalytics filters=\{filters\} />\s*\)\})",
    r"\1\n            {activeTab === 'capacitaciones' && (\n              <CapacitacionesAnalytics filters={filters} />\n            )}",
    content,
    flags=re.DOTALL
)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
