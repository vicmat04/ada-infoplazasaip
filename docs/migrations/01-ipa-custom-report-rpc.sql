-- ====================================================================
-- FUNCIÓN RPC: ipa_get_custom_report
-- Genera el dataset consolidado ad-hoc por mes e Infoplaza
-- Excluye automáticamente infoplazas cerradas y consolida visitas
-- ====================================================================

CREATE OR REPLACE FUNCTION ipa_get_custom_report(
  p_periodo_tipo text DEFAULT 'mes_actual',
  p_desde_anio int DEFAULT NULL,
  p_desde_mes int DEFAULT NULL,
  p_hasta_anio int DEFAULT NULL,
  p_hasta_mes int DEFAULT NULL,
  p_regionales text[] DEFAULT '{}'
)
RETURNS json AS $$
DECLARE
  v_max_anio int;
  v_max_mes_num int;
  v_start_period int;
  v_end_period int;
  v_result json;
BEGIN
  -- 1. Determinar el último período disponible con datos reales en la base de datos (dinámico sin hardcoding)
  SELECT rd.anio, rd.mes_numero
  INTO v_max_anio, v_max_mes_num
  FROM resumen_demografico rd
  WHERE rd.total > 0
  ORDER BY rd.anio DESC, rd.mes_numero DESC
  LIMIT 1;

  -- Fallback en caso de que la tabla estuviera vacía
  IF v_max_anio IS NULL THEN
    v_max_anio := EXTRACT(YEAR FROM CURRENT_DATE)::int;
    v_max_mes_num := 12;
  END IF;

  -- 2. Calcular los períodos de inicio y fin (Formato AAAAMM ej: 202607)
  IF p_periodo_tipo = 'mes_actual' THEN
    v_start_period := (v_max_anio * 100) + v_max_mes_num;
    v_end_period := v_start_period;

  ELSIF p_periodo_tipo = 'mes_anterior' THEN
    IF v_max_mes_num = 1 THEN
      v_start_period := ((v_max_anio - 1) * 100) + 12;
    ELSE
      v_start_period := (v_max_anio * 100) + (v_max_mes_num - 1);
    END IF;
    v_end_period := v_start_period;

  ELSIF p_periodo_tipo = 'este_anio' THEN
    v_start_period := (v_max_anio * 100) + 1;
    v_end_period := (v_max_anio * 100) + v_max_mes_num;

  ELSIF p_periodo_tipo = 'anio_anterior' THEN
    v_start_period := ((v_max_anio - 1) * 100) + 1;
    v_end_period := ((v_max_anio - 1) * 100) + 12;

  ELSIF p_periodo_tipo = 'personalizado' THEN
    IF p_desde_anio IS NOT NULL AND p_desde_mes IS NOT NULL THEN
      v_start_period := (p_desde_anio * 100) + p_desde_mes;
    ELSE
      v_start_period := (v_max_anio * 100) + 1;
    END IF;

    IF p_hasta_anio IS NOT NULL AND p_hasta_mes IS NOT NULL THEN
      v_end_period := (p_hasta_anio * 100) + p_hasta_mes;
    ELSE
      v_end_period := (v_max_anio * 100) + v_max_mes_num;
    END IF;
  ELSE
    -- Por defecto mes actual
    v_start_period := (v_max_anio * 100) + v_max_mes_num;
    v_end_period := v_start_period;
  END IF;

  -- 3. Construir la consulta agrupada por mes e Infoplaza
  SELECT json_agg(t.row_data) INTO v_result
  FROM (
    SELECT json_build_object(
      'regional', i.regional,
      'numero_infoplaza', i.numero,
      'nombre_infoplaza', i.nombre,
      'provincia', i.provincia,
      'distrito', i.distrito,
      'corregimiento', i.corregimiento,
      'anio', rd.anio,
      'mes', rd.mes,
      'mes_numero', rd.mes_numero,
      'periodo_label', CONCAT(rd.anio, ' - ', rd.mes),
      'masculino', COALESCE(rd.masculino, 0),
      'femenino', COALESCE(rd.femenino, 0),
      'primaria', COALESCE(rd.primaria, 0),
      'secundaria', COALESCE(rd.secundaria, 0),
      'universitario', COALESCE(rd.universitario, 0),
      'docente', COALESCE(rd.docente, 0),
      'tercera_edad', COALESCE(rd.tercera_edad, 0),
      'publico_general', COALESCE(rd.publico_general, 0),
      'uso_de_pc', COALESCE(rs.uso_de_pc, 0),
      'copia', COALESCE(rs.copia, 0),
      'impresion', COALESCE(rs.impresion, 0),
      'consulta', COALESCE(rs.consulta, 0),
      'taller', COALESCE(rs.taller, 0),
      'reunion', COALESCE(rs.reunion, 0),
      'otros', COALESCE(rs.otros, 0),
      'total_visitas', COALESCE(rd.total, rs.total, 0)
    ) AS row_data
    FROM ipa_infoplazas_activas i
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
      )
    ORDER BY rd.anio DESC, rd.mes_numero DESC, i.regional ASC, i.numero ASC
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql STABLE;
