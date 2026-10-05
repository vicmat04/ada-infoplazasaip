import re

with open('src/components/dashboard/CuatrimestreAnalytics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update stats logic to include motivo
old_logic = r"""      const ipEstado = ip.estado \|\| '';
      const isActiva = ipEstado.toLowerCase\(\) === 'activa' \|\| ipEstado.toLowerCase\(\) === 'abierta';
      
      // Si la infoplaza está cerrada y NO entregó reporte, no la contamos ni mostramos
      if \(!isActiva && reporteEstado.toLowerCase\(\) !== 'entregado'\) \{
        return;
      \}
      
      list.push\(\{ \.\.\.ip, reporteEstado \}\);"""

new_logic = """      const ipEstado = ip.estado || '';
      const isActiva = ipEstado.toLowerCase() === 'activa' || ipEstado.toLowerCase() === 'abierta';
      const motivo = ctrl?.motivo || '';
      
      // Si la infoplaza está cerrada y NO entregó reporte, no la contamos ni mostramos
      if (!isActiva && reporteEstado.toLowerCase() !== 'entregado') {
        return;
      }
      
      list.push({ ...ip, reporteEstado, motivo });"""

content = re.sub(old_logic, new_logic, content)

# 2. Update handleVerDetalle to accept filterEstado and show motivo
old_handle = r"""  const handleVerDetalle = \(\) => \{
    setDrawerData\(\{
      title: Estado de Entregas \(Q\$\{filters.cuatrimestre\} - \$\{filters.anio\}\),
      content: \(
        <div className="flex flex-col gap-2">
          \{stats.list.map\(\(ip, i\) => \(
            <div key=\{i\} className="p-3 bg-slate-900/50 rounded-lg flex items-center justify-between border border-slate-800">
              <div>
                <p className="font-semibold text-slate-200">\{ip.numero\} - \{ip.nombre\}</p>
                <p className="text-xs text-slate-400">\{ip.regional\}</p>
              </div>"""

new_handle = """  const handleVerDetalle = (filterEstado?: string) => {
    const title = filterEstado 
      ? Informes s (Q - ).toUpperCase()
      : Estado de Entregas (Q - );
      
    const filteredList = filterEstado 
      ? stats.list.filter(ip => ip.reporteEstado.toLowerCase() === filterEstado.toLowerCase())
      : stats.list;

    setDrawerData({
      title,
      content: (
        <div className="flex flex-col gap-2">
          {filteredList.map((ip, i) => (
            <div key={i} className="p-3 bg-slate-900/50 rounded-lg flex items-center justify-between border border-slate-800">
              <div>
                <p className="font-semibold text-slate-200">{ip.numero} - {ip.nombre}</p>
                <p className="text-xs text-slate-400">{ip.regional}</p>
                {ip.reporteEstado.toLowerCase() === 'no entrega' && ip.motivo && (
                  <p className="text-xs text-red-400 mt-1 italic">Observación: {ip.motivo}</p>
                )}
              </div>"""

content = re.sub(old_handle, new_handle, content)

# 3. Add button to Habilitadas
old_habilitadas = r"""        <Card className="glass border-\[var\(--card-border\)\] bg-gradient-to-br from-blue-900/20 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Habilitadas</p>
              <h3 className="text-2xl font-bold text-blue-400" title="Infoplazas habilitadas para entregar">\{\(stats.entregados \+ stats.pendientes \+ stats.noEntrega\).toLocaleString\('es-PA'\)\}</h3>
            </div>
            <Building size=\{32\} className="text-blue-500/30" />
          </CardContent>
        </Card>"""

new_habilitadas = """        <Card className="glass border-[var(--card-border)] bg-gradient-to-br from-blue-900/20 to-transparent flex flex-col justify-between">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Habilitadas</p>
                <h3 className="text-2xl font-bold text-blue-400" title="Infoplazas habilitadas para entregar">{(stats.entregados + stats.pendientes + stats.noEntrega).toLocaleString('es-PA')}</h3>
              </div>
              <Building size={32} className="text-blue-500/30" />
            </div>
            <button 
              onClick={() => handleVerDetalle()}
              className="mt-3 w-full py-1 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded border border-blue-500/20 transition-colors"
            >
              Ver Listado
            </button>
          </CardContent>
        </Card>"""

content = re.sub(old_habilitadas, new_habilitadas, content)

# 4. Add button to Entregados
old_entregados = r"""        <Card className="glass border-\[var\(--card-border\)\] bg-gradient-to-br from-emerald-900/20 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Entregados</p>
              <h3 className="text-2xl font-bold text-emerald-400" title="Informes Entregados">\{stats.entregados.toLocaleString\('es-PA'\)\}</h3>
            </div>
            <CheckCircle2 size=\{32\} className="text-emerald-500/30" />
          </CardContent>
        </Card>"""

new_entregados = """        <Card className="glass border-[var(--card-border)] bg-gradient-to-br from-emerald-900/20 to-transparent flex flex-col justify-between">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Entregados</p>
                <h3 className="text-2xl font-bold text-emerald-400" title="Informes Entregados">{stats.entregados.toLocaleString('es-PA')}</h3>
              </div>
              <CheckCircle2 size={32} className="text-emerald-500/30" />
            </div>
            <button 
              onClick={() => handleVerDetalle('entregado')}
              className="mt-3 w-full py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded border border-emerald-500/20 transition-colors"
            >
              Ver Listado
            </button>
          </CardContent>
        </Card>"""

content = re.sub(old_entregados, new_entregados, content)

# 5. Add button to Pendientes
old_pendientes = r"""        <Card className="glass border-\[var\(--card-border\)\] bg-gradient-to-br from-yellow-900/20 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pendientes</p>
              <h3 className="text-2xl font-bold text-yellow-400" title="Informes Pendientes">\{stats.pendientes.toLocaleString\('es-PA'\)\}</h3>
            </div>
            <Clock size=\{32\} className="text-yellow-500/30" />
          </CardContent>
        </Card>"""

new_pendientes = """        <Card className="glass border-[var(--card-border)] bg-gradient-to-br from-yellow-900/20 to-transparent flex flex-col justify-between">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pendientes</p>
                <h3 className="text-2xl font-bold text-yellow-400" title="Informes Pendientes">{stats.pendientes.toLocaleString('es-PA')}</h3>
              </div>
              <Clock size={32} className="text-yellow-500/30" />
            </div>
            <button 
              onClick={() => handleVerDetalle('pendiente')}
              className="mt-3 w-full py-1 text-xs font-medium text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded border border-yellow-500/20 transition-colors"
            >
              Ver Listado
            </button>
          </CardContent>
        </Card>"""

content = re.sub(old_pendientes, new_pendientes, content)

# 6. Add button to No Entrega
old_noentrega = r"""        <Card className="glass border-\[var\(--card-border\)\] bg-gradient-to-br from-red-900/20 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">No Entregan</p>
              <h3 className="text-2xl font-bold text-red-400" title="Infoplazas que no entregan informes">\{stats.noEntrega.toLocaleString\('es-PA'\)\}</h3>
            </div>
            <XCircle size=\{32\} className="text-red-500/30" />
          </CardContent>
        </Card>"""

new_noentrega = """        <Card className="glass border-[var(--card-border)] bg-gradient-to-br from-red-900/20 to-transparent flex flex-col justify-between">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">No Entregan</p>
                <h3 className="text-2xl font-bold text-red-400" title="Infoplazas que no entregan informes">{stats.noEntrega.toLocaleString('es-PA')}</h3>
              </div>
              <XCircle size={32} className="text-red-500/30" />
            </div>
            <button 
              onClick={() => handleVerDetalle('no entrega')}
              className="mt-3 w-full py-1 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded border border-red-500/20 transition-colors"
            >
              Ver Listado
            </button>
          </CardContent>
        </Card>"""

content = re.sub(old_noentrega, new_noentrega, content)

with open('src/components/dashboard/CuatrimestreAnalytics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
