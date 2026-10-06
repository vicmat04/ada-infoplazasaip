import os
import re

file_path = 'docs/migrations/03-fix-rpc-distrito-cuatrimestre.sql'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Match: FROM ipa_infoplazas_activas ipa\n      LEFT JOIN resumen_servicios rs
# up to GROUP BY ... \n      ORDER BY ...
# We will just replace 'ipa_infoplazas_activas' with 'infoplazas' in the specific sections.
# But we also need to change GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia
# to include ipa.estado, and add the HAVING clause.

def replace_servicios(match):
    return match.group(1) + "infoplazas ipa\n      LEFT JOIN resumen_servicios" + match.group(2) + "GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia, ipa.estado\n      HAVING (LOWER(TRIM(ipa.estado)) != 'cerrada definitivamente' OR COALESCE(SUM(rs.total), 0) > 0)\n      ORDER"

def replace_visitantes(match):
    return match.group(1) + "infoplazas ipa\n      LEFT JOIN resumen_demografico" + match.group(2) + "GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia, ipa.estado\n      HAVING (LOWER(TRIM(ipa.estado)) != 'cerrada definitivamente' OR COALESCE(SUM(rd.total), 0) > 0)\n      ORDER"

pattern_serv = r"(?s)(v_servicios_por_infoplaza.*?FROM )ipa_infoplazas_activas ipa\s*LEFT JOIN resumen_servicios(.*?)GROUP BY ipa\.numero, ipa\.nombre, ipa\.regional, ipa\.provincia\s*ORDER"
content = re.sub(pattern_serv, replace_servicios, content)

pattern_vis = r"(?s)(v_visitantes_por_infoplaza.*?FROM )ipa_infoplazas_activas ipa\s*LEFT JOIN resumen_demografico(.*?)GROUP BY ipa\.numero, ipa\.nombre, ipa\.regional, ipa\.provincia\s*ORDER"
content = re.sub(pattern_vis, replace_visitantes, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
