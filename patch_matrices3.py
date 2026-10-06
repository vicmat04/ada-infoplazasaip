import os

file_path = 'docs/migrations/03-fix-rpc-distrito-cuatrimestre.sql'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_serv = '''    FROM ipa_infoplazas_activas ipa
      LEFT JOIN resumen_servicios rs 
        ON ipa.numero = rs.numero_infoplaza 
        AND (p_anio = 0 OR rs.anio = p_anio)
        AND (p_mes = '' OR rs.mes = p_mes) AND (p_cuatrimestre = 0 OR (rs.mes_numero <= 4 AND p_cuatrimestre = 1) OR (rs.mes_numero > 4 AND rs.mes_numero <= 8 AND p_cuatrimestre = 2) OR (rs.mes_numero > 8 AND p_cuatrimestre = 3))
      WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
        AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
          AND (p_distrito = '' OR LOWER(TRIM(ipa.distrito)) = LOWER(TRIM(p_distrito)))
        AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza)
      GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia
      ORDER BY COALESCE(SUM(rs.total), 0) DESC'''

new_serv = '''    FROM infoplazas ipa
      LEFT JOIN resumen_servicios rs 
        ON ipa.numero = rs.numero_infoplaza 
        AND (p_anio = 0 OR rs.anio = p_anio)
        AND (p_mes = '' OR rs.mes = p_mes) AND (p_cuatrimestre = 0 OR (rs.mes_numero <= 4 AND p_cuatrimestre = 1) OR (rs.mes_numero > 4 AND rs.mes_numero <= 8 AND p_cuatrimestre = 2) OR (rs.mes_numero > 8 AND p_cuatrimestre = 3))
      WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
        AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
          AND (p_distrito = '' OR LOWER(TRIM(ipa.distrito)) = LOWER(TRIM(p_distrito)))
        AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza)
      GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia, ipa.estado
      HAVING (LOWER(TRIM(ipa.estado)) != 'cerrada definitivamente' OR COALESCE(SUM(rs.total), 0) > 0)
      ORDER BY COALESCE(SUM(rs.total), 0) DESC'''

old_vis = '''    FROM ipa_infoplazas_activas ipa
      LEFT JOIN resumen_demografico rd 
        ON ipa.numero = rd.numero_infoplaza 
        AND (p_anio = 0 OR rd.anio = p_anio)
        AND (p_mes = '' OR rd.mes = p_mes) AND (p_cuatrimestre = 0 OR (rd.mes_numero <= 4 AND p_cuatrimestre = 1) OR (rd.mes_numero > 4 AND rd.mes_numero <= 8 AND p_cuatrimestre = 2) OR (rd.mes_numero > 8 AND p_cuatrimestre = 3))
      WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
        AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
          AND (p_distrito = '' OR LOWER(TRIM(ipa.distrito)) = LOWER(TRIM(p_distrito)))
        AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza)
      GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia
      ORDER BY COALESCE(SUM(rd.total), 0) DESC'''

new_vis = '''    FROM infoplazas ipa
      LEFT JOIN resumen_demografico rd 
        ON ipa.numero = rd.numero_infoplaza 
        AND (p_anio = 0 OR rd.anio = p_anio)
        AND (p_mes = '' OR rd.mes = p_mes) AND (p_cuatrimestre = 0 OR (rd.mes_numero <= 4 AND p_cuatrimestre = 1) OR (rd.mes_numero > 4 AND rd.mes_numero <= 8 AND p_cuatrimestre = 2) OR (rd.mes_numero > 8 AND p_cuatrimestre = 3))
      WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
        AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
          AND (p_distrito = '' OR LOWER(TRIM(ipa.distrito)) = LOWER(TRIM(p_distrito)))
        AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza)
      GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia, ipa.estado
      HAVING (LOWER(TRIM(ipa.estado)) != 'cerrada definitivamente' OR COALESCE(SUM(rd.total), 0) > 0)
      ORDER BY COALESCE(SUM(rd.total), 0) DESC'''

c = content.replace(old_serv, new_serv)
c = c.replace(old_vis, new_vis)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(c)
print("patched:", c != content)
