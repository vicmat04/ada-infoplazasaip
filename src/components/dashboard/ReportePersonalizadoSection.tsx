'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import {
  Download, Filter, Calendar, MapPin, RefreshCw, Search, Layers, SlidersHorizontal,
  ChevronLeft, ChevronRight, Database, Lock, Rows3, Check,
} from 'lucide-react';
import { getCustomReportDataV2 } from '../../app/actions';
import type { RangoMeses } from './FiltersBar';
import * as XLSX from 'xlsx';

interface InfoplazaItem {
  numero: number;
  nombre: string;
  regional: string;
  provincia: string;
  distrito: string;
  corregimiento: string;
}

interface ReportePersonalizadoSectionProps {
  allInfoplazas: InfoplazaItem[];
  filters: {
    anio: number; mes: string; regional: string; provincia: string;
    distrito: string; infoplaza: number; cuatrimestre: number;
  };
  rango: RangoMeses | null;
}

/* ───────────────────────── Configuración ───────────────────────── */

type Grupo = 'genero' | 'tipo_usuario' | 'servicios';

const GRUPOS: { id: Grupo; titulo: string; color: string }[] = [
  { id: 'genero', titulo: 'Género', color: '#a78bfa' },
  { id: 'tipo_usuario', titulo: 'Tipo de usuario', color: '#38bdf8' },
  { id: 'servicios', titulo: 'Servicios', color: '#fbbf24' },
];

const METRICAS: { key: string; label: string; grupo: Grupo }[] = [
  { key: 'masculino', label: 'Masculino', grupo: 'genero' },
  { key: 'femenino', label: 'Femenino', grupo: 'genero' },
  { key: 'primaria', label: 'Primaria', grupo: 'tipo_usuario' },
  { key: 'secundaria', label: 'Secundaria', grupo: 'tipo_usuario' },
  { key: 'universitario', label: 'Universitario', grupo: 'tipo_usuario' },
  { key: 'docente', label: 'Docente', grupo: 'tipo_usuario' },
  { key: 'tercera_edad', label: 'Tercera edad', grupo: 'tipo_usuario' },
  { key: 'publico_general', label: 'Público general', grupo: 'tipo_usuario' },
  { key: 'uso_de_pc', label: 'Uso de PC', grupo: 'servicios' },
  { key: 'copia', label: 'Copias', grupo: 'servicios' },
  { key: 'impresion', label: 'Impresión', grupo: 'servicios' },
  { key: 'consulta', label: 'Consultas', grupo: 'servicios' },
  { key: 'taller', label: 'Talleres', grupo: 'servicios' },
  { key: 'reunion', label: 'Reuniones', grupo: 'servicios' },
  { key: 'otros', label: 'Otros servicios', grupo: 'servicios' },
];

const ATAJOS: { id: string; label: string; grupos: Grupo[] }[] = [
  { id: 'completo', label: 'Completo', grupos: ['genero', 'tipo_usuario', 'servicios'] },
  { id: 'genero', label: 'Solo género', grupos: ['genero'] },
  { id: 'tipo', label: 'Solo tipo de usuario', grupos: ['tipo_usuario'] },
  { id: 'servicios', label: 'Solo servicios', grupos: ['servicios'] },
  { id: 'total', label: 'Solo total', grupos: [] },
];

type Nivel = 'mes_ip' | 'ip' | 'provincia' | 'regional';

type Fila = Record<string, string | number | null>;

interface ColFija { key: string; label: string; ancho?: string; numerica?: boolean; ocultarMovil?: boolean }

const NIVELES: { id: Nivel; label: string; ayuda: string; fijas: ColFija[] }[] = [
  {
    id: 'mes_ip', label: 'Mes por Infoplaza', ayuda: 'Una fila por cada Infoplaza y mes.',
    fijas: [
      { key: 'numero_infoplaza', label: 'N.º' },
      { key: 'nombre_infoplaza', label: 'Infoplaza' },
      { key: 'regional', label: 'Regional', ocultarMovil: true },
      { key: 'provincia', label: 'Provincia', ocultarMovil: true },
      { key: 'distrito', label: 'Distrito', ocultarMovil: true },
      { key: 'corregimiento', label: 'Corregimiento', ocultarMovil: true },
      { key: 'anio', label: 'Año' },
      { key: 'mes', label: 'Mes' },
    ],
  },
  {
    id: 'ip', label: 'Infoplaza', ayuda: 'Una fila por Infoplaza con el total del período.',
    fijas: [
      { key: 'numero_infoplaza', label: 'N.º' },
      { key: 'nombre_infoplaza', label: 'Infoplaza' },
      { key: 'regional', label: 'Regional', ocultarMovil: true },
      { key: 'provincia', label: 'Provincia', ocultarMovil: true },
      { key: 'distrito', label: 'Distrito', ocultarMovil: true },
      { key: 'corregimiento', label: 'Corregimiento', ocultarMovil: true },
      { key: 'meses', label: 'Meses con datos', numerica: true },
    ],
  },
  {
    id: 'provincia', label: 'Provincia', ayuda: 'Una fila por provincia con el total del período.',
    fijas: [
      { key: 'regional', label: 'Regional' },
      { key: 'provincia', label: 'Provincia' },
      { key: 'infoplazas', label: 'Infoplazas', numerica: true },
    ],
  },
  {
    id: 'regional', label: 'Regional', ayuda: 'Una fila por regional con el total del período.',
    fijas: [
      { key: 'regional', label: 'Regional' },
      { key: 'infoplazas', label: 'Infoplazas', numerica: true },
    ],
  },
];

