-- 05 - Reporte personalizado v2: alimentado por la barra de filtros global.
-- Ya aplicada en Supabase (migración ipa_custom_report_v2_filtros_unificados).
-- La función anterior ipa_get_custom_report se conserva; puede eliminarse cuando
-- ninguna versión desplegada la use.
CREATE OR REPLACE FUNCTION ipa_get_custom_report_v2(
  p_anio int DEFAULT 0, p_mes text DEFAULT '', p_cuatrimestre int DEFAULT 0,
  p_desde int DEFAULT NULL, p_hasta int DEFAULT NULL,
  p_regional text DEFAULT '', p_provincia text DEFAULT '', p_distrito text DEFAULT '', p_infoplaza int DEFAULT 0
)
RETURNS json LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_mes_num int;
  v_result json;
BEGIN
  v_mes_num := CASE lower(trim(coalesce(p_mes, '')))
    WHEN 'enero' THEN 1 WHEN 'febrero' THEN 2 WHEN 'marzo' THEN 3 WHEN 'abril' THEN 4
    WHEN 'mayo' THEN 5 WHEN 'junio' THEN 6 WHEN 'julio' THEN 7 WHEN 'agosto' THEN 8
    WHEN 'septiembre' THEN 9 WHEN 'setiembre' THEN 9 WHEN 'octubre' THEN 10
    WHEN 'noviembre' THEN 11 WHEN 'diciembre' THEN 12 ELSE NULL END;

  SELECT json_agg(t.row_data) INTO v_result
  FROM (
    SELECT json_build_object(
      'regional', i.regional, 'numero_infoplaza', i.numero, 'nombre_infoplaza', i.nombre,
      'provincia', i.provincia, 'distrito', i.distrito, 'corregimiento', i.corregimiento, 'estado', i.estado,
      'anio', rd.anio, 'mes', rd.mes, 'mes_numero', rd.mes_numero,
      'masculino', COALESCE(rd.masculino, 0), 'femenino', COALESCE(rd.femenino, 0),
      'primaria', COALESCE(rd.primaria, 0), 'secundaria', COALESCE(rd.secundaria, 0),
      'universitario', COALESCE(rd.universitario, 0), 'docente', COALESCE(rd.docente, 0),
      'tercera_edad', COALESCE(rd.tercera_edad, 0), 'publico_general', COALESCE(rd.publico_general, 0),
      'uso_de_pc', COALESCE(rs.uso_de_pc, 0), 'copia', COALESCE(rs.copia, 0), 'impresion', COALESCE(rs.impresion, 0),
      'consulta', COALESCE(rs.consulta, 0), 'taller', COALESCE(rs.taller, 0), 'reunion', COALESCE(rs.reunion, 0),
      'otros', COALESCE(rs.otros, 0), 'total_visitas', COALESCE(rd.total, rs.total, 0)
    ) AS row_data
    FROM infoplazas i
    INNER JOIN resumen_demografico rd ON rd.numero_infoplaza = i.numero
    LEFT JOIN resumen_servicios rs ON rs.numero_infoplaza = i.numero AND rs.anio = rd.anio AND rs.mes_numero = rd.mes_numero
    WHERE (
        (p_desde IS NOT NULL AND p_hasta IS NOT NULL
          AND (rd.anio * 100 + rd.mes_numero) BETWEEN LEAST(p_desde, p_hasta) AND GREATEST(p_desde, p_hasta))
        OR
        ((p_desde IS NULL OR p_hasta IS NULL)
          AND (coalesce(p_anio, 0) = 0 OR rd.anio = p_anio)
          AND (v_mes_num IS NULL OR rd.mes_numero = v_mes_num)
          AND (coalesce(p_cuatrimestre, 0) = 0 OR ((rd.mes_numero - 1) / 4) + 1 = p_cuatrimestre))
      )
      AND (coalesce(p_regional, '') = '' OR lower(trim(i.regional)) = lower(trim(p_regional)))
      AND (coalesce(p_provincia, '') = '' OR lower(trim(i.provincia)) = lower(trim(p_provincia)))
      AND (coalesce(p_distrito, '') = '' OR lower(trim(i.distrito)) = lower(trim(p_distrito)))
      AND (coalesce(p_infoplaza, 0) = 0 OR i.numero = p_infoplaza)
      AND (lower(trim(i.estado)) <> 'cerrada definitivamente' OR COALESCE(rd.total, 0) > 0 OR COALESCE(rs.total, 0) > 0)
    ORDER BY rd.anio DESC, rd.mes_numero DESC, i.regional ASC, i.numero ASC
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

REVOKE ALL ON FUNCTION ipa_get_custom_report_v2(int,text,int,int,int,text,text,text,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ipa_get_custom_report_v2(int,text,int,int,int,text,text,text,int) TO authenticated, service_role;
