import os

file_path = 'docs/migrations/01-ipa-custom-report-rpc.sql'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_query = '''    FROM ipa_infoplazas_activas i
    INNER JOIN resumen_demografico rd ON rd.numero_infoplaza = i.numero
    LEFT JOIN resumen_servicios rs ON rs.numero_infoplaza = i.numero 
                                  AND rs.anio = rd.anio 
                                  AND rs.mes_numero = rd.mes_numero
    WHERE ((rd.anio * 100) + rd.mes_numero) BETWEEN v_start_period AND v_end_period
      AND (
        p_regionales IS NULL 
        OR array_length(p_regionales, 1) IS NULL 
        OR 'ALL' = ANY(p_regionales) 
        OR LOWER(TRIM(i.regional)) = ANY(SELECT LOWER(TRIM(r)) FROM unnest(p_regionales) r)
      )'''

new_query = '''    FROM infoplazas i
    INNER JOIN resumen_demografico rd ON rd.numero_infoplaza = i.numero
    LEFT JOIN resumen_servicios rs ON rs.numero_infoplaza = i.numero 
                                  AND rs.anio = rd.anio 
                                  AND rs.mes_numero = rd.mes_numero
    WHERE ((rd.anio * 100) + rd.mes_numero) BETWEEN v_start_period AND v_end_period
      AND (LOWER(TRIM(i.estado)) != 'cerrada definitivamente' OR COALESCE(rd.total, 0) > 0 OR COALESCE(rs.total, 0) > 0)
      AND (
        p_regionales IS NULL 
        OR array_length(p_regionales, 1) IS NULL 
        OR 'ALL' = ANY(p_regionales) 
        OR LOWER(TRIM(i.regional)) = ANY(SELECT LOWER(TRIM(r)) FROM unnest(p_regionales) r)
      )'''

c = content.replace(old_query, new_query)
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(c)

print("patched:", c != content)