const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
const fmt = (v: unknown) => num(v).toLocaleString('es-PA');
const PAGE_SIZE = 15;

/* ───────────────────────── Componente ───────────────────────── */

export default function ReportePersonalizadoSection({ allInfoplazas, filters, rango }: ReportePersonalizadoSectionProps) {
  const [isPending, startTransition] = useTransition();

  // Período y ubicación vienen de la barra de filtros global
  const resumenFiltros = useMemo(() => {
    const mesLabel = (v: number) => `${MESES_NOMBRES[(v % 100) - 1]} ${Math.floor(v / 100)}`;
    let periodo: string;
    if (rango) periodo = `${mesLabel(Math.min(rango.desde, rango.hasta))} a ${mesLabel(Math.max(rango.desde, rango.hasta))}`;
    else if (filters.mes && !filters.mes.startsWith('Q')) periodo = `${filters.mes} ${filters.anio || '(todos los años)'}`;
    else if (filters.cuatrimestre) periodo = `Cuatrimestre ${filters.cuatrimestre} ${filters.anio || '(todos los años)'}`;
    else periodo = filters.anio ? `Año ${filters.anio}` : 'Todos los años';

    const ip = allInfoplazas.find((i) => i.numero === filters.infoplaza);
    const ambito = ip ? `Infoplaza ${ip.numero} - ${ip.nombre}`
      : filters.distrito ? `Distrito de ${filters.distrito}`
      : filters.provincia ? `Provincia de ${filters.provincia}`
      : filters.regional ? `Regional ${filters.regional}`
      : 'Todas las regionales';
    return { periodo, ambito };
  }, [filters, rango, allInfoplazas]);

  /* ── Opciones del reporte ── */
  const [nivel, setNivel] = useState<Nivel>('mes_ip');
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set(METRICAS.map((m) => m.key)));

  const alternar = (key: string) => setSeleccion((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const alternarGrupo = (grupo: Grupo) => setSeleccion((prev) => {
    const keys = METRICAS.filter((m) => m.grupo === grupo).map((m) => m.key);
    const todas = keys.every((k) => prev.has(k));
    const next = new Set(prev);
    keys.forEach((k) => (todas ? next.delete(k) : next.add(k)));
    return next;
  });
  const aplicarAtajo = (grupos: Grupo[]) => setSeleccion(new Set(METRICAS.filter((m) => grupos.includes(m.grupo)).map((m) => m.key)));
  const atajoActivo = ATAJOS.find((a) => {
    const esperadas = METRICAS.filter((m) => a.grupos.includes(m.grupo)).map((m) => m.key);
    return esperadas.length === seleccion.size && esperadas.every((k) => seleccion.has(k));
  })?.id;

  const metricasActivas = useMemo(() => METRICAS.filter((m) => seleccion.has(m.key)), [seleccion]);
  const nivelCfg = NIVELES.find((n) => n.id === nivel)!;

  /* ── Datos ── */
  const [filasBase, setFilasBase] = useState<Fila[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filtrosKey = JSON.stringify({ filters, rango });
  useEffect(() => {
    let vivo = true;
    startTransition(async () => {
      const res = await getCustomReportDataV2({ ...filters, desde: rango?.desde ?? null, hasta: rango?.hasta ?? null });
      if (!vivo) return;
      setFilasBase(res.success ? (res.data as Fila[]) : []);
      setHasSearched(true);
      setCurrentPage(1);
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrosKey]);

  // Totales del período para mostrar junto a cada opción
  const totalesPorMetrica = useMemo(() => {
    const t: Record<string, number> = { total_visitas: 0 };
    METRICAS.forEach((m) => { t[m.key] = 0; });
    filasBase.forEach((f) => {
      METRICAS.forEach((m) => { t[m.key] += num(f[m.key]); });
      t.total_visitas += num(f.total_visitas);
    });
    return t;
  }, [filasBase]);

  // Agregación según el nivel de detalle
  const filasNivel = useMemo<Fila[]>(() => {
    if (nivel === 'mes_ip') return filasBase;
    const clave = (f: Fila) =>
      nivel === 'ip' ? String(f.numero_infoplaza)
      : nivel === 'provincia' ? `${f.regional}|${f.provincia}`
      : String(f.regional);
    const grupos = new Map<string, { fila: Fila; ips: Set<unknown>; meses: Set<string> }>();
    filasBase.forEach((f) => {
      const k = clave(f);
      let g = grupos.get(k);
      if (!g) {
        const base: Fila = {
          regional: f.regional, provincia: f.provincia, distrito: f.distrito, corregimiento: f.corregimiento,
          numero_infoplaza: f.numero_infoplaza, nombre_infoplaza: f.nombre_infoplaza, total_visitas: 0,
        };
        METRICAS.forEach((m) => { base[m.key] = 0; });
        g = { fila: base, ips: new Set(), meses: new Set() };
        grupos.set(k, g);
      }
      METRICAS.forEach((m) => { g!.fila[m.key] = num(g!.fila[m.key]) + num(f[m.key]); });
      g.fila.total_visitas = num(g.fila.total_visitas) + num(f.total_visitas);
      g.ips.add(f.numero_infoplaza);
      g.meses.add(`${f.anio}-${f.mes_numero}`);
    });
    const salida: Fila[] = Array.from(grupos.values()).map((g) => ({ ...g.fila, infoplazas: g.ips.size, meses: g.meses.size }));
    return salida.sort((a, b) =>
      nivel === 'ip'
        ? String(a.regional).localeCompare(String(b.regional)) || num(a.numero_infoplaza) - num(b.numero_infoplaza)
        : String(a.regional).localeCompare(String(b.regional)) || String(a.provincia).localeCompare(String(b.provincia))
    );
  }, [filasBase, nivel]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return filasNivel;
    return filasNivel.filter((row) =>
      ['nombre_infoplaza', 'numero_infoplaza', 'regional', 'provincia', 'distrito', 'corregimiento']
        .some((k) => String(row[k] ?? '').toLowerCase().includes(q))
    );
  }, [filasNivel, searchQuery]);

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  // Totales de lo que se ve (respeta la búsqueda)
  const totalesTabla = useMemo(() => {
    const t: Record<string, number> = { total_visitas: 0 };
    metricasActivas.forEach((m) => { t[m.key] = 0; });
    filteredRows.forEach((f) => {
      metricasActivas.forEach((m) => { t[m.key] += num(f[m.key]); });
      t.total_visitas += num(f.total_visitas);
    });
    return t;
  }, [filteredRows, metricasActivas]);

  /* ── Exportar ── */
  const handleExportExcel = () => {
    if (filteredRows.length === 0) return;
    const cabeceras = [...nivelCfg.fijas.map((c) => c.label), ...metricasActivas.map((m) => m.label), 'Total visitas'];
    const datos = filteredRows.map((row) => [
      ...nivelCfg.fijas.map((c) => (c.numerica ? num(row[c.key]) : row[c.key] ?? '')),
      ...metricasActivas.map((m) => num(row[m.key])),
      num(row.total_visitas),
    ]);
    const filaTotal = [
      'Total', ...nivelCfg.fijas.slice(1).map(() => ''),
      ...metricasActivas.map((m) => totalesTabla[m.key]), totalesTabla.total_visitas,
    ];
    const ws = XLSX.utils.aoa_to_sheet([cabeceras, ...datos, filaTotal]);
    ws['!cols'] = cabeceras.map((c) => ({ wch: Math.max(10, c.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Período', resumenFiltros.periodo],
      ['Ámbito', resumenFiltros.ambito],
      ['Nivel de detalle', nivelCfg.label],
      ['Búsqueda aplicada', searchQuery || '(ninguna)'],
      ['Generado', new Date().toLocaleString('es-PA')],
    ]), 'Filtros');
    const slug = `${nivelCfg.label}_${resumenFiltros.periodo}_${resumenFiltros.ambito}`
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_');
    XLSX.writeFile(wb, `Reporte_Infoplazas_${slug}.xlsx`);
  };

  const columnasTotales = nivelCfg.fijas.length + metricasActivas.length + 1;

  /* ───────────── Render ───────────── */

  return (
    <div className="grid grid-cols-1 min-w-0 gap-6 w-full max-w-full box-border">
      <Card className="animate-fade-in w-full max-w-full box-border overflow-hidden">
        <CardHeader className="border-b border-[var(--card-border)] pb-4">
          <CardTitle className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
            <SlidersHorizontal className="text-blue-500" size={20} />
            Configuración del reporte
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4 space-y-6 w-full max-w-full box-border">
          {/* Filtros aplicados (vienen de la barra superior) */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-[var(--muted)]">
              <Filter size={13} className="text-blue-400" /> Filtros aplicados:
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/15 text-blue-300 border border-blue-500/30 font-medium">
              <Calendar size={12} /> {resumenFiltros.periodo}
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-medium">
              <MapPin size={12} /> {resumenFiltros.ambito}
            </span>
            <span className="text-[var(--muted)]">Se cambian en la barra superior.</span>
          </div>

          {/* 1. Nivel de detalle */}
          <section aria-labelledby="rp-nivel">
            <h4 id="rp-nivel" className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5 mb-2">
              <Rows3 size={14} className="text-blue-400" /> 1. Nivel de detalle
            </h4>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="rp-nivel">
              {NIVELES.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  role="radio"
                  aria-checked={nivel === n.id}
                  onClick={() => { setNivel(n.id); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500
                    ${nivel === n.id ? 'bg-blue-600 border-blue-600 text-white' : 'border-[var(--card-border)] text-[var(--foreground)] hover:bg-white/5'}`}
                >
                  {n.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--muted)] mt-2">{nivelCfg.ayuda}</p>
          </section>

          {/* 2. Columnas */}
          <section aria-labelledby="rp-columnas" className="pt-5 border-t border-[var(--card-border)]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h4 id="rp-columnas" className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                <Layers size={14} className="text-emerald-400" /> 2. Columnas a incluir
                <span className="text-[var(--muted)] font-normal">({metricasActivas.length} de {METRICAS.length})</span>
              </h4>
              <div className="flex flex-wrap gap-1.5" aria-label="Atajos de columnas">
                {ATAJOS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => aplicarAtajo(a.grupos)}
                    aria-pressed={atajoActivo === a.id}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors
                      ${atajoActivo === a.id ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300' : 'border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)]'}`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {GRUPOS.map((g) => {
                const items = METRICAS.filter((m) => m.grupo === g.id);
                const marcadas = items.filter((m) => seleccion.has(m.key)).length;
                const todas = marcadas === items.length;
                return (
                  <div key={g.id} className="rounded-xl border border-[var(--card-border)] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} aria-hidden />
                        {g.titulo}
                        <span className="text-xs font-normal text-[var(--muted)]">{marcadas}/{items.length}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => alternarGrupo(g.id)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        {todas ? 'Quitar todas' : 'Marcar todas'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((m) => {
                        const on = seleccion.has(m.key);
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => alternar(m.key)}
                            aria-pressed={on}
                            title={`Total del período: ${fmt(totalesPorMetrica[m.key])}`}
                            className={`flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-lg border text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500
                              ${on ? 'text-[var(--foreground)] bg-white/[0.06]' : 'text-[var(--muted)] border-[var(--card-border)] hover:bg-white/5'}`}
                            style={on ? { borderColor: `${g.color}80` } : undefined}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded flex items-center justify-center border"
                              style={on ? { backgroundColor: g.color, borderColor: g.color } : { borderColor: 'var(--card-border)' }}
                              aria-hidden
                            >
                              {on && <Check size={10} strokeWidth={3} className="text-slate-900" />}
                            </span>
                            {m.label}
                            {hasSearched && <span className="tabular-nums opacity-60">{fmt(totalesPorMetrica[m.key])}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Columnas fijas según el nivel */}
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)] mt-3">
              <Lock size={12} className="shrink-0" /> Siempre incluidas:
              {[...nivelCfg.fijas.map((c) => c.label), 'Total visitas'].map((l) => (
                <span key={l} className="px-1.5 py-0.5 rounded border border-[var(--card-border)] text-[var(--foreground)]/80">{l}</span>
              ))}
            </p>
          </section>

          {/* Resumen de lo que se va a generar */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs px-3 py-2.5 rounded-xl bg-white/[0.03] border border-[var(--card-border)]">
            {isPending ? (
              <span className="flex items-center gap-2 text-[var(--muted)]"><RefreshCw className="animate-spin" size={13} /> Actualizando datos…</span>
            ) : (
              <span className="text-[var(--foreground)]">
                El reporte tendrá <strong>{filteredRows.length.toLocaleString('es-PA')}</strong> filas y <strong>{columnasTotales}</strong> columnas,
                con <strong>{fmt(totalesPorMetrica.total_visitas)}</strong> visitas en total.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* VISTA TABULAR DEL REPORTE */}
      {hasSearched && (
        <Card className="animate-fade-in w-full max-w-full box-border overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--card-border)]">
            <div>
              <CardTitle className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                <Database className="text-blue-500" size={18} />
                Resultado ({filteredRows.length.toLocaleString('es-PA')} filas, {nivelCfg.label.toLowerCase()})
              </CardTitle>
              <p className="text-xs text-[var(--muted)] mt-1">La última fila suma todo lo que se ve, incluida la búsqueda.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Buscar en el reporte..."
                  aria-label="Buscar en el reporte"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-4 py-2 bg-white/5 border border-[var(--card-border)] rounded-xl text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-[var(--muted)]/60"
                />
              </div>
              <button
                onClick={handleExportExcel}
                disabled={filteredRows.length === 0}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shrink-0"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Exportar Excel</span>
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-white/[0.01]">
                  {nivelCfg.fijas.map((c) => (
                    <th key={c.key} className={`${c.ocultarMovil ? 'hidden md:table-cell' : ''} px-3 sm:px-4 py-3 text-xs font-semibold text-[var(--muted)] whitespace-nowrap ${c.numerica ? 'text-right' : ''}`}>
                      {c.label}
                    </th>
                  ))}
                  {metricasActivas.map((m) => (
                    <th key={m.key} className="px-3 sm:px-4 py-3 text-xs font-semibold text-right text-[var(--muted)] whitespace-nowrap">
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ backgroundColor: GRUPOS.find((g) => g.id === m.grupo)!.color }} aria-hidden />
                      {m.label}
                    </th>
                  ))}
                  <th className="px-3 sm:px-4 py-3 text-xs font-semibold text-right text-emerald-400 bg-emerald-500/10 whitespace-nowrap">Total visitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={columnasTotales} className="px-6 py-12 text-center text-sm text-[var(--muted)]">
                      No se encontraron registros para los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      {nivelCfg.fijas.map((c, i) => (
                        <td
                          key={c.key}
                          className={`${c.ocultarMovil ? 'hidden md:table-cell' : ''} px-3 sm:px-4 py-3 text-sm whitespace-nowrap
                            ${c.numerica ? 'text-right tabular-nums text-[var(--foreground)]' : i <= 1 ? 'font-semibold text-[var(--foreground)]' : 'text-[var(--muted)]'}`}
                        >
                          {c.key === 'numero_infoplaza' ? `#${row[c.key]}` : c.numerica ? fmt(row[c.key]) : row[c.key]}
                        </td>
                      ))}
                      {metricasActivas.map((m) => (
                        <td key={m.key} className="px-3 sm:px-4 py-3 text-sm tabular-nums text-right text-[var(--foreground)]">{fmt(row[m.key])}</td>
                      ))}
                      <td className="px-3 sm:px-4 py-3 text-sm tabular-nums text-right font-bold text-emerald-400 bg-emerald-500/5">{fmt(row.total_visitas)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[var(--card-border)] font-semibold text-[var(--foreground)]">
                    {nivelCfg.fijas.map((c, i) => (
                      <td key={c.key} className={`${c.ocultarMovil ? 'hidden md:table-cell' : ''} px-3 sm:px-4 py-3 text-sm`}>{i === 0 ? 'Total' : ''}</td>
                    ))}
                    {metricasActivas.map((m) => (
                      <td key={m.key} className="px-3 sm:px-4 py-3 text-sm tabular-nums text-right">{fmt(totalesTabla[m.key])}</td>
                    ))}
                    <td className="px-3 sm:px-4 py-3 text-sm tabular-nums text-right text-emerald-400 bg-emerald-500/10">{fmt(totalesTabla.total_visitas)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </CardContent>

          {totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-[var(--card-border)]">
              <span className="text-xs text-[var(--muted)] font-medium">
                Página {currentPage} de {totalPages} ({filteredRows.length.toLocaleString('es-PA')} filas)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Página anterior"
                  className="p-1.5 rounded-lg border border-[var(--card-border)] bg-white/5 text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-40 transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Página siguiente"
                  className="p-1.5 rounded-lg border border-[var(--card-border)] bg-white/5 text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-40 transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
