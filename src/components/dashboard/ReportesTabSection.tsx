'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Search, 
  Download, 
  FileText, 
  Activity, 
  Users, 
  Clock, 
  ShieldCheck, 
  Database,
  TrendingUp,
  MapPin,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Info
} from 'lucide-react';
import { getDashboardData, getSyncPageData, getInfoplazaMensualReport } from '../../app/actions';

interface InfoplazaItem {
  numero: number;
  nombre: string;
  regional: string;
  provincia: string;
  distrito: string;
  corregimiento: string;
}

interface ReportesTabSectionProps {
  allInfoplazas: InfoplazaItem[];
  filters: {
    anio: number;
    mes: string;
    regional: string;
    provincia: string;
    infoplaza: number;
  };
  onFiltersChange: (filters: any) => void;
}

const COLORS = {
  // Servicios
  uso_de_pc: '#3b82f6',
  copia: '#ec4899',
  impresion: '#8b5cf6',
  consulta: '#10b981',
  taller: '#f59e0b',
  reunion: '#06b6d4',
  otros: '#64748b',
  
  // Demografía
  primaria: '#10b981',
  secundaria: '#f59e0b',
  universitario: '#3b82f6',
  docente: '#8b5cf6',
  tercera_edad: '#ec4899',
  publico_general: '#06b6d4'
};

