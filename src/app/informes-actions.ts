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

