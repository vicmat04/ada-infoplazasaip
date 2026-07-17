'use server';

import { getExecutiveDashboardSnapshot, DashboardFilters, supabaseAdmin, getDashboardRawData as getRawData } from '../lib/dashboard/executive-services';
import { supabase } from '../lib/supabase';

// Server Action para obtener el snapshot de datos con filtros
export async function getDashboardData(filters: DashboardFilters = {}) {
  try {
    const data = await getExecutiveDashboardSnapshot(filters);
    return { success: true, data };
  } catch (error: any) {
    console.error('Error en Server Action getDashboardData:', error);
    return { success: false, error: error.message || 'Error al obtener datos del servidor' };
  }
}

// Server Action para obtener toda la data cruda de Supabase para un año
export async function getDashboardRawData(anio: number) {
  try {
    const data = await getRawData(anio);
    return { success: true, data };
  } catch (error: any) {
    console.error('Error en Server Action getDashboardRawData:', error);
    return { success: false, error: error.message || 'Error al obtener datos crudos del servidor' };
  }
}

// Server Action para obtener la lista de infoplazas para el catálogo
export async function getInfoplazasCatalog() {
  try {
    // Obtenemos los campos clave de las activas para mantener el payload ultra ligero (optimización de velocidad)
    const { data, error } = await supabaseAdmin
      .from('infoplazas')
      .select('numero, nombre, regional, provincia, distrito, corregimiento')
      .eq('estado', 'Activa')
      .order('numero', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error al obtener catálogo de Infoplazas:', error);
    return { success: false, error: error.message || 'Error al obtener el catálogo' };
  }
}

// Server Action para obtener los periodos disponibles
export async function getAvailablePeriods() {
  try {
    const { data, error } = await supabaseAdmin.rpc('ipa_get_periodos_disponibles');
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error al obtener periodos disponibles:', error);
    return { success: false, error: error.message || 'Error al obtener periodos' };
  }
}

// Server Action para obtener los datos detallados de la pestaña de Sincronización
export async function getSyncPageData(filters: DashboardFilters = {}) {
  try {
    const targetAnio = filters.anio !== undefined ? filters.anio : 2026;
    const targetMes = filters.mes || '';
    const targetRegional = filters.regional || '';
    const targetProvincia = filters.provincia || '';
    const targetDistrito = filters.distrito || '';
    const targetInfoplaza = filters.infoplaza || 0;

    const { data, error } = await supabaseAdmin.rpc('ipa_get_sync_page_data', {
      p_anio: targetAnio,
      p_mes: targetMes,
      p_regional: targetRegional,
      p_provincia: targetProvincia,
      p_distrito: targetDistrito,
      p_infoplaza: targetInfoplaza
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Error en Server Action getSyncPageData:', error);
    return { success: false, error: error.message || 'Error al obtener datos de sincronización' };
  }
}

// Server Action para obtener el desglose mensual de visitas y servicios cruzado para una Infoplaza
export async function getInfoplazaMensualReport(numeroInfoplaza: number, anio: number) {
  try {
    const [resDemo, resServ] = await Promise.all([
      supabaseAdmin
        .from('resumen_demografico')
        .select('mes, mes_numero, masculino, femenino, primaria, secundaria, universitario, docente, tercera_edad, publico_general, total')
        .eq('numero_infoplaza', numeroInfoplaza)
        .eq('anio', anio),
      supabaseAdmin
        .from('resumen_servicios')
        .select('mes, mes_numero, uso_de_pc, copia, impresion, consulta, taller, reunion, otros, total')
        .eq('numero_infoplaza', numeroInfoplaza)
        .eq('anio', anio)
    ]);

    if (resDemo.error) throw resDemo.error;
    if (resServ.error) throw resServ.error;

    const demoData = resDemo.data || [];
    const servData = resServ.data || [];

    // Cruzar los datos por mes_numero (1 al 12)
    const consolidado: any[] = [];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    for (let i = 1; i <= 12; i++) {
      const demoMes = demoData.find(d => d.mes_numero === i);
      const servMes = servData.find(s => s.mes_numero === i);

      // Si no hay datos en ese mes en ninguna de las dos tablas, no lo incluimos
      if (!demoMes && !servMes) continue;

      consolidado.push({
        mes_numero: i,
        mes: demoMes?.mes || servMes?.mes || meses[i - 1],
        // Demografía
        masculino: demoMes?.masculino || 0,
        femenino: demoMes?.femenino || 0,
        primaria: demoMes?.primaria || 0,
        secundaria: demoMes?.secundaria || 0,
        universitario: demoMes?.universitario || 0,
        docente: demoMes?.docente || 0,
        tercera_edad: demoMes?.tercera_edad || 0,
        publico_general: demoMes?.publico_general || 0,
        total_visitas: demoMes?.total || 0,
        // Servicios
        uso_de_pc: servMes?.uso_de_pc || 0,
        copia: servMes?.copia || 0,
        impresion: servMes?.impresion || 0,
        consulta: servMes?.consulta || 0,
        taller: servMes?.taller || 0,
        reunion: servMes?.reunion || 0,
        otros: servMes?.otros || 0,
        total_servicios: servMes?.total || 0
      });
    }

    // Ordenar cronológicamente por mes_numero
    consolidado.sort((a, b) => a.mes_numero - b.mes_numero);

    return { success: true, data: consolidado };
  } catch (error: any) {
    console.error('Error al obtener reporte mensual consolidado:', error);
    return { success: false, error: error.message || 'Error al obtener reporte consolidado' };
  }
}

// Server Action para obtener novedades publicadas del sistema
export async function getNotificacionesSistema() {
  try {
    const { data, error } = await supabaseAdmin
      .from('notificaciones_sistema')
      .select('id, titulo, cuerpo, tipo, creado_en')
      .eq('publicado', true)
      .order('creado_en', { ascending: false })
      .limit(20);

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error al obtener novedades del sistema:', error);
    return { success: false, error: error.message || 'Error al obtener novedades', data: [] };
  }
}

// Server Action para calcular alertas operativas en tiempo real.
// Reutiliza getSyncPageData como única fuente de verdad para garantizar
// consistencia exacta con el menú de Sincronización (mismos umbrales,
// mismos filtros, misma exclusión de "Cerrada Definitivamente" — Regla 11 AGENTS.md).
export async function getAlertasOperativas(regional?: string) {
  try {
    // Usamos el año 0 (todos los años) sin mes para obtener los tableRows del último corte,
    // aplicando el filtro de regional si se provee.
    const syncRes = await getSyncPageData({ regional: regional ?? '' });

    if (!syncRes.success || !syncRes.data) {
      throw new Error(syncRes.error ?? 'Error al obtener datos de sincronización');
    }

    const tableRows: any[] = syncRes.data.tableRows ?? [];

    // Mismos umbrales que SyncTabSection.tsx
    const criticas  = tableRows.filter((r: any) => r.dias_sin_sinc !== null && r.dias_sin_sinc > 30);
    const revision  = tableRows.filter((r: any) => r.dias_sin_sinc !== null && r.dias_sin_sinc > 10 && r.dias_sin_sinc <= 30);
    const enPeriodo = tableRows.filter((r: any) => r.dias_sin_sinc !== null && r.dias_sin_sinc <= 10);

    const alertas: { tipo: 'critico' | 'advertencia' | 'info'; titulo: string; descripcion: string }[] = [];

    if (criticas.length > 0) {
      alertas.push({
        tipo: 'critico',
        titulo: `${criticas.length} infoplaza${criticas.length > 1 ? 's' : ''} con atraso crítico`,
        descripcion: 'Más de 30 días sin sincronizar. Requieren atención inmediata.',
      });
    }

    if (revision.length > 0) {
      alertas.push({
        tipo: 'advertencia',
        titulo: `${revision.length} infoplaza${revision.length > 1 ? 's' : ''} para revisión`,
        descripcion: 'Entre 11 y 30 días sin sincronizar.',
      });
    }

    if (enPeriodo.length > 0) {
      alertas.push({
        tipo: 'info',
        titulo: `${enPeriodo.length} infoplaza${enPeriodo.length > 1 ? 's' : ''} en período de monitoreo`,
        descripcion: 'Hasta 10 días sin sincronizar. Dentro del umbral aceptable.',
      });
    }

    if (alertas.length === 0) {
      alertas.push({
        tipo: 'info',
        titulo: 'Sin alertas activas',
        descripcion: 'Todas las infoplazas están sincronizadas correctamente.',
      });
    }

    return {
      success: true,
      data: {
        alertas,
        resumen: {
          criticas: criticas.length,
          revision: revision.length,
          enPeriodo: enPeriodo.length,
          total: tableRows.length,
        },
      },
    };
  } catch (error: any) {
    console.error('Error al calcular alertas operativas:', error);
    return { success: false, error: error.message ?? 'Error al calcular alertas', data: null };
  }
}

// Variable en caché a nivel de módulo para evitar consultar 84k filas en cada render
let cachedFirstReportMap: Record<number, string> | null = null;

// Server Action para obtener la primera fecha de reporte de cada sucursal en historial
export async function getAuditReportData() {
  try {
    if (cachedFirstReportMap && Object.keys(cachedFirstReportMap).length > 0) {
      return { success: true, data: cachedFirstReportMap };
    }

    // Obtener lista de infoplazas activas para optimizar detención temprana
    const { data: activePlazas, error: errPlazas } = await supabaseAdmin
      .from('infoplazas')
      .select('numero')
      .eq('estado', 'Activa');
      
    if (errPlazas) throw errPlazas;
    const activePlazasSet = new Set(activePlazas?.map(p => p.numero) || []);

    const firstReportMap: Record<number, string> = {};
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabaseAdmin
        .from('historial_sincronizacion')
        .select('sucursal, fecha_reporte')
        .order('fecha_reporte', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);
        
      if (error) throw error;
      if (!data || data.length === 0) break;
      
      for (const row of data) {
        if (!row.sucursal) continue;
        const num = parseInt(row.sucursal.split('-')[0].trim(), 10);
        if (isNaN(num)) continue;
        if (activePlazasSet.has(num) && !firstReportMap[num]) {
          firstReportMap[num] = row.fecha_reporte;
        }
      }
      
      // Si ya encontramos las fechas de todas las plazas activas, detenemos la paginación
      if (Object.keys(firstReportMap).length >= activePlazasSet.size) {
        break;
      }
      
      if (data.length < pageSize) break;
      page++;
    }

    cachedFirstReportMap = firstReportMap;
    return { success: true, data: firstReportMap };
  } catch (error: any) {
    console.error('Error en Server Action getAuditReportData:', error);
    return { success: false, error: error.message || 'Error al obtener primeras fechas de reporte' };
  }
}

