-- ====================================================================
-- SCRIPT DE MIGRACIÓN A RPC Y VISTAS - INFOPLAZAS ANALYTICS (IPA)
-- Ejecutar este script en el editor SQL de Supabase (SQL Editor)
-- ====================================================================

-- 1. Vista de Infoplazas Activas actualizadas
-- Aísla de raíz las sucursales que hoy están "Cerradas Definitivamente"
CREATE OR REPLACE VIEW ipa_infoplazas_activas AS
SELECT numero, nombre, regional, provincia, distrito, corregimiento, estado
FROM infoplazas
WHERE estado = 'Activa';

-- 2. Función RPC para obtener los períodos reales con datos en Supabase
-- Evita el límite de PostgREST y elimina listas estáticas en frontend
CREATE OR REPLACE FUNCTION ipa_get_periodos_disponibles()
RETURNS TABLE (anio int, mes text) AS $$
BEGIN
  RETURN QUERY
  SELECT rs.anio, rs.mes
  FROM resumen_servicios rs
  GROUP BY rs.anio, rs.mes
  ORDER BY rs.anio DESC, 
           CASE rs.mes
             WHEN 'Enero' THEN 1
             WHEN 'Febrero' THEN 2
             WHEN 'Marzo' THEN 3
             WHEN 'Abril' THEN 4
             WHEN 'Mayo' THEN 5
             WHEN 'Junio' THEN 6
             WHEN 'Julio' THEN 7
             WHEN 'Agosto' THEN 8
             WHEN 'Septiembre' THEN 9
             WHEN 'Octubre' THEN 10
             WHEN 'Noviembre' THEN 11
             WHEN 'Diciembre' THEN 12
             ELSE 13
           END;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Función RPC consolidadora principal para el snapshot del Dashboard
-- Ejecuta todo el agrupamiento, filtros y sumas en PostgreSQL y retorna un único JSON
CREATE OR REPLACE FUNCTION ipa_get_dashboard_snapshot(
  p_anio int,
  p_mes text,
  p_regional text,
  p_provincia text,
  p_infoplaza int
)
RETURNS json AS $$
DECLARE
  -- Variables de Red e Infraestructura
  v_total_activas int;
  v_total_reportadas int;
  v_ips_con_actividad_periodo int;
  v_cumplimiento_sinc numeric;
  v_ips_revision int;
  v_ultimo_corte date;
  v_sync_umbral int := 10;
  
  -- Variables de Servicios
  v_total_atenciones bigint;
  v_promedio_atenciones numeric;
  v_servicio_lider text;
  v_servicio_lider_total bigint;
  v_servicio_lider_porcentaje numeric;
  
  -- Variables de Visitantes
  v_total_visitantes bigint;
  v_total_educativo bigint;
  v_total_masculino bigint;
  v_total_femenino bigint;
  v_porcentaje_femenino numeric;
  v_genero_lider text;
  v_genero_lider_total bigint;
  v_genero_lider_porcentaje numeric;
  v_segmento_lider text;
  v_segmento_lider_total bigint;
  v_segmento_lider_porcentaje numeric;
  
  -- Sumas desagregadas de segmentos
  v_sum_primaria bigint;
  v_sum_secundaria bigint;
  v_sum_universitario bigint;
  v_sum_docente bigint;
  v_sum_tercera_edad bigint;
  v_sum_publico_general bigint;

  -- Bloques de Arrays JSON finales
  v_tendencia_mensual json;
  v_regional_rows json;
  v_sync_regional_rows json;
  v_risk_rows json;
  v_table_rows json;
  v_service_ranking json;
  v_visitor_segments json;
  v_max_mes_cargado_numero int;
  v_ytd_total_actual bigint;
  v_ytd_total_anterior bigint;
  v_crecimiento_ytd numeric;
  
  -- Nuevas variables para servicios desglosados
  v_tendencia_servicios json;
  v_servicios_por_regional json;
  v_servicios_por_infoplaza json;
  
  -- Nuevas variables para visitantes desglosados (Pestaña Visitantes)
  v_visitor_gender_type_rows json;
  v_tendencia_visitantes json;
  v_visitantes_por_regional json;
  v_visitantes_por_infoplaza json;
  
  v_resultado json;
