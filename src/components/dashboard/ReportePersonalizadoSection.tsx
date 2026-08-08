'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { 
  Download, 
  Filter, 
  Calendar, 
  MapPin, 
  RefreshCw, 
  Search, 
  Layers, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Database,
  Info,
  CheckCircle
} from 'lucide-react';
import { getCustomReportData } from '../../app/actions';

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
  availablePeriods: Array<{ anio: number; mes: string }>;
}

// Métricas de datos opcionales a seleccionar por el usuario
// (Ubicación, Período y Total Visitas Reales son columnas FIJAS obligatorias)
interface MetricColumnOption {
  key: string;
  label: string;
  category: 'genero' | 'segmentos' | 'servicios';
  defaultSelected: boolean;
}

const METRIC_COLUMN_OPTIONS: MetricColumnOption[] = [
  // Género
  { key: 'masculino', label: 'Masculino', category: 'genero', defaultSelected: true },
  { key: 'femenino', label: 'Femenino', category: 'genero', defaultSelected: true },

  // Segmentos Educativos / Edad
  { key: 'primaria', label: 'Primaria', category: 'segmentos', defaultSelected: true },
  { key: 'secundaria', label: 'Secundaria', category: 'segmentos', defaultSelected: true },
  { key: 'universitario', label: 'Universitario', category: 'segmentos', defaultSelected: true },
  { key: 'docente', label: 'Docente', category: 'segmentos', defaultSelected: true },
  { key: 'tercera_edad', label: 'Tercera Edad', category: 'segmentos', defaultSelected: true },
  { key: 'publico_general', label: 'Público General', category: 'segmentos', defaultSelected: true },

  // Servicios
  { key: 'uso_de_pc', label: 'Uso de PC', category: 'servicios', defaultSelected: true },
  { key: 'copia', label: 'Copias', category: 'servicios', defaultSelected: true },
  { key: 'impresion', label: 'Impresión', category: 'servicios', defaultSelected: true },
  { key: 'consulta', label: 'Consultas', category: 'servicios', defaultSelected: true },
  { key: 'taller', label: 'Talleres', category: 'servicios', defaultSelected: true },
  { key: 'reunion', label: 'Reuniones', category: 'servicios', defaultSelected: true },
  { key: 'otros', label: 'Otros Servicios', category: 'servicios', defaultSelected: true },
];

