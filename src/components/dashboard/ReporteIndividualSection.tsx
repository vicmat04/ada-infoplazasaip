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
  Info,
  Printer
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

interface ReporteIndividualSectionProps {
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

export default function ReporteIndividualSection({ allInfoplazas, filters, onFiltersChange }: ReporteIndividualSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIp, setSelectedIp] = useState<InfoplazaItem | null>(null);
  
  const [reportData, setReportData] = useState<any>(null);
  const [syncHistory, setSyncHistory] = useState<any>(null);
  const [monthlyConsolidated, setMonthlyConsolidated] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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
      focoLabel: isEducative ? 'Foco Académico / Educativo' : 'Foco Social / Comunitario',
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

  // Exportar el Informe Individual a CSV
  const handleExportCSV = () => {
    if (!selectedIp || monthlyConsolidated.length === 0) return;
    
    const headers = [
      'Infoplaza ID', 'Nombre', 'Regional', 'Provincia', 'Distrito', 'Corregimiento',
      'Mes Número', 'Mes', 'Año',
      'Uso PC', 'Copia', 'Impresión', 'Consulta', 'Taller', 'Reunión', 'Otros', 'Total Servicios',
      'Masculino', 'Femenino', 'Primaria', 'Secundaria', 'Universitario', 'Docente', 'Tercera Edad', 'Público General', 'Total Visitantes'
    ];

    const rows = monthlyConsolidated.map(m => [
      selectedIp.numero,
      `"${selectedIp.nombre.replace(/"/g, '""')}"`,
      `"${selectedIp.regional}"`,
      `"${selectedIp.provincia}"`,
      `"${selectedIp.distrito}"`,
      `"${selectedIp.corregimiento}"`,
      m.mes_numero,
      m.mes,
      filters.anio,
      m.uso_de_pc,
      m.copia,
      m.impresion,
      m.consulta,
      m.taller,
      m.reunion,
      m.otros,
      m.total_servicios,
      m.masculino,
      m.femenino,
      m.primaria,
      m.secundaria,
      m.universitario,
      m.docente,
      m.tercera_edad,
      m.publico_general,
      m.total_visitantes
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ficha_Diagnostica_Infoplaza_${selectedIp.numero}_${filters.anio}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    if (!selectedIp) return;
    setIsGeneratingPDF(true);
    
    try {
      // Importación dinámica para evitar errores de SSR en Next.js
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('reporte-pdf-content');
      if (!element) return;
      
      const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `Ficha_Diagnostica_Infoplaza_${selectedIp.numero}_${filters.anio}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true,
          logging: false,
          backgroundColor: '#0f172a' 
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };
      
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error al generar PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Selector Inteligente de Infoplaza */}
      <Card className="bg-[var(--card-bg)] border-[var(--card-border)] relative z-20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                <FileText className="text-blue-500" size={20} />
                Selección de Infoplaza para Diagnóstico
              </h2>
              <p className="text-xs text-[var(--muted)] mt-1">
                Generá informes ejecutivos individuales, diagnósticos de impacto social e historial mensual de cualquier sucursal activa.
              </p>
            </div>

            {/* Buscador / Selector Autocomplete */}
            <div className="relative w-full md:w-96">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por N°, nombre, distrito o regional..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Menú Desplegable Autocomplete */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-2xl z-50 divide-y divide-[var(--card-border)]">
                  {filteredCatalog.length === 0 ? (
                    <div className="p-4 text-xs text-[var(--muted)] text-center">
                      No se encontraron Infoplazas con esos criterios
                    </div>
                  ) : (
                    filteredCatalog.map((ip) => (
                      <button
                        key={ip.numero}
                        onClick={() => {
                          setSelectedIp(ip);
                          setSearchQuery(`${ip.numero} - ${ip.nombre}`);
                          setIsDropdownOpen(false);
                          onFiltersChange({ ...filters, infoplaza: ip.numero });
                        }}
                        className={`w-full text-left p-3 hover:bg-blue-600/10 transition-colors flex items-center justify-between ${
                          selectedIp?.numero === ip.numero ? 'bg-blue-600/15 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div>
                          <div className="text-sm font-semibold text-[var(--foreground)]">
                            #{ip.numero} - {ip.nombre}
                          </div>
                          <div className="text-xs text-[var(--muted)] flex items-center gap-2 mt-0.5">
                            <span>{ip.regional}</span>
                            <span>•</span>
                            <span>{ip.provincia}</span>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">
                          Ver Ficha
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cierre del menú de selección al hacer clic fuera */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}

      {/* 2. Estado Inicial (Sin selección) */}
      {!selectedIp && (
        <div className="p-12 text-center border-2 border-dashed border-[var(--card-border)] rounded-2xl bg-white/[0.01]">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-4">
            <Search size={28} />
          </div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">Ninguna Infoplaza seleccionada</h3>
          <p className="text-sm text-[var(--muted)] max-w-md mx-auto mt-2">
            Escribí el número o nombre de la Infoplaza en el buscador superior para generar su informe individual, diagnóstico operativo y desglose de servicios.
          </p>
        </div>
      )}

      {/* Spinner de carga si está cambiando */}
      {selectedIp && isPending && (
        <div className="p-12 text-center">
          <RefreshCw className="animate-spin text-blue-500 mx-auto mb-3" size={28} />
          <p className="text-sm text-[var(--muted)]">Generando reporte diagnóstico para Infoplaza #{selectedIp.numero}...</p>
        </div>
      )}

      {/* 3. VISTA PRINCIPAL DEL REPORTE INDIVIDUAL */}
      {selectedIp && !isPending && reportData && (
        <div id="reporte-pdf-content" className="space-y-6">
          {/* Header de la Infoplaza Seleccionada */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-slate-900 border border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold">
                  INFOPLAZA #{selectedIp.numero}
                </span>
                <span className="text-xs text-[var(--muted)] flex items-center gap-1">
                  <MapPin size={12} /> {selectedIp.regional}
                </span>
              </div>
              <h1 className="text-2xl font-black text-white mt-1">{selectedIp.nombre}</h1>
              <p className="text-xs text-[var(--muted)] mt-1">
                {selectedIp.provincia} • Distrito de {selectedIp.distrito} • Corregimiento de {selectedIp.corregimiento}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto" data-html2canvas-ignore>
              <button
                onClick={handleExportPDF}
                disabled={isGeneratingPDF}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {isGeneratingPDF ? <RefreshCw size={16} className="animate-spin" /> : <Printer size={16} />}
                {isGeneratingPDF ? 'Generando PDF...' : 'Descargar PDF'}
              </button>
              <button
                onClick={handleExportCSV}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
              >
                <Download size={16} /> CSV
              </button>
            </div>
          </div>

          {/* Cards de Perfilado Inteligente (Diagnóstico) */}
          {profiling && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl border bg-gradient-to-r ${profiling.focoColor}`}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1">
                  <BookOpen size={14} /> Foco Comunitario / Educativo
                </div>
                <div className="text-base font-bold text-white">{profiling.focoLabel}</div>
                <div className="text-xs text-[var(--muted)] mt-1">{profiling.impactoDominante}</div>
              </div>

              <div className={`p-4 rounded-xl border bg-gradient-to-r ${profiling.perfilColor}`}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1">
                  <Activity size={14} /> Perfil Operativo de Servicios
                </div>
                <div className="text-base font-bold text-white">{profiling.perfilLabel}</div>
                <div className="text-xs text-[var(--muted)] mt-1">
                  Basado en la demanda relativa de uso de computadoras vs talleres y reuniones
                </div>
              </div>
            </div>
          )}

          {/* Resumen Ejecutivo Narrativo */}
          <Card className="bg-[var(--card-bg)] border-[var(--card-border)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-2">
                <Info size={16} className="text-blue-400" /> Resumen Ejecutivo Autogenerado
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <p className="text-sm text-[var(--foreground)] leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-[var(--card-border)]">
                {resumenNarrativo}
              </p>
            </CardContent>
          </Card>

          {/* Gráficos de Servicios y Visitantes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 1: Mix de Servicios */}
            <Card className="bg-[var(--card-bg)] border-[var(--card-border)]">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-2">
                  <Activity size={16} className="text-blue-500" /> Distribución de Servicios
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {servicesPieData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-[var(--muted)]">
                    Sin registros de servicios en el período
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={servicesPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {servicesPieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Gráfico 2: Visitantes por Segmento */}
            <Card className="bg-[var(--card-bg)] border-[var(--card-border)]">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-2">
                  <Users size={16} className="text-emerald-500" /> Perfil de Visitantes por Segmento
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {visitorBarData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-[var(--muted)]">
                    Sin registros de demografía en el período
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={visitorBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                      <Bar dataKey="Cantidad" radius={[6, 6, 0, 0]}>
                        {visitorBarData.map((entry: any, index: number) => (
                          <Cell key={`bar-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabla Mensual Consolidada */}
          <Card className="bg-[var(--card-bg)] border-[var(--card-border)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-500" /> Historial Mensual del Año {filters.anio}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--foreground)]">
                <thead className="bg-white/5 text-[var(--muted)] uppercase tracking-wider border-b border-[var(--card-border)]">
                  <tr>
                    <th className="p-3.5">Mes</th>
                    <th className="p-3.5 text-right">Uso PC</th>
                    <th className="p-3.5 text-right">Impresión</th>
                    <th className="p-3.5 text-right">Copias</th>
                    <th className="p-3.5 text-right">Consultas</th>
                    <th className="p-3.5 text-right">Talleres</th>
                    <th className="p-3.5 text-right">Total Servicios</th>
                    <th className="p-3.5 text-right">Masculino</th>
                    <th className="p-3.5 text-right">Femenino</th>
                    <th className="p-3.5 text-right font-bold text-blue-400">Total Visitantes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)] font-mono">
                  {monthlyConsolidated.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-[var(--muted)]">
                        No hay datos registrados en este año para la Infoplaza.
                      </td>
                    </tr>
                  ) : (
                    monthlyConsolidated.map((m) => (
                      <tr key={m.mes_numero} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5 font-sans font-medium text-white">{m.mes}</td>
                        <td className="p-3.5 text-right">{m.uso_de_pc?.toLocaleString() || 0}</td>
                        <td className="p-3.5 text-right">{m.impresion?.toLocaleString() || 0}</td>
                        <td className="p-3.5 text-right">{m.copia?.toLocaleString() || 0}</td>
                        <td className="p-3.5 text-right">{m.consulta?.toLocaleString() || 0}</td>
                        <td className="p-3.5 text-right">{m.taller?.toLocaleString() || 0}</td>
                        <td className="p-3.5 text-right font-bold text-slate-300">{m.total_servicios?.toLocaleString() || 0}</td>
                        <td className="p-3.5 text-right text-blue-400">{m.masculino?.toLocaleString() || 0}</td>
                        <td className="p-3.5 text-right text-pink-400">{m.femenino?.toLocaleString() || 0}</td>
                        <td className="p-3.5 text-right font-bold text-emerald-400 bg-emerald-500/5">{m.total_visitantes?.toLocaleString() || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
