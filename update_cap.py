import re

with open('src/components/dashboard/CapacitacionesAnalytics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('export default function CuatrimestreAnalytics', 'export default function CapacitacionesAnalytics')
content = content.replace('Anlisis Cuatrimestral Detallado', 'Análisis de Capacitaciones y Actividades')

# Remove the Control Entrega card (the first Card in the grid)
old_card_grid = r'''      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass border-\[var\(--card-border\)\] bg-gradient-to-br from-blue-900/20 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Entregados</p>
              <h3 className="text-2xl font-bold text-blue-400">\{ctrlEntregados\}</h3>
            </div>
            <CheckCircle2 size=\{32\} className="text-blue-500/30" />
          </CardContent>
        </Card>'''

new_card_grid = '''      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">'''

content = re.sub(old_card_grid, new_card_grid, content)

# Format numbers with toLocaleString('es-PA')
content = re.sub(r'>\{totalParticipantesCap\}</h3>', r'>{totalParticipantesCap.toLocaleString("es-PA")}</h3>', content)
content = re.sub(r'>\{totalHorasCap\}</h3>', r'>{totalHorasCap.toLocaleString("es-PA")}</h3>', content)
content = re.sub(r'>\{totalParticipantesAct\}</h3>', r'>{totalParticipantesAct.toLocaleString("es-PA")}</h3>', content)
content = re.sub(r'>\{item.participantes\}</span>', r'>{item.participantes.toLocaleString("es-PA")}</span>', content)
content = re.sub(r'>\{item.horas\}</span>', r'>{item.horas.toLocaleString("es-PA")}</span>', content)
content = re.sub(r'>\{item.cantidad\}</span>', r'>{item.cantidad.toLocaleString("es-PA")}</span>', content)
content = re.sub(r'formatter=\{\(value: number\) => \[\$\{value\}', r'formatter={(value: number) => [${value.toLocaleString("es-PA")}', content)

with open('src/components/dashboard/CapacitacionesAnalytics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
