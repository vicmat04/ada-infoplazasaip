import os

file_path = 'docs/migrations/03-fix-rpc-distrito-cuatrimestre.sql'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_table_rows = False
in_serv_rows = False
in_vis_rows = False

for line in lines:
    if 'INTO v_table_rows' in line:
        in_table_rows = True
    elif 'INTO v_servicios_por_infoplaza' in line:
        in_serv_rows = True
    elif 'INTO v_visitantes_por_infoplaza' in line:
        in_vis_rows = True
    
    if in_table_rows and 'FROM ipa_infoplazas_activas ipa' in line:
        line = line.replace('FROM ipa_infoplazas_activas ipa', 'FROM infoplazas ipa')
    if in_table_rows and 'GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia, ipa.distrito, ipa.corregimiento' in line:
        line = line.replace('GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia, ipa.distrito, ipa.corregimiento', 'GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia, ipa.distrito, ipa.corregimiento, ipa.estado\n      HAVING (LOWER(TRIM(ipa.estado)) != \'cerrada definitivamente\' OR COALESCE(SUM(rs.total), 0) > 0)')
        in_table_rows = False
        
    if in_serv_rows and 'FROM ipa_infoplazas_activas ipa' in line:
        line = line.replace('FROM ipa_infoplazas_activas ipa', 'FROM infoplazas ipa')
    if in_serv_rows and 'GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia' in line and not 'ipa.estado' in line:
        line = line.replace('GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia', 'GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia, ipa.estado\n      HAVING (LOWER(TRIM(ipa.estado)) != \'cerrada definitivamente\' OR COALESCE(SUM(rs.total), 0) > 0)')
        in_serv_rows = False

    if in_vis_rows and 'FROM ipa_infoplazas_activas ipa' in line:
        line = line.replace('FROM ipa_infoplazas_activas ipa', 'FROM infoplazas ipa')
    if in_vis_rows and 'GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia' in line and not 'ipa.estado' in line:
        line = line.replace('GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia', 'GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia, ipa.estado\n      HAVING (LOWER(TRIM(ipa.estado)) != \'cerrada definitivamente\' OR COALESCE(SUM(rd.total), 0) > 0)')
        in_vis_rows = False

    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("done manually")