export default function ReportesTabSection({ allInfoplazas, filters, onFiltersChange }: ReportesTabSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIp, setSelectedIp] = useState<InfoplazaItem | null>(null);
  
  const [reportData, setReportData] = useState<any>(null);
  const [syncHistory, setSyncHistory] = useState<any>(null);
  const [monthlyConsolidated, setMonthlyConsolidated] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  // 1. Sincronización en doble vía: del Estado Global (FiltersBar) al Estado Local
  useEffect(() => {
    if (filters.infoplaza !== 0) {
      const ip = allInfoplazas.find(i => i.numero === filters.infoplaza);
      if (ip) {
        setSelectedIp(ip);
        setSearchQuery(`${ip.numero} - ${ip.nombre}`);
      }
    } else {
      setSelectedIp(null);
      setSearchQuery('');
      setReportData(null);
      setSyncHistory(null);
      setMonthlyConsolidated([]);
    }
  }, [filters.infoplaza, allInfoplazas]);

  // Resetear la selección si la regional/provincia activa en los filtros globales cambia
  // y la Infoplaza seleccionada ya no pertenece a esos criterios geográficos
  useEffect(() => {
    if (!selectedIp) return;
    const matchesRegional = !filters.regional || selectedIp.regional.toLowerCase().trim() === filters.regional.toLowerCase().trim();
    const matchesProvincia = !filters.provincia || selectedIp.provincia.toLowerCase().trim() === filters.provincia.toLowerCase().trim();
    
    if (!matchesRegional || !matchesProvincia) {
      onFiltersChange({ ...filters, infoplaza: 0 });
    }
  }, [filters.regional, filters.provincia, selectedIp, filters, onFiltersChange]);

  // Filtrar el catálogo según búsquedas y filtros geográficos heredados (RBAC-Ready)
  const filteredCatalog = useMemo(() => {
    return allInfoplazas.filter(ip => {
      // Filtrar por restricciones geográficas globales heredadas del padre (seguridad y consistencia)
      if (filters.regional && ip.regional.toLowerCase().trim() !== filters.regional.toLowerCase().trim()) return false;
      if (filters.provincia && ip.provincia.toLowerCase().trim() !== filters.provincia.toLowerCase().trim()) return false;

      // Filtrar por query de búsqueda
      if (!searchQuery) return true;
      if (selectedIp && searchQuery === `${selectedIp.numero} - ${selectedIp.nombre}`) return true;
      const q = searchQuery.toLowerCase();
      return (
        ip.nombre.toLowerCase().includes(q) ||
        ip.numero.toString().includes(q) ||
        ip.regional.toLowerCase().includes(q) ||
        ip.provincia.toLowerCase().includes(q)
      );
    });
  }, [allInfoplazas, filters.regional, filters.provincia, searchQuery, selectedIp]);

  // Cargar datos del reporte individual de la Infoplaza seleccionada
  useEffect(() => {
    if (!selectedIp) return;

    startTransition(async () => {
      // Pedimos datos de la RPC general pasándole el ID de la Infoplaza
      const [resData, resSync, resMonthly] = await Promise.all([
        getDashboardData({
          anio: filters.anio,
          mes: filters.mes,
          regional: selectedIp.regional,
          provincia: selectedIp.provincia,
          infoplaza: selectedIp.numero
        }),
        getSyncPageData({
          anio: filters.anio,
          mes: filters.mes,
          regional: selectedIp.regional,
          provincia: selectedIp.provincia,
          infoplaza: selectedIp.numero
        }),
        getInfoplazaMensualReport(selectedIp.numero, filters.anio)
      ]);

      if (resData.success && resData.data) {
        setReportData(resData.data);
      }
      if (resSync.success && resSync.data) {
        setSyncHistory(resSync.data);
      }
      if (resMonthly.success && resMonthly.data) {
        setMonthlyConsolidated(resMonthly.data);
      }
    });
  }, [selectedIp, filters.anio, filters.mes]);

  // Perfilado inteligente de la Infoplaza (Foco Social vs Educativo, Capacitación vs Conectividad)
  const profiling = useMemo(() => {
    if (!reportData) return null;
    
    // 1. Foco Social vs Educativo
    const totalVisits = reportData.visitorKpis?.totalVisitantes || 0;
    const educativeVisits = reportData.visitorKpis?.totalEducativo || 0;
    const isEducative = totalVisits > 0 && (educativeVisits / totalVisits) >= 0.50;

    // 2. Perfil de Servicios (Uso PC + Consultas vs Talleres + Reuniones)
    const pcTotal = reportData.serviceRanking?.find((s: any) => s.servicio === 'USO DE PC')?.total || 0;
    const consultaTotal = reportData.serviceRanking?.find((s: any) => s.servicio === 'CONSULTA')?.total || 0;
    const tallerTotal = reportData.serviceRanking?.find((s: any) => s.servicio === 'TALLER')?.total || 0;
    const reunionTotal = reportData.serviceRanking?.find((s: any) => s.servicio === 'REUNIÓN')?.total || 0;

    const baseDigital = pcTotal + consultaTotal;
    const baseCapacitacion = tallerTotal + reunionTotal;
    const isCapacitacion = baseCapacitacion > baseDigital;

    // 3. Segmento predominante
    const topSegment = reportData.visitorSegments?.reduce((max: any, current: any) => {
      return (current.value > (max?.value || 0)) ? current : max;
    }, null);

    return {
      focoLabel: 'Foco Académico / Educativo',
      focoColor: isEducative ? 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-400' : 'from-indigo-500/10 to-purple-500/10 border-indigo-500/20 text-indigo-400',
      perfilLabel: isCapacitacion ? 'Centro de Capacitación y Taller' : 'Centro de Acceso y Conectividad',
      perfilColor: isCapacitacion ? 'from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-400' : 'from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-400',
      impactoDominante: topSegment && topSegment.value > 0 ? `Concentración de impacto: Estudiantes y usuarios de perfil ${topSegment.name}` : 'Perfil operativo balanceado'
    };
  }, [reportData]);

  // Obtener estado de sincronización de la Infoplaza seleccionada
  const syncState = useMemo(() => {
    if (!syncHistory?.tableRows || syncHistory.tableRows.length === 0) return null;
    return syncHistory.tableRows[0]; // Fila de la Infoplaza actual
  }, [syncHistory]);

  // Resumen Ejecutivo Narrativo autogenerado (Más tipo Informe)
  const resumenNarrativo = useMemo(() => {
    if (!reportData || !selectedIp || !profiling) return '';
    const totalAtenciones = reportData.serviceKpis?.totalAtenciones?.toLocaleString() || '0';
    const servicioLider = reportData.serviceKpis?.servicioLider || 'Ninguno';
    const porcServicio = reportData.serviceKpis?.servicioLiderPorcentaje ? `${reportData.serviceKpis.servicioLiderPorcentaje.toFixed(1)}%` : '0%';
    const syncMsg = syncState?.sync_estado === 'Al día' 
      ? 'se encuentra con su conectividad al día' 
      : `registra un atraso en su sincronización de ${syncState?.dias_sin_sinc ?? 'N/A'} días hábiles, clasificado en estado "${syncState?.sync_estado || 'Sin Reporte'}"`;
    
    return `La Infoplaza #${selectedIp.numero} - ${selectedIp.nombre}, ubicada en el corregimiento de ${selectedIp.corregimiento}, distrito de ${selectedIp.distrito}, provincia de ${selectedIp.provincia} (perteneciente a la Regional ${selectedIp.regional}), presenta un diagnóstico operativo clasificado como un ${profiling.perfilLabel} con un ${profiling.focoLabel}. Durante el periodo analizado, el centro gestionó un total acumulado de ${totalAtenciones} atenciones de servicios. El servicio de mayor demanda corresponde a ${servicioLider}, concentrando el ${porcServicio} del total de las solicitudes de la Infoplaza. En materia de infraestructura y control operativo de red, la Infoplaza ${syncMsg}, registrando en el último corte de conectividad la observación: "${syncState?.observacion || 'Operación ordinaria'}".`;
  }, [reportData, selectedIp, profiling, syncState]);

  // Mix de Servicios formateado para PieChart de Recharts
  const servicesPieData = useMemo(() => {
    if (!reportData?.serviceRanking) return [];
    return reportData.serviceRanking.map((s: any) => {
      const key = s.servicio.toLowerCase().replace(/\s+/g, '_');
      const resolvedColor = (COLORS as any)[key] || COLORS.otros;
      return {
        name: s.servicio,
        value: Number(s.total),
        color: resolvedColor
      };
    });
  }, [reportData]);

  // Desglose de Visitantes por Segmento Educativo y Edad
  const visitorBarData = useMemo(() => {
    if (!reportData?.visitorSegments) return [];
    return reportData.visitorSegments.map((s: any) => {
      const key = s.name.toLowerCase().replace(/\s+/g, '_').replace('público_general', 'publico_general');
      const resolvedColor = (COLORS as any)[key] || COLORS.publico_general;
      return {
        name: s.name,
        Cantidad: Number(s.value),
        color: resolvedColor
      };
    });
  }, [reportData]);

  // Media mensual basada en los meses que reportaron datos reales en el periodo
  const mediaMensualYEducativo = useMemo(() => {
    if (!reportData) return { media: 0, tasaEducativa: 0 };
    
    // Meses con atenciones reales mayores a 0
    const activeMonths = reportData.tendenciaMensual?.filter((m: any) => m.total > 0).length || 1;
    const media = activeMonths > 0 ? (reportData.serviceKpis?.totalAtenciones || 0) / activeMonths : 0;
    
    // Tasa de Impacto Educativo
    const totalVisits = reportData.visitorKpis?.totalVisitantes || 0;
    const educativeVisits = reportData.visitorKpis?.totalEducativo || 0;
    const tasaEducativa = totalVisits > 0 ? (educativeVisits / totalVisits) * 100 : 0;

    return { media, tasaEducativa };
  }, [reportData]);

  const handlePrintReport = () => {
    if (!selectedIp) return;
    window.print();
  };

  const syncStateLabel = syncState?.sync_estado || 'Sin Reporte';

  return (
    <div className="space-y-6">
      {/* Estilo CSS inyectado dinámicamente para forzar formato Letter (8.5x11 in) vertical y evitar saltos de línea feos en tablas */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: letter portrait;
            margin: 18mm 15mm 18mm 15mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            font-size: 11px !important;
          }
          .recharts-responsive-container {
            width: 100% !important;
            height: 180px !important;
          }
        }
      `}} />

      {/* Selector e Indicador de Impresión - Oculto en impresión */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/40 border border-white/5 backdrop-blur-md">
        <div className="flex-1 max-w-md relative">
          <label className="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5">
            Buscador Predictivo de Infoplazas
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Escribí nombre o número de Infoplaza..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all duration-200"
            />
            <Search size={18} className="absolute left-3.5 top-2.5 text-slate-500" />
            
            {/* Buscador predictivo Dropdown */}
            {isDropdownOpen && searchQuery && (
              <div className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 divide-y divide-white/5">
                {filteredCatalog.length > 0 ? (
                  filteredCatalog.slice(0, 10).map((ip) => (
                    <button
                      key={ip.numero}
                      onClick={() => {
                        // Sincronizar en doble vía: actualiza filtros globales y el estado del componente
                        onFiltersChange({ ...filters, regional: ip.regional, provincia: ip.provincia, infoplaza: ip.numero });
                        setSearchQuery(`${ip.numero} - ${ip.nombre}`);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs hover:bg-blue-600/20 text-slate-300 hover:text-white transition-colors flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-200">{ip.numero}</span> &bull; {ip.nombre}
                      </div>
                      <span className="text-[10px] text-[var(--muted)] uppercase font-semibold">{ip.regional}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-[var(--muted)]">
                    No se encontraron Infoplazas autorizadas.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        {selectedIp && reportData && (
          <div className="flex items-end">
            <button
              onClick={handlePrintReport}
              disabled={isPending}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-xs font-bold transition-all duration-200 shadow-lg shadow-blue-500/20"
            >
              <Download size={14} />
              Imprimir Informe (Letter Portrait)
            </button>
          </div>
        )}
      </div>

      {/* Pantalla vacía (Empty State) */}
      {!selectedIp && (
        <Card className="border border-dashed border-white/10 bg-slate-900/20 py-16">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-200">Informe Analítico de Infoplazas</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Buscá una Infoplaza arriba o utilizá los selectores de la barra de filtros superior para cargar el reporte narrativo, estadísticas de demanda y perfilado social.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indicador de carga */}
      {selectedIp && isPending && (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-blue-500" />
          <span className="text-xs font-semibold text-slate-400">Procesando base de datos y consolidando informe...</span>
        </div>
      )}

      {/* Informe Individual Completo */}
      {selectedIp && reportData && !isPending && (
        <div className="space-y-6 print:space-y-6 print:text-black">
          {/* Cabecera del Reporte - Estilo Documental Impresionable */}
          <div className="pb-4 border-b border-white/10 print:border-b-2 print:border-slate-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase print:bg-slate-200 print:text-slate-800 print:border-slate-300">
                  DOCUMENTO ANALÍTICO DE GESTIÓN
                </span>
                <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight mt-1.5 print:text-black print:text-3xl">
                  Informe de Desempeño: Infoplaza #{selectedIp.numero}
                </h1>
                <p className="text-sm text-blue-400 font-semibold mt-0.5 print:text-blue-800">
                  {selectedIp.nombre} &bull; Regional {selectedIp.regional}
                </p>
              </div>
              <div className="text-left sm:text-right text-[10px] text-[var(--muted)] shrink-0 space-y-0.5 print:text-slate-700">
                <p className="font-extrabold">Periodo de Análisis: {filters.mes ? `${filters.mes} ` : 'Año '} {filters.anio}</p>
                <p>Fecha de Emisión: {new Date().toLocaleDateString('es-PA')}</p>
              </div>
            </div>
            <p className="text-xs text-[var(--muted)] mt-2 print:text-slate-600">
              Ubicación física: Corregimiento de {selectedIp.corregimiento}, Distrito de {selectedIp.distrito}, Provincia de {selectedIp.provincia}.
            </p>
          </div>

          {/* Sección 1: Resumen Ejecutivo / Diagnóstico Narrativo */}
          <Card className="border border-white/5 bg-slate-900/10 overflow-hidden print:border-slate-300 print:bg-slate-50">
            <CardHeader className="pb-2 border-b border-white/5 bg-white/5 print:border-slate-300 print:bg-slate-100">
              <CardTitle className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5 print:text-slate-900">
                <Info size={14} className="text-blue-500 print:text-blue-800" />
                Resumen Ejecutivo y Caracterización de Infoplaza
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 text-sm text-slate-300 leading-relaxed space-y-4 print:text-slate-900">
              <p className="font-medium indent-4">
                {resumenNarrativo}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 print:gap-2">
                <div className="text-xs p-3 rounded-lg bg-white/5 border border-white/5 print:border-slate-200 print:bg-white">
                  <span className="font-bold text-slate-200 block print:text-slate-900">Foco Educativo e Impacto Social</span>
                  <p className="text-[var(--muted)] mt-1 print:text-slate-700">
                    La Infoplaza está catalogada con un <span className="font-semibold text-emerald-400 print:text-emerald-800">{profiling?.focoLabel}</span>. {profiling?.impactoDominante}.
                  </p>
                </div>
                <div className="text-xs p-3 rounded-lg bg-white/5 border border-white/5 print:border-slate-200 print:bg-white">
                  <span className="font-bold text-slate-200 block print:text-slate-900">Comportamiento Operativo de Servicios</span>
                  <p className="text-[var(--muted)] mt-1 print:text-slate-700">
                    Orientado como un <span className="font-semibold text-blue-400 print:text-blue-800">{profiling?.perfilLabel}</span>. Registra atenciones en atenciones de PC libres y capacitación.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPIs Analíticos (No redundantes) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
            <Card className="print:border-slate-300">
              <CardContent className="p-4 print:p-2">
                <span className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider print:text-slate-600">Volumen de Demanda</span>
                <h3 className="text-xl font-extrabold text-slate-100 mt-1 print:text-black">
                  {reportData.serviceKpis?.totalAtenciones?.toLocaleString() || 0} atenciones
                </h3>
                <p className="text-[9px] text-blue-400 font-semibold mt-1 print:text-blue-800">
                  Total de atenciones registradas
                </p>
              </CardContent>
            </Card>

            <Card className="print:border-slate-300">
              <CardContent className="p-4 print:p-2">
                <span className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider print:text-slate-600">Promedio Mensual</span>
                <h3 className="text-xl font-extrabold text-slate-100 mt-1 print:text-black">
                  {Math.round(mediaMensualYEducativo.media).toLocaleString()} servicios
                </h3>
                <p className="text-[9px] text-indigo-400 font-semibold mt-1 print:text-indigo-800">
                  Media operativa por mes activo
                </p>
              </CardContent>
            </Card>

            <Card className="print:border-slate-300">
              <CardContent className="p-4 print:p-2">
                <span className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider print:text-slate-600">Servicio Líder</span>
                <h3 className="text-xl font-extrabold text-slate-100 mt-1 truncate print:text-black">
                  {reportData.serviceKpis?.servicioLider || 'Ninguno'}
                </h3>
                <p className="text-[9px] text-[var(--muted)] mt-1 print:text-slate-600">
                  Representa el {reportData.serviceKpis?.servicioLiderPorcentaje ? `${reportData.serviceKpis.servicioLiderPorcentaje.toFixed(1)}%` : '0%'}
                </p>
              </CardContent>
            </Card>

            <Card className="print:border-slate-300">
              <CardContent className="p-4 print:p-2">
                <span className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider print:text-slate-600">Impacto Académico</span>
                <h3 className="text-xl font-extrabold text-slate-100 mt-1 print:text-black">
                  {mediaMensualYEducativo.tasaEducativa.toFixed(1)}% del total
                </h3>
                <p className="text-[9px] text-emerald-400 font-semibold mt-1 print:text-emerald-800">
                  Visitantes con perfil educativo
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos de Servicios y Demografía */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 print:break-after-page">
            {/* Gráfico 1: Evolución Mensual */}
            <Card className="print:border-slate-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5 print:text-slate-800">
                  <Activity size={14} className="text-blue-500 print:text-blue-700" />
                  Tendencia de Comportamiento Mensual
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px] pr-1">
                {reportData.tendenciaMensual?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reportData.tendenciaMensual} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAtencionesLocal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="mes" stroke="#64748b" fontSize={9} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#f1f5f9' }}
                        itemStyle={{ fontSize: '10px', color: '#3b82f6' }}
                      />
                      <Area type="monotone" dataKey="total" name="Atenciones" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorAtencionesLocal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[var(--muted)]">
                    Sin datos en el período.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico 2: Mix de Servicios */}
            <Card className="print:border-slate-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5 print:text-slate-800">
                  <TrendingUp size={14} className="text-purple-500 print:text-purple-700" />
                  Distribución de Servicios Demandados
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px] flex flex-col sm:flex-row items-center justify-center gap-4">
                {servicesPieData.length > 0 ? (
                  <>
                    <div className="w-[110px] h-[110px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={servicesPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={50}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {servicesPieData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 sm:flex sm:flex-col gap-1.5 overflow-y-auto max-h-[190px] w-full text-xs">
                      {servicesPieData.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 truncate print:text-slate-900">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-300 font-medium truncate print:text-slate-700">{item.name}:</span>
                          <span className="text-[var(--muted)] font-bold shrink-0 print:text-slate-900">{item.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-[var(--muted)]">
                    Sin atenciones registradas.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico 3: Perfil Demográfico */}
            <Card className="print:border-slate-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5 print:text-slate-800">
                  <Users size={14} className="text-emerald-500 print:text-emerald-700" />
                  Perfil Demográfico y Segmentos de Impacto
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px] pr-1">
                {visitorBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={visitorBarData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" fontSize={9} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} tickLine={false} width={80} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '10px' }}
                      />
                      <Bar dataKey="Cantidad" radius={[0, 4, 4, 0]}>
                        {visitorBarData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[var(--muted)]">
                    Sin perfil demográfico registrado.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico 4: Sincronización e Historial */}
            <Card className="print:border-slate-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5 print:text-slate-800">
                  <Clock size={14} className="text-amber-500 print:text-amber-700" />
                  Salud Tecnológica e Historial de Sincronización
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px] flex flex-col justify-between gap-4">
                {syncHistory?.complianceTrend && syncHistory.complianceTrend.length > 0 ? (
                  <>
                    <div className="h-[120px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={syncHistory.complianceTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <XAxis dataKey="fecha" stroke="#64748b" fontSize={8} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={9} tickLine={false} domain={[0, 100]} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                          <Area type="monotone" dataKey="cumplimiento" name="Salud %" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.05} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[75px] border border-white/5 bg-white/5 rounded-lg p-2 text-[10px] space-y-1 leading-relaxed text-[var(--muted)] print:text-slate-800 print:border-slate-300">
                      <p className="font-extrabold text-slate-300 border-b border-white/5 pb-0.5 flex items-center gap-1 print:text-slate-900 print:border-slate-300">
                        <AlertCircle size={10} className="text-amber-500" />
                        Incidencias y Conectividad Reciente
                      </p>
                      {syncState ? (
                        <div className="space-y-0.5">
                          <p><span className="font-bold text-slate-200 print:text-slate-900">Observación:</span> {syncState.observacion || 'Operación ordinaria'}</p>
                          <p><span className="font-bold text-slate-200 print:text-slate-900">Atraso actual:</span> {syncState.dias_sin_sinc ?? 'N/A'} días hábiles en sincronización</p>
                        </div>
                      ) : (
                        <p>No se registran incidencias de red vigentes para esta Infoplaza.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[var(--muted)]">
                    Sin registros históricos de red.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* TABLAS INDIVIDUALES (Una debajo de la otra. Oculta el salto y fuerza hojas individuales al imprimir si la tabla no cabe) */}
          <div className="space-y-6 print:space-y-8">
            
            {/* Tabla 1: Distribución Mensual de Visitantes por Sexo */}
            <Card className="border border-white/5 bg-slate-900/10 overflow-hidden print:border-slate-300 print:bg-white print:break-inside-avoid">
              <CardHeader className="pb-2 border-b border-white/5 bg-white/5 print:border-slate-300 print:bg-slate-100">
                <CardTitle className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5 print:text-slate-900">
                  <Users size={14} className="text-emerald-500 print:text-emerald-800" />
                  Matriz Mensual de Visitantes por Género / Sexo ({filters.anio})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 overflow-x-auto print:overflow-visible">
                {monthlyConsolidated.length > 0 ? (
                  <table className="w-full border-collapse text-xs text-left text-slate-300 print:text-slate-900">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 print:border-slate-300 print:bg-slate-50 text-[9px] uppercase font-bold text-[var(--muted)] print:text-slate-700">
                        <th className="p-2 border-r border-white/5 print:border-slate-300">Mes</th>
                        <th className="p-2 text-center">Masculino</th>
                        <th className="p-2 text-center">Femenino</th>
                        <th className="p-2 text-center font-bold bg-white/5 print:bg-slate-100">Total Visitas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 print:divide-slate-200">
                      {monthlyConsolidated.map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] print:hover:bg-transparent transition-colors">
                          <td className="p-2 font-bold border-r border-white/5 print:border-slate-300 text-slate-100 print:text-slate-900">{row.mes}</td>
                          <td className="p-2 text-center">{row.masculino.toLocaleString()}</td>
                          <td className="p-2 text-center">{row.femenino.toLocaleString()}</td>
                          <td className="p-2 text-center font-bold bg-white/5 print:bg-slate-50">{row.total_visitas.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-6 text-xs text-[var(--muted)]">
                    Sin registros demográficos de género cargados.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabla 2: Distribución Mensual de Visitantes por Perfil Educativo / Edad */}
            <Card className="border border-white/5 bg-slate-900/10 overflow-hidden print:border-slate-300 print:bg-white print:break-inside-avoid">
              <CardHeader className="pb-2 border-b border-white/5 bg-white/5 print:border-slate-300 print:bg-slate-100">
                <CardTitle className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5 print:text-slate-900">
                  <BookOpen size={14} className="text-teal-500 print:text-teal-850" />
                  Matriz Mensual de Visitantes por Perfil de Usuario ({filters.anio})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 overflow-x-auto print:overflow-visible">
                {monthlyConsolidated.length > 0 ? (
                  <table className="w-full border-collapse text-xs text-left text-slate-300 print:text-slate-900">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 print:border-slate-300 print:bg-slate-50 text-[9px] uppercase font-bold text-[var(--muted)] print:text-slate-700">
                        <th className="p-2 border-r border-white/5 print:border-slate-300">Mes</th>
                        <th className="p-1.5 text-center">Primaria</th>
                        <th className="p-1.5 text-center">Secundaria</th>
                        <th className="p-1.5 text-center">Universidad</th>
                        <th className="p-1.5 text-center">Docente</th>
                        <th className="p-1.5 text-center">Tercera Edad</th>
                        <th className="p-1.5 text-center">Público Gral</th>
                        <th className="p-1.5 text-center font-bold bg-white/5 print:bg-slate-100">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 print:divide-slate-200">
                      {monthlyConsolidated.map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] print:hover:bg-transparent transition-colors">
                          <td className="p-2 font-bold border-r border-white/5 print:border-slate-300 text-slate-100 print:text-slate-900">{row.mes}</td>
                          <td className="p-1.5 text-center">{row.primaria.toLocaleString()}</td>
                          <td className="p-1.5 text-center">{row.secundaria.toLocaleString()}</td>
                          <td className="p-1.5 text-center">{row.universitario.toLocaleString()}</td>
                          <td className="p-1.5 text-center">{row.docente.toLocaleString()}</td>
                          <td className="p-1.5 text-center">{row.tercera_edad.toLocaleString()}</td>
                          <td className="p-1.5 text-center">{row.publico_general.toLocaleString()}</td>
                          <td className="p-1.5 text-center font-bold bg-white/5 print:bg-slate-50">{row.total_visitas.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-6 text-xs text-[var(--muted)]">
                    Sin registros demográficos de perfiles cargados.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabla 3: Distribución Mensual de Servicios */}
            <Card className="border border-white/5 bg-slate-900/10 overflow-hidden print:border-slate-300 print:bg-white print:break-inside-avoid">
              <CardHeader className="pb-2 border-b border-white/5 bg-white/5 print:border-slate-300 print:bg-slate-100">
                <CardTitle className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5 print:text-slate-900">
                  <Activity size={14} className="text-blue-500 print:text-blue-800" />
                  Matriz Mensual de Servicios Solicitados (Atenciones - {filters.anio})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 overflow-x-auto print:overflow-visible">
                {monthlyConsolidated.length > 0 ? (
                  <table className="w-full border-collapse text-xs text-left text-slate-300 print:text-slate-900">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 print:border-slate-300 print:bg-slate-50 font-semibold text-[8px] uppercase text-[var(--muted)] print:text-slate-700">
                        <th className="p-2 border-r border-white/5 print:border-slate-300">Mes</th>
                        <th className="p-1.5 text-center">Uso PC</th>
                        <th className="p-1.5 text-center">Impresión</th>
                        <th className="p-1.5 text-center">Copia</th>
                        <th className="p-1.5 text-center">Consulta</th>
                        <th className="p-1.5 text-center">Taller</th>
                        <th className="p-1.5 text-center">Reunión</th>
                        <th className="p-1.5 text-center">Otros</th>
                        <th className="p-1.5 text-center font-bold bg-blue-500/10 text-blue-400 border-l border-white/5 print:border-slate-300 print:bg-slate-100 print:text-slate-900">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 print:divide-slate-200">
                      {monthlyConsolidated.map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] print:hover:bg-transparent transition-colors">
                          <td className="p-2 font-bold border-r border-white/5 print:border-slate-300 text-slate-100 print:text-slate-900">{row.mes}</td>
                          <td className="p-1.5 text-center">{row.uso_de_pc.toLocaleString()}</td>
                          <td className="p-1.5 text-center">{row.impresion.toLocaleString()}</td>
                          <td className="p-1.5 text-center">{row.copia.toLocaleString()}</td>
                          <td className="p-1.5 text-center">{row.consulta.toLocaleString()}</td>
                          <td className="p-1.5 text-center">{row.taller.toLocaleString()}</td>
                          <td className="p-1.5 text-center">{row.reunion.toLocaleString()}</td>
                          <td className="p-1.5 text-center">{row.otros.toLocaleString()}</td>
                          <td className="p-1.5 text-center font-bold bg-blue-500/10 text-blue-400 border-l border-white/5 print:border-slate-300 print:bg-blue-50 print:text-blue-900">{row.total_servicios.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-6 text-xs text-[var(--muted)]">
                    Sin atenciones de servicios cargadas.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