const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function ReportePersonalizadoSection({ allInfoplazas, availablePeriods }: ReportePersonalizadoSectionProps) {
  const [isPending, startTransition] = useTransition();

  // 1. Estados de Filtro de Período
  const [periodoTipo, setPeriodoTipo] = useState<'mes_actual' | 'mes_anterior' | 'este_anio' | 'anio_anterior' | 'personalizado'>('mes_actual');
  
  // Años y Meses disponibles dinámicos extraídos de DB
  const listaAnios = useMemo(() => {
    const years = Array.from(new Set(availablePeriods.map(p => p.anio))).sort((a, b) => b - a);
    return years.length > 0 ? years : [2026, 2025, 2024, 2023];
  }, [availablePeriods]);

  const [desdeAnio, setDesdeAnio] = useState<number>(listaAnios[0] || 2026);
  const [desdeMesNum, setDesdeMesNum] = useState<number>(1);
  const [hastaAnio, setHastaAnio] = useState<number>(listaAnios[0] || 2026);
  const [hastaMesNum, setHastaMesNum] = useState<number>(12);

  // 2. Estado de Filtro de Regionales
  const listaRegionales = useMemo(() => {
    return Array.from(new Set(allInfoplazas.map(ip => ip.regional).filter(Boolean))).sort();
  }, [allInfoplazas]);

  const [selectedRegionales, setSelectedRegionales] = useState<string[]>(['ALL']);

  const toggleRegional = (reg: string) => {
    if (reg === 'ALL') {
      setSelectedRegionales(['ALL']);
      return;
    }

    let next = selectedRegionales.filter(r => r !== 'ALL');
    if (next.includes(reg)) {
      next = next.filter(r => r !== reg);
    } else {
      next.push(reg);
    }

    if (next.length === 0 || next.length === listaRegionales.length) {
      setSelectedRegionales(['ALL']);
    } else {
      setSelectedRegionales(next);
    }
  };

  // 3. Estado de Métricas Opcionales Seleccionables
  const [selectedMetrics, setSelectedMetrics] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    METRIC_COLUMN_OPTIONS.forEach(col => {
      initial[col.key] = col.defaultSelected;
    });
    return initial;
  });

  const toggleMetric = (key: string) => {
    setSelectedMetrics(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const selectAllMetrics = (select: boolean) => {
    const next: Record<string, boolean> = {};
    METRIC_COLUMN_OPTIONS.forEach(col => {
      next[col.key] = select;
    });
    setSelectedMetrics(next);
  };

  // 4. Resultado del Dataset Generado
  const [reportRows, setReportRows] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Paginación de la Vista Previa
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Carga inicial al montar el componente
  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = () => {
    startTransition(async () => {
      const res = await getCustomReportData({
        periodoTipo,
        desdeAnio: periodoTipo === 'personalizado' ? desdeAnio : undefined,
        desdeMes: periodoTipo === 'personalizado' ? desdeMesNum : undefined,
        hastaAnio: periodoTipo === 'personalizado' ? hastaAnio : undefined,
        hastaMes: periodoTipo === 'personalizado' ? hastaMesNum : undefined,
        regionales: selectedRegionales
      });

      if (res.success && res.data) {
        setReportRows(res.data);
      } else {
        setReportRows([]);
      }
      setHasSearched(true);
      setCurrentPage(1);
    });
  };

  // Métricas seleccionadas activas
  const activeMetrics = useMemo(() => {
    return METRIC_COLUMN_OPTIONS.filter(col => selectedMetrics[col.key]);
  }, [selectedMetrics]);

  // Filtrar filas por búsqueda rápida
  const filteredRows = useMemo(() => {
    if (!searchQuery) return reportRows;
    const q = searchQuery.toLowerCase().trim();
    return reportRows.filter(row => {
      return (
        row.nombre_infoplaza?.toLowerCase().includes(q) ||
        row.numero_infoplaza?.toString().includes(q) ||
        row.regional?.toLowerCase().includes(q) ||
        row.provincia?.toLowerCase().includes(q) ||
        row.distrito?.toLowerCase().includes(q)
      );
    });
  }, [reportRows, searchQuery]);

  // Paginación
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage]);

  // Exportar a CSV (SIEMPRE incluye Identificación Fija + Métricas Opcionales + Total Visitas Reales al Final)
  const handleExportCSV = () => {
    if (filteredRows.length === 0) return;

    // 1. Cabeceras Fijas Obligatorias de Identificación
    const fixedHeaders = [
      'Regional',
      'Número Infoplaza',
      'Infoplaza',
      'Año',
      'Mes',
      'Provincia',
      'Distrito',
      'Corregimiento'
    ];

    // 2. Cabeceras de métricas desglosadas seleccionadas
    const metricHeaders = activeMetrics.map(m => m.label);

    // 3. Cabecera Fija Obligatoria Final: Total Visitas Reales
    const allHeaders = [...fixedHeaders, ...metricHeaders, 'Total Visitas Reales'].map(h => `"${h.replace(/"/g, '""')}"`);

    // 4. Filas de Datos
    const rows = filteredRows.map(row => {
      const fixedVals = [
        `"${String(row.regional ?? '').replace(/"/g, '""')}"`,
        row.numero_infoplaza,
        `"${String(row.nombre_infoplaza ?? '').replace(/"/g, '""')}"`,
        row.anio,
        `"${String(row.mes ?? '').replace(/"/g, '""')}"`,
        `"${String(row.provincia ?? '').replace(/"/g, '""')}"`,
        `"${String(row.distrito ?? '').replace(/"/g, '""')}"`,
        `"${String(row.corregimiento ?? '').replace(/"/g, '""')}"`
      ];

      const metricVals = activeMetrics.map(m => {
        const val = row[m.key];
        return typeof val === 'number' ? val : 0;
      });

      const totalVal = typeof row.total_visitas === 'number' ? row.total_visitas : 0;

      return [...fixedVals, ...metricVals, totalVal].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [allHeaders.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Consolidado_Infoplazas_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 w-full max-w-full box-border overflow-hidden">
      {/* CARD DE CONFIGURACIÓN Y FILTROS AD-HOC */}
      <Card className="animate-fade-in w-full max-w-full box-border overflow-hidden">
        <CardHeader className="border-b border-[var(--card-border)] pb-4">
          <CardTitle className="text-base font-bold text-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="text-blue-500" size={20} />
              Configuración del Reporte Personalizado
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">
              1 Fila por Mes e Infoplaza
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 space-y-6 w-full max-w-full box-border">
          
          {/* 1. SELECCIÓN DE PERÍODO TEMPORAL */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
              <Calendar size={14} className="text-blue-400" /> 1. Período de Tiempo
            </label>
            
            <div className="flex flex-wrap gap-2 w-full">
              {[
                { id: 'mes_actual', label: 'Mes Actual' },
                { id: 'mes_anterior', label: 'Mes Anterior' },
                { id: 'este_anio', label: 'Este Año' },
                { id: 'anio_anterior', label: 'Año Anterior' },
                { id: 'personalizado', label: 'Personalizado' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setPeriodoTipo(item.id as any)}
                  className={`flex-1 sm:flex-initial min-w-[110px] px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-all text-center whitespace-nowrap ${
                    periodoTipo === item.id 
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-sm font-bold'
                      : 'bg-white/5 text-[var(--muted)] border-[var(--card-border)] hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Selector de Rango Personalizado */}
            {periodoTipo === 'personalizado' && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[var(--card-border)] grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <span className="text-xs text-[var(--muted)] font-medium block mb-1.5">Desde (Año / Mes):</span>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={desdeAnio}
                      onChange={e => setDesdeAnio(Number(e.target.value))}
                      className="bg-white/5 border border-[var(--card-border)] text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                    >
                      {listaAnios.map(a => (
                        <option key={a} value={a} className="bg-slate-900">{a}</option>
                      ))}
                    </select>

                    <select
                      value={desdeMesNum}
                      onChange={e => setDesdeMesNum(Number(e.target.value))}
                      className="bg-white/5 border border-[var(--card-border)] text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                    >
                      {MESES_NOMBRES.map((m, idx) => (
                        <option key={m} value={idx + 1} className="bg-slate-900">{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-[var(--muted)] font-medium block mb-1.5">Hasta (Año / Mes):</span>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={hastaAnio}
                      onChange={e => setHastaAnio(Number(e.target.value))}
                      className="bg-white/5 border border-[var(--card-border)] text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                    >
                      {listaAnios.map(a => (
                        <option key={a} value={a} className="bg-slate-900">{a}</option>
                      ))}
                    </select>

                    <select
                      value={hastaMesNum}
                      onChange={e => setHastaMesNum(Number(e.target.value))}
                      className="bg-white/5 border border-[var(--card-border)] text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                    >
                      {MESES_NOMBRES.map((m, idx) => (
                        <option key={m} value={idx + 1} className="bg-slate-900">{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. SELECCIÓN MULTI-REGIONAL */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
              <MapPin size={14} className="text-indigo-400" /> 2. Cobertura Regional
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleRegional('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  selectedRegionales.includes('ALL')
                    ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40 font-bold'
                    : 'bg-white/5 text-[var(--muted)] border-[var(--card-border)] hover:bg-white/10'
                }`}
              >
                Todas las Regionales
              </button>

              {listaRegionales.map(reg => {
                const isSelected = selectedRegionales.includes('ALL') || selectedRegionales.includes(reg);
                return (
                  <button
                    key={reg}
                    onClick={() => toggleRegional(reg)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-blue-600/15 text-blue-400 border-blue-500/30 font-semibold'
                        : 'bg-white/5 text-[var(--muted)] border-[var(--card-border)] hover:bg-white/10'
                    }`}
                  >
                    {reg}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. AVISO INFORMATIVO DE COLUMNAS OBLIGATORIAS E INAMOVIBLES */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3 text-xs text-blue-300 w-full max-w-full box-border">
            <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
            <div>
              <strong className="text-white block font-semibold mb-0.5">Columnas Fijas Obligatorias:</strong>
              Las columnas <span className="text-white font-mono font-medium">Regional, N° Infoplaza, Infoplaza, Año, Mes, Provincia, Distrito, Corregimiento y Total Visitas Reales</span> son inamovibles y siempre formarán parte del reporte. Usá los checkboxes a continuación para seleccionar qué desglose de datos deseas incluir.
            </div>
          </div>

          {/* 4. MARCAR DÁTOS Y MÉTRICAS DESEADAS */}
          <div className="space-y-3 pt-2 border-t border-[var(--card-border)]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
                <Layers size={14} className="text-emerald-400" /> 3. Marcar Desglose de Datos a Incluir
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectAllMetrics(true)}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Marcar todas
                </button>
                <span className="text-[var(--muted)]">•</span>
                <button
                  onClick={() => selectAllMetrics(false)}
                  className="text-xs text-[var(--muted)] hover:underline"
                >
                  Desmarcar todas
                </button>
              </div>
            </div>

            {/* Categorías de Métricas Opcionales Seleccionables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 rounded-xl bg-white/[0.02] border border-[var(--card-border)] w-full max-w-full box-border">
              {/* Demografía y Segmentos */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 block pb-1 border-b border-[var(--card-border)]">
                  Demografía y Segmentos de Visitantes
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {METRIC_COLUMN_OPTIONS.filter(c => c.category === 'genero' || c.category === 'segmentos').map(col => (
                    <label key={col.key} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={!!selectedMetrics[col.key]}
                        onChange={() => toggleMetric(col.key)}
                        className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Servicios Solicitados */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 block pb-1 border-b border-[var(--card-border)]">
                  Servicios Solicitados
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {METRIC_COLUMN_OPTIONS.filter(c => c.category === 'servicios').map(col => (
                    <label key={col.key} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={!!selectedMetrics[col.key]}
                        onChange={() => toggleMetric(col.key)}
                        className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BOTÓN DE GENERAR DATASET */}
          <div className="flex justify-end pt-2 w-full max-w-full box-border">
            <button
              onClick={fetchReport}
              disabled={isPending}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <RefreshCw className="animate-spin" size={16} /> Generando Reporte...
                </>
              ) : (
                <>
                  <Filter size={16} /> Aplicar Filtros y Generar Dataset
                </>
              )}
            </button>
          </div>

        </CardContent>
      </Card>

      {/* VISTA TABULAR DEL REPORTE */}
      {hasSearched && (
        <Card className="animate-fade-in w-full max-w-full box-border overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--card-border)]">
            <div>
              <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
                <Database className="text-blue-500" size={18} />
                Resultado del Reporte ({filteredRows.length.toLocaleString()} registros)
              </CardTitle>
              <p className="text-xs text-[var(--muted)] mt-1">
                Mostrando {paginatedRows.length} registros por página. Total Visitas Reales incluido como columna fija obligatoria.
              </p>
            </div>

            {/* Acciones de la tabla */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Buscador de resultados */}
              <div className="relative flex-1 sm:flex-none sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Buscar en el reporte..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-white/5 border border-[var(--card-border)] rounded-xl text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-[var(--muted)]/60"
                />
              </div>

              {/* Botón Exportar */}
              <button
                onClick={handleExportCSV}
                disabled={filteredRows.length === 0}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20 shrink-0"
                title="Exportar reporte completo con todas las columnas obligatorias a CSV"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Exportar CSV</span>
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--card-border)] bg-white/[0.01]">
                    {/* COLUMNAS PRINCIPALES DE UBICACIÓN & TIEMPO */}
                    <th className="px-3 sm:px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">N°</th>
                    <th className="px-3 sm:px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Infoplaza</th>
                    <th className="hidden sm:table-cell px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Regional</th>
                    <th className="hidden md:table-cell px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Provincia</th>
                    <th className="hidden sm:table-cell px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Año</th>
                    <th className="hidden sm:table-cell px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Mes</th>

                    {/* COLUMNAS DE MÉTRICAS SELECCIONADAS OPCIONALES */}
                    {activeMetrics.map(col => (
                      <th 
                        key={col.key} 
                        className="px-3 sm:px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-right text-[var(--muted)]"
                      >
                        {col.label}
                      </th>
                    ))}

                    {/* COLUMNA FIJA OBLIGATORIA FINAL: TOTAL VISITAS REALES */}
                    <th className="px-3 sm:px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-right text-emerald-400 bg-emerald-500/10">
                      Total Visitas Reales
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td 
                        colSpan={7 + activeMetrics.length} 
                        className="px-6 py-12 text-center text-sm text-[var(--muted)]"
                      >
                        No se encontraron registros para los criterios aplicados.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                        {/* DATOS DE UBICACIÓN & TIEMPO */}
                        <td className="px-3 sm:px-6 py-3.5 text-sm font-bold text-slate-300">#{row.numero_infoplaza}</td>
                        <td className="px-3 sm:px-6 py-3.5 text-sm font-semibold text-slate-100 max-w-[140px] sm:max-w-none truncate sm:whitespace-normal" title={row.nombre_infoplaza}>
                          {row.nombre_infoplaza}
                        </td>
                        <td className="hidden sm:table-cell px-6 py-3.5 text-sm text-[var(--muted)]">{row.regional}</td>
                        <td className="hidden md:table-cell px-6 py-3.5 text-sm text-[var(--muted)]">{row.provincia}</td>
                        <td className="hidden sm:table-cell px-6 py-3.5 text-sm font-mono text-slate-300">{row.anio}</td>
                        <td className="hidden sm:table-cell px-6 py-3.5 text-sm font-sans text-slate-300">{row.mes}</td>

                        {/* DATOS DE MÉTRICAS SELECCIONADAS OPCIONALES */}
                        {activeMetrics.map(col => {
                          const val = row[col.key];
                          const isNumeric = typeof val === 'number';

                          return (
                            <td 
                              key={col.key} 
                              className="px-3 sm:px-6 py-3.5 text-sm font-mono text-right text-slate-200"
                            >
                              {isNumeric ? val.toLocaleString() : (val ?? 0)}
                            </td>
                          );
                        })}

                        {/* VALOR DE COLUMNA FIJA OBLIGATORIA FINAL: TOTAL VISITAS REALES */}
                        <td className="px-3 sm:px-6 py-3.5 text-sm font-mono text-right font-extrabold text-emerald-400 bg-emerald-500/5">
                          {(typeof row.total_visitas === 'number' ? row.total_visitas : 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
          </CardContent>

          {/* PAGINACIÓN */}
          {totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-[var(--card-border)] bg-white/[0.005]">
              <span className="text-xs text-[var(--muted)] font-medium">
                Mostrando pág. {currentPage} de {totalPages} ({filteredRows.length} registros)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-[var(--card-border)] bg-white/5 text-[var(--muted)] hover:text-white disabled:opacity-40 transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-[var(--card-border)] bg-white/5 text-[var(--muted)] hover:text-white disabled:opacity-40 transition-all"
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
