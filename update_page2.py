import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
content = content.replace("import CuatrimestreAnalytics from '../components/dashboard/CuatrimestreAnalytics';", "import CuatrimestreAnalytics from '../components/dashboard/CuatrimestreAnalytics';\nimport CapacitacionesAnalytics from '../components/dashboard/CapacitacionesAnalytics';")

# Add the new tab button
content = content.replace(
    """            <button 
              onClick={() => setActiveTab('cuatrimestral')}
              className={whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm transition-colors }
            >
              Análisis Cuatrimestral
            </button>""",
    """            <button 
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
)

# Render the new tab
content = content.replace(
    """            {activeTab === 'cuatrimestral' && (
              <CuatrimestreAnalytics filters={filters} />
            )}""",
    """            {activeTab === 'cuatrimestral' && (
              <CuatrimestreAnalytics filters={filters} />
            )}
            {activeTab === 'capacitaciones' && (
              <CapacitacionesAnalytics filters={filters} />
            )}"""
)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
