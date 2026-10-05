'use server';

import { supabaseAdmin, DashboardFilters } from '../lib/dashboard/executive-services';

export async function getCuatrimestralData(filters: DashboardFilters, anio: number, cuatrimestre: number) {
  try {
    // 1. Obtener infoplazas permitidas (según regional/provincia)
    let ipQuery = supabaseAdmin.from('infoplazas').select('numero, nombre, regional, provincia, distrito, corregimiento, estado');
    
    if (filters.regional) {
      ipQuery = ipQuery.eq('regional', filters.regional);
    }
    if (filters.provincia) {
      ipQuery = ipQuery.eq('provincia', filters.provincia);
    }
    const { data: infoplazas, error: ipErr } = await ipQuery;
    if (ipErr) throw ipErr;
    
    const infoplazaNumeros = infoplazas.map(ip => ip.numero);
    if (infoplazaNumeros.length === 0) return { success: true, data: { infoplazas: infoplazas || [], capacitaciones: [], actividades: [], servicios: [], control: [] } };

    // 2. Control de entrega
    const { data: control, error: ctrlErr } = await supabaseAdmin
      .from('control_entrega_informes')
      .select('*')
      .eq('anio', anio)
      .eq('cuatrimestre', cuatrimestre)
      .in('infoplaza_numero', infoplazaNumeros);
    if (ctrlErr) throw ctrlErr;

    // 3. Capacitaciones
    const { data: capacitaciones, error: capErr } = await supabaseAdmin
      .from('informe_capacitaciones')
      .select('*')
      .eq('anio', anio)
      .eq('cuatrimestre', cuatrimestre)
      .in('infoplaza_numero', infoplazaNumeros);
    if (capErr) throw capErr;

    // 4. Otras actividades
    const { data: actividades, error: actErr } = await supabaseAdmin
      .from('informe_otras_actividades')
      .select('*')
      .eq('anio', anio)
      .eq('cuatrimestre', cuatrimestre)
      .in('infoplaza_numero', infoplazaNumeros);
    if (actErr) throw actErr;

    // 5. Servicios
    const { data: servicios, error: servErr } = await supabaseAdmin
      .from('informe_servicios')
      .select('*')
      .eq('anio', anio)
      .eq('cuatrimestre', cuatrimestre)
      .in('infoplaza_numero', infoplazaNumeros);
    if (servErr) throw servErr;

    return { 
      success: true, 
      data: {
        infoplazas: infoplazas || [],
        control: control || [],
        capacitaciones: capacitaciones || [],
        actividades: actividades || [],
        servicios: servicios || []
      }
    };
  } catch (error: any) {
    console.error('Error en getCuatrimestralData:', error);
    return { success: false, error: error.message || 'Error al obtener datos cuatrimestrales' };
  }
}


/**
 * Informe consolidado de Capacitaciones, Actividades y Servicios.
 * Agrega en la base (RPC ipa_get_capacitaciones_report) para no topar con el
 * límite de 1000 filas de PostgREST y respeta todos los filtros del dashboard.
 * - cuatrimestre 0 = todo el año; anio 0 = todos los años.
 * - mes: capacitaciones por mes exacto; actividades/servicios por su cuatrimestre.
 */
export async function getCapacitacionesReport(filters: DashboardFilters, incluirDetalle = false) {
  try {
    const { data, error } = await supabaseAdmin.rpc('ipa_get_capacitaciones_report', {
      p_anio: filters.anio || 0,
      p_cuatrimestre: filters.cuatrimestre || 0,
      p_mes: filters.mes || '',
      p_regional: filters.regional || '',
      p_provincia: filters.provincia || '',
      p_distrito: filters.distrito || '',
      p_infoplaza: filters.infoplaza || 0,
      p_incluir_detalle: incluirDetalle,
    });
    if (error) throw error;
    return { success: true as const, data };
  } catch (error: unknown) {
    console.error('Error en getCapacitacionesReport:', error);
    const msg = error instanceof Error ? error.message : (error as { message?: string })?.message;
    return { success: false as const, error: msg || 'Error al obtener el informe de capacitaciones' };
  }
}
