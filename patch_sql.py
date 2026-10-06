import os

file_path = 'docs/migrations/04-ipa-capacitaciones-report-rpc.sql'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_str = "'ips_sin_reporte', coalesce((SELECT json_agg(x ORDER BY x.regional, x.numero) FROM ("
new_str = """'lista_pendientes', coalesce((SELECT json_agg(x ORDER BY x.regional, x.numero) FROM (
        SELECT ips.numero, ips.nombre, ips.regional, ips.provincia, ips.distrito,
               coalesce((SELECT ctrl.estado FROM ctrl WHERE ctrl.infoplaza_numero = ips.numero LIMIT 1), 'pendiente') AS estado_entrega
        FROM ips WHERE ips.activa
        AND lower(coalesce((SELECT ctrl.estado FROM ctrl WHERE ctrl.infoplaza_numero = ips.numero LIMIT 1), 'pendiente')) = 'pendiente'
    ) x), '[]'::json),
    'lista_no_entrega', coalesce((SELECT json_agg(x ORDER BY x.regional, x.numero) FROM (
        SELECT ips.numero, ips.nombre, ips.regional, ips.provincia, ips.distrito,
               (SELECT ctrl.estado FROM ctrl WHERE ctrl.infoplaza_numero = ips.numero LIMIT 1) AS estado_entrega,
               (SELECT ctrl.motivo FROM ctrl WHERE ctrl.infoplaza_numero = ips.numero LIMIT 1) AS motivo
        FROM ips WHERE ips.activa
        AND lower((SELECT ctrl.estado FROM ctrl WHERE ctrl.infoplaza_numero = ips.numero LIMIT 1)) = 'no entrega'
    ) x), '[]'::json),
    'ips_sin_reporte', coalesce((SELECT json_agg(x ORDER BY x.regional, x.numero) FROM ("""

content = content.replace(old_str, new_str)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('SQL Patched')
