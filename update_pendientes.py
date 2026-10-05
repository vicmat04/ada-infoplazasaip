import re

with open('src/components/dashboard/CuatrimestreAnalytics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = r"""      if \(reporteEstado.toLowerCase\(\) === 'entregado'\) \{
        entregados\+\+;
        regMap\[reg\]\['Entregado'\]\+\+;
      \} else if \(reporteEstado.toLowerCase\(\) === 'no entrega'\) \{
        if \(ipEstado.toLowerCase\(\) === 'abierta'\) \{
          noEntrega\+\+;
          regMap\[reg\]\['No Entrega'\]\+\+;
        \}
      \} else \{
        pendientes\+\+;
        regMap\[reg\]\['Pendiente'\]\+\+;
      \}"""

new_logic = """      if (reporteEstado.toLowerCase() === 'entregado') {
        entregados++;
        regMap[reg]['Entregado']++;
      } else if (reporteEstado.toLowerCase() === 'no entrega') {
        if (ipEstado.toLowerCase() === 'abierta') {
          noEntrega++;
          regMap[reg]['No Entrega']++;
        }
      } else {
        // Asumimos 'Pendiente'
        if (ipEstado.toLowerCase() === 'abierta') {
          pendientes++;
          regMap[reg]['Pendiente']++;
        }
      }"""

content = re.sub(old_logic, new_logic, content)

with open('src/components/dashboard/CuatrimestreAnalytics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
