import re

with open('src/components/dashboard/FiltersBar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace mesesDisponibles
old_meses_memo = r"""  const mesesDisponibles = React.useMemo\(\(\) => \{
    const mesesFiltrados = activeFilters.anio
      \? availablePeriods.filter\(\(p\) => p.anio === activeFilters.anio\).map\(\(p\) => p.mes\)
      : Array.from\(new Set\(availablePeriods.map\(\(p\) => p.mes\)\)\);

    const mesesOrden = \['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'\];
    const uniqueMeses = mesesOrden.filter\(\(m\) => mesesFiltrados.includes\(m\)\);

    return \[
      \{ value: '', label: 'Todos los meses' \},
      \.\.\.uniqueMeses.map\(\(m\) => \(\{ value: m, label: m \}\)\),
    \];
  \}, \[availablePeriods, activeFilters.anio\]\);"""

new_meses_memo = """  const mesesDisponibles = React.useMemo(() => {
    const mesesFiltrados = activeFilters.anio
      ? availablePeriods.filter((p) => p.anio === activeFilters.anio).map((p) => p.mes)
      : Array.from(new Set(availablePeriods.map((p) => p.mes)));

    const mesesOrden = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const uniqueMeses = mesesOrden.filter((m) => mesesFiltrados.includes(m));

    return [
      { value: '', label: 'Todos los meses' },
      ...uniqueMeses.map((m) => ({ value: m, label: m })),
      { value: 'Q1', label: 'Cuatrimestre 1 (Ene-Abr)' },
      { value: 'Q2', label: 'Cuatrimestre 2 (May-Ago)' },
      { value: 'Q3', label: 'Cuatrimestre 3 (Sep-Dic)' },
    ];
  }, [availablePeriods, activeFilters.anio]);"""

content = re.sub(old_meses_memo, new_meses_memo, content, flags=re.MULTILINE|re.DOTALL)

# Replace handleSelectMes and remove handleSelectCuatrimestre
old_handlers = r"""  const handleSelectMes = \(e: React.ChangeEvent<HTMLSelectElement>\) => \{
    onFiltersChange\(\{ \.\.\.activeFilters, mes: e.target.value, cuatrimestre: 0 \}\);
  \};

  const handleSelectCuatrimestre = \(e: React.ChangeEvent<HTMLSelectElement>\) => \{
    onFiltersChange\(\{ \.\.\.activeFilters, cuatrimestre: parseInt\(e.target.value, 10\), mes: '' \}\);
  \};"""

new_handlers = """  const handleSelectMes = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val.startsWith('Q')) {
      const qNum = parseInt(val.replace('Q', ''), 10);
      onFiltersChange({ ...activeFilters, mes: '', cuatrimestre: qNum });
    } else {
      onFiltersChange({ ...activeFilters, mes: val, cuatrimestre: 0 });
    }
  };"""

content = re.sub(old_handlers, new_handlers, content, flags=re.MULTILINE|re.DOTALL)

# Replace <select> for mes to use Qx if cuatrimestre is selected
old_mes_select = r"""        \{/\* Mes \*/\}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <select
            value=\{activeFilters.mes\}
            onChange=\{handleSelectMes\}"""

new_mes_select = """        {/* Mes y Cuatrimestre */}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <select
            value={activeFilters.cuatrimestre ? 'Q' + activeFilters.cuatrimestre : activeFilters.mes}
            onChange={handleSelectMes}"""

content = re.sub(old_mes_select, new_mes_select, content, flags=re.MULTILINE|re.DOTALL)

# Remove Cuatrimestre select
old_cuatrimestre_div = r"""        \{/\* Cuatrimestre \*/\}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <select
            value=\{activeFilters.cuatrimestre\}
            onChange=\{handleSelectCuatrimestre\}
            className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-white/5 border border-\[var\(--card-border\)\] text-sm focus:outline-none focus:border-blue-500/50 transition-colors sm:min-w-\[150px\]"
          >
            <option value=\{0\} className="bg-slate-950 text-white">Todos los cuatrimestres</option>
            <option value=\{1\} className="bg-slate-950 text-white">Q1 \(Ene-Abr\)</option>
            <option value=\{2\} className="bg-slate-950 text-white">Q2 \(May-Ago\)</option>
            <option value=\{3\} className="bg-slate-950 text-white">Q3 \(Sep-Dic\)</option>
          </select>
        </div>"""

content = re.sub(old_cuatrimestre_div, "", content, flags=re.MULTILINE|re.DOTALL)

with open('src/components/dashboard/FiltersBar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
