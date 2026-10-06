import os

file_path = 'docs/migrations/04-ipa-capacitaciones-report-rpc.sql'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the reg AS CTE line
old_reg_pendientes = "(SELECT count(*) FROM ctrl WHERE ctrl.regional = ips.regional AND lower(ctrl.estado) = 'pendiente' AND ctrl.activa) AS pendientes,"
new_reg_pendientes = "(count(*) FILTER (WHERE ips.activa) - (SELECT count(*) FROM ctrl WHERE ctrl.regional = ips.regional AND lower(ctrl.estado) = 'entregado' AND ctrl.activa) - (SELECT count(*) FROM ctrl WHERE ctrl.regional = ips.regional AND lower(ctrl.estado) = 'no entrega' AND ctrl.activa)) AS pendientes,"
content = content.replace(old_reg_pendientes, new_reg_pendientes)

# Replace the kpis object line
old_kpis_pendientes = "'pendientes', (SELECT count(*) FROM ctrl WHERE lower(estado) = 'pendiente' AND activa),"
new_kpis_pendientes = "'pendientes', ((SELECT count(*) FROM ips WHERE activa) - (SELECT count(*) FROM ctrl WHERE lower(estado) = 'entregado' AND activa) - (SELECT count(*) FROM ctrl WHERE lower(estado) = 'no entrega' AND activa)),"
content = content.replace(old_kpis_pendientes, new_kpis_pendientes)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
