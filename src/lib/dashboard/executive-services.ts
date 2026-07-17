import { createClient } from '@supabase/supabase-js';

// Evitar error de WebSocket en Node.js < 22 en Server Actions
if (typeof global !== 'undefined' && !global.WebSocket) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.WebSocket = class {} as any;
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Cliente privado server-only con service role key para saltar RLS
// ya que por ahora se omiten los roles y el login del usuario del sistema.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

export interface DashboardFilters {
  anio?: number;
  mes?: string;
  regional?: string;
  provincia?: string;
  distrito?: string;
  infoplaza?: number;
}

interface ResumenServicioRow {
  numero_infoplaza: number;
  regional: string;
  anio: number;
  mes: string;
  total: number;
  taller: number;
  reunion: number;
  consulta: number;
  venta: number;
  scan: number;
  correo: number;
  tel: number;
  lt: number;
  impresion: number;
  copia: number;
  cine: number;
  otros: number;
  uso_de_pc: number;
}

interface ResumenDemograficoRow {
  numero_infoplaza: number;
  regional: string;
  anio: number;
  mes: string;
  masculino: number;
  femenino: number;
  primaria: number;
  secundaria: number;
  universitario: number;
  docente: number;
  tercera_edad: number;
  publico_general: number;
  total: number;
}

interface ResumenTipoUsuarioGeneroRow {
  numero_infoplaza: number;
  regional: string;
  anio: number;
  mes: string;
  tipo_usuario: string;
  masculino: number;
  femenino: number;
  total: number;
}

// Helper genérico para descargar todos los registros paginados en Supabase (evita el límite de 1000 filas de PostgREST)
async function fetchAllRows<T>(
  queryBuilderFn: (page: number, pageSize: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  let allRows: T[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const query = queryBuilderFn(page, pageSize);
    const { data, error } = await query;
    if (error) throw error;
    allRows = allRows.concat(data || []);
    if (!data || data.length < pageSize) {
      hasMore = false;
    } else {
      page++;
    }
  }
  return allRows;
}

export async function getExecutiveDashboardSnapshot(filters: DashboardFilters = {}) {
  const targetAnio = filters.anio !== undefined ? filters.anio : 2026;
  const targetMes = filters.mes || '';
  const targetRegional = filters.regional || '';
  const targetProvincia = filters.provincia || '';
  const targetDistrito = filters.distrito || '';
  const targetInfoplaza = filters.infoplaza || 0;

  const { data, error } = await supabaseAdmin.rpc('ipa_get_dashboard_snapshot', {
    p_anio: targetAnio,
    p_mes: targetMes,
    p_regional: targetRegional,
    p_provincia: targetProvincia,
    p_distrito: targetDistrito,
    p_infoplaza: targetInfoplaza
  });

  if (error) {
    console.error('Error llamando RPC ipa_get_dashboard_snapshot:', error);
    throw error;
  }

  return data;
}

interface HistorialSincronizacionRow {
  fecha_reporte: string;
  regional: string;
  sucursal: string;
  dias_sin_sinc: number | null;
  observacion: string | null;
}

export async function getDashboardRawData(anio: number) {
  // Descargar las tres tablas crudas en paralelo para máxima velocidad
  const [servicios, demografico, tipoUsuario] = await Promise.all([
    fetchAllRows<ResumenServicioRow>((page, pageSize) => {
      let q = supabaseAdmin
        .from('resumen_servicios')
        .select('numero_infoplaza, regional, anio, mes, total, taller, reunion, consulta, venta, scan, correo, tel, lt, impresion, copia, cine, otros, uso_de_pc')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (anio !== 0) q = q.eq('anio', anio);
      return q;
    }),
    fetchAllRows<ResumenDemograficoRow>((page, pageSize) => {
      let q = supabaseAdmin
        .from('resumen_demografico')
        .select('numero_infoplaza, regional, anio, mes, masculino, femenino, primaria, secundaria, universitario, docente, tercera_edad, publico_general, total')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (anio !== 0) q = q.eq('anio', anio);
      return q;
    }),
    fetchAllRows<ResumenTipoUsuarioGeneroRow>((page, pageSize) => {
      let q = supabaseAdmin
        .from('resumen_tipo_usuario_genero')
        .select('numero_infoplaza, regional, anio, mes, tipo_usuario, masculino, femenino, total')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (anio !== 0) q = q.eq('anio', anio);
      return q;
    })
  ]);

  // Obtener última fecha de sincronización
  const { data: latestReportDateRow } = await supabaseAdmin
    .from('historial_sincronizacion')
    .select('fecha_reporte')
    .order('fecha_reporte', { ascending: false })
    .limit(1);

  const latestReportDate = latestReportDateRow?.[0]?.fecha_reporte || '2026-06-30';

  // Obtener historial de sincronización para la última fecha
  const syncHistory = await fetchAllRows<HistorialSincronizacionRow>((page, pageSize) => {
    return supabaseAdmin
      .from('historial_sincronizacion')
      .select('fecha_reporte, regional, sucursal, dias_sin_sinc, observacion')
      .eq('fecha_reporte', latestReportDate)
      .range(page * pageSize, (page + 1) * pageSize - 1);
  });

  return {
    servicios,
    demografico,
    tipoUsuario,
    latestReportDate,
    syncHistory
  };
}
