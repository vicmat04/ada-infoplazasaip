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
import ExecutiveReportTemplate from './ExecutiveReportTemplate';

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
    distrito: string;
    infoplaza: number;
    cuatrimestre: number;
  };
  onFiltersChange: (filters: ReporteIndividualSectionProps['filters']) => void;
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
  // La Infoplaza se elige en el buscador de la barra de filtros superior
  const selectedIp = useMemo(
    () => (filters.infoplaza ? allInfoplazas.find((i) => i.numero === filters.infoplaza) ?? null : null),
    [filters.infoplaza, allInfoplazas]
  );
  const [reportData, setReportData] = useState<any>(null);
  const [syncHistory, setSyncHistory] = useState<any>(null);
  const [monthlyConsolidated, setMonthlyConsolidated] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Cargar datos del reporte individual de la Infoplaza seleccionada
  useEffect(() => {
    if (!selectedIp) return;

    startTransition(async () => {
      // Pedimos datos de la RPC general pasándole el ID de la Infoplaza
      const [resData, resSync, resMonthly] = await Promise.all([
        getDashboardData({
          anio: filters.anio,
          mes: filters.mes,
          cuatrimestre: filters.cuatrimestre || 0,
          regional: selectedIp.regional,
          provincia: selectedIp.provincia,
          distrito: selectedIp.distrito,
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
  }, [selectedIp, filters.anio, filters.mes, filters.cuatrimestre]);

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
      const { toJpeg } = await import('html-to-image');
      const { default: jsPDF } = await import('jspdf');
      
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10;
      let currentY = margin;
      const renderWidth = pdfWidth - (margin * 2);

      const sections = [
        'pdf-section-header',
        'pdf-section-kpis',
        'pdf-section-resumen',
        'pdf-section-charts',
        'pdf-section-table1',
        'pdf-section-table2',
        'pdf-section-table3',
        'pdf-section-footer'
      ];

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (!element) continue;

        const dataUrl = await toJpeg(element, {
          quality: 0.8,
          pixelRatio: 2, backgroundColor: '#ffffff'
        });

        const imgProps = pdf.getImageProperties(dataUrl);
        const imgRatio = imgProps.width / imgProps.height;
        const renderHeight = renderWidth / imgRatio;

        // Si la sección excede el espacio vertical restante, crear nueva página
        if (currentY + renderHeight > pdfHeight - margin && currentY > margin) {
          pdf.addPage();
          currentY = margin;
        }

        pdf.addImage(dataUrl, 'JPEG', margin, currentY, renderWidth, renderHeight);
        currentY += renderHeight + 5; // 5mm gap
      }
      
      pdf.save(`Ficha_Diagnostica_Infoplaza_${selectedIp.numero}_${filters.anio}.pdf`);
      
    } catch (error) {
      console.error('Error al generar PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Infoplaza seleccionada (se elige en la barra de filtros superior) */}
      {selectedIp && (
        <Card className="bg-[var(--card-bg)] border-[var(--card-border)]">
          <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                <FileText className="text-blue-500" size={20} />
                Infoplaza {selectedIp.numero} - {selectedIp.nombre}
              </h2>
              <p className="text-xs text-[var(--muted)] mt-1 flex items-center gap-1.5">
                <MapPin size={12} /> Regional {selectedIp.regional}, {selectedIp.provincia}, {selectedIp.distrito}
                {selectedIp.corregimiento ? `, ${selectedIp.corregimiento}` : ''}
              </p>
            </div>
            <button
              onClick={() => onFiltersChange({ ...filters, infoplaza: 0, distrito: '' })}
              className="text-xs text-[var(--muted)] hover:text-rose-400 self-start md:self-auto"
            >
              Cambiar Infoplaza
            </button>
          </CardContent>
        </Card>
      )}

      {/* 2. Estado Inicial (Sin selección) */}
      {!selectedIp && (
        <div className="p-12 text-center border-2 border-dashed border-[var(--card-border)] rounded-2xl bg-white/[0.01]">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-4">
            <Search size={28} />
          </div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">Ninguna Infoplaza seleccionada</h3>
          <p className="text-sm text-[var(--muted)] max-w-md mx-auto mt-2">
            Elige la Infoplaza en el filtro &quot;Ubicación&quot; de la barra superior (puedes buscarla por número, nombre o distrito) para generar su informe individual, diagnóstico operativo y desglose de servicios.
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
        <div className="space-y-6">
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

      {/* 4. TEMPLATE OCULTO PARA EXPORTACIÓN A PDF */}
      {selectedIp && !isPending && reportData && profiling && (
        <div className="absolute left-[-9999px] top-[-9999px] overflow-hidden">
          <ExecutiveReportTemplate 
            selectedIp={selectedIp}
            filters={filters}
            reportData={reportData}
            syncState={syncState}
            resumenNarrativo={resumenNarrativo}
            servicesPieData={servicesPieData}
            visitorBarData={visitorBarData}
            monthlyConsolidated={monthlyConsolidated}
          />
        </div>
      )}
    </div>
  );
}
