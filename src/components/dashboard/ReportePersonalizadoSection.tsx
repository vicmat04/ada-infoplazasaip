'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { 
  FileSpreadsheet, 
  Download, 
  Filter, 
  Calendar, 
  MapPin, 
  CheckSquare, 
  Square, 
  RefreshCw, 
  Search, 
  Layers, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Database,
  Check
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

// Definición de las Columnas Dinámicas Configurables
interface ColumnOption {
  key: string;
  label: string;
  category: 'identificacion' | 'genero' | 'segmentos' | 'servicios' | 'total';
  defaultSelected: boolean;
}

const COLUMN_OPTIONS: ColumnOption[] = [
  // Identificación (Obligatorias / Recomendadas)
  { key: 'regional', label: 'Regional', category: 'identificacion', defaultSelected: true },
  { key: 'numero_infoplaza', label: 'N° Infoplaza', category: 'identificacion', defaultSelected: true },
  { key: 'nombre_infoplaza', label: 'Infoplaza', category: 'identificacion', defaultSelected: true },
  { key: 'periodo_label', label: 'Año - Mes', category: 'identificacion', defaultSelected: true },
  { key: 'provincia', label: 'Provincia', category: 'identificacion', defaultSelected: true },
  { key: 'distrito', label: 'Distrito', category: 'identificacion', defaultSelected: true },
  { key: 'corregimiento', label: 'Corregimiento', category: 'identificacion', defaultSelected: true },

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

  // Métrica Total (Suma de atenciones reales del periodo, sin duplicidad)
  { key: 'total_visitas', label: 'Total Visitas Reales', category: 'total', defaultSelected: true },
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
    const regs = Array.from(new Set(allInfoplazas.map(ip => ip.regional).filter(Boolean))).sort();
    return regs;
  }, [allInfoplazas]);

  const [selectedRegionales, setSelectedRegionales] = useState<string[]>(['ALL']);

  // Toggle Regionales
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

  // 3. Estado de Columnas Seleccionadas
  const [selectedColumns, setSelectedColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    COLUMN_OPTIONS.forEach(col => {
      initial[col.key] = col.defaultSelected;
    });
    return initial;
  });

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const selectAllColumns = (select: boolean) => {
    const next: Record<string, boolean> = {};
    COLUMN_OPTIONS.forEach(col => {
      next[col.key] = select;
    });
    setSelectedColumns(next);
  };

  // 4. Resultado del Dataset Generado
  const [reportRows, setReportRows] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Paginación de la Vista Previa
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Carga inicial automática al montar el componente
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

  // Columnas activas ordenadas según COLUMN_OPTIONS
  const activeColumns = useMemo(() => {
    return COLUMN_OPTIONS.filter(col => selectedColumns[col.key]);
  }, [selectedColumns]);

  // Filtrar filas por query de búsqueda rápida
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

  // Exportar a CSV
  const handleExportCSV = () => {
    if (reportRows.length === 0 || activeColumns.length === 0) return;

    const headers = activeColumns.map(col => `"${col.label.replace(/"/g, '""')}"`);
    const rows = filteredRows.map(row => {
      return activeColumns.map(col => {
        const val = row[col.key];
        if (typeof val === 'number') return val;
        return `"${String(val ?? '').replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Personalizado_Infoplazas_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* CARD DE CONFIGURACIÓN Y FILTROS AD-HOC */}
      <Card className="bg-[var(--card-bg)] border-[var(--card-border)]">
        <CardHeader className="border-b border-[var(--card-border)] pb-4">
          <CardTitle className="text-lg font-bold text-[var(--foreground)] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="text-blue-500" size={22} />
              Configuración de Reporte Personalizado
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 font-mono">
              Salida: 1 Fila por Mes e Infoplaza
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          {/* 1. SELECCIÓN DE PERÍODO TEMPORAL */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
              <Calendar size={14} className="text-blue-400" /> 1. Período de Tiempo
            </label>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
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
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    periodoTipo === item.id 
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-sm font-bold'
                      : 'bg-[var(--background)] text-[var(--muted)] border-[var(--card-border)] hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Selector de Rango Personalizado */}
            {periodoTipo === 'personalizado' && (
              <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--card-border)] grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                {/* Desde */}
                <div>
                  <span className="text-xs text-[var(--muted)] font-medium block mb-1.5">Desde:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={desdeAnio}
                      onChange={e => setDesdeAnio(Number(e.target.value))}
                      className="bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--foreground)] rounded-lg p-2 focus:outline-none focus:border-blue-500"
                    >
                      {listaAnios.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>

                    <select
                      value={desdeMesNum}
                      onChange={e => setDesdeMesNum(Number(e.target.value))}
                      className="bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--foreground)] rounded-lg p-2 focus:outline-none focus:border-blue-500"
                    >
                      {MESES_NOMBRES.map((m, idx) => (
                        <option key={m} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Hasta */}
                <div>
                  <span className="text-xs text-[var(--muted)] font-medium block mb-1.5">Hasta:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={hastaAnio}
                      onChange={e => setHastaAnio(Number(e.target.value))}
                      className="bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--foreground)] rounded-lg p-2 focus:outline-none focus:border-blue-500"
                    >
                      {listaAnios.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>

                    <select
                      value={hastaMesNum}
                      onChange={e => setHastaMesNum(Number(e.target.value))}
                      className="bg-[var(--card-bg)] border border-[var(--card-border)] text-xs text-[var(--foreground)] rounded-lg p-2 focus:outline-none focus:border-blue-500"
                    >
                      {MESES_NOMBRES.map((m, idx) => (
                        <option key={m} value={idx + 1}>{m}</option>
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
                    : 'bg-[var(--background)] text-[var(--muted)] border-[var(--card-border)] hover:bg-white/5'
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
                        : 'bg-[var(--background)] text-[var(--muted)] border-[var(--card-border)] hover:bg-white/5'
                    }`}
                  >
                    {reg}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. COLUMN PICKER (SELECTOR DE COLUMNAS) */}
          <div className="space-y-3 pt-2 border-t border-[var(--card-border)]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
                <Layers size={14} className="text-emerald-400" /> 3. Selección de Columnas y Métricas
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => selectAllColumns(true)}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Marcar todas
                </button>
                <span className="text-[var(--muted)]">•</span>
                <button
                  onClick={() => selectAllColumns(false)}
                  className="text-xs text-[var(--muted)] hover:underline"
                >
                  Desmarcar todas
                </button>
              </div>
            </div>

            {/* Categorías de Columnas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-[var(--background)] border border-[var(--card-border)]">
              {/* Identificación */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 block pb-1 border-b border-[var(--card-border)]">
                  Ubicación e ID
                </span>
                {COLUMN_OPTIONS.filter(c => c.category === 'identificacion').map(col => (
                  <label key={col.key} className="flex items-center gap-2 text-xs text-[var(--foreground)] cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={!!selectedColumns[col.key]}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0"
                    />
                    {col.label}
                  </label>
                ))}
              </div>

              {/* Demografía / Género */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 block pb-1 border-b border-[var(--card-border)]">
                  Género y Segmentos
                </span>
                {COLUMN_OPTIONS.filter(c => c.category === 'genero' || c.category === 'segmentos').map(col => (
                  <label key={col.key} className="flex items-center gap-2 text-xs text-[var(--foreground)] cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={!!selectedColumns[col.key]}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0"
                    />
                    {col.label}
                  </label>
                ))}
              </div>

              {/* Servicios */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 block pb-1 border-b border-[var(--card-border)]">
                  Uso de Servicios
                </span>
                {COLUMN_OPTIONS.filter(c => c.category === 'servicios').map(col => (
                  <label key={col.key} className="flex items-center gap-2 text-xs text-[var(--foreground)] cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={!!selectedColumns[col.key]}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0"
                    />
                    {col.label}
                  </label>
                ))}
              </div>

              {/* Métrica Total */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-emerald-400 block pb-1 border-b border-[var(--card-border)]">
                  Total de Atenciones
                </span>
                {COLUMN_OPTIONS.filter(c => c.category === 'total').map(col => (
                  <label key={col.key} className="flex items-center gap-2 text-xs text-white font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!selectedColumns[col.key]}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                    />
                    {col.label}
                  </label>
                ))}
                <p className="text-[10px] text-[var(--muted)] leading-tight mt-1">
                  * Suma exacta de visitas/atenciones únicas del período sin duplicar géneros o servicios.
                </p>
              </div>
            </div>
          </div>

          {/* BOTÓN DE GENERACIÓN */}
          <div className="flex justify-end pt-2">
            <button
              onClick={fetchReport}
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <RefreshCw className="animate-spin" size={18} /> Generando Reporte...
                </>
              ) : (
                <>
                  <Filter size={18} /> Aplicar Filtros y Generar Dataset
                </>
              )}
            </button>
          </div>

        </CardContent>
      </Card>

      {/* RESULTADO: LIVE PREVIEW & EXPORTADOR */}
      {hasSearched && (
        <Card className="bg-[var(--card-bg)] border-[var(--card-border)]">
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[var(--card-border)]">
            <div>
              <CardTitle className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                <Database className="text-blue-500" size={18} />
                Resultado del Reporte ({filteredRows.length.toLocaleString()} registros)
              </CardTitle>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Mostrando {paginatedRows.length} filas por página. Infoplazas cerradas excluidas automáticamente.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* Buscador Rápido en Tabla */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={14} />
                <input
                  type="text"
                  placeholder="Filtrar resultado..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Botón Descarga CSV */}
              <button
                onClick={handleExportCSV}
                disabled={reportRows.length === 0 || activeColumns.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50 whitespace-nowrap"
              >
                <Download size={14} /> Exportar a CSV
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            {reportRows.length === 0 ? (
              <div className="p-12 text-center text-xs text-[var(--muted)]">
                No se encontraron registros con los criterios seleccionados.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-[var(--foreground)] border-collapse">
                <thead className="bg-white/5 text-[var(--muted)] uppercase tracking-wider border-b border-[var(--card-border)] font-mono">
                  <tr>
                    {activeColumns.map(col => (
                      <th 
                        key={col.key} 
                        className={`p-3 whitespace-nowrap ${
                          col.category !== 'identificacion' ? 'text-right' : ''
                        } ${col.key === 'total_visitas' ? 'text-emerald-400 font-bold bg-emerald-500/10' : ''}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)] font-mono">
                  {paginatedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      {activeColumns.map(col => {
                        const val = row[col.key];
                        const isNumeric = typeof val === 'number';
                        const isTotal = col.key === 'total_visitas';

                        return (
                          <td 
                            key={col.key} 
                            className={`p-3 whitespace-nowrap ${
                              isNumeric ? 'text-right' : ''
                            } ${isTotal ? 'font-bold text-emerald-400 bg-emerald-500/5' : ''}`}
                          >
                            {isNumeric ? val.toLocaleString() : (val ?? '-')}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>

          {/* Paginador */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[var(--card-border)] flex items-center justify-between text-xs text-[var(--muted)]">
              <div>
                Página <span className="font-bold text-white">{currentPage}</span> de <span className="font-bold text-white">{totalPages}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-[var(--card-border)] hover:bg-white/5 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-[var(--card-border)] hover:bg-white/5 disabled:opacity-30"
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
