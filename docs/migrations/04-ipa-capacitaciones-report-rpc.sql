-- =====================================================================
-- 04 - Informe de Capacitaciones y Actividades (pestaña "Capacitaciones y act.")
-- Agrega en el servidor para evitar el tope de 1000 filas de PostgREST.
-- Respeta todos los filtros del dashboard. 0 / '' = sin filtro.
--   p_mes: nombre del mes ('Mayo'). Capacitaciones se filtran por mes exacto;
--          actividades y servicios (sin columna mes) por el cuatrimestre del mes.
-- =====================================================================
CREATE OR REPLACE FUNCTION ipa_get_capacitaciones_report(
  p_anio int DEFAULT 0,
  p_cuatrimestre int DEFAULT 0,
  p_mes text DEFAULT '',
  p_regional text DEFAULT '',
  p_provincia text DEFAULT '',
  p_distrito text DEFAULT '',
  p_infoplaza int DEFAULT 0,
  p_incluir_detalle boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_mes text := lower(trim(coalesce(p_mes, '')));
  v_mes_num int;
  v_cuat int := coalesce(p_cuatrimestre, 0);
  v_result json;
BEGIN
  v_mes_num := CASE v_mes
    WHEN 'enero' THEN 1 WHEN 'febrero' THEN 2 WHEN 'marzo' THEN 3 WHEN 'abril' THEN 4
    WHEN 'mayo' THEN 5 WHEN 'junio' THEN 6 WHEN 'julio' THEN 7 WHEN 'agosto' THEN 8
    WHEN 'septiembre' THEN 9 WHEN 'setiembre' THEN 9 WHEN 'octubre' THEN 10
    WHEN 'noviembre' THEN 11 WHEN 'diciembre' THEN 12 ELSE NULL END;
  IF v_mes_num IS NOT NULL AND v_cuat = 0 THEN
    v_cuat := ((v_mes_num - 1) / 4) + 1;
  END IF;

  WITH ips AS (
    SELECT i.numero, i.nombre, coalesce(nullif(trim(i.regional), ''), 'Sin regional') AS regional,
           i.provincia, i.distrito, i.corregimiento, i.estado,
           (i.estado ILIKE 'activ%') AS activa
    FROM infoplazas i
    WHERE (coalesce(p_regional, '') = '' OR lower(trim(i.regional)) = lower(trim(p_regional)))
      AND (coalesce(p_provincia, '') = '' OR lower(trim(i.provincia)) = lower(trim(p_provincia)))
      AND (coalesce(p_distrito, '') = '' OR lower(trim(i.distrito)) = lower(trim(p_distrito)))
      AND (coalesce(p_infoplaza, 0) = 0 OR i.numero = p_infoplaza)
  ),
  cap AS (
    SELECT c.*, ips.regional, ips.nombre AS ip_nombre, ips.provincia, ips.distrito,
           coalesce(nullif(lower(trim(c.categoria)), ''), 'sin categoría') AS cat_key,
           lower(trim(c.mes)) AS mes_key
    FROM informe_capacitaciones c JOIN ips ON ips.numero = c.infoplaza_numero
    WHERE (coalesce(p_anio, 0) = 0 OR c.anio = p_anio)
      AND (v_cuat = 0 OR c.cuatrimestre = v_cuat)
      AND (v_mes_num IS NULL OR lower(trim(c.mes)) = v_mes OR (v_mes = 'setiembre' AND lower(trim(c.mes)) = 'septiembre'))
  ),
  act AS (
    SELECT a.*, ips.regional, ips.nombre AS ip_nombre, ips.provincia, ips.distrito,
           coalesce(nullif(lower(trim(a.categoria)), ''), 'sin categoría') AS cat_key
    FROM informe_otras_actividades a JOIN ips ON ips.numero = a.infoplaza_numero
    WHERE (coalesce(p_anio, 0) = 0 OR a.anio = p_anio)
      AND (v_cuat = 0 OR a.cuatrimestre = v_cuat)
  ),
  srv AS (
    SELECT s.*, ips.regional,
           lower(trim(s.servicio_nombre)) AS srv_key
    FROM informe_servicios s JOIN ips ON ips.numero = s.infoplaza_numero
    WHERE (coalesce(p_anio, 0) = 0 OR s.anio = p_anio)
      AND (v_cuat = 0 OR s.cuatrimestre = v_cuat)
  ),
  ctrl AS (
    SELECT ce.*, ips.regional, ips.activa
    FROM control_entrega_informes ce JOIN ips ON ips.numero = ce.infoplaza_numero
    WHERE (coalesce(p_anio, 0) = 0 OR ce.anio = p_anio)
      AND (v_cuat = 0 OR ce.cuatrimestre = v_cuat)
  ),
  -- Infoplazas que reportaron algo (en cualquiera de las tres tablas)
  reportantes AS (
    SELECT infoplaza_numero FROM cap UNION
    SELECT infoplaza_numero FROM act UNION
    SELECT infoplaza_numero FROM srv
  ),
  meses AS (
    SELECT * FROM (VALUES ('enero',1),('febrero',2),('marzo',3),('abril',4),('mayo',5),('junio',6),
      ('julio',7),('agosto',8),('septiembre',9),('octubre',10),('noviembre',11),('diciembre',12)) m(mes_key, n)
  ),
  reg AS (
    SELECT ips.regional,
      count(*) FILTER (WHERE ips.activa) AS ips_activas,
      count(r.infoplaza_numero) AS ips_reportantes,
      (SELECT count(*) FROM ctrl WHERE ctrl.regional = ips.regional AND lower(ctrl.estado) = 'entregado') AS entregados,
      (count(*) FILTER (WHERE ips.activa) - (SELECT count(*) FROM ctrl WHERE ctrl.regional = ips.regional AND lower(ctrl.estado) = 'entregado' AND ctrl.activa) - (SELECT count(*) FROM ctrl WHERE ctrl.regional = ips.regional AND lower(ctrl.estado) = 'no entrega' AND ctrl.activa)) AS pendientes,
      (SELECT count(*) FROM ctrl WHERE ctrl.regional = ips.regional AND lower(ctrl.estado) = 'no entrega' AND ctrl.activa) AS no_entrega
    FROM ips LEFT JOIN reportantes r ON r.infoplaza_numero = ips.numero
    GROUP BY ips.regional
  ),
  reg_cap AS (
    SELECT regional, count(*) AS sesiones, coalesce(sum(participantes),0) AS participantes,
           coalesce(sum(horas),0) AS horas, count(DISTINCT infoplaza_numero) AS ips
    FROM cap GROUP BY regional
  ),
  reg_act AS (
    SELECT regional, count(*) AS actividades, coalesce(sum(participantes),0) AS participantes,
           count(DISTINCT infoplaza_numero) AS ips
    FROM act GROUP BY regional
  ),
  ip_tot AS (
    SELECT ips.numero, ips.nombre, ips.regional, ips.provincia, ips.distrito,
      coalesce(c.sesiones,0) AS cap_sesiones, coalesce(c.participantes,0) AS cap_participantes,
      coalesce(c.horas,0) AS cap_horas,
      coalesce(a.actividades,0) AS act_cantidad, coalesce(a.participantes,0) AS act_participantes
    FROM ips
    LEFT JOIN (SELECT infoplaza_numero, count(*) sesiones, sum(participantes) participantes, sum(horas) horas FROM cap GROUP BY 1) c ON c.infoplaza_numero = ips.numero
    LEFT JOIN (SELECT infoplaza_numero, count(*) actividades, sum(participantes) participantes FROM act GROUP BY 1) a ON a.infoplaza_numero = ips.numero
    WHERE c.infoplaza_numero IS NOT NULL OR a.infoplaza_numero IS NOT NULL
  )
  SELECT json_build_object(
    'periodo', json_build_object('anio', p_anio, 'cuatrimestre', v_cuat, 'mes', nullif(p_mes, '')),
    'kpis', json_build_object(
      'ips_activas', (SELECT count(*) FROM ips WHERE activa),
      'ips_reportantes', (SELECT count(*) FROM reportantes),
      'cap_sesiones', (SELECT count(*) FROM cap),
      'cap_participantes', (SELECT coalesce(sum(participantes),0) FROM cap),
      'cap_horas', (SELECT coalesce(sum(horas),0) FROM cap),
      'cap_ips', (SELECT count(DISTINCT infoplaza_numero) FROM cap),
      'act_cantidad', (SELECT count(*) FROM act),
      'act_participantes', (SELECT coalesce(sum(participantes),0) FROM act),
      'act_ips', (SELECT count(DISTINCT infoplaza_numero) FROM act),
      'srv_ips', (SELECT count(DISTINCT infoplaza_numero) FROM srv),
      'srv_promedio_por_ip', (SELECT round(avg(n)::numeric, 1) FROM (SELECT count(*) FILTER (WHERE ofrecido) n FROM srv GROUP BY infoplaza_numero) x),
      'entregados', (SELECT count(*) FROM ctrl WHERE lower(estado) = 'entregado'),
      'pendientes', ((SELECT count(*) FROM ips WHERE activa) - (SELECT count(*) FROM ctrl WHERE lower(estado) = 'entregado' AND activa) - (SELECT count(*) FROM ctrl WHERE lower(estado) = 'no entrega' AND activa)),
      'no_entrega', (SELECT count(*) FROM ctrl WHERE lower(estado) = 'no entrega' AND activa)
    ),
    'cap_por_categoria', coalesce((SELECT json_agg(x ORDER BY x.participantes DESC) FROM (
        SELECT initcap(cat_key) AS categoria, count(*) AS sesiones, sum(participantes) AS participantes,
               sum(horas) AS horas, count(DISTINCT infoplaza_numero) AS ips
        FROM cap GROUP BY cat_key) x), '[]'::json),
    'act_por_categoria', coalesce((SELECT json_agg(x ORDER BY x.participantes DESC) FROM (
        SELECT initcap(cat_key) AS categoria, count(*) AS actividades, sum(participantes) AS participantes,
               count(DISTINCT infoplaza_numero) AS ips
        FROM act GROUP BY cat_key) x), '[]'::json),
    'cap_por_mes', coalesce((SELECT json_agg(x ORDER BY x.anio, x.mes_num) FROM (
        SELECT cap.anio, coalesce(m.n, 0) AS mes_num, initcap(coalesce(cap.mes_key, 'sin mes')) AS mes,
               count(*) AS sesiones, sum(participantes) AS participantes, sum(horas) AS horas
        FROM cap LEFT JOIN meses m ON m.mes_key = cap.mes_key
        GROUP BY cap.anio, m.n, cap.mes_key) x), '[]'::json),
    'temas_top', coalesce((SELECT json_agg(x) FROM (
        SELECT initcap(min(tema)) AS tema, initcap(min(cat_key)) AS categoria, count(*) AS sesiones,
               sum(participantes) AS participantes, sum(horas) AS horas, count(DISTINCT infoplaza_numero) AS ips
        FROM cap WHERE coalesce(trim(tema), '') <> ''
        GROUP BY lower(trim(tema))
        ORDER BY sum(participantes) DESC LIMIT 20) x), '[]'::json),
    'servicios', coalesce((SELECT json_agg(x ORDER BY x.ips_ofrecen DESC) FROM (
        SELECT initcap(min(servicio_nombre)) AS servicio, bool_or(es_personalizado) AS personalizado,
               count(DISTINCT infoplaza_numero) FILTER (WHERE ofrecido) AS ips_ofrecen,
               count(DISTINCT infoplaza_numero) AS ips_reportan
        FROM srv GROUP BY srv_key) x), '[]'::json),
    'servicios_por_regional', coalesce((SELECT json_agg(x) FROM (
        SELECT regional, initcap(min(servicio_nombre)) AS servicio,
               count(DISTINCT infoplaza_numero) FILTER (WHERE ofrecido) AS ips_ofrecen,
               count(DISTINCT infoplaza_numero) AS ips_reportan
        FROM srv WHERE NOT es_personalizado GROUP BY regional, srv_key) x), '[]'::json),
    'por_regional', coalesce((SELECT json_agg(x ORDER BY x.regional) FROM (
        SELECT reg.regional, reg.ips_activas, reg.ips_reportantes, reg.entregados, reg.pendientes, reg.no_entrega,
          coalesce(rc.sesiones,0) AS cap_sesiones, coalesce(rc.participantes,0) AS cap_participantes,
          coalesce(rc.horas,0) AS cap_horas, coalesce(rc.ips,0) AS cap_ips,
          coalesce(ra.actividades,0) AS act_cantidad, coalesce(ra.participantes,0) AS act_participantes,
          coalesce(ra.ips,0) AS act_ips
        FROM reg LEFT JOIN reg_cap rc USING (regional) LEFT JOIN reg_act ra USING (regional)
        WHERE reg.ips_activas > 0 OR rc.sesiones > 0 OR ra.actividades > 0) x), '[]'::json),
    'regional_x_cap_categoria', coalesce((SELECT json_agg(x) FROM (
        SELECT regional, initcap(cat_key) AS categoria, count(*) AS sesiones, sum(participantes) AS participantes
        FROM cap GROUP BY regional, cat_key) x), '[]'::json),
    'regional_x_act_categoria', coalesce((SELECT json_agg(x) FROM (
        SELECT regional, initcap(cat_key) AS categoria, count(*) AS actividades, sum(participantes) AS participantes
        FROM act GROUP BY regional, cat_key) x), '[]'::json),
    'top_infoplazas', coalesce((SELECT json_agg(x) FROM (
        SELECT * FROM ip_tot ORDER BY (cap_participantes + act_participantes) DESC LIMIT 25) x), '[]'::json),
    'lista_pendientes', coalesce((SELECT json_agg(x ORDER BY x.regional, x.numero) FROM (
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
    'ips_sin_reporte', coalesce((SELECT json_agg(x ORDER BY x.regional, x.numero) FROM (
        SELECT ips.numero, ips.nombre, ips.regional, ips.provincia, ips.distrito,
               (SELECT ctrl.estado FROM ctrl WHERE ctrl.infoplaza_numero = ips.numero LIMIT 1) AS estado_entrega,
               (SELECT ctrl.motivo FROM ctrl WHERE ctrl.infoplaza_numero = ips.numero LIMIT 1) AS motivo
        FROM ips WHERE ips.activa AND ips.numero NOT IN (SELECT infoplaza_numero FROM reportantes)) x), '[]'::json),
    'detalle_infoplazas', CASE WHEN p_incluir_detalle THEN coalesce((SELECT json_agg(x ORDER BY x.regional, x.numero) FROM ip_tot x), '[]'::json) END,
    'detalle_capacitaciones', CASE WHEN p_incluir_detalle THEN coalesce((SELECT json_agg(x ORDER BY x.regional, x.infoplaza_numero, x.anio, x.cuatrimestre, x.orden) FROM (
        SELECT regional, provincia, distrito, infoplaza_numero, ip_nombre, anio, cuatrimestre, initcap(mes_key) AS mes,
               initcap(cat_key) AS categoria, tema, participantes, horas, observaciones, orden
        FROM cap) x), '[]'::json) END,
    'detalle_actividades', CASE WHEN p_incluir_detalle THEN coalesce((SELECT json_agg(x ORDER BY x.regional, x.infoplaza_numero, x.anio, x.cuatrimestre, x.orden) FROM (
        SELECT regional, provincia, distrito, infoplaza_numero, ip_nombre, anio, cuatrimestre,
               initcap(cat_key) AS categoria, actividad, participantes, observaciones, orden
        FROM act) x), '[]'::json) END
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION ipa_get_capacitaciones_report(int,int,text,text,text,text,int,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ipa_get_capacitaciones_report(int,int,text,text,text,text,int,boolean) TO authenticated, service_role;
