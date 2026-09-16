import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Render the new tab for Capacitaciones
old_render = r"""                \{/\* VISTA 5: ADMINISTRACION \(Hardening & Cargas\) \*/\}
                \{activeTab === 'administracion' && \("""

new_render = """                {/* VISTA 6: CAPACITACIONES */}
                {activeTab === 'capacitaciones' && (
                  <CapacitacionesAnalytics filters={filters} />
                )}

                {/* VISTA 5: ADMINISTRACION (Hardening & Cargas) */}
                {activeTab === 'administracion' && ("""

content = re.sub(old_render, new_render, content)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
