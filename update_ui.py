import re

with open('src/components/dashboard/CuatrimestreAnalytics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add handleExportCSV
export_func = """
  const handleExportCSV = () => {
    if (!drawerData?.list) return;
    
    const headers = ['Nro Infoplaza', 'Nombre', 'Regional', 'Provincia', 'Distrito', 'Corregimiento', 'Estado de Entrega', 'Observacion', 'Cuatrimestre'];
    const csvRows = drawerData.list.map((ip: any) => [
      ip.numero,
      \"\",
      \"\",
      \"\",
      \"\",
      \"\",
      \"\",
      \"\",
      \"Q - \"
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((r: any) => r.join(','))].join('\\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', listado_cuatrimestre_Q_.csv);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
"""
export_func = export_func.replace('or', '||')

# Find where to insert it. Below handleVerDetalle.
# Let's just insert it before if (!filters.cuatrimestre...
content = content.replace("  if (!filters.cuatrimestre || filters.cuatrimestre === 0) {", export_func + "\n  if (!filters.cuatrimestre || filters.cuatrimestre === 0) {")


# 2. Update setDrawerData in handleVerDetalle to include list
old_drawer = r"""    setDrawerData\(\{
      title,
      content: \("""
new_drawer = """    setDrawerData({
      title,
      list: filteredList,
      content: ("""
content = re.sub(old_drawer, new_drawer, content)


# 3. Update the modal header to include the Export button. Import Download icon if needed, or use FileText.
content = content.replace("import { AlertCircle, FileText, CheckCircle2, Clock, XCircle, Search, X, Building } from 'lucide-react';", "import { AlertCircle, FileText, CheckCircle2, Clock, XCircle, Search, X, Building, Download } from 'lucide-react';")

old_modal = r"""              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">\{drawerData\?\.title\}</h3>
                <button onClick=\{.*?setIsDrawerOpen\(false\).*?\} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                  <X size=\{20\} />
                </button>
              </div>"""

new_modal = """              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">{drawerData?.title}</h3>
                <div className="flex items-center gap-3">
                  <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-all">
                    <Download size={14} /> Exportar CSV
                  </button>
                  <button onClick={() => setIsDrawerOpen(false)} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>"""
content = re.sub(old_modal, new_modal, content)

# 4. Replace buttons in the 4 cards.
old_blue = r"""            <button 
              onClick=\{\(\) => handleVerDetalle\(\)\}
              className="mt-3 w-full py-1 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded border border-blue-500/20 transition-colors"
            >
              Ver Listado
            </button>"""
new_blue = """            <div className="flex justify-end mt-2">
              <button 
                onClick={() => handleVerDetalle()}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline transition-all uppercase"
              >
                Ver
              </button>
            </div>"""
content = re.sub(old_blue, new_blue, content)

old_em = r"""            <button 
              onClick=\{\(\) => handleVerDetalle\('entregado'\)\}
              className="mt-3 w-full py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded border border-emerald-500/20 transition-colors"
            >
              Ver Listado
            </button>"""
new_em = """            <div className="flex justify-end mt-2">
              <button 
                onClick={() => handleVerDetalle('entregado')}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline transition-all uppercase"
              >
                Ver
              </button>
            </div>"""
content = re.sub(old_em, new_em, content)

old_y = r"""            <button 
              onClick=\{\(\) => handleVerDetalle\('pendiente'\)\}
              className="mt-3 w-full py-1 text-xs font-medium text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded border border-yellow-500/20 transition-colors"
            >
              Ver Listado
            </button>"""
new_y = """            <div className="flex justify-end mt-2">
              <button 
                onClick={() => handleVerDetalle('pendiente')}
                className="text-xs font-bold text-yellow-400 hover:text-yellow-300 hover:underline transition-all uppercase"
              >
                Ver
              </button>
            </div>"""
content = re.sub(old_y, new_y, content)

old_red = r"""            <button 
              onClick=\{\(\) => handleVerDetalle\('no entrega'\)\}
              className="mt-3 w-full py-1 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded border border-red-500/20 transition-colors"
            >
              Ver Listado
            </button>"""
new_red = """            <div className="flex justify-end mt-2">
              <button 
                onClick={() => handleVerDetalle('no entrega')}
                className="text-xs font-bold text-red-400 hover:text-red-300 hover:underline transition-all uppercase"
              >
                Ver
              </button>
            </div>"""
content = re.sub(old_red, new_red, content)

with open('src/components/dashboard/CuatrimestreAnalytics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
