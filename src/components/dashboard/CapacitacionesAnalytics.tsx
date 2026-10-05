'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getCapacitacionesReport } from '@/app/informes-actions';
import {
  AlertCircle, BookOpen, Activity, CheckCircle2, FileSpreadsheet, FileDown,
  MapPinned, Building2, Loader2, ClipboardCheck, Eye, EyeOff,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart, Line,
} from 'recharts';

/* ───────────────────────── Tipos ───────────────────────── */

type Filters = {
  anio: number; mes: string; regional: string; provincia: string;
  distrito: string; infoplaza: number; cuatrimestre: number;
};

interface Kpis {
  ips_activas: number; ips_reportantes: number;
  cap_sesiones: number; cap_participantes: number; cap_horas: number; cap_ips: number;
  act_cantidad: number; act_participantes: number; act_ips: number;
  srv_ips: number; srv_promedio_por_ip: number | null;
  entregados: number; pendientes: number; no_entrega: number;
}
interface CapCat { categoria: string; sesiones: number; participantes: number; horas: number; ips: number }
interface ActCat { categoria: string; actividades: number; participantes: number; ips: number }
interface CapMes { anio: number; mes_num: number; mes: string; sesiones: number; participantes: number; horas: number }
interface Tema { tema: string; categoria: string; sesiones: number; participantes: number; horas: number; ips: number }
interface Servicio { servicio: string; personalizado: boolean; ips_ofrecen: number; ips_reportan: number }
interface ServicioReg { regional: string; servicio: string; ips_ofrecen: number; ips_reportan: number }
interface Regional {
  regional: string; ips_activas: number; ips_reportantes: number; entregados: number; pendientes: number; no_entrega: number;
  cap_sesiones: number; cap_participantes: number; cap_horas: number; cap_ips: number;
  act_cantidad: number; act_participantes: number; act_ips: number;
}
interface RegCat { regional: string; categoria: string; participantes: number; sesiones?: number; actividades?: number }
interface IpTot {
  numero: number; nombre: string; regional: string; provincia: string; distrito: string;
  cap_sesiones: number; cap_participantes: number; cap_horas: number; act_cantidad: number; act_participantes: number;
}
interface IpSinReporte { numero: number; nombre: string; regional: string; provincia: string; distrito: string; estado_entrega: string | null; motivo: string | null }

interface DetalleBase {
  regional: string; provincia: string; distrito: string; infoplaza_numero: number; ip_nombre: string;
  anio: number; cuatrimestre: number; categoria: string; participantes: number; observaciones: string | null;
}
interface DetalleCap extends DetalleBase { mes: string | null; tema: string; horas: number }
interface DetalleAct extends DetalleBase { actividad: string }

interface Report {
  periodo: { anio: number; cuatrimestre: number; mes: string | null };
  kpis: Kpis;
  cap_por_categoria: CapCat[];
  act_por_categoria: ActCat[];
  cap_por_mes: CapMes[];
  temas_top: Tema[];
  servicios: Servicio[];
  servicios_por_regional: ServicioReg[];
  por_regional: Regional[];
  regional_x_cap_categoria: RegCat[];
  regional_x_act_categoria: RegCat[];
  top_infoplazas: IpTot[];
  lista_pendientes: IpSinReporte[];
  lista_no_entrega: IpSinReporte[];
  ips_sin_reporte: IpSinReporte[];
  detalle_infoplazas?: IpTot[];
  detalle_capacitaciones?: DetalleCap[];
  detalle_actividades?: DetalleAct[];
}

/* ───────────────────────── Utilidades ───────────────────────── */

const COLOR_CAP = '#8b5cf6';
const COLOR_ACT = '#f97316';
const COLOR_SRV = '#10b981';
const COLOR_HORAS = '#0ea5e9';

/** Exporta datos a CSV */
const exportarCSV = (datos: Record<string, unknown>[], nombreArchivo: string, columnas?: { key: string; label: string }[]) => {
  if (!datos || datos.length === 0) return;
  const cols = columnas || Object.keys(datos[0]).map(k => ({ key: k, label: k }));
  const headers = cols.map(c => c.label).join(',');
  const rows = datos.map(row => 
    cols.map(c => {
      let val = String(row[c.key] ?? '');
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    }).join(',')
  ).join('\n');
  const csv = headers + '\n' + rows;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nombreArchivo;
  link.click();
  URL.revokeObjectURL(link.href);
};

/** Detecta si una categor
en es "Otra/Otras/Otro" (case-insensitive) */
const esOtra = (categoria: string) => /^otra?s?$/i.test(categoria?.trim() || '');

const n = (v: number | null | undefined, dec = 0) =>
  (Number(v) || 0).toLocaleString('es-PA', { maximumFractionDigits: dec, minimumFractionDigits: dec });
const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
const pctTxt = (a: number, b: number, dec = 0) => `${n(pct(a, b), dec)}%`;
const div = (a: number, b: number) => (b > 0 ? a / b : 0);
const slugify = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_');

function periodoLabel(f: Filters) {
  const partes: string[] = [];
  if (f.mes && !f.mes.startsWith('Q')) partes.push(f.mes);
  else if (f.cuatrimestre) partes.push(`Cuatrimestre ${f.cuatrimestre}`);
  partes.push(f.anio ? String(f.anio) : 'todos los años');
  return partes.join(' ');
}

function ambitoLabel(f: Filters, ipNombre?: string) {
  if (f.infoplaza) return ipNombre ? `Infoplaza ${f.infoplaza} (${ipNombre})` : `Infoplaza ${f.infoplaza}`;
  if (f.distrito) return `Distrito de ${f.distrito}`;
  if (f.provincia) return `Provincia de ${f.provincia}`;
  if (f.regional) return `Regional ${f.regional}`;
  return 'Todas las regionales';
}

