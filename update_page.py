import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add CapacitacionesAnalytics import
if 'import CapacitacionesAnalytics' not in content:
    content = content.replace("import CuatrimestreAnalytics from '@/components/dashboard/CuatrimestreAnalytics';", "import CuatrimestreAnalytics from '@/components/dashboard/CuatrimestreAnalytics';\nimport CapacitacionesAnalytics from '@/components/dashboard/CapacitacionesAnalytics';")

# Add the new tab button
old_tabs = r"""            <button 
              onClick=\{\(\) => setActiveTab\('cuatrimestral'\)\}
              className=\{whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm transition-colors \$\{
                activeTab === 'cuatrimestral'
                  \? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              \}\}
            >
              Análisis Cuatrimestral
            </button>"""

new_tabs = """            <button 
              onClick={() => setActiveTab('cuatrimestral')}
              className={whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm transition-colors }
            >
              Análisis Cuatrimestral
            </button>
            <button 
              onClick={() => setActiveTab('capacitaciones')}
              className={whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm transition-colors }
            >
              Capacitaciones y Actividades
            </button>"""

content = re.sub(old_tabs, new_tabs, content)

# Render the new tab
old_render = r"""            \{activeTab === 'cuatrimestral' && \(
              <CuatrimestreAnalytics filters=\{filters\} />
            \)\}"""

new_render = """            {activeTab === 'cuatrimestral' && (
              <CuatrimestreAnalytics filters={filters} />
            )}
            {activeTab === 'capacitaciones' && (
              <CapacitacionesAnalytics filters={filters} />
            )}"""

content = re.sub(old_render, new_render, content)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
