import os
import re

file_path = 'src/components/dashboard/CapacitacionesAnalytics.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add IpSinReporte Type if missing, and modify Kpis to include new lists
# We need to add list_pendientes and list_no_entrega to the data interface
type_search = """  ips_sin_reporte: IpSinReporte[];
  detalle_infoplazas?: IpTot[];"""

type_replace = """  lista_pendientes: IpSinReporte[];
  lista_no_entrega: IpSinReporte[];
  ips_sin_reporte: IpSinReporte[];
  detalle_infoplazas?: IpTot[];"""

content = content.replace(type_search, type_replace)

# 2. Add State for drawer
state_search = """  const [metricaMatriz, setMetricaMatriz] = useState<'sesiones' | 'participantes'>('sesiones');
  const [showEmpty, setShowEmpty] = useState(false);"""

state_replace = """  const [metricaMatriz, setMetricaMatriz] = useState<'sesiones' | 'participantes'>('sesiones');
  const [showEmpty, setShowEmpty] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<any>(null);"""

content = content.replace(state_search, state_replace)

# 3. Add onClick to Kpi component
kpi_search = """function Kpi({ label, value, detail, color }: { label: string; value: string; detail?: string; color: string }) {"""
kpi_replace = """function Kpi({ label, value, detail, color, onClick, isClickable }: { label: string; value: string; detail?: React.ReactNode; color: string; onClick?: () => void; isClickable?: boolean }) {"""
content = content.replace(kpi_search, kpi_replace)

kpi_body_search = """    return (
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4" style={{ borderLeft: 3px solid  }}>
        <p className="text-xs text-[var(--muted)]">{label}</p>
        <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color }}>{value}</p>
        {detail && <p className="text-xs text-[var(--muted)] mt-1">{detail}</p>}
      </div>
    );"""
kpi_body_replace = """    return (
      <div 
        onClick={onClick}
        className={ounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 } 
        style={{ borderLeft: 3px solid  }}
      >
        <p className="text-xs text-[var(--muted)]">{label}</p>
        <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color }}>{value}</p>
        {detail && <div className="text-xs text-[var(--muted)] mt-1">{detail}</div>}
      </div>
    );"""
content = content.replace(kpi_body_search, kpi_body_replace)

# 4. Modify the usages of the "Informes entregados" KPI
kpi_usage_search = """              <Kpi label="Informes entregados" value={n(k.entregados)} color="#eab308"
                detail={${n(k.pendientes)} pendientes,  sin entrega} />"""

kpi_usage_replace = """              <Kpi 
                label="Informes entregados" 
                value={n(k.entregados)} 
                color="#eab308"
                detail={
                  <div className="flex gap-2 items-center">
                    <span 
                      className="cursor-pointer hover:text-[#eab308] underline decoration-dashed underline-offset-2 transition-colors"
                      onClick={() => {
                        setDrawerData({
                          title: 'Infoplazas Pendientes',
                          list: data?.lista_pendientes || [],
                          type: 'pendientes'
                        });
                        setIsDrawerOpen(true);
                      }}
                    >
                      {n(k.pendientes)} pendientes
                    </span>
                    <span>,</span>
                    <span 
                      className="cursor-pointer hover:text-[#eab308] underline decoration-dashed underline-offset-2 transition-colors"
                      onClick={() => {
                        setDrawerData({
                          title: 'Infoplazas Sin Entrega',
                          list: data?.lista_no_entrega || [],
                          type: 'no_entrega'
                        });
                        setIsDrawerOpen(true);
                      }}
                    >
                      {n(k.no_entrega)} sin entrega
                    </span>
                  </div>
                } 
              />"""
content = content.replace(kpi_usage_search, kpi_usage_replace)

# 5. Add drawer render at the end before final div
drawer_render = """
      {/* Right Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
          <div className="relative w-full max-w-2xl bg-[#030712] h-full border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertCircle className="text-[#eab308]" size={20} />
                {drawerData?.title}
              </h3>
              <button onClick={() => setIsDrawerOpen(false)} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            {/* Action Bar */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/20">
              <p className="text-sm text-slate-400">Total: <strong className="text-white">{drawerData?.list?.length || 0}</strong> Infoplazas</p>
              <button 
                onClick={() => {
                  if (!drawerData?.list) return;
                  const isNoEntrega = drawerData.type === 'no_entrega';
                  const headers = ['Numero', 'Infoplaza', 'Regional', 'Provincia', 'Distrito', 'Estatus'];
                  if (isNoEntrega) headers.push('Observacion');
                  
                  const rows = drawerData.list.map((ip: any) => {
                    const r = [ip.numero, ip.nombre, ip.regional, ip.provincia, ip.distrito, ip.estado_entrega || 'Pendiente'];
                    if (isNoEntrega) r.push(ip.motivo || '');
                    return r;
                  });
                  
                  const csvContent = [headers.join(',')]
                    .concat(rows.map((row: any[]) => row.map(v => "").join(',')))
                    .join('\\n');
                    
                  const blob = new Blob(['\\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = ${drawerData.title.replace(/\\s+/g, '_')}.csv;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors border border-slate-700"
              >
                <FileDown size={16} /> Descargar CSV
              </button>
            </div>
            
            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {drawerData?.list?.map((ip: any) => (
                <div key={ip.numero} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white text-base leading-tight">
                      <span className="text-[#eab308] mr-2">#{ip.numero}</span>
                      {ip.nombre}
                    </h4>
                    <span className={	ext-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ml-3 }>
                      {ip.estado_entrega || 'Pendiente'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Regional</p>
                      <p className="text-slate-200 font-medium">{ip.regional}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Provincia</p>
                      <p className="text-slate-200 font-medium">{ip.provincia}</p>
                    </div>
                  </div>
                  
                  {drawerData.type === 'no_entrega' && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Observación</p>
                      <p className="text-slate-300 text-sm italic">{ip.motivo || 'Sin observación'}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

content = content.replace("    </div>\n  );\n}", drawer_render)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