const tooltipStyle = {
  contentStyle: { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#f8fafc', fontSize: 12 },
  itemStyle: { color: '#e2e8f0' },
  labelStyle: { color: '#f8fafc', fontWeight: 600 },
};

/* ───────────────────────── Piezas de UI ───────────────────────── */

function Section({ id, icon, title, subtitle, actions, children }: {
  id: string; icon: React.ReactNode; title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section id={id} className="glass rounded-xl p-4 sm:p-6 scroll-mt-24">
      <header className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-[var(--accent)]">{icon}</div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] leading-tight">{title}</h3>
            {subtitle && <p className="text-sm text-[var(--muted)] mt-1 max-w-3xl">{subtitle}</p>}
          </div>
        </div>
        {actions && <div data-export-ignore>{actions}</div>}
      </header>
      {children}
    </section>
  );
}

function Kpi({ label, value, detail, color, onClick, isClickable }: { label: string; value: string; detail?: React.ReactNode; color: string; onClick?: () => void; isClickable?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4" style={{ borderLeft: `3px solid ${color}` }}>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color }}>{value}</p>
      {detail && <p className="text-xs text-[var(--muted)] mt-1">{detail}</p>}
    </div>
  );
}

type Col<T> = { key: string; label: string; align?: 'left' | 'right'; render?: (r: T) => React.ReactNode };

function DataTable<T extends object>({ columns, rows, footer, csvFileName, csvData }: { 
  columns: Col<T>[]; 
  rows: T[]; 
  footer?: Record<string, React.ReactNode>; 
  csvFileName?: string; 
  csvData?: Record<string, unknown>[];
}) {
  const handleExportCSV = () => {
    if (!csvFileName) return;
    const dataToExport = csvData || rows;
    exportarCSV(dataToExport as Record<string, unknown>[], csvFileName, columns.map(c => ({ key: c.key, label: c.label })));
  };

  return (
    <div>
      {csvFileName && (
        <div className="flex justify-end mb-2" data-export-ignore>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600/10 border border-emerald-600/20 text-emerald-400 hover:bg-emerald-600/20 transition-colors"
          >
            <FileSpreadsheet size={14} />
            Descargar CSV
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-[var(--card-bg)] backdrop-blur">
          <tr className="text-[var(--muted)] text-xs">
            {columns.map((c) => (
              <th key={c.key} className={`px-3 py-2 font-medium whitespace-nowrap ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            // Disimular filas con "otra/otras/otro"
            const rowData = r as Record<string, unknown>;
            const categoria = String(rowData.categoria || '');
            const esOtraRow = esOtra(categoria);
            return (
              <tr key={i} className={`border-t border-[var(--card-border)] text-[var(--foreground)] ${esOtraRow ? 'opacity-50' : ''}`}>
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2 ${c.align === 'right' ? 'text-right tabular-nums whitespace-nowrap' : ''}`}>
                    {c.render ? c.render(r) : ((r as Record<string, unknown>)[c.key] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-[var(--muted)]">Sin registros para este filtro</td></tr>
          )}
        </tbody>
        {footer && (
          <tfoot>
            <tr className="border-t-2 border-[var(--card-border)] font-semibold text-[var(--foreground)]">
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2 ${c.align === 'right' ? 'text-right tabular-nums whitespace-nowrap' : ''}`}>
                  {footer[c.key] ?? ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
      </div>
    </div>
  );
}

/** Matriz regional × categoría con intensidad de color por celda. */
function Heatmap({ data, valueKey, color }: { data: RegCat[]; valueKey: 'participantes' | 'sesiones' | 'actividades'; color: string }) {
  const regionales = Array.from(new Set(data.map((d) => d.regional))).sort();
  const totPorCat: Record<string, number> = {};
  const totPorReg: Record<string, number> = {};
  data.forEach((d) => {
    const v = Number(d[valueKey]) || 0;
    totPorCat[d.categoria] = (totPorCat[d.categoria] || 0) + v;
    totPorReg[d.regional] = (totPorReg[d.regional] || 0) + v;
  });
  const categorias = Object.keys(totPorCat).sort((a, b) => totPorCat[b] - totPorCat[a]);
  const map = new Map(data.map((d) => [`${d.regional}|${d.categoria}`, Number(d[valueKey]) || 0]));
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0));
  const total = Object.values(totPorCat).reduce((a, b) => a + b, 0);

  if (regionales.length === 0) return <p className="text-sm text-[var(--muted)]">Sin datos para este filtro.</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[var(--muted)]">
            <th className="px-3 py-2 text-left font-medium">Categoría</th>
            {regionales.map((r) => <th key={r} className="px-3 py-2 text-right font-medium whitespace-nowrap">{r}</th>)}
            <th className="px-3 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {categorias.map((c) => (
            <tr key={c} className="border-t border-[var(--card-border)] text-[var(--foreground)]">
              <td className="px-3 py-1.5 whitespace-nowrap">{c}</td>
              {regionales.map((r) => {
                const v = map.get(`${r}|${c}`) || 0;
                const alpha = v ? 0.12 + 0.68 * (v / max) : 0;
                return (
                  <td key={r} className="px-3 py-1.5 text-right tabular-nums"
                    style={{ backgroundColor: v ? `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}` : undefined }}>
                    {v ? n(v) : '–'}
                  </td>
                );
              })}
              <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{n(totPorCat[c])}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[var(--card-border)] font-semibold text-[var(--foreground)]">
            <td className="px-3 py-1.5">Total</td>
            {regionales.map((r) => <td key={r} className="px-3 py-1.5 text-right tabular-nums">{n(totPorReg[r])}</td>)}
            <td className="px-3 py-1.5 text-right tabular-nums">{n(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function HBarChart({ data, dataKey, nameKey, color, label }: { data: object[]; dataKey: string; nameKey: string; color: string; label: string }) {
  const height = Math.max(220, data.length * 30 + 40);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
          <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => n(v)} />
          <YAxis type="category" dataKey={nameKey} stroke="#94a3b8" fontSize={11} width={190} tick={{ fill: '#94a3b8' }} interval={0} />
          <Tooltip {...tooltipStyle} formatter={(v) => n(Number(v))} />
          <Bar dataKey={dataKey} name={label} fill={color} radius={[0, 4, 4, 0]}
            label={{ position: 'right', fill: '#94a3b8', fontSize: 11, formatter: (v: unknown) => n(Number(v)) }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const SECCIONES = [
  { id: 'cap-resumen', label: 'Resumen' },
  { id: 'cap-capacitaciones', label: 'Capacitaciones' },
  { id: 'cap-actividades', label: 'Actividades' },
  { id: 'cap-servicios', label: 'Servicios' },
  { id: 'cap-regionales', label: 'Comparativa regional' },
  { id: 'cap-infoplazas', label: 'Infoplazas' },
];

/* ───────────────────────── Componente principal ───────────────────────── */

export default function CapacitacionesAnalytics({ filters, allInfoplazas = [] }: {
  filters: Filters; allInfoplazas?: { numero: number; nombre: string }[];
}) {
  const [resultado, setResultado] = useState<{ key: string; data?: Report; error?: string } | null>(null);
  const [exportando, setExportando] = useState<'xlsx' | 'pdf' | null>(null);
  const [mostrarTablaCapCat, setMostrarTablaCapCat] = useState(true);
  const [mostrarTablaCapMes, setMostrarTablaCapMes] = useState(false);
  const [mostrarTablaActCat, setMostrarTablaActCat] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<any>(null);
  const [metricaMatriz, setMetricaMatriz] = useState<'participantes' | 'sesiones'>('participantes');

  // Clave estable: solo recarga cuando los filtros cambian de verdad
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let vivo = true;
    let parsedFilters;
    try {
      parsedFilters = JSON.parse(filtersKey);
    } catch {
      setTimeout(() => {
        if (vivo) setResultado({ key: filtersKey, error: 'Error al parsear filtros' });
      }, 0);
      return () => { vivo = false; };
    }
    
    getCapacitacionesReport(parsedFilters)
      .then((res) => {
        if (!vivo) return;
        setResultado(res.success ? { key: filtersKey, data: res.data as Report } : { key: filtersKey, error: res.error });
      })
      .catch((e) => { if (vivo) setResultado({ key: filtersKey, error: String(e) }); });
    
    return () => { vivo = false; };
  }, [filtersKey]);

  // Mientras llega el nuevo resultado se mantiene el anterior atenuado
  const loading = resultado?.key !== filtersKey;
  const data = resultado?.data ?? null;
  const error = !loading ? resultado?.error ?? null : null;

  const ipNombre = allInfoplazas.find((i) => i.numero === filters.infoplaza)?.nombre;
  const periodo = periodoLabel(filters);
  const ambito = ambitoLabel(filters, ipNombre);
  const filtraPorMes = !!filters.mes && !filters.mes.startsWith('Q');
  const k = data?.kpis;

  /* ── Derivados ── */
  const capCat = useMemo(() => {
    const items = (data?.cap_por_categoria || []).map((c) => ({
      ...c, horas: Number(c.horas) || 0,
      part_por_sesion: div(c.participantes, c.sesiones),
      pct: pct(c.participantes, data?.kpis.cap_participantes || 0),
    }));
    // Ordenar: "otra/otras/otro" siempre al final
    return items.sort((a, b) => {
      const aEsOtra = esOtra(a.categoria);
      const bEsOtra = esOtra(b.categoria);
      if (aEsOtra && !bEsOtra) return 1;
      if (!aEsOtra && bEsOtra) return -1;
      return 0; // Mantener orden original para las demás
    });
  }, [data]);

  const actCat = useMemo(() => {
    const items = (data?.act_por_categoria || []).map((a) => ({
      ...a, pct: pct(a.participantes, data?.kpis.act_participantes || 0),
      part_por_act: div(a.participantes, a.actividades),
    }));
    // Ordenar: "otra/otras/otro" siempre al final
    return items.sort((a, b) => {
      const aEsOtra = esOtra(a.categoria);
      const bEsOtra = esOtra(b.categoria);
      if (aEsOtra && !bEsOtra) return 1;
      if (!aEsOtra && bEsOtra) return -1;
      return 0; // Mantener orden original para las demás
    });
  }, [data]);

  const servicios = useMemo(() => (data?.servicios || []).map((s) => ({
    ...s, cobertura: pct(s.ips_ofrecen, s.ips_reportan),
  })), [data]);
  const serviciosEstandar = servicios.filter((s) => !s.personalizado);
  const serviciosPersonalizados = servicios.filter((s) => s.personalizado);

  const regionales = useMemo(() => (data?.por_regional || []).map((r) => ({
    ...r, cap_horas: Number(r.cap_horas) || 0,
    pct_reportan: pct(r.ips_reportantes, r.ips_activas),
    part_cap_por_ip: +div(r.cap_participantes, r.ips_activas).toFixed(1),
    horas_por_ip: div(Number(r.cap_horas) || 0, r.ips_activas),
    part_act_por_ip: +div(r.act_participantes, r.ips_activas).toFixed(1),
    pct_ips_capacitan: pct(r.cap_ips, r.ips_activas),
  })), [data]);

  const serviciosMatriz = useMemo(() => {
    const rows = data?.servicios_por_regional || [];
    const regs = Array.from(new Set(rows.map((s) => s.regional))).sort();
    const map = new Map(rows.map((s) => [`${s.regional}|${s.servicio.toLowerCase()}`, s]));
    return { regs, map };
  }, [data]);

  /* ── Lectura ejecutiva generada a partir de los datos ── */
  const lectura = useMemo(() => {
    if (!data) return [];
    const kp = data.kpis;
    const p: string[] = [];
    const donde = ambito === 'Todas las regionales' ? 'la red nacional' : ambito;
    p.push(
      `En ${periodo}, en ${donde}, ${n(kp.ips_reportantes)} de ${n(kp.ips_activas)} Infoplazas activas ` +
      `(${pctTxt(kp.ips_reportantes, kp.ips_activas)}) registraron información en ADA. Se impartieron ${n(kp.cap_sesiones)} capacitaciones ` +
      `con ${n(kp.cap_participantes)} participantes y ${n(kp.cap_horas)} horas de formación, y se realizaron ${n(kp.act_cantidad)} actividades ` +
      `comunitarias con ${n(kp.act_participantes)} participantes.`
    );
    // Filtrar "otra/otras" para el resumen ejecutivo
    const capCatFiltrado = capCat.filter(c => !esOtra(c.categoria));
    const actCatFiltrado = actCat.filter(a => !esOtra(a.categoria));

    if (capCatFiltrado[0]) {
      p.push(`La categoría de capacitación con más participantes fue ${capCatFiltrado[0].categoria} (${n(capCatFiltrado[0].participantes)}, ${n(capCatFiltrado[0].pct, 1)}% del total)` +
        (capCatFiltrado[1] ? `, seguida de ${capCatFiltrado[1].categoria} (${n(capCatFiltrado[1].participantes)}).` : '.'));
    }
    if (actCatFiltrado[0]) p.push(`En actividades destaca ${actCatFiltrado[0].categoria}, con ${n(actCatFiltrado[0].participantes)} participantes en ${n(actCatFiltrado[0].actividades)} actividades.`);
    if (regionales.length > 1) {
      const orden = [...regionales].sort((a, b) => b.part_cap_por_ip - a.part_cap_por_ip);
      const mayor = orden[0], menor = orden[orden.length - 1];
      p.push(`Por regional, ${mayor.regional} logra el mayor alcance relativo en capacitaciones (${n(mayor.part_cap_por_ip, 1)} participantes por Infoplaza activa) ` +
        `y ${menor.regional} el menor (${n(menor.part_cap_por_ip, 1)}).`);
    }
    if (kp.pendientes + kp.no_entrega > 0 || data.ips_sin_reporte.length > 0) {
      p.push(`Control de entrega: ${n(kp.entregados)} informes entregados, ${n(kp.pendientes)} pendientes y ${n(kp.no_entrega)} sin entrega. ` +
        `${n(data.ips_sin_reporte.length)} Infoplazas activas no tienen registros de capacitaciones, actividades ni servicios en el período.`);
    }
    return p;
  }, [data, capCat, actCat, regionales, periodo, ambito]);

  /* ── Exportación Excel (incluye detalle fila por fila) ── */
  const exportarExcel = async () => {
    setExportando('xlsx');
    try {
      const res = await getCapacitacionesReport(filters, true);
      if (!res.success) throw new Error(res.error);
      const d = res.data as Report;
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const add = (nombre: string, filas: Record<string, unknown>[]) => {
        const datos = filas.length ? filas : [{ Nota: 'Sin registros para este filtro' }];
        const ws = XLSX.utils.json_to_sheet(datos);
        ws['!cols'] = Object.keys(datos[0]).map((c) => ({
          wch: Math.min(60, Math.max(c.length + 2, ...datos.slice(0, 300).map((f) => String(f[c] ?? '').length + 1))),
        }));
        XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 31));
      };
      const kk = d.kpis;
      add('Resumen', [
        { Indicador: 'Período', Valor: periodo },
        { Indicador: 'Ámbito', Valor: ambito },
        { Indicador: 'Infoplazas activas', Valor: kk.ips_activas },
        { Indicador: 'Infoplazas que reportaron', Valor: kk.ips_reportantes },
        { Indicador: 'Capacitaciones (sesiones)', Valor: kk.cap_sesiones },
        { Indicador: 'Participantes en capacitaciones', Valor: kk.cap_participantes },
        { Indicador: 'Horas de capacitación', Valor: Number(kk.cap_horas) },
        { Indicador: 'Infoplazas que capacitaron', Valor: kk.cap_ips },
        { Indicador: 'Otras actividades', Valor: kk.act_cantidad },
        { Indicador: 'Participantes en actividades', Valor: kk.act_participantes },
        { Indicador: 'Infoplazas con actividades', Valor: kk.act_ips },
        { Indicador: 'Servicios ofrecidos promedio por Infoplaza', Valor: Number(kk.srv_promedio_por_ip) || 0 },
        { Indicador: 'Informes entregados', Valor: kk.entregados },
        { Indicador: 'Informes pendientes', Valor: kk.pendientes },
        { Indicador: 'Sin entrega', Valor: kk.no_entrega },
        { Indicador: 'Generado', Valor: new Date().toLocaleString('es-PA') },
        ...lectura.map((t, i) => ({ Indicador: i === 0 ? 'Lectura del período' : '', Valor: t })),
      ]);
      add('Cap. por categoría', d.cap_por_categoria.map((c) => ({
        Categoría: c.categoria, Sesiones: c.sesiones, Participantes: c.participantes, Horas: Number(c.horas),
        Infoplazas: c.ips, '% participantes': +pct(c.participantes, kk.cap_participantes).toFixed(1),
      })));
      add('Cap. por mes', d.cap_por_mes.map((m) => ({ Año: m.anio, Mes: m.mes, Sesiones: m.sesiones, Participantes: m.participantes, Horas: Number(m.horas) })));
      add('Temas principales', d.temas_top.map((t) => ({ Tema: t.tema, Categoría: t.categoria, Sesiones: t.sesiones, Participantes: t.participantes, Horas: Number(t.horas), Infoplazas: t.ips })));
      add('Act. por categoría', d.act_por_categoria.map((a) => ({
        Categoría: a.categoria, Actividades: a.actividades, Participantes: a.participantes, Infoplazas: a.ips,
        '% participantes': +pct(a.participantes, kk.act_participantes).toFixed(1),
      })));
      add('Servicios', d.servicios.map((s) => ({
        Servicio: s.servicio, Tipo: s.personalizado ? 'Adicional' : 'Estándar',
        'Infoplazas que lo ofrecen': s.ips_ofrecen, 'Infoplazas que reportan': s.ips_reportan,
        '% cobertura': +pct(s.ips_ofrecen, s.ips_reportan).toFixed(1),
      })));
      add('Servicios por regional', d.servicios_por_regional.map((s) => ({
        Regional: s.regional, Servicio: s.servicio, 'Infoplazas que lo ofrecen': s.ips_ofrecen,
        'Infoplazas que reportan': s.ips_reportan, '% cobertura': +pct(s.ips_ofrecen, s.ips_reportan).toFixed(1),
      })));
      add('Comparativa regional', d.por_regional.map((r) => ({
        Regional: r.regional, 'IP activas': r.ips_activas, 'IP que reportan': r.ips_reportantes,
        '% reportan': +pct(r.ips_reportantes, r.ips_activas).toFixed(1),
        'Informes entregados': r.entregados, Pendientes: r.pendientes, 'Sin entrega': r.no_entrega,
        'Cap. sesiones': r.cap_sesiones, 'Cap. participantes': r.cap_participantes, 'Cap. horas': Number(r.cap_horas),
        'IP que capacitan': r.cap_ips, 'Part. cap. por IP activa': +div(r.cap_participantes, r.ips_activas).toFixed(1),
        'Act. cantidad': r.act_cantidad, 'Act. participantes': r.act_participantes,
        'Part. act. por IP activa': +div(r.act_participantes, r.ips_activas).toFixed(1),
      })));
      add('Regional x cat. cap.', d.regional_x_cap_categoria.map((r) => ({ Regional: r.regional, Categoría: r.categoria, Sesiones: r.sesiones, Participantes: r.participantes })));
      add('Regional x cat. act.', d.regional_x_act_categoria.map((r) => ({ Regional: r.regional, Categoría: r.categoria, Actividades: r.actividades, Participantes: r.participantes })));
      add('Por Infoplaza', (d.detalle_infoplazas || []).map((i) => ({
        Número: i.numero, Infoplaza: i.nombre, Regional: i.regional, Provincia: i.provincia, Distrito: i.distrito,
        'Cap. sesiones': i.cap_sesiones, 'Cap. participantes': i.cap_participantes, 'Cap. horas': Number(i.cap_horas),
        'Act. cantidad': i.act_cantidad, 'Act. participantes': i.act_participantes,
      })));
      add('Sin reporte', d.ips_sin_reporte.map((i) => ({
        Número: i.numero, Infoplaza: i.nombre, Regional: i.regional, Provincia: i.provincia, Distrito: i.distrito,
        'Estado de entrega': i.estado_entrega || 'Sin registro', Motivo: i.motivo || '',
      })));
      add('Detalle capacitaciones', (d.detalle_capacitaciones || []).map((c) => ({
        Regional: c.regional, Provincia: c.provincia, Distrito: c.distrito, Número: c.infoplaza_numero, Infoplaza: c.ip_nombre,
        Año: c.anio, Cuatrimestre: c.cuatrimestre, Mes: c.mes, Categoría: c.categoria, Tema: c.tema,
        Participantes: c.participantes, Horas: Number(c.horas), Observaciones: c.observaciones || '',
      })));
      add('Detalle actividades', (d.detalle_actividades || []).map((a) => ({
        Regional: a.regional, Provincia: a.provincia, Distrito: a.distrito, Número: a.infoplaza_numero, Infoplaza: a.ip_nombre,
        Año: a.anio, Cuatrimestre: a.cuatrimestre, Categoría: a.categoria, Actividad: a.actividad,
        Participantes: a.participantes, Observaciones: a.observaciones || '',
      })));
      XLSX.writeFile(wb, `Capacitaciones_Actividades_${slugify(`${periodo}_${ambito}`)}.xlsx`);
    } catch (e) {
      console.error('Error exportando Excel:', e);
      alert('No se pudo generar el Excel. Intente de nuevo.');
    } finally {
      setExportando(null);
    }
  };

  /* ── Exportación PDF (captura sección por sección) ── */
  const exportarPDF = async () => {
    setExportando('pdf');
    try {
      const { toJpeg } = await import('html-to-image');
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      const m = 10;
      const ancho = W - m * 2;
      const altoUtil = H - m * 2 - 4; // deja sitio al pie de página
      let y = m;
      const fondo = getComputedStyle(document.documentElement).getPropertyValue('--background').trim() || '#030712';

      // Las tablas con scroll interno se expanden durante la captura
      const conScroll = Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-table]'));
      const previos = conScroll.map((el) => el.style.maxHeight);
      conScroll.forEach((el) => { el.style.maxHeight = 'none'; });

      try {
        for (const id of ['cap-portada', ...SECCIONES.map((s) => s.id)]) {
          const el = document.getElementById(id);
          if (!el) continue;
          const url = await toJpeg(el, {
            pixelRatio: 2, quality: 0.8, backgroundColor: fondo,
            filter: (node) => !(node instanceof HTMLElement && node.dataset?.exportIgnore !== undefined),
          });
          const props = pdf.getImageProperties(url);
          const alto = ancho * (props.height / props.width);

          if (alto <= altoUtil) {
            if (y + alto > m + altoUtil && y > m) { pdf.addPage(); y = m; }
            pdf.addImage(url, 'JPEG', m, y, ancho, alto);
            y += alto + 4;
          } else {
            // Sección más alta que una página: se reparte en varias
            if (y > m) { pdf.addPage(); y = m; }
            const img = await new Promise<HTMLImageElement>((ok, ko) => {
              const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url;
            });
            const pxPorMm = img.width / ancho;
            const altoPaginaPx = Math.floor(altoUtil * pxPorMm);
            for (let off = 0; off < img.height; off += altoPaginaPx) {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = Math.min(altoPaginaPx, img.height - off);
              const ctx = canvas.getContext('2d')!;
              ctx.fillStyle = fondo;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, -off);
              if (off > 0) pdf.addPage();
              const h = canvas.height / pxPorMm;
              pdf.addImage(canvas.toDataURL('image/jpeg', 0.8), 'JPEG', m, m, ancho, h);
              y = m + h + 4;
            }
          }
        }
      } finally {
        conScroll.forEach((el, i) => { el.style.maxHeight = previos[i]; });
      }

      const total = pdf.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.text(`Infoplazas Analytics - Capacitaciones y actividades - ${periodo} - ${ambito}`, m, H - 4);
        pdf.text(`${i} / ${total}`, W - m, H - 4, { align: 'right' });
      }
      pdf.save(`Informe_Capacitaciones_${slugify(`${periodo}_${ambito}`)}.pdf`);
    } catch (e) {
      console.error('Error exportando PDF:', e);
      alert('No se pudo generar el PDF. Intente de nuevo.');
    } finally {
      setExportando(null);
    }
  };

  /* ───────────── Estados de carga / error ───────────── */

  if (loading && !data) {
    return (
      <div className="glass rounded-xl p-10 flex flex-col items-center justify-center text-[var(--muted)]">
        <Loader2 className="animate-spin mb-3" size={28} />
        <p>Preparando el informe de capacitaciones y actividades…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-xl p-8 flex flex-col items-center text-center border border-red-500/30">
        <AlertCircle size={36} className="text-red-400 mb-3" />
        <p className="text-[var(--foreground)] font-semibold">No se pudo cargar el informe</p>
        <p className="text-sm text-[var(--muted)] mt-1">{error}</p>
      </div>
    );
  }

  if (!data || !k) return null;

  const sinDatos = k.cap_sesiones === 0 && k.act_cantidad === 0 && k.srv_ips === 0;

  /* ───────────── Render ───────────── */

  return (
    <div className={`flex flex-col gap-6 mb-6 transition-opacity ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Encabezado del informe */}
      <div id="cap-portada" className="glass rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--muted)]">Informe de gestión</p>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mt-1">Capacitaciones, actividades y servicios</h2>
            <p className="text-sm text-[var(--muted)] mt-2 max-w-3xl">
              <span className="text-[var(--foreground)] font-medium">{periodo}</span>
              {', '}
              <span className="text-[var(--foreground)] font-medium">{ambito}</span>
              {'. Fuente: informes cuatrimestrales registrados en ADA por los dinamizadores.'}
            </p>
            {filtraPorMes && (
              <p className="text-xs text-amber-400/90 mt-2 max-w-2xl">
                Con un mes seleccionado, las capacitaciones corresponden solo a {filters.mes}. Las actividades y los servicios
                no se registran por mes, así que se muestran para todo el cuatrimestre {data.periodo.cuatrimestre}.
              </p>
            )}
          </div>
          <div className="flex gap-2" data-export-ignore>
            <button onClick={exportarExcel} disabled={!!exportando || sinDatos}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400">
              {exportando === 'xlsx' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
              Excel completo
            </button>
            <button onClick={exportarPDF} disabled={!!exportando || sinDatos}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] hover:opacity-90 text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">
              {exportando === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              PDF
            </button>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2 mt-5" data-export-ignore aria-label="Secciones del informe">
          {SECCIONES.map((s) => (
            <a key={s.id} href={`#${s.id}`}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)] transition-colors">
              {s.label}
            </a>
          ))}
        </nav>
      </div>

      {sinDatos ? (
        <div className="glass rounded-xl p-8 flex flex-col items-center text-center border border-amber-500/20">
          <AlertCircle size={40} className="mb-3 text-amber-500/60" />
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Sin registros para este filtro</h3>
          <p className="text-sm text-[var(--muted)] max-w-md mt-1">
            No hay capacitaciones, actividades ni servicios registrados para {periodo} en {ambito}.
            El registro detallado en ADA comenzó en el segundo cuatrimestre de 2026.
          </p>
        </div>
      ) : (
        <>
          {/* 1. Resumen ejecutivo */}
          <Section id="cap-resumen" icon={<ClipboardCheck size={20} />} title="Resumen ejecutivo">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <Kpi label="Participantes en capacitaciones" value={n(k.cap_participantes)} color={COLOR_CAP}
                detail={`${n(k.cap_sesiones)} sesiones en ${n(k.cap_ips)} Infoplazas`} />
              <Kpi label="Horas de formación" value={n(k.cap_horas)} color={COLOR_HORAS}
                detail={`${n(div(Number(k.cap_horas), k.cap_sesiones), 1)} h por sesión`} />
              <Kpi label="Participantes por sesión" value={n(div(k.cap_participantes, k.cap_sesiones), 1)} color={COLOR_CAP}
                detail="Promedio de asistencia" />
              <Kpi label="Participantes en actividades" value={n(k.act_participantes)} color={COLOR_ACT}
                detail={`${n(k.act_cantidad)} actividades en ${n(k.act_ips)} Infoplazas`} />
              <Kpi label="Infoplazas que reportaron" value={pctTxt(k.ips_reportantes, k.ips_activas)} color={COLOR_SRV}
                detail={`${n(k.ips_reportantes)} de ${n(k.ips_activas)} activas`} />
              <Kpi label="Informes entregados" value={n(k.entregados)} color="#eab308"
                detail={`${n(k.pendientes)} pendientes, ${n(k.no_entrega)} sin entrega`} />
            </div>
            <div className="mt-5 rounded-lg border border-[var(--card-border)] p-4 bg-[var(--accent-glow)]">
              <p className="text-sm font-semibold text-[var(--foreground)] mb-2">Lectura del período</p>
              <div className="space-y-2 text-sm text-[var(--foreground)] leading-relaxed max-w-4xl">
                {lectura.map((t, i) => <p key={i}>{t}</p>)}
              </div>
            </div>
          </Section>

          {/* 2. Capacitaciones */}
          <Section id="cap-capacitaciones" icon={<BookOpen size={20} />} title="Capacitaciones"
            subtitle="Participantes, sesiones y horas por categoría, evolución mensual y temas con mayor alcance.">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[var(--foreground)]">Participantes por categoría</p>
                  <button
                    onClick={() => setMostrarTablaCapCat(!mostrarTablaCapCat)}
                    className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {mostrarTablaCapCat ? <EyeOff size={14} /> : <Eye size={14} />}
                    {mostrarTablaCapCat ? 'Ocultar tabla' : 'Ver tabla'}
                  </button>
                </div>
                <HBarChart data={capCat} dataKey="participantes" nameKey="categoria" color={COLOR_CAP} label="Participantes" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[var(--foreground)]">Evolución mensual</p>
                  <button
                    onClick={() => setMostrarTablaCapMes(!mostrarTablaCapMes)}
                    className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {mostrarTablaCapMes ? <EyeOff size={14} /> : <Eye size={14} />}
                    {mostrarTablaCapMes ? 'Ocultar tabla' : 'Ver tabla'}
                  </button>
                </div>
                <div style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={data.cap_por_mes.map((m) => ({ ...m, horas: Number(m.horas), etiqueta: filters.anio ? m.mes : `${m.mes} ${m.anio}` }))}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="etiqueta" stroke="#94a3b8" fontSize={11} />
                      <YAxis yAxisId="l" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => n(v)} />
                      <YAxis yAxisId="r" orientation="right" stroke="#eab308" fontSize={11} tickFormatter={(v) => n(v)} />
                      <Tooltip {...tooltipStyle} formatter={(v) => n(Number(v))} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar yAxisId="l" dataKey="participantes" name="Participantes" fill={COLOR_CAP} radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="l" dataKey="horas" name="Horas" fill={COLOR_HORAS} radius={[4, 4, 0, 0]} />
                      <Line yAxisId="r" type="monotone" dataKey="sesiones" name="Sesiones (eje derecho)" stroke="#eab308" strokeWidth={2} dot />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                {mostrarTablaCapMes && (
                  <div className="mt-4">
                    <DataTable
                      csvFileName="Capacitaciones_Evolucion_Mensual.csv"
                      columns={[
                        { key: 'mes', label: 'Mes' },
                        { key: 'anio', label: 'Año', render: (r) => r.anio || '' },
                        { key: 'sesiones', label: 'Sesiones', align: 'right', render: (r) => n(r.sesiones) },
                        { key: 'participantes', label: 'Participantes', align: 'right', render: (r) => n(r.participantes) },
                        { key: 'horas', label: 'Horas', align: 'right', render: (r) => n(Number(r.horas)) },
                      ]}
                      rows={data.cap_por_mes}
                    />
                  </div>
                )}
              </div>
            </div>

            {mostrarTablaCapCat && (
              <div className="mt-6">
                <DataTable
                  csvFileName="Capacitaciones_por_Categoria.csv"
                  columns={[
                    { key: 'categoria', label: 'Categoría' },
                  { key: 'sesiones', label: 'Sesiones', align: 'right', render: (r) => n(r.sesiones) },
                  { key: 'participantes', label: 'Participantes', align: 'right', render: (r) => n(r.participantes) },
                  { key: 'pct', label: '% del total', align: 'right', render: (r) => `${n(r.pct, 1)}%` },
                  { key: 'horas', label: 'Horas', align: 'right', render: (r) => n(r.horas) },
                  { key: 'part_por_sesion', label: 'Part. por sesión', align: 'right', render: (r) => n(r.part_por_sesion, 1) },
                  { key: 'ips', label: 'Infoplazas', align: 'right', render: (r) => n(r.ips) },
                ]}
                rows={capCat}
                footer={{
                    categoria: 'Total', sesiones: n(k.cap_sesiones), participantes: n(k.cap_participantes), pct: '100%',
                    horas: n(k.cap_horas), part_por_sesion: n(div(k.cap_participantes, k.cap_sesiones), 1), ips: n(k.cap_ips),
                  }}
                />
              </div>
            )}

            {data.temas_top.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-[var(--foreground)] mb-2">Temas con más participantes</p>
                <div data-scroll-table style={{ maxHeight: 360, overflowY: 'auto' }}>
                  <DataTable
                    columns={[
                      { key: 'tema', label: 'Tema' },
                      { key: 'categoria', label: 'Categoría' },
                      { key: 'sesiones', label: 'Sesiones', align: 'right', render: (r) => n(r.sesiones) },
                      { key: 'participantes', label: 'Participantes', align: 'right', render: (r) => n(r.participantes) },
                      { key: 'horas', label: 'Horas', align: 'right', render: (r) => n(Number(r.horas)) },
                      { key: 'ips', label: 'Infoplazas', align: 'right', render: (r) => n(r.ips) },
                    ]}
                    rows={data.temas_top}
                  />
                </div>
              </div>
            )}
          </Section>

          {/* 3. Actividades */}
          <Section id="cap-actividades" icon={<Activity size={20} />} title="Otras actividades"
            subtitle="Actividades comunitarias registradas (reuniones, ferias, cine, trámites, charlas) y su alcance.">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--foreground)]">Participantes por categoría</p>
                <button
                  onClick={() => setMostrarTablaActCat(!mostrarTablaActCat)}
                  className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  {mostrarTablaActCat ? <EyeOff size={14} /> : <Eye size={14} />}
                  {mostrarTablaActCat ? 'Ocultar tabla' : 'Ver tabla'}
                </button>
              </div>
              <HBarChart data={actCat} dataKey="participantes" nameKey="categoria" color={COLOR_ACT} label="Participantes" />
              {mostrarTablaActCat && (
                <DataTable
                  csvFileName="Actividades_por_Categoria.csv"
                  columns={[
                    { key: 'categoria', label: 'Categoría' },
                    { key: 'actividades', label: 'Actividades', align: 'right', render: (r) => n(r.actividades) },
                    { key: 'participantes', label: 'Participantes', align: 'right', render: (r) => n(r.participantes) },
                    { key: 'pct', label: '% del total', align: 'right', render: (r) => `${n(r.pct, 1)}%` },
                    { key: 'part_por_act', label: 'Part. por actividad', align: 'right', render: (r) => n(r.part_por_act, 1) },
                    { key: 'ips', label: 'Infoplazas', align: 'right', render: (r) => n(r.ips) },
                  ]}
                  rows={actCat}
                  footer={{
                    categoria: 'Total', actividades: n(k.act_cantidad), participantes: n(k.act_participantes), pct: '100%',
                    part_por_act: n(div(k.act_participantes, k.act_cantidad), 1), ips: n(k.act_ips),
                  }}
                />
              )}
            </div>
          </Section>

          {/* 4. Servicios */}
          <Section id="cap-servicios" icon={<CheckCircle2 size={20} />} title="Servicios ofrecidos"
            subtitle={`Porcentaje de las ${n(k.srv_ips)} Infoplazas que reportaron servicios que ofrecen cada uno. En promedio, cada Infoplaza ofrece ${n(k.srv_promedio_por_ip, 1)} servicios.`}>
            <div className="space-y-3">
              {serviciosEstandar.map((s) => (
                <div key={s.servicio}>
                  <div className="flex justify-between text-sm text-[var(--foreground)] mb-1 gap-4">
                    <span>{s.servicio}</span>
                    <span className="tabular-nums text-[var(--muted)] whitespace-nowrap">
                      {n(s.ips_ofrecen)} de {n(s.ips_reportan)}{' '}
                      <span className="text-[var(--foreground)] font-semibold ml-1">{n(s.cobertura, 1)}%</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-500/20 overflow-hidden" role="presentation">
                    <div className="h-full rounded-full" style={{ width: `${s.cobertura}%`, backgroundColor: COLOR_SRV }} />
                  </div>
                </div>
              ))}
            </div>

            {serviciosMatriz.regs.length > 1 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-[var(--foreground)] mb-2">Cobertura por regional</p>
                <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[var(--muted)]">
                        <th className="px-3 py-2 text-left font-medium">Servicio</th>
                        {serviciosMatriz.regs.map((r) => <th key={r} className="px-3 py-2 text-right font-medium">{r}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {serviciosEstandar.map((s) => (
                        <tr key={s.servicio} className="border-t border-[var(--card-border)] text-[var(--foreground)]">
                          <td className="px-3 py-1.5">{s.servicio}</td>
                          {serviciosMatriz.regs.map((r) => {
                            const c = serviciosMatriz.map.get(`${r}|${s.servicio.toLowerCase()}`);
                            const v = c ? pct(c.ips_ofrecen, c.ips_reportan) : null;
                            return (
                              <td key={r} className={`px-3 py-1.5 text-right tabular-nums ${v !== null && v < 90 ? 'text-amber-400 font-semibold' : ''}`}>
                                {v === null ? '–' : `${n(v, 1)}%`}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-[var(--muted)] mt-2">En ámbar, coberturas por debajo del 90%.</p>
              </div>
            )}

            {serviciosPersonalizados.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-[var(--foreground)] mb-2">Servicios adicionales declarados por las Infoplazas</p>
                <div className="flex flex-wrap gap-2">
                  {serviciosPersonalizados.slice(0, 40).map((s) => (
                    <span key={s.servicio} className="text-xs px-2.5 py-1 rounded-full border border-[var(--card-border)] text-[var(--foreground)]">
                      {s.servicio} <span className="text-[var(--muted)]">({n(s.ips_ofrecen)})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* 5. Comparativa regional */}
          <Section id="cap-regionales" icon={<MapPinned size={20} />} title="Comparativa entre regionales"
            subtitle="Volumen absoluto y alcance relativo por Infoplaza activa, para comparar regionales de distinto tamaño."
            actions={
              <div className="flex rounded-lg border border-[var(--card-border)] overflow-hidden text-xs" role="group" aria-label="Métrica de las matrices">
                {(['participantes', 'sesiones'] as const).map((mm) => (
                  <button key={mm} onClick={() => setMetricaMatriz(mm)} aria-pressed={metricaMatriz === mm}
                    className={`px-3 py-1.5 ${metricaMatriz === mm ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}>
                    {mm === 'participantes' ? 'Participantes' : 'Sesiones / actividades'}
                  </button>
                ))}
              </div>
            }>
            {regionales.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)] mb-2">Participantes totales</p>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={regionales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="regional" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => n(v)} />
                        <Tooltip {...tooltipStyle} formatter={(v) => n(Number(v))} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="cap_participantes" name="Capacitaciones" fill={COLOR_CAP} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="act_participantes" name="Actividades" fill={COLOR_ACT} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)] mb-2">Participantes por Infoplaza activa</p>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={regionales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="regional" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip {...tooltipStyle} formatter={(v) => n(Number(v), 1)} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="part_cap_por_ip" name="Capacitaciones" fill={COLOR_CAP} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="part_act_por_ip" name="Actividades" fill={COLOR_ACT} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <DataTable
                columns={[
                  { key: 'regional', label: 'Regional' },
                  { key: 'ips_activas', label: 'IP activas', align: 'right', render: (r) => n(r.ips_activas) },
                  { key: 'pct_reportan', label: '% reportan', align: 'right', render: (r) => `${n(r.pct_reportan, 1)}%` },
                  { key: 'entregados', label: 'Entregados', align: 'right', render: (r) => n(r.entregados) },
                  { key: 'pend', label: 'Pend. / sin entrega', align: 'right', render: (r) => `${n(r.pendientes)} / ${n(r.no_entrega)}` },
                  { key: 'cap_sesiones', label: 'Cap. sesiones', align: 'right', render: (r) => n(r.cap_sesiones) },
                  { key: 'cap_participantes', label: 'Cap. participantes', align: 'right', render: (r) => n(r.cap_participantes) },
                  { key: 'cap_horas', label: 'Cap. horas', align: 'right', render: (r) => n(r.cap_horas) },
                  { key: 'pct_ips_capacitan', label: '% IP que capacitan', align: 'right', render: (r) => `${n(r.pct_ips_capacitan, 1)}%` },
                  { key: 'horas_por_ip', label: 'Horas por IP', align: 'right', render: (r) => n(r.horas_por_ip, 1) },
                  { key: 'act_cantidad', label: 'Actividades', align: 'right', render: (r) => n(r.act_cantidad) },
                  { key: 'act_participantes', label: 'Act. participantes', align: 'right', render: (r) => n(r.act_participantes) },
                ]}
                rows={regionales}
                footer={regionales.length > 1 ? {
                  regional: 'Total', ips_activas: n(k.ips_activas), pct_reportan: pctTxt(k.ips_reportantes, k.ips_activas, 1),
                  entregados: n(k.entregados), pend: `${n(k.pendientes)} / ${n(k.no_entrega)}`,
                  cap_sesiones: n(k.cap_sesiones), cap_participantes: n(k.cap_participantes), cap_horas: n(k.cap_horas),
                  pct_ips_capacitan: pctTxt(k.cap_ips, k.ips_activas, 1), horas_por_ip: n(div(Number(k.cap_horas), k.ips_activas), 1),
                  act_cantidad: n(k.act_cantidad), act_participantes: n(k.act_participantes),
                } : undefined}
              />
            </div>

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6 mt-6">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)] mb-2">
                  Capacitaciones por categoría y regional ({metricaMatriz === 'sesiones' ? 'sesiones' : 'participantes'})
                </p>
                <Heatmap data={data.regional_x_cap_categoria} valueKey={metricaMatriz} color={COLOR_CAP} />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)] mb-2">
                  Actividades por categoría y regional ({metricaMatriz === 'sesiones' ? 'actividades' : 'participantes'})
                </p>
                <Heatmap data={data.regional_x_act_categoria} valueKey={metricaMatriz === 'sesiones' ? 'actividades' : 'participantes'} color={COLOR_ACT} />
              </div>
            </div>
          </Section>

          {/* 6. Infoplazas */}
          <Section id="cap-infoplazas" icon={<Building2 size={20} />} title="Infoplazas"
            subtitle="Las Infoplazas con mayor alcance y las activas que no registraron información en el período.">
            <p className="text-sm font-medium text-[var(--foreground)] mb-2">Mayor número de participantes (capacitaciones y actividades)</p>
            <div data-scroll-table style={{ maxHeight: 420, overflowY: 'auto' }}>
              <DataTable
                columns={[
                  { key: 'numero', label: 'N.º', align: 'right' },
                  { key: 'nombre', label: 'Infoplaza' },
                  { key: 'regional', label: 'Regional' },
                  { key: 'distrito', label: 'Distrito' },
                  { key: 'cap_sesiones', label: 'Cap. sesiones', align: 'right', render: (r) => n(r.cap_sesiones) },
                  { key: 'cap_participantes', label: 'Cap. participantes', align: 'right', render: (r) => n(r.cap_participantes) },
                  { key: 'cap_horas', label: 'Cap. horas', align: 'right', render: (r) => n(Number(r.cap_horas)) },
                  { key: 'act_cantidad', label: 'Actividades', align: 'right', render: (r) => n(r.act_cantidad) },
                  { key: 'act_participantes', label: 'Act. participantes', align: 'right', render: (r) => n(r.act_participantes) },
                ]}
                rows={data.top_infoplazas}
              />
            </div>

            <p className="text-sm font-medium text-[var(--foreground)] mt-6 mb-2">
              Activas sin registros en el período ({n(data.ips_sin_reporte.length)})
            </p>
            {data.ips_sin_reporte.length === 0 ? (
              <p className="text-sm text-emerald-400">Todas las Infoplazas activas del filtro registraron información.</p>
            ) : (
              <div data-scroll-table style={{ maxHeight: 320, overflowY: 'auto' }}>
                <DataTable
                  columns={[
                    { key: 'numero', label: 'N.º', align: 'right' },
                    { key: 'nombre', label: 'Infoplaza' },
                    { key: 'regional', label: 'Regional' },
                    { key: 'distrito', label: 'Distrito' },
                    { key: 'estado_entrega', label: 'Estado de entrega', render: (r) => r.estado_entrega || 'Sin registro' },
                    { key: 'motivo', label: 'Motivo', render: (r) => r.motivo || '–' },
                  ]}
                  rows={data.ips_sin_reporte}
                />
              </div>
            )}
            <p className="text-xs text-[var(--muted)] mt-4">
              El Excel completo incluye además el detalle de cada capacitación y actividad, y los totales de todas las Infoplazas.
            </p>
          </Section>
        </>
      )}

      {/* Right Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
          <div className="relative w-full max-w-2xl bg-[#030712] h-full border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertCircle className="text-[#eab308]" size={20} />
                {drawerData?.title}
              </h3>
              <button onClick={() => setIsDrawerOpen(false)} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            {/* Action Bar */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/20">
              <p className="text-sm text-slate-400">Total: <strong className="text-white">{drawerData?.list?.length || 0}</strong> Infoplazas</p>
              <button 
                onClick={() => {
                  if (!drawerData?.list) return;
                  const isNoEntrega = drawerData.type === 'no_entrega';
                  const headers = ['Numero', 'Infoplaza', 'Regional', 'Provincia', 'Distrito', 'Estatus'];
                  if (isNoEntrega) headers.push('Observacion');
                  
                  const rows = drawerData.list.map((ip: any) => {
                    const r = [ip.numero, ip.nombre, ip.regional, ip.provincia, ip.distrito, ip.estado_entrega || 'Pendiente'];
                    if (isNoEntrega) r.push(ip.motivo || '');
                    return r;
                  });
                  
                  const csvContent = [headers.join(',')]
                    .concat(rows.map((row: any[]) => row.map(v => "").join(',')))
                    .join('\n');
                    
                  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${drawerData.title.replace(/\\s+/g, '_')}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors border border-slate-700"
              >
                <FileDown size={16} /> Descargar CSV
              </button>
            </div>
            
            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {drawerData?.list?.map((ip: any) => (
                <div key={ip.numero} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white text-base leading-tight">
                      <span className="text-[#eab308] mr-2">#{ip.numero}</span>
                      {ip.nombre}
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ml-3 ${drawerData.type === 'no_entrega' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {ip.estado_entrega || 'Pendiente'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Regional</p>
                      <p className="text-slate-200 font-medium">{ip.regional}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Provincia</p>
                      <p className="text-slate-200 font-medium">{ip.provincia}</p>
                    </div>
                  </div>
                  
                  {drawerData.type === 'no_entrega' && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Observación</p>
                      <p className="text-slate-300 text-sm italic">{ip.motivo || 'Sin observación'}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