BEGIN
  -- ------------------------------------------------------------------
  -- PASO A: DETERMINAR LA FECHA DEL ÚLTIMO CORTE DE SINCRONIZACIÓN
  -- ------------------------------------------------------------------
  SELECT COALESCE(MAX(fecha_reporte), '2026-06-30'::date) INTO v_ultimo_corte
  FROM historial_sincronizacion;

  -- ------------------------------------------------------------------
  -- PASO B: METRICAS OPERATIVAS ACTUALES Y COBERTURA (Solo sobre Infoplazas Activas)
  -- ------------------------------------------------------------------
  -- Total de sucursales físicamente activas hoy (según filtros geográficos)
  SELECT COUNT(*)::int INTO v_total_activas
  FROM ipa_infoplazas_activas ipa
  WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
    AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
    AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza);

  -- ------------------------------------------------------------------
  -- PASO C: CÓMPUTO DE SERVICIOS HISTÓRICOS (Sin restricción de estado activo para atenciones)
  -- ------------------------------------------------------------------
  -- Suma total de atenciones registradas en resumen_servicios
  SELECT 
    COALESCE(SUM(rs.total), 0),
    COUNT(DISTINCT CASE WHEN rs.total > 0 THEN rs.numero_infoplaza END)
  INTO v_total_atenciones, v_ips_con_actividad_periodo
  FROM resumen_servicios rs
  WHERE (p_anio = 0 OR rs.anio = p_anio)
    AND (p_mes = '' OR rs.mes = p_mes)
    AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional)))
    AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza)
    -- Si se seleccionó provincia, cruzamos con la tabla física para validar la provincia del registro histórico
    AND (p_provincia = '' OR rs.numero_infoplaza IN (
         SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))
        ));

  -- ------------------------------------------------------------------
  -- PASO D: CÓMPUTO DE VISITANTES HISTÓRICOS (Resumen demográfico)
  -- ------------------------------------------------------------------
  SELECT 
    COALESCE(SUM(rd.total), 0),
    COALESCE(SUM(rd.primaria + rd.secundaria + rd.universitario + rd.docente), 0),
    COALESCE(SUM(rd.masculino), 0),
    COALESCE(SUM(rd.femenino), 0),
    COALESCE(SUM(rd.primaria), 0),
    COALESCE(SUM(rd.secundaria), 0),
    COALESCE(SUM(rd.universitario), 0),
    COALESCE(SUM(rd.docente), 0),
    COALESCE(SUM(rd.tercera_edad), 0),
    COALESCE(SUM(rd.publico_general), 0)
  INTO 
    v_total_visitantes, v_total_educativo, v_total_masculino, v_total_femenino,
    v_sum_primaria, v_sum_secundaria, v_sum_universitario, v_sum_docente,
    v_sum_tercera_edad, v_sum_publico_general
  FROM resumen_demografico rd
  WHERE (p_anio = 0 OR rd.anio = p_anio)
    AND (p_mes = '' OR rd.mes = p_mes)
    AND (p_regional = '' OR LOWER(TRIM(rd.regional)) = LOWER(TRIM(p_regional)))
    AND (p_infoplaza = 0 OR rd.numero_infoplaza = p_infoplaza)
    AND (p_provincia = '' OR rd.numero_infoplaza IN (
         SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))
        ));

  -- Construir el JSON desagregado de todos los tipos de usuarios (en orden descendente o natural)
  v_visitor_segments := json_build_array(
    json_build_object('name', 'Público General', 'value', v_sum_publico_general),
    json_build_object('name', 'Secundaria', 'value', v_sum_secundaria),
    json_build_object('name', 'Universitario', 'value', v_sum_universitario),
    json_build_object('name', 'Primaria', 'value', v_sum_primaria),
    json_build_object('name', 'Tercera Edad', 'value', v_sum_tercera_edad),
    json_build_object('name', 'Docente', 'value', v_sum_docente)
  );

  -- ------------------------------------------------------------------
  -- PASO E: DETERMINAR GÉNERO LÍDER Y SERVICIO LÍDER
  -- ------------------------------------------------------------------
  -- Porcentaje femenino
  IF v_total_visitantes > 0 THEN
    v_porcentaje_femenino := (v_total_femenino::numeric / v_total_visitantes::numeric) * 100;
  ELSE
    v_porcentaje_femenino := 0;
  END IF;

  IF v_total_femenino >= v_total_masculino THEN
    v_genero_lider := 'Femenino';
    v_genero_lider_total := v_total_femenino;
  ELSE
    v_genero_lider := 'Masculino';
    v_genero_lider_total := v_total_masculino;
  END IF;

  IF v_total_visitantes > 0 THEN
    v_genero_lider_porcentaje := (v_genero_lider_total::numeric / v_total_visitantes::numeric) * 100;
  ELSE
    v_genero_lider_porcentaje := 0;
  END IF;

  -- Determinar Servicio Líder dinámicamente sumando columnas de resumen_servicios
  WITH sumas_servicios AS (
    SELECT 'Copia' AS servicio, COALESCE(SUM(copia), 0) AS total FROM resumen_servicios rs WHERE (p_anio = 0 OR rs.anio = p_anio) AND (p_mes = '' OR rs.mes = p_mes) AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional))) AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza) AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
    UNION ALL
    SELECT 'Impresión' AS servicio, COALESCE(SUM(impresion), 0) AS total FROM resumen_servicios rs WHERE (p_anio = 0 OR rs.anio = p_anio) AND (p_mes = '' OR rs.mes = p_mes) AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional))) AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza) AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
    UNION ALL
    SELECT 'Uso de PC' AS servicio, COALESCE(SUM(uso_de_pc), 0) AS total FROM resumen_servicios rs WHERE (p_anio = 0 OR rs.anio = p_anio) AND (p_mes = '' OR rs.mes = p_mes) AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional))) AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza) AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
    UNION ALL
    SELECT 'Consulta' AS servicio, COALESCE(SUM(consulta), 0) AS total FROM resumen_servicios rs WHERE (p_anio = 0 OR rs.anio = p_anio) AND (p_mes = '' OR rs.mes = p_mes) AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional))) AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza) AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
    UNION ALL
    SELECT 'Taller' AS servicio, COALESCE(SUM(taller), 0) AS total FROM resumen_servicios rs WHERE (p_anio = 0 OR rs.anio = p_anio) AND (p_mes = '' OR rs.mes = p_mes) AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional))) AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza) AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
    UNION ALL
    SELECT 'Reunión' AS servicio, COALESCE(SUM(reunion), 0) AS total FROM resumen_servicios rs WHERE (p_anio = 0 OR rs.anio = p_anio) AND (p_mes = '' OR rs.mes = p_mes) AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional))) AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza) AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
    UNION ALL
    SELECT 'Otros' AS servicio, COALESCE(SUM(otros), 0) AS total FROM resumen_servicios rs WHERE (p_anio = 0 OR rs.anio = p_anio) AND (p_mes = '' OR rs.mes = p_mes) AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional))) AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza) AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
  ),
  ranking AS (
    SELECT servicio, total, ROW_NUMBER() OVER(ORDER BY total DESC) as rn
    FROM sumas_servicios
  )
  SELECT ranking.servicio, ranking.total INTO v_servicio_lider, v_servicio_lider_total
  FROM ranking
  WHERE rn = 1;

  IF v_total_atenciones > 0 THEN
    v_servicio_lider_porcentaje := (v_servicio_lider_total::numeric / v_total_atenciones::numeric) * 100;
  ELSE
    v_servicio_lider_porcentaje := 0;
  END IF;

  -- ------------------------------------------------------------------
  -- PASO F: RANKING DE SERVICIOS COMPLETO (Para la vista de servicios)
  -- ------------------------------------------------------------------
  WITH sumas_servicios AS (
    SELECT 'COPIA' AS servicio, COALESCE(SUM(copia), 0) AS total FROM resumen_servicios rs WHERE (p_anio = 0 OR rs.anio = p_anio) AND (p_mes = '' OR rs.mes = p_mes) AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional))) AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza) AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
    UNION ALL
    SELECT 'IMPRESIÓN' AS servicio, COALESCE(SUM(impresion), 0) AS total FROM resumen_servicios rs WHERE (p_anio = 0 OR rs.anio = p_anio) AND (p_mes = '' OR rs.mes = p_mes) AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional))) AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza) AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
    UNION ALL
    SELECT 'USO DE PC' AS servicio, COALESCE(SUM(uso_de_pc), 0) AS total FROM resumen_servicios rs WHERE (p_anio = 0 OR rs.anio = p_anio) AND (p_mes = '' OR rs.mes = p_mes) AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional))) AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza) AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
    UNION ALL
    SELECT 'CONSULTA' AS servicio, COALESCE(SUM(consulta), 0) AS total FROM resumen_servicios rs WHERE (p_anio = 0 OR rs.anio = p_anio) AND (p_mes = '' OR rs.mes = p_mes) AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional))) AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza) AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
    UNION ALL
    SELECT 'TALLER' AS servicio, COALESCE(SUM(taller), 0) AS total FROM resumen_servicios rs WHERE (p_anio = 0 OR rs.anio = p_anio) AND (p_mes = '' OR rs.mes = p_mes) AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional))) AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza) AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
    UNION ALL
    SELECT 'REUNIÓN' AS servicio, COALESCE(SUM(reunion), 0) AS total FROM resumen_servicios rs WHERE (p_anio = 0 OR rs.anio = p_anio) AND (p_mes = '' OR rs.mes = p_mes) AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional))) AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza) AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
    UNION ALL
    SELECT 'OTROS' AS servicio, COALESCE(SUM(otros), 0) AS total FROM resumen_servicios rs WHERE (p_anio = 0 OR rs.anio = p_anio) AND (p_mes = '' OR rs.mes = p_mes) AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional))) AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza) AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
  )
  SELECT json_agg(json_build_object('servicio', servicio, 'total', total) ORDER BY total DESC) INTO v_service_ranking
  FROM sumas_servicios
  WHERE total > 0;

  -- ------------------------------------------------------------------
  -- PASO G: DETERMINAR TIPO DE USUARIO LÍDER (resumen_tipo_usuario_genero)
  -- ------------------------------------------------------------------
  WITH sumas_tipos AS (
    SELECT rtug.tipo_usuario, SUM(rtug.total)::bigint AS total
    FROM resumen_tipo_usuario_genero rtug
    WHERE (p_anio = 0 OR rtug.anio = p_anio)
      AND (p_mes = '' OR rtug.mes = p_mes)
      AND (p_regional = '' OR LOWER(TRIM(rtug.regional)) = LOWER(TRIM(p_regional)))
      AND (p_infoplaza = 0 OR rtug.numero_infoplaza = p_infoplaza)
      AND (p_provincia = '' OR rtug.numero_infoplaza IN (
           SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))
          ))
    GROUP BY rtug.tipo_usuario
  ),
  ranking_tipo AS (
    SELECT tipo_usuario, total, ROW_NUMBER() OVER(ORDER BY total DESC) as rn
    FROM sumas_tipos
  )
  SELECT ranking_tipo.tipo_usuario, ranking_tipo.total INTO v_segmento_lider, v_segmento_lider_total
  FROM ranking_tipo
  WHERE rn = 1;

  IF v_total_visitantes > 0 THEN
    v_segmento_lider_porcentaje := (v_segmento_lider_total::numeric / v_total_visitantes::numeric) * 100;
  ELSE
    v_segmento_lider_porcentaje := 0;
  END IF;

  -- Promedio de atenciones por sucursal con datos
  IF v_ips_con_actividad_periodo > 0 THEN
    v_promedio_atenciones := v_total_atenciones::numeric / v_ips_con_actividad_periodo::numeric;
  ELSE
    v_promedio_atenciones := 0;
  END IF;

  -- ------------------------------------------------------------------
  -- PASO H: CÁLCULO DE SALUD DE SINCRONIZACIÓN Y COBERTURA (Solo sobre activas hoy)
  -- ------------------------------------------------------------------
  -- Cruzar las infoplazas activas actuales con el historial de sincronización del último corte
  WITH sinc_filtrado AS (
    SELECT 
      ipa.numero,
      hs.dias_sin_sinc,
      CASE 
        WHEN hs.dias_sin_sinc IS NULL THEN 'Sin Reporte'
        WHEN hs.dias_sin_sinc <= v_sync_umbral THEN 'Al día'
        ELSE 'Para revisión'
      END AS sync_estado
    FROM ipa_infoplazas_activas ipa
    LEFT JOIN historial_sincronizacion hs 
      ON ipa.numero = CAST(SPLIT_PART(hs.sucursal, '-', 1) AS int)
      AND hs.fecha_reporte = v_ultimo_corte
    WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
      AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
      AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza)
  )
  SELECT 
    COUNT(CASE WHEN sync_estado = 'Al día' THEN 1 END)::int,
    COUNT(CASE WHEN sync_estado = 'Para revisión' THEN 1 END)::int,
    COUNT(CASE WHEN sync_estado = 'Sin Reporte' THEN 1 END)::int
  INTO v_total_reportadas, v_ips_revision, v_total_reportadas -- reutilizar total reportadas para alDia/revision
  FROM sinc_filtrado;

  -- Re-asignar total reportadas
  -- Nota: total reportadas son las que están "Al día"
  v_total_reportadas := v_total_activas - v_ips_revision - (v_total_activas - (v_total_reportadas + v_ips_revision)); -- simplificar
  
  -- Para este dashboard, "totalReportadas" representa el número de sucursales activas "Al día"
  SELECT COUNT(CASE WHEN sync_estado = 'Al día' THEN 1 END)::int INTO v_total_reportadas
  FROM (
    SELECT 
      CASE 
        WHEN hs.dias_sin_sinc IS NULL THEN 'Sin Reporte'
        WHEN hs.dias_sin_sinc <= v_sync_umbral THEN 'Al día'
        ELSE 'Para revisión'
      END AS sync_estado
    FROM ipa_infoplazas_activas ipa
    LEFT JOIN historial_sincronizacion hs 
      ON ipa.numero = CAST(SPLIT_PART(hs.sucursal, '-', 1) AS int)
      AND hs.fecha_reporte = v_ultimo_corte
    WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
      AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
      AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza)
  ) t;

  IF v_total_activas > 0 THEN
    v_cumplimiento_sinc := (v_total_reportadas::numeric / v_total_activas::numeric) * 100;
  ELSE
    v_cumplimiento_sinc := 0;
  END IF;

  IF p_anio = 0 THEN
    -- Todos los años: Agrupamiento cronológico plurianual (ej: Ene 23, Feb 23... Jul 26)
    SELECT json_agg(t.row) INTO v_tendencia_mensual
    FROM (
      SELECT json_build_object(
        'mes', 
        CASE m.mes
          WHEN 'Enero' THEN 'Ene' WHEN 'Febrero' THEN 'Feb' WHEN 'Marzo' THEN 'Mar'
          WHEN 'Abril' THEN 'Abr' WHEN 'Mayo' THEN 'May' WHEN 'Junio' THEN 'Jun'
          WHEN 'Julio' THEN 'Jul' WHEN 'Agosto' THEN 'Ago' WHEN 'Septiembre' THEN 'Sep'
          WHEN 'Octubre' THEN 'Oct' WHEN 'Noviembre' THEN 'Nov' WHEN 'Diciembre' THEN 'Dic'
        END || ' ' || SUBSTRING(a.anio::text, 3, 2),
        'total', COALESCE(SUM(rd.total), 0),
        'masculino', COALESCE(SUM(rd.masculino), 0),
        'femenino', COALESCE(SUM(rd.femenino), 0)
      ) AS row
      FROM (
        SELECT 2023 AS anio UNION ALL SELECT 2024 UNION ALL SELECT 2025 UNION ALL SELECT 2026
      ) a
      CROSS JOIN (
        SELECT 'Enero' AS mes, 1 AS ord UNION ALL SELECT 'Febrero', 2 UNION ALL SELECT 'Marzo', 3 UNION ALL 
        SELECT 'Abril', 4 UNION ALL SELECT 'Mayo', 5 UNION ALL SELECT 'Junio', 6 UNION ALL 
        SELECT 'Julio', 7 UNION ALL SELECT 'Agosto', 8 UNION ALL SELECT 'Septiembre', 9 UNION ALL 
        SELECT 'Octubre', 10 UNION ALL SELECT 'Noviembre', 11 UNION ALL SELECT 'Diciembre', 12
      ) m
      LEFT JOIN resumen_demografico rd 
        ON rd.anio = a.anio
        AND rd.mes = m.mes
        AND (p_mes = '' OR rd.mes = p_mes)
        AND (p_regional = '' OR LOWER(TRIM(rd.regional)) = LOWER(TRIM(p_regional)))
        AND (p_infoplaza = 0 OR rd.numero_infoplaza = p_infoplaza)
        AND (p_provincia = '' OR rd.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
      GROUP BY a.anio, m.mes, m.ord
      HAVING (p_mes = '' AND SUM(rd.total) > 0) OR (p_mes <> '' AND m.mes = p_mes)
      ORDER BY a.anio, m.ord
    ) t;
  ELSE
    -- Obtener dinámicamente el mes máximo con datos para el año seleccionado (evita hardcodeo)
    SELECT COALESCE(MAX(mes_numero), 12) INTO v_max_mes_cargado_numero
    FROM resumen_demografico
    WHERE anio = p_anio
      AND total > 0;

    -- Año específico: Agrupamiento mensual simple con abreviaturas (ej: Ene, Feb... Dic) que compara con el año anterior
    SELECT json_agg(t.row) INTO v_tendencia_mensual
    FROM (
      SELECT json_build_object(
        'mes', 
        CASE m.mes
          WHEN 'Enero' THEN 'Ene' WHEN 'Febrero' THEN 'Feb' WHEN 'Marzo' THEN 'Mar'
          WHEN 'Abril' THEN 'Abr' WHEN 'Mayo' THEN 'May' WHEN 'Junio' THEN 'Jun'
          WHEN 'Julio' THEN 'Jul' WHEN 'Agosto' THEN 'Ago' WHEN 'Septiembre' THEN 'Sep'
          WHEN 'Octubre' THEN 'Oct' WHEN 'Noviembre' THEN 'Nov' WHEN 'Diciembre' THEN 'Dic'
        END,
        'total', COALESCE(SUM(rd_act.total), 0),
        'total_anterior', COALESCE(SUM(rd_ant.total), 0),
        'masculino', COALESCE(SUM(rd_act.masculino), 0),
        'femenino', COALESCE(SUM(rd_act.femenino), 0)
      ) AS row
      FROM (
        SELECT 'Enero' AS mes, 1 AS ord UNION ALL SELECT 'Febrero', 2 UNION ALL SELECT 'Marzo', 3 UNION ALL 
        SELECT 'Abril', 4 UNION ALL SELECT 'Mayo', 5 UNION ALL SELECT 'Junio', 6 UNION ALL 
        SELECT 'Julio', 7 UNION ALL SELECT 'Agosto', 8 UNION ALL SELECT 'Septiembre', 9 UNION ALL 
        SELECT 'Octubre', 10 UNION ALL SELECT 'Noviembre', 11 UNION ALL SELECT 'Diciembre', 12
      ) m
      LEFT JOIN resumen_demografico rd_act 
        ON rd_act.mes = m.mes
        AND rd_act.anio = p_anio
        AND (p_mes = '' OR rd_act.mes = p_mes)
        AND (p_regional = '' OR LOWER(TRIM(rd_act.regional)) = LOWER(TRIM(p_regional)))
        AND (p_infoplaza = 0 OR rd_act.numero_infoplaza = p_infoplaza)
        AND (p_provincia = '' OR rd_act.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
      LEFT JOIN resumen_demografico rd_ant 
        ON rd_ant.mes = m.mes
        AND rd_ant.anio = p_anio - 1
        AND (p_mes = '' OR rd_ant.mes = p_mes)
        AND (p_regional = '' OR LOWER(TRIM(rd_ant.regional)) = LOWER(TRIM(p_regional)))
        AND (p_infoplaza = 0 OR rd_ant.numero_infoplaza = p_infoplaza)
        AND (p_provincia = '' OR rd_ant.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
      GROUP BY m.mes, m.ord
      HAVING (p_mes = '' AND m.ord <= v_max_mes_cargado_numero) OR (p_mes <> '' AND m.mes = p_mes)
      ORDER BY m.ord
    ) t;
  END IF;

  -- ------------------------------------------------------------------
  -- PASO J: CONSTRUIR FILAS POR REGIONAL (Para PieChart)
  -- ------------------------------------------------------------------
  SELECT json_agg(t.row) INTO v_regional_rows
  FROM (
    SELECT json_build_object(
      'regional', rs.regional,
      'atenciones', SUM(rs.total)
    ) AS row
    FROM resumen_servicios rs
    WHERE (p_anio = 0 OR rs.anio = p_anio)
      AND (p_mes = '' OR rs.mes = p_mes)
      AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional)))
      AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza)
      AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
    GROUP BY rs.regional
    ORDER BY SUM(rs.total) DESC
  ) t;

  -- ------------------------------------------------------------------
  -- PASO K: CONSTRUIR FILAS DE SINCRONIZACIÓN REGIONAL (Para BarChart Regional)
  -- ------------------------------------------------------------------
  SELECT json_agg(t.row) INTO v_sync_regional_rows
  FROM (
    SELECT json_build_object(
      'regional', ipa.regional,
      'alDia', COUNT(CASE WHEN COALESCE(hs.dias_sin_sinc, 999) <= v_sync_umbral THEN 1 END)::int,
      'revision', COUNT(CASE WHEN COALESCE(hs.dias_sin_sinc, 999) > v_sync_umbral AND hs.dias_sin_sinc IS NOT NULL THEN 1 END)::int,
      'sinReporte', COUNT(CASE WHEN hs.dias_sin_sinc IS NULL THEN 1 END)::int,
      'total', COUNT(*)::int
    ) AS row
    FROM ipa_infoplazas_activas ipa
    LEFT JOIN historial_sincronizacion hs 
      ON ipa.numero = CAST(SPLIT_PART(hs.sucursal, '-', 1) AS int)
      AND hs.fecha_reporte = v_ultimo_corte
    WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
      AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
      AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza)
    GROUP BY ipa.regional
    ORDER BY ipa.regional
  ) t;

  -- ------------------------------------------------------------------
  -- PASO L: CONSTRUIR TABLA DE DETALLE GENERAL DE INFOPLAZAS
  -- ------------------------------------------------------------------
  SELECT json_agg(t.row) INTO v_table_rows
  FROM (
    SELECT json_build_object(
      'numero', ipa.numero,
      'nombre', ipa.nombre,
      'regional', ipa.regional,
      'provincia', ipa.provincia,
      'distrito', ipa.distrito,
      'corregimiento', ipa.corregimiento,
      'atenciones', COALESCE(SUM(rs.total), 0),
      'dias_sin_sinc', MAX(hs.dias_sin_sinc),
      'sync_estado', CASE 
        WHEN MAX(hs.dias_sin_sinc) IS NULL THEN 'Sin Reporte'
        WHEN MAX(hs.dias_sin_sinc) <= v_sync_umbral THEN 'Al día'
        ELSE 'Para revisión'
      END,
      'observacion', CASE 
        WHEN COALESCE(SUM(rs.total), 0) = 0 AND (MAX(hs.observacion) IS NULL OR MAX(hs.observacion) = '') THEN 'Sin datos en el período'
        ELSE COALESCE(MAX(hs.observacion), 'OK')
      END
    ) AS row
    FROM ipa_infoplazas_activas ipa
    LEFT JOIN resumen_servicios rs 
      ON ipa.numero = rs.numero_infoplaza 
      AND (p_anio = 0 OR rs.anio = p_anio)
      AND (p_mes = '' OR rs.mes = p_mes)
    LEFT JOIN historial_sincronizacion hs 
      ON ipa.numero = CAST(SPLIT_PART(hs.sucursal, '-', 1) AS int)
      AND hs.fecha_reporte = v_ultimo_corte
    WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
      AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
      AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza)
    GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia, ipa.distrito, ipa.corregimiento
    ORDER BY COALESCE(SUM(rs.total), 0) DESC
  ) t;

  -- ------------------------------------------------------------------
  -- PASO M: CONSTRUIR RIESGOS / FOCOS DE ATENCIÓN (dias_sin_sinc > 10)
  -- ------------------------------------------------------------------
  SELECT json_agg(t.row) INTO v_risk_rows
  FROM (
    SELECT json_build_object(
      'numero', ipa.numero,
      'nombre', ipa.nombre,
      'regional', ipa.regional,
      'provincia', ipa.provincia,
      'distrito', ipa.distrito,
      'corregimiento', ipa.corregimiento,
      'atenciones', COALESCE(SUM(rs.total), 0),
      'dias_sin_sinc', MAX(hs.dias_sin_sinc),
      'sync_estado', 'Para revisión',
      'observacion', COALESCE(MAX(hs.observacion), 'Atraso en sincronización')
    ) AS row
    FROM ipa_infoplazas_activas ipa
    LEFT JOIN resumen_servicios rs 
      ON ipa.numero = rs.numero_infoplaza 
      AND (p_anio = 0 OR rs.anio = p_anio)
      AND (p_mes = '' OR rs.mes = p_mes)
    INNER JOIN historial_sincronizacion hs 
      ON ipa.numero = CAST(SPLIT_PART(hs.sucursal, '-', 1) AS int)
      AND hs.fecha_reporte = v_ultimo_corte
      AND hs.dias_sin_sinc > v_sync_umbral
    WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
      AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
      AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza)
    GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia, ipa.distrito, ipa.corregimiento
    ORDER BY MAX(hs.dias_sin_sinc) DESC
  ) t;

  -- ------------------------------------------------------------------
  -- PASO M.3: OBTENER DESGLOSES DETALLADOS DE SERVICIOS (Pestaña Servicios)
  -- ------------------------------------------------------------------
  
  -- 1. Tendencia Temporal de Servicios
  IF p_anio = 0 THEN
    -- Plurianual
    SELECT json_agg(t.row) INTO v_tendencia_servicios
    FROM (
      SELECT json_build_object(
        'mes', 
        CASE m.mes
          WHEN 'Enero' THEN 'Ene' WHEN 'Febrero' THEN 'Feb' WHEN 'Marzo' THEN 'Mar'
          WHEN 'Abril' THEN 'Abr' WHEN 'Mayo' THEN 'May' WHEN 'Junio' THEN 'Jun'
          WHEN 'Julio' THEN 'Jul' WHEN 'Agosto' THEN 'Ago' WHEN 'Septiembre' THEN 'Sep'
          WHEN 'Octubre' THEN 'Oct' WHEN 'Noviembre' THEN 'Nov' WHEN 'Diciembre' THEN 'Dic'
        END || ' ' || SUBSTRING(a.anio::text, 3, 2),
        'uso_de_pc', COALESCE(SUM(rs.uso_de_pc), 0),
        'copia', COALESCE(SUM(rs.copia), 0),
        'impresion', COALESCE(SUM(rs.impresion), 0),
        'consulta', COALESCE(SUM(rs.consulta), 0),
        'taller', COALESCE(SUM(rs.taller), 0),
        'reunion', COALESCE(SUM(rs.reunion), 0),
        'otros', COALESCE(SUM(rs.otros), 0),
        'total', COALESCE(SUM(rs.total), 0)
      ) AS row
      FROM (
        SELECT 2023 AS anio UNION ALL SELECT 2024 UNION ALL SELECT 2025 UNION ALL SELECT 2026
      ) a
      CROSS JOIN (
        SELECT 'Enero' AS mes, 1 AS ord UNION ALL SELECT 'Febrero', 2 UNION ALL SELECT 'Marzo', 3 UNION ALL 
        SELECT 'Abril', 4 UNION ALL SELECT 'Mayo', 5 UNION ALL SELECT 'Junio', 6 UNION ALL 
        SELECT 'Julio', 7 UNION ALL SELECT 'Agosto', 8 UNION ALL SELECT 'Septiembre', 9 UNION ALL 
        SELECT 'Octubre', 10 UNION ALL SELECT 'Noviembre', 11 UNION ALL SELECT 'Diciembre', 12
      ) m
      LEFT JOIN resumen_servicios rs 
        ON rs.anio = a.anio
        AND rs.mes = m.mes
        AND (p_mes = '' OR rs.mes = p_mes)
        AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional)))
        AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza)
        AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
      GROUP BY a.anio, m.mes, m.ord
      HAVING (p_mes = '' AND SUM(rs.total) > 0) OR (p_mes <> '' AND m.mes = p_mes)
      ORDER BY a.anio, m.ord
    ) t;
  ELSE
    -- Año específico
    SELECT json_agg(t.row) INTO v_tendencia_servicios
    FROM (
      SELECT json_build_object(
        'mes', 
        CASE m.mes
          WHEN 'Enero' THEN 'Ene' WHEN 'Febrero' THEN 'Feb' WHEN 'Marzo' THEN 'Mar'
          WHEN 'Abril' THEN 'Abr' WHEN 'Mayo' THEN 'May' WHEN 'Junio' THEN 'Jun'
          WHEN 'Julio' THEN 'Jul' WHEN 'Agosto' THEN 'Ago' WHEN 'Septiembre' THEN 'Sep'
          WHEN 'Octubre' THEN 'Oct' WHEN 'Noviembre' THEN 'Nov' WHEN 'Diciembre' THEN 'Dic'
        END,
        'uso_de_pc', COALESCE(SUM(rs.uso_de_pc), 0),
        'copia', COALESCE(SUM(rs.copia), 0),
        'impresion', COALESCE(SUM(rs.impresion), 0),
        'consulta', COALESCE(SUM(rs.consulta), 0),
        'taller', COALESCE(SUM(rs.taller), 0),
        'reunion', COALESCE(SUM(rs.reunion), 0),
        'otros', COALESCE(SUM(rs.otros), 0),
        'total', COALESCE(SUM(rs.total), 0)
      ) AS row
      FROM (
        SELECT 'Enero' AS mes, 1 AS ord UNION ALL SELECT 'Febrero', 2 UNION ALL SELECT 'Marzo', 3 UNION ALL 
        SELECT 'Abril', 4 UNION ALL SELECT 'Mayo', 5 UNION ALL SELECT 'Junio', 6 UNION ALL 
        SELECT 'Julio', 7 UNION ALL SELECT 'Agosto', 8 UNION ALL SELECT 'Septiembre', 9 UNION ALL 
        SELECT 'Octubre', 10 UNION ALL SELECT 'Noviembre', 11 UNION ALL SELECT 'Diciembre', 12
      ) m
      LEFT JOIN resumen_servicios rs 
        ON rs.mes = m.mes
        AND rs.anio = p_anio
        AND (p_mes = '' OR rs.mes = p_mes)
        AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional)))
        AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza)
        AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
      GROUP BY m.mes, m.ord
      HAVING (p_mes = '' AND m.ord <= v_max_mes_cargado_numero) OR (p_mes <> '' AND m.mes = p_mes)
      ORDER BY m.ord
    ) t;
  END IF;

  -- 2. Distribución de Servicios por Regional
  SELECT json_agg(t.row) INTO v_servicios_por_regional
  FROM (
    SELECT json_build_object(
      'regional', rs.regional,
      'uso_de_pc', COALESCE(SUM(rs.uso_de_pc), 0),
      'copia', COALESCE(SUM(rs.copia), 0),
      'impresion', COALESCE(SUM(rs.impresion), 0),
      'consulta', COALESCE(SUM(rs.consulta), 0),
      'taller', COALESCE(SUM(rs.taller), 0),
      'reunion', COALESCE(SUM(rs.reunion), 0),
      'otros', COALESCE(SUM(rs.otros), 0),
      'total', COALESCE(SUM(rs.total), 0)
    ) AS row
    FROM resumen_servicios rs
    WHERE (p_anio = 0 OR rs.anio = p_anio)
      AND (p_mes = '' OR rs.mes = p_mes)
      AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional)))
      AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza)
      AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
    GROUP BY rs.regional
    ORDER BY SUM(rs.total) DESC
  ) t;

  -- 3. Matriz de Servicios por Infoplaza (Excluyendo cerradas definitivamente mediante ipa_infoplazas_activas)
  SELECT json_agg(t.row) INTO v_servicios_por_infoplaza
  FROM (
    SELECT json_build_object(
      'numero', ipa.numero,
      'nombre', ipa.nombre,
      'regional', ipa.regional,
      'provincia', ipa.provincia,
      'uso_de_pc', COALESCE(SUM(rs.uso_de_pc), 0),
      'copia', COALESCE(SUM(rs.copia), 0),
      'impresion', COALESCE(SUM(rs.impresion), 0),
      'consulta', COALESCE(SUM(rs.consulta), 0),
      'taller', COALESCE(SUM(rs.taller), 0),
      'reunion', COALESCE(SUM(rs.reunion), 0),
      'otros', COALESCE(SUM(rs.otros), 0),
      'total', COALESCE(SUM(rs.total), 0)
    ) AS row
    FROM ipa_infoplazas_activas ipa
    LEFT JOIN resumen_servicios rs 
      ON ipa.numero = rs.numero_infoplaza 
      AND (p_anio = 0 OR rs.anio = p_anio)
      AND (p_mes = '' OR rs.mes = p_mes)
    WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
      AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
      AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza)
    GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia
    ORDER BY COALESCE(SUM(rs.total), 0) DESC
  ) t;

  -- ------------------------------------------------------------------
  -- PASO N: CONSOLIDAR TODO EL PAYLOAD DE RETORNO
  -- ------------------------------------------------------------------
  v_crecimiento_ytd := NULL;
  
  IF p_anio > 0 THEN
    -- Determinar el mes máximo con datos en resumen_demografico para el año actual (evita hardcodeo)
    SELECT COALESCE(MAX(mes_numero), 12) INTO v_max_mes_cargado_numero
    FROM resumen_demografico
    WHERE anio = p_anio AND total > 0;

    -- Total acumulado YTD año seleccionado
    SELECT COALESCE(SUM(rs.total), 0) INTO v_ytd_total_actual
    FROM resumen_servicios rs
    WHERE rs.anio = p_anio
      AND rs.mes_numero <= v_max_mes_cargado_numero
      AND (p_mes = '' OR rs.mes = p_mes)
      AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional)))
      AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza)
      AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))));

    -- Total acumulado YTD año anterior (p_anio - 1)
    SELECT COALESCE(SUM(rs.total), 0) INTO v_ytd_total_anterior
    FROM resumen_servicios rs
    WHERE rs.anio = p_anio - 1
      AND rs.mes_numero <= v_max_mes_cargado_numero
      AND (p_mes = '' OR rs.mes = p_mes)
      AND (p_regional = '' OR LOWER(TRIM(rs.regional)) = LOWER(TRIM(p_regional)))
      AND (p_infoplaza = 0 OR rs.numero_infoplaza = p_infoplaza)
      AND (p_provincia = '' OR rs.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))));

    -- Calcular tasa de crecimiento si hay datos del año anterior
    IF v_ytd_total_anterior > 0 THEN
      v_crecimiento_ytd := ((v_ytd_total_actual::numeric - v_ytd_total_anterior::numeric) / v_ytd_total_anterior::numeric) * 100;
    END IF;
  END IF;

  -- ------------------------------------------------------------------
  -- PASO M.4: OBTENER DESGLOSES DETALLADOS DE VISITANTES (Pestaña Visitantes)
  -- ------------------------------------------------------------------
  -- 1. Matriz de Género y Segmento (resumen_tipo_usuario_genero)
  SELECT json_agg(t.row) INTO v_visitor_gender_type_rows
  FROM (
    SELECT json_build_object(
      'tipo_usuario', rtug.tipo_usuario,
      'masculino', COALESCE(SUM(rtug.masculino), 0),
      'femenino', COALESCE(SUM(rtug.femenino), 0),
      'total', COALESCE(SUM(rtug.total), 0)
    ) AS row
    FROM resumen_tipo_usuario_genero rtug
    WHERE (p_anio = 0 OR rtug.anio = p_anio)
      AND (p_mes = '' OR rtug.mes = p_mes)
      AND (p_regional = '' OR LOWER(TRIM(rtug.regional)) = LOWER(TRIM(p_regional)))
      AND (p_infoplaza = 0 OR rtug.numero_infoplaza = p_infoplaza)
      AND (p_provincia = '' OR rtug.numero_infoplaza IN (
           SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))
          ))
    GROUP BY rtug.tipo_usuario
    ORDER BY SUM(rtug.total) DESC
  ) t;

  -- 2. Tendencia Temporal de Visitas por Género (resumen_demografico)
  IF p_anio = 0 THEN
    -- Plurianual
    SELECT json_agg(t.row) INTO v_tendencia_visitantes
    FROM (
      SELECT json_build_object(
        'mes', 
        CASE m.mes
          WHEN 'Enero' THEN 'Ene' WHEN 'Febrero' THEN 'Feb' WHEN 'Marzo' THEN 'Mar'
          WHEN 'Abril' THEN 'Abr' WHEN 'Mayo' THEN 'May' WHEN 'Junio' THEN 'Jun'
          WHEN 'Julio' THEN 'Jul' WHEN 'Agosto' THEN 'Ago' WHEN 'Septiembre' THEN 'Sep'
          WHEN 'Octubre' THEN 'Oct' WHEN 'Noviembre' THEN 'Nov' WHEN 'Diciembre' THEN 'Dic'
        END || ' ' || SUBSTRING(a.anio::text, 3, 2),
        'masculino', COALESCE(SUM(rd.masculino), 0),
        'femenino', COALESCE(SUM(rd.femenino), 0),
        'total', COALESCE(SUM(rd.total), 0)
      ) AS row
      FROM (
        SELECT 2023 AS anio UNION ALL SELECT 2024 UNION ALL SELECT 2025 UNION ALL SELECT 2026
      ) a
      CROSS JOIN (
        SELECT 'Enero' AS mes, 1 AS ord UNION ALL SELECT 'Febrero', 2 UNION ALL SELECT 'Marzo', 3 UNION ALL 
        SELECT 'Abril', 4 UNION ALL SELECT 'Mayo', 5 UNION ALL SELECT 'Junio', 6 UNION ALL 
        SELECT 'Julio', 7 UNION ALL SELECT 'Agosto', 8 UNION ALL SELECT 'Septiembre', 9 UNION ALL 
        SELECT 'Octubre', 10 UNION ALL SELECT 'Noviembre', 11 UNION ALL SELECT 'Diciembre', 12
      ) m
      LEFT JOIN resumen_demografico rd 
        ON rd.anio = a.anio
        AND rd.mes = m.mes
        AND (p_mes = '' OR rd.mes = p_mes)
        AND (p_regional = '' OR LOWER(TRIM(rd.regional)) = LOWER(TRIM(p_regional)))
        AND (p_infoplaza = 0 OR rd.numero_infoplaza = p_infoplaza)
        AND (p_provincia = '' OR rd.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
      GROUP BY a.anio, m.mes, m.ord
      HAVING (p_mes = '' AND SUM(rd.total) > 0) OR (p_mes <> '' AND m.mes = p_mes)
      ORDER BY a.anio, m.ord
    ) t;
  ELSE
    -- Año específico
    SELECT json_agg(t.row) INTO v_tendencia_visitantes
    FROM (
      SELECT json_build_object(
        'mes', 
        CASE m.mes
          WHEN 'Enero' THEN 'Ene' WHEN 'Febrero' THEN 'Feb' WHEN 'Marzo' THEN 'Mar'
          WHEN 'Abril' THEN 'Abr' WHEN 'Mayo' THEN 'May' WHEN 'Junio' THEN 'Jun'
          WHEN 'Julio' THEN 'Jul' WHEN 'Agosto' THEN 'Ago' WHEN 'Septiembre' THEN 'Sep'
          WHEN 'Octubre' THEN 'Oct' WHEN 'Noviembre' THEN 'Nov' WHEN 'Diciembre' THEN 'Dic'
        END,
        'masculino', COALESCE(SUM(rd.masculino), 0),
        'femenino', COALESCE(SUM(rd.femenino), 0),
        'total', COALESCE(SUM(rd.total), 0)
      ) AS row
      FROM (
        SELECT 'Enero' AS mes, 1 AS ord UNION ALL SELECT 'Febrero', 2 UNION ALL SELECT 'Marzo', 3 UNION ALL 
        SELECT 'Abril', 4 UNION ALL SELECT 'Mayo', 5 UNION ALL SELECT 'Junio', 6 UNION ALL 
        SELECT 'Julio', 7 UNION ALL SELECT 'Agosto', 8 UNION ALL SELECT 'Septiembre', 9 UNION ALL 
        SELECT 'Octubre', 10 UNION ALL SELECT 'Noviembre', 11 UNION ALL SELECT 'Diciembre', 12
      ) m
      LEFT JOIN resumen_demografico rd 
        ON rd.mes = m.mes
        AND rd.anio = p_anio
        AND (p_mes = '' OR rd.mes = p_mes)
        AND (p_regional = '' OR LOWER(TRIM(rd.regional)) = LOWER(TRIM(p_regional)))
        AND (p_infoplaza = 0 OR rd.numero_infoplaza = p_infoplaza)
        AND (p_provincia = '' OR rd.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
      GROUP BY m.mes, m.ord
      HAVING (p_mes = '' AND m.ord <= v_max_mes_cargado_numero) OR (p_mes <> '' AND m.mes = p_mes)
      ORDER BY m.ord
    ) t;
  END IF;

  -- 3. Distribución de Visitantes por Regional
  SELECT json_agg(t.row) INTO v_visitantes_por_regional
  FROM (
    SELECT json_build_object(
      'regional', rd.regional,
      'total', COALESCE(SUM(rd.total), 0),
      'masculino', COALESCE(SUM(rd.masculino), 0),
      'femenino', COALESCE(SUM(rd.femenino), 0)
    ) AS row
    FROM resumen_demografico rd
    WHERE (p_anio = 0 OR rd.anio = p_anio)
      AND (p_mes = '' OR rd.mes = p_mes)
      AND (p_regional = '' OR LOWER(TRIM(rd.regional)) = LOWER(TRIM(p_regional)))
      AND (p_infoplaza = 0 OR rd.numero_infoplaza = p_infoplaza)
      AND (p_provincia = '' OR rd.numero_infoplaza IN (SELECT numero FROM infoplazas WHERE LOWER(TRIM(provincia)) = LOWER(TRIM(p_provincia))))
    GROUP BY rd.regional
    ORDER BY SUM(rd.total) DESC
  ) t;

  -- 4. Matriz de Visitantes por Infoplaza (Excluyendo cerradas definitivamente)
  SELECT json_agg(t.row) INTO v_visitantes_por_infoplaza
  FROM (
    SELECT json_build_object(
      'numero', ipa.numero,
      'nombre', ipa.nombre,
      'regional', ipa.regional,
      'provincia', ipa.provincia,
      'total', COALESCE(SUM(rd.total), 0),
      'masculino', COALESCE(SUM(rd.masculino), 0),
      'femenino', COALESCE(SUM(rd.femenino), 0),
      'primaria', COALESCE(SUM(rd.primaria), 0),
      'secundaria', COALESCE(SUM(rd.secundaria), 0),
      'universitario', COALESCE(SUM(rd.universitario), 0),
      'docente', COALESCE(SUM(rd.docente), 0),
      'tercera_edad', COALESCE(SUM(rd.tercera_edad), 0),
      'publico_general', COALESCE(SUM(rd.publico_general), 0)
    ) AS row
    FROM ipa_infoplazas_activas ipa
    LEFT JOIN resumen_demografico rd 
      ON ipa.numero = rd.numero_infoplaza 
      AND (p_anio = 0 OR rd.anio = p_anio)
      AND (p_mes = '' OR rd.mes = p_mes)
    WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
      AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
      AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza)
    GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia
    ORDER BY COALESCE(SUM(rd.total), 0) DESC
  ) t;

  -- ------------------------------------------------------------------
  -- PASO N: CONSOLIDAR TODO EL PAYLOAD DE RETORNO
  -- ------------------------------------------------------------------
  v_resultado := json_build_object(
    'networkKpis', json_build_object(
      'totalActivas', v_total_activas,
      'totalReportadas', v_total_reportadas,
      'cumplimientoSinc', v_cumplimiento_sinc,
      'ipsRevision', v_ips_revision,
      'ipsConActividadPeriodo', v_ips_con_actividad_periodo,
      'porcentajeCobertura', 100.0 -- estático a solicitud del negocio
    ),
    'serviceKpis', json_build_object(
      'totalAtenciones', v_total_atenciones,
      'promedioAtenciones', v_promedio_atenciones,
      'servicioLider', v_servicio_lider,
      'servicioLiderTotal', v_servicio_lider_total,
      'servicioLiderPorcentaje', v_servicio_lider_porcentaje,
      'crecimientoYTD', v_crecimiento_ytd
    ),
    'visitorKpis', json_build_object(
      'totalVisitantes', v_total_visitantes,
      'totalEducativo', v_total_educativo,
      'porcentajeFemenino', v_porcentaje_femenino,
      'generoLider', v_genero_lider,
      'generoLiderTotal', v_genero_lider_total,
      'generoLiderPorcentaje', v_genero_lider_porcentaje,
      'segmentoLider', v_segmento_lider,
      'segmentoLiderTotal', v_segmento_lider_total,
      'segmentoLiderPorcentaje', v_segmento_lider_porcentaje
    ),
    'tendenciaMensual', COALESCE(v_tendencia_mensual, '[]'::json),
    'regionalRows', COALESCE(v_regional_rows, '[]'::json),
    'syncRegionalRows', COALESCE(v_sync_regional_rows, '[]'::json),
    'riskRows', COALESCE(v_risk_rows, '[]'::json),
    'tableRows', COALESCE(v_table_rows, '[]'::json),
    'serviceRanking', COALESCE(v_service_ranking, '[]'::json),
    'visitorSegments', COALESCE(v_visitor_segments, '[]'::json),
    'ultimoCorteDate', v_ultimo_corte,
    -- Campos agregados para la pestaña de Servicios
    'tendenciaServicios', COALESCE(v_tendencia_servicios, '[]'::json),
    'serviciosPorRegional', COALESCE(v_servicios_por_regional, '[]'::json),
    'serviciosPorInfoplaza', COALESCE(v_servicios_por_infoplaza, '[]'::json),
    -- Campos agregados para la pestaña de Visitantes
    'visitorGenderTypeRows', COALESCE(v_visitor_gender_type_rows, '[]'::json),
    'tendenciaVisitantes', COALESCE(v_tendencia_visitantes, '[]'::json),
    'visitantesPorRegional', COALESCE(v_visitantes_por_regional, '[]'::json),
    'visitantesPorInfoplaza', COALESCE(v_visitantes_por_infoplaza, '[]'::json)
  );

  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Función RPC específica para la Pestaña de Sincronización
-- Ofrece KPIs de red avanzados, distribución de atrasos, tendencia de cumplimiento y tabla detallada.
CREATE OR REPLACE FUNCTION ipa_get_sync_page_data(
  p_anio int,
  p_mes text,
  p_regional text,
  p_provincia text,
  p_infoplaza int
)
RETURNS json AS $$
DECLARE
  -- Variables de Red y Sincronización
  v_ultimo_corte date;
  v_sync_umbral int := 10;
  v_total_activas int;
  v_al_dia int;
  v_para_revision int;
  v_sin_reporte int;
  v_casos_criticos int;
  v_promedio_retraso numeric;
  v_cumplimiento_porcentaje numeric;
  v_sinc_sin_uso int;
  v_filtro_mes_abs int;

  -- Bloques JSON de retorno
  v_delay_distribution json;
  v_compliance_trend json;
  v_regional_rows json;
  v_table_rows json;
  
  v_resultado json;
BEGIN
  -- 1. Determinar el último corte disponible
  SELECT COALESCE(MAX(fecha_reporte), '2026-06-30'::date) INTO v_ultimo_corte
  FROM historial_sincronizacion;

  -- Determinar mes absoluto del filtro para comparar con el inicio de datos de cada infoplaza
  v_filtro_mes_abs := CASE 
    WHEN p_anio = 0 THEN 0
    WHEN p_mes = '' THEN p_anio * 12 + 1
    ELSE p_anio * 12 + CASE p_mes
      WHEN 'Enero' THEN 1 WHEN 'Febrero' THEN 2 WHEN 'Marzo' THEN 3 WHEN 'Abril' THEN 4
      WHEN 'Mayo' THEN 5 WHEN 'Junio' THEN 6 WHEN 'Julio' THEN 7 WHEN 'Agosto' THEN 8
      WHEN 'Septiembre' THEN 9 WHEN 'Octubre' THEN 10 WHEN 'Noviembre' THEN 11 WHEN 'Diciembre' THEN 12
      ELSE 1 END
  END;

  -- 2. Cómputo de KPIs de red sobre Infoplazas Activas en el último corte
  SELECT 
    COUNT(*)::int,
    COUNT(CASE WHEN COALESCE(hs.dias_sin_sinc, 999) <= v_sync_umbral THEN 1 END)::int,
    COUNT(CASE WHEN COALESCE(hs.dias_sin_sinc, 999) > v_sync_umbral AND hs.dias_sin_sinc IS NOT NULL THEN 1 END)::int,
    COUNT(CASE WHEN hs.dias_sin_sinc IS NULL THEN 1 END)::int,
    COUNT(CASE WHEN hs.dias_sin_sinc > 30 THEN 1 END)::int,
    ROUND(COALESCE(AVG(CASE WHEN hs.dias_sin_sinc > v_sync_umbral THEN hs.dias_sin_sinc END), 0)::numeric, 1)
  INTO 
    v_total_activas, v_al_dia, v_para_revision, v_sin_reporte, v_casos_criticos, v_promedio_retraso
  FROM ipa_infoplazas_activas ipa
  LEFT JOIN historial_sincronizacion hs 
    ON ipa.numero = CAST(SPLIT_PART(hs.sucursal, '-', 1) AS int)
    AND hs.fecha_reporte = v_ultimo_corte
  WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
    AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
    AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza);

  IF v_total_activas > 0 THEN
    v_cumplimiento_porcentaje := ROUND((v_al_dia::numeric / v_total_activas::numeric) * 100, 1);
  ELSE
    v_cumplimiento_porcentaje := 0;
  END IF;

  -- 3. Cómputo de "Sincronizadas sin Datos" (Atenciones en el período = 0, días sin sinc <= 10, y período >= primer reporte)
  WITH primer_reporte AS (
    SELECT 
      CAST(SPLIT_PART(hs_min.sucursal, '-', 1) AS int) AS numero_infoplaza,
      MIN(EXTRACT(YEAR FROM hs_min.fecha_reporte)::int * 12 + EXTRACT(MONTH FROM hs_min.fecha_reporte)::int) AS min_mes_abs
    FROM historial_sincronizacion hs_min
    WHERE hs_min.sucursal IS NOT NULL AND hs_min.sucursal LIKE '%-%'
    GROUP BY CAST(SPLIT_PART(hs_min.sucursal, '-', 1) AS int)
  ),
  atenciones_periodo AS (
    SELECT 
      ipa.numero,
      CASE 
        WHEN v_filtro_mes_abs > 0 AND v_filtro_mes_abs < COALESCE(pr.min_mes_abs, 999999) THEN NULL
        ELSE COALESCE(SUM(rs.total), 0)
      END AS total_atenciones
    FROM ipa_infoplazas_activas ipa
    LEFT JOIN primer_reporte pr ON ipa.numero = pr.numero_infoplaza
    LEFT JOIN resumen_servicios rs 
      ON ipa.numero = rs.numero_infoplaza 
      AND (p_anio = 0 OR rs.anio = p_anio)
      AND (p_mes = '' OR rs.mes = p_mes)
    WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
      AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
      AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza)
    GROUP BY ipa.numero, pr.min_mes_abs
  )
  SELECT COUNT(*)::int INTO v_sinc_sin_uso
  FROM ipa_infoplazas_activas ipa
  LEFT JOIN historial_sincronizacion hs 
    ON ipa.numero = CAST(SPLIT_PART(hs.sucursal, '-', 1) AS int)
    AND hs.fecha_reporte = v_ultimo_corte
  INNER JOIN atenciones_periodo ap ON ipa.numero = ap.numero
  WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
    AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
    AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza)
    AND COALESCE(hs.dias_sin_sinc, 999) <= v_sync_umbral
    AND ap.total_atenciones = 0;

  -- 4. Distribución del retraso por intervalos (para gráfico de barras horizontales/verticales)
  WITH sinc_filtrado AS (
    SELECT 
      ipa.numero,
      hs.dias_sin_sinc,
      CASE 
        WHEN hs.dias_sin_sinc IS NULL THEN 'Sin reporte'
        WHEN hs.dias_sin_sinc <= 5 THEN '0-5 días'
        WHEN hs.dias_sin_sinc <= 10 THEN '6-10 días'
        WHEN hs.dias_sin_sinc <= 15 THEN '11-15 días'
        WHEN hs.dias_sin_sinc <= 30 THEN '16-30 días'
        ELSE '+30 días'
      END AS rango_delay
    FROM ipa_infoplazas_activas ipa
    LEFT JOIN historial_sincronizacion hs 
      ON ipa.numero = CAST(SPLIT_PART(hs.sucursal, '-', 1) AS int)
      AND hs.fecha_reporte = v_ultimo_corte
    WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
      AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
      AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza)
  )
  SELECT COALESCE(json_agg(t.row), '[]'::json) INTO v_delay_distribution
  FROM (
    SELECT json_build_object(
      'rango', r.rango,
      'cantidad', COUNT(s.numero)::int
    ) AS row
    FROM (
      SELECT '0-5 días' AS rango, 1 AS ord UNION ALL
      SELECT '6-10 días' AS rango, 2 UNION ALL
      SELECT '11-15 días' AS rango, 3 UNION ALL
      SELECT '16-30 días' AS rango, 4 UNION ALL
      SELECT '+30 días' AS rango, 5 UNION ALL
      SELECT 'Sin reporte' AS rango, 6
    ) r
    LEFT JOIN sinc_filtrado s ON s.rango_delay = r.rango
    GROUP BY r.rango, r.ord
    ORDER BY r.ord ASC
  ) t;

  -- 5. Tendencia Histórica de Cumplimiento por fecha de reporte (con desagregación por regional)
  WITH cumplimiento_diario_regional AS (
    SELECT 
      hs_reg.fecha_reporte,
      ipa_reg.regional,
      ROUND((COUNT(CASE WHEN COALESCE(hs_reg.dias_sin_sinc, 999) <= v_sync_umbral THEN 1 END)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 1) AS cumplimiento
    FROM historial_sincronizacion hs_reg
    INNER JOIN ipa_infoplazas_activas ipa_reg ON CAST(SPLIT_PART(hs_reg.sucursal, '-', 1) AS int) = ipa_reg.numero
    WHERE (p_provincia = '' OR LOWER(TRIM(ipa_reg.provincia)) = LOWER(TRIM(p_provincia)))
      AND (p_infoplaza = 0 OR ipa_reg.numero = p_infoplaza)
    GROUP BY hs_reg.fecha_reporte, ipa_reg.regional
  ),
  regionales_por_fecha AS (
    SELECT 
      fecha_reporte,
      jsonb_object_agg(regional, cumplimiento) AS regionales
    FROM cumplimiento_diario_regional
    GROUP BY fecha_reporte
  ),
  cumplimiento_general AS (
    SELECT 
      hs_gen.fecha_reporte,
      COUNT(CASE WHEN COALESCE(hs_gen.dias_sin_sinc, 999) <= v_sync_umbral THEN 1 END)::int AS alDia,
      COUNT(CASE WHEN COALESCE(hs_gen.dias_sin_sinc, 999) > v_sync_umbral THEN 1 END)::int AS paraRevision,
      COUNT(*)::int AS total,
      ROUND((COUNT(CASE WHEN COALESCE(hs_gen.dias_sin_sinc, 999) <= v_sync_umbral THEN 1 END)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 1) AS cumplimiento
    FROM historial_sincronizacion hs_gen
    INNER JOIN ipa_infoplazas_activas ipa_gen ON CAST(SPLIT_PART(hs_gen.sucursal, '-', 1) AS int) = ipa_gen.numero
    WHERE (p_regional = '' OR LOWER(TRIM(ipa_gen.regional)) = LOWER(TRIM(p_regional)))
      AND (p_provincia = '' OR LOWER(TRIM(ipa_gen.provincia)) = LOWER(TRIM(p_provincia)))
      AND (p_infoplaza = 0 OR ipa_gen.numero = p_infoplaza)
    GROUP BY hs_gen.fecha_reporte
  )
  SELECT COALESCE(json_agg(t_trend.row), '[]'::json) INTO v_compliance_trend
  FROM (
    SELECT json_build_object(
      'fecha', cg.fecha_reporte::text,
      'alDia', cg.alDia,
      'paraRevision', cg.paraRevision,
      'total', cg.total,
      'cumplimiento', cg.cumplimiento,
      'regionales', COALESCE(rpf.regionales, '{}'::jsonb)
    ) AS row
    FROM cumplimiento_general cg
    LEFT JOIN regionales_por_fecha rpf ON cg.fecha_reporte = rpf.fecha_reporte
    ORDER BY cg.fecha_reporte ASC
  ) t_trend;

  -- 6. Distribución de Sincronización por Regional (para la tabla regional)
  SELECT COALESCE(json_agg(t.row), '[]'::json) INTO v_regional_rows
  FROM (
    SELECT json_build_object(
      'regional', ipa.regional,
      'alDia', COUNT(CASE WHEN COALESCE(hs.dias_sin_sinc, 999) <= v_sync_umbral THEN 1 END)::int,
      'revision', COUNT(CASE WHEN COALESCE(hs.dias_sin_sinc, 999) > v_sync_umbral AND hs.dias_sin_sinc IS NOT NULL THEN 1 END)::int,
      'sinReporte', COUNT(CASE WHEN hs.dias_sin_sinc IS NULL THEN 1 END)::int,
      'total', COUNT(*)::int,
      'cumplimiento', ROUND((COUNT(CASE WHEN COALESCE(hs.dias_sin_sinc, 999) <= v_sync_umbral THEN 1 END)::numeric / NULLIF(COUNT(*), 0)::numeric) * 100, 1)
    ) AS row
    FROM ipa_infoplazas_activas ipa
    LEFT JOIN historial_sincronizacion hs 
      ON ipa.numero = CAST(SPLIT_PART(hs.sucursal, '-', 1) AS int)
      AND hs.fecha_reporte = v_ultimo_corte
    WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
      AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
      AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza)
    GROUP BY ipa.regional
    ORDER BY ipa.regional
  ) t;

  -- 7. Tabla Detallada General de Infoplazas para Sincronización
  WITH primer_reporte AS (
    SELECT 
      CAST(SPLIT_PART(hs_min.sucursal, '-', 1) AS int) AS numero_infoplaza,
      MIN(EXTRACT(YEAR FROM hs_min.fecha_reporte)::int * 12 + EXTRACT(MONTH FROM hs_min.fecha_reporte)::int) AS min_mes_abs
    FROM historial_sincronizacion hs_min
    WHERE hs_min.sucursal IS NOT NULL AND hs_min.sucursal LIKE '%-%'
    GROUP BY CAST(SPLIT_PART(hs_min.sucursal, '-', 1) AS int)
  ),
  tabla_preparada AS (
    SELECT 
      ipa.numero,
      ipa.nombre,
      ipa.regional,
      ipa.provincia,
      ipa.distrito,
      ipa.corregimiento,
      CASE 
        WHEN v_filtro_mes_abs > 0 AND v_filtro_mes_abs < COALESCE(pr.min_mes_abs, 999999) THEN NULL
        ELSE COALESCE(SUM(rs.total), 0)
      END AS atenciones_calc,
      MAX(hs.dias_sin_sinc) AS max_dias,
      MAX(hs.observacion) AS max_obs,
      MAX(pr.min_mes_abs) AS min_mes_abs_val
    FROM ipa_infoplazas_activas ipa
    LEFT JOIN primer_reporte pr ON ipa.numero = pr.numero_infoplaza
    LEFT JOIN resumen_servicios rs 
      ON ipa.numero = rs.numero_infoplaza 
      AND (p_anio = 0 OR rs.anio = p_anio)
      AND (p_mes = '' OR rs.mes = p_mes)
    LEFT JOIN historial_sincronizacion hs 
      ON ipa.numero = CAST(SPLIT_PART(hs.sucursal, '-', 1) AS int)
      AND hs.fecha_reporte = v_ultimo_corte
    WHERE (p_regional = '' OR LOWER(TRIM(ipa.regional)) = LOWER(TRIM(p_regional)))
      AND (p_provincia = '' OR LOWER(TRIM(ipa.provincia)) = LOWER(TRIM(p_provincia)))
      AND (p_infoplaza = 0 OR ipa.numero = p_infoplaza)
    GROUP BY ipa.numero, ipa.nombre, ipa.regional, ipa.provincia, ipa.distrito, ipa.corregimiento, pr.min_mes_abs
  )
  SELECT COALESCE(json_agg(t.row), '[]'::json) INTO v_table_rows
  FROM (
    SELECT json_build_object(
      'numero', tp.numero,
      'nombre', tp.nombre,
      'regional', tp.regional,
      'provincia', tp.provincia,
      'distrito', tp.distrito,
      'corregimiento', tp.corregimiento,
      'atenciones', tp.atenciones_calc,
      'dias_sin_sinc', tp.max_dias,
      'sync_estado', CASE 
        WHEN tp.max_dias IS NULL THEN 'Sin reporte'
        WHEN tp.max_dias <= v_sync_umbral THEN 'Al día'
        ELSE 'Para revisión'
      END,
      'observacion', CASE 
        WHEN tp.atenciones_calc IS NULL THEN 'Previo a registro en sistema'
        WHEN tp.atenciones_calc = 0 AND (tp.max_obs IS NULL OR tp.max_obs = '') THEN 'Sin datos en el período'
        ELSE COALESCE(tp.max_obs, 'OK')
      END
    ) AS row
    FROM tabla_preparada tp
    ORDER BY tp.max_dias DESC NULLS LAST
  ) t;

  -- 8. Retornar el JSON estructurado
  v_resultado := json_build_object(
    'syncKpis', json_build_object(
      'totalActivas', v_total_activas,
      'alDia', v_al_dia,
      'paraRevision', v_para_revision,
      'sinReporte', v_sin_reporte,
      'casosCriticos', v_casos_criticos,
      'promedioRetraso', v_promedio_retraso,
      'cumplimientoPorcentaje', v_cumplimiento_porcentaje,
      'sincronizadasSinUso', v_sinc_sin_uso
    ),
    'delayDistribution', v_delay_distribution,
    'complianceTrend', v_compliance_trend,
    'regionalRows', v_regional_rows,
    'tableRows', v_table_rows,
    'ultimoCorteDate', v_ultimo_corte
  );

  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql STABLE;

