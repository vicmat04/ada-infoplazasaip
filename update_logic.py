import re

with open('src/components/dashboard/CuatrimestreAnalytics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = r"""      const reporteEstado = ctrl\?.estado \|\| 'Pendiente';
      const ipEstado = ip.estado \|\| '';
      
      list.push\(\{ \.\.\.ip, reporteEstado \}\);

      if \(reporteEstado.toLowerCase\(\) === 'entregado'\) \{
        entregados\+\+;
        regMap\[reg\]\['Entregado'\]\+\+;
      \} else if \(reporteEstado.toLowerCase\(\) === 'no entrega'\) \{
        if \(ipEstado.toLowerCase\(\) === 'activa' \|\| ipEstado.toLowerCase\(\) === 'abierta'\) \{
          noEntrega\+\+;
          regMap\[reg\]\['No Entrega'\]\+\+;
        \}
      \} else \{
        // Asumimos 'Pendiente'
        if \(ipEstado.toLowerCase\(\) === 'activa' \|\| ipEstado.toLowerCase\(\) === 'abierta'\) \{
          pendientes\+\+;
          regMap\[reg\]\['Pendiente'\]\+\+;
        \}
      \}"""

new_logic = """      const reporteEstado = ctrl?.estado || 'Pendiente';
      const ipEstado = ip.estado || '';
      const isActiva = ipEstado.toLowerCase() === 'activa' || ipEstado.toLowerCase() === 'abierta';
      
      // Si la infoplaza est\u00e1 cerrada y NO entreg\u00f3 reporte, no la contamos ni mostramos
      if (!isActiva && reporteEstado.toLowerCase() !== 'entregado') {
        return;
      }
      
      list.push({ ...ip, reporteEstado });

      if (reporteEstado.toLowerCase() === 'entregado') {
        entregados++;
        regMap[reg]['Entregado']++;
      } else if (reporteEstado.toLowerCase() === 'no entrega') {
        noEntrega++;
        regMap[reg]['No Entrega']++;
      } else {
        pendientes++;
        regMap[reg]['Pendiente']++;
      }"""

content = re.sub(old_logic, new_logic, content)

with open('src/components/dashboard/CuatrimestreAnalytics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
