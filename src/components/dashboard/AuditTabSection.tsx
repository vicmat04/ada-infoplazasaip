'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  FileSpreadsheet, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  SlidersHorizontal,
  RefreshCw,
  Eye,
  FileCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { getSyncPageData, getAuditReportData } from '../../app/actions';

interface InfoplazaItem {
  numero: number;
  nombre: string;
  regional: string;
  provincia: string;
}

interface PeriodoItem {
  anio: number;
  mes: string;
}

interface AuditTabSectionProps {
  allInfoplazas: InfoplazaItem[];
  availablePeriods: PeriodoItem[];
  onViewDetail: (row: any) => void;
}

export default function AuditTabSection({ 
  allInfoplazas, 
  availablePeriods, 
  onViewDetail 
}: AuditTabSectionProps) {
  // Filtros locales independientes sin hardcodeo
  const [localFilters, setLocalFilters] = useState({
    anio: new Date().getFullYear(),
    mes: [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ][new Date().getMonth()],
    regional: '',
    provincia: '',
    infoplaza: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [ultimoCorteDate, setUltimoCorteDate] = useState<string | null>(null);
  const [firstReportMap, setFirstReportMap] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Estados de colapso para las tres tablas (inician contraídas por defecto)
  const [table1Open, setTable1Open] = useState(false);
  const [table2Open, setTable2Open] = useState(false);
  const [table3Open, setTable3Open] = useState(false);

  // Inicializar año y mes a partir de la fecha actual y periodos disponibles
  useEffect(() => {
    if (availablePeriods.length > 0) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const mesesOrden = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const currentMonthName = mesesOrden[now.getMonth()];

      // Buscar si el año y mes actual están en la lista
      const periodExists = availablePeriods.some(
        p => p.anio === currentYear && p.mes?.toLowerCase() === currentMonthName.toLowerCase()
      );

      if (periodExists) {
        setLocalFilters(prev => ({
          ...prev,
          anio: currentYear,
          mes: currentMonthName
        }));
      } else {
        // Fallback al último periodo disponible de la base de datos
        const latestPeriod = availablePeriods[0];
        setLocalFilters(prev => ({
          ...prev,
          anio: latestPeriod.anio,
          mes: latestPeriod.mes || ''
        }));
      }
    }
  }, [availablePeriods]);

  // Cargar primera fecha de reporte histórica (ejecuta una sola vez)
  useEffect(() => {
    async function loadFirstReports() {
      const res = await getAuditReportData();
      if (res.success && res.data) {
        setFirstReportMap(res.data);
      }
    }
    loadFirstReports();
  }, []);

  // Cargar datos de sincronización del servidor cuando cambian los filtros locales
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const res = await getSyncPageData(localFilters);
      if (res.success && res.data) {
        setTableRows(res.data.tableRows || []);
        setUltimoCorteDate(res.data.ultimoCorteDate || null);
      }
      setIsLoading(false);
    }
    loadData();
  }, [localFilters]);

  // --- FILTROS DINÁMICOS DE APOYO (AISLADOS DEL GLOBAL) ---

  const aniosDisponibles = useMemo(() => {
    const uniqueAnios = Array.from(new Set(availablePeriods.map((p) => p.anio)))
      .filter((a) => !!a)
      .sort((a, b) => b - a);
    return uniqueAnios;
  }, [availablePeriods]);

  const mesesDisponibles = useMemo(() => {
    const mesesFiltrados = localFilters.anio
      ? availablePeriods.filter((p) => p.anio === localFilters.anio).map((p) => p.mes)
      : Array.from(new Set(availablePeriods.map((p) => p.mes)));

    const mesesOrden = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return mesesOrden.filter((m) => mesesFiltrados.includes(m));
  }, [availablePeriods, localFilters.anio]);

  const regionalesList = useMemo(() => {
    const uniqueRegionales = Array.from(new Set(allInfoplazas.map((ip) => ip.regional).filter(Boolean))).sort();
    return uniqueRegionales;
  }, [allInfoplazas]);

  const provinciasList = useMemo(() => {
    const ipsParaProvincias = localFilters.regional
      ? allInfoplazas.filter((ip) => ip.regional.toLowerCase().trim() === localFilters.regional.toLowerCase().trim())
      : allInfoplazas;

    const uniqueProvincias = Array.from(new Set(ipsParaProvincias.map((ip) => ip.provincia).filter(Boolean))).sort();
    return uniqueProvincias;
  }, [allInfoplazas, localFilters.regional]);

  const infoplazasFiltradasList = useMemo(() => {
    let list = allInfoplazas;
    if (localFilters.regional) {
      list = list.filter((ip) => ip.regional.toLowerCase().trim() === localFilters.regional.toLowerCase().trim());
    }
    if (localFilters.provincia) {
      list = list.filter((ip) => ip.provincia.toLowerCase().trim() === localFilters.provincia.toLowerCase().trim());
    }
    return list.sort((a, b) => a.numero - b.numero);
  }, [allInfoplazas, localFilters.regional, localFilters.provincia]);

  // Manejo de cambios en cascada de filtros
  const handleRegionalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocalFilters(prev => ({
      ...prev,
      regional: e.target.value,
      provincia: '',
      infoplaza: 0
    }));
  };

  const handleProvinciaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocalFilters(prev => ({
      ...prev,
      provincia: e.target.value,
      infoplaza: 0
    }));
  };

  // --- FILTRADO POR BÚSQUEDA ---
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return tableRows;
    const q = searchQuery.toLowerCase().trim();
    return tableRows.filter(row => 
      row.nombre.toLowerCase().includes(q) || 
      row.numero.toString().includes(q) ||
      row.regional.toLowerCase().includes(q) ||
      row.provincia.toLowerCase().includes(q)
    );
  }, [tableRows, searchQuery]);

  // --- CLASIFICACIÓN EN TRES TABLAS (SEGÚN CRITERIO AUDITADO) ---
  
  // 1. Sincronizadas con Registros (Al día y atenciones > 0)
  const sincronizadasConRegistros = useMemo(() => {
    return filteredRows.filter(row => 
      row.dias_sin_sinc !== null && 
      row.dias_sin_sinc <= 10 && 
      (row.atenciones || 0) > 0
    );
  }, [filteredRows]);

  // 2. Sincronizadas sin Registros (Al día y atenciones == 0 o nulo)
  const sincronizadasSinRegistros = useMemo(() => {
    return filteredRows.filter(row => 
      row.dias_sin_sinc !== null && 
      row.dias_sin_sinc <= 10 && 
      !(row.atenciones || 0)
    );
  }, [filteredRows]);

  // 3. Atrasadas / Por revisar (Atraso > 10 días o sin reporte)
  const atrasadasOPorRevisar = useMemo(() => {
    return filteredRows.filter(row => 
      row.dias_sin_sinc === null || 
      row.dias_sin_sinc > 10
    );
  }, [filteredRows]);

  // --- CÁLCULO DE KPIS DE AUDITORÍA ---
  const kpis = useMemo(() => {
    const total = tableRows.length;
    const sincronizadas = tableRows.filter(r => r.dias_sin_sinc !== null && r.dias_sin_sinc <= 10).length;
    const porRevisar = tableRows.filter(r => r.dias_sin_sinc === null || r.dias_sin_sinc > 10).length;
    const conRegistros = tableRows.filter(r => (r.atenciones || 0) > 0).length;
    const sinRegistros = tableRows.filter(r => !(r.atenciones || 0)).length;
    const sincSinDatos = tableRows.filter(r => r.dias_sin_sinc !== null && r.dias_sin_sinc <= 10 && !(r.atenciones || 0)).length;

    return {
      total,
      sincronizadas,
      porRevisar,
      conRegistros,
      sinRegistros,
      sincSinDatos
    };
  }, [tableRows]);

  // --- FORMATEO Y AUXILIARES ---
  const calculateLastSyncDate = (diasSinSinc: number | null, corteDateStr: string | null) => {
    if (diasSinSinc === null || !corteDateStr) return 'Nunca';
    const corteDate = new Date(corteDateStr);
    corteDate.setDate(corteDate.getDate() - diasSinSinc);
    return corteDate.toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatFirstReportDate = (dateStr?: string) => {
    if (!dateStr) return 'Sin registros';
    return new Date(dateStr).toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // --- EXPORTAR A CSV ---
  const handleExportCSV = (title: string, dataRows: any[]) => {
    if (dataRows.length === 0) return;
    
    const headers = [
      'Numero',
      'Infoplaza',
      'Regional',
      'Provincia',
      'Primera fecha de reporte',
      'Ultima Sincronizacion',
      'Atraso (dias)',
      'Registros'
    ];
    
    const rows = dataRows.map(row => {
      const firstReport = firstReportMap[row.numero] 
        ? formatFirstReportDate(firstReportMap[row.numero])
        : 'Sin registros';
        
      const lastSync = calculateLastSyncDate(row.dias_sin_sinc, ultimoCorteDate);
      
      return [
        row.numero,
        `"${row.nombre.replace(/"/g, '""')}"`,
        `"${row.regional.replace(/"/g, '""')}"`,
        `"${row.provincia.replace(/"/g, '""')}"`,
        firstReport,
        lastSync,
        row.dias_sin_sinc !== null ? row.dias_sin_sinc : 'N/A',
        row.atenciones || 0
      ];
    });
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `auditoria_${title.toLowerCase().replace(/\s+/g, '_')}_${localFilters.anio}_${localFilters.mes || 'todos'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. BARRA DE FILTROS LOCALES (INDependientes) */}
      <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-md">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-blue-500" />
            {isLoading && <RefreshCw size={14} className="animate-spin text-blue-400 ml-1" />}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 flex-1 md:max-w-6xl">
            {/* Buscador */}
            <div className="relative col-span-2 sm:col-span-3 lg:col-span-2 lg:max-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por N° o nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs font-semibold text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
            {/* Año */}
            <select
              value={localFilters.anio}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, anio: parseInt(e.target.value, 10) }))}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
            >
              {aniosDisponibles.map(a => (
                <option key={a} value={a} className="bg-slate-950 text-slate-300">Año {a}</option>
              ))}
            </select>

            {/* Mes */}
            <select
              value={localFilters.mes}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, mes: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-950 text-slate-400">Todos los meses</option>
              {mesesDisponibles.map(m => (
                <option key={m} value={m} className="bg-slate-950 text-slate-300">{m}</option>
              ))}
            </select>

            {/* Regional */}
            <select
              value={localFilters.regional}
              onChange={handleRegionalChange}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-950 text-slate-400">Todas las regionales</option>
              {regionalesList.map(r => (
                <option key={r} value={r} className="bg-slate-950 text-slate-300">{r}</option>
              ))}
            </select>

            {/* Provincia */}
            <select
              value={localFilters.provincia}
              onChange={handleProvinciaChange}
              disabled={!localFilters.regional}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="" className="bg-slate-950 text-slate-400">Todas las provincias</option>
              {provinciasList.map(p => (
                <option key={p} value={p} className="bg-slate-950 text-slate-300">{p}</option>
              ))}
            </select>

            {/* Infoplaza */}
            <select
              value={localFilters.infoplaza}
              onChange={(e) => setLocalFilters(prev => ({ ...prev, infoplaza: parseInt(e.target.value, 10) }))}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value={0} className="bg-slate-950 text-slate-400">Todas las plazas</option>
              {infoplazasFiltradasList.map(ip => (
                <option key={ip.numero} value={ip.numero} className="bg-slate-950 text-slate-300">
                  {ip.numero} - {ip.nombre}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 2. KPIs DE CONTROL DE AUDITORÍA */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Sincronizadas al día */}
        <Card className="glass p-4 rounded-xl border border-emerald-500/10 hover:border-emerald-500/20 transition-all">
          <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle size={12} />
            Sincronizadas al Día
          </span>
          <h4 className="text-2xl font-black mt-2 text-slate-100">{kpis.sincronizadas}</h4>
          <p className="text-[9px] text-slate-400 mt-1">Con atraso &lt;= 10 días</p>
        </Card>

        {/* KPI 2: Por revisar */}
        <Card className="glass p-4 rounded-xl border border-amber-500/10 hover:border-amber-500/20 transition-all">
          <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider block flex items-center gap-1">
            <AlertTriangle size={12} />
            Por Revisar
          </span>
          <h4 className="text-2xl font-black mt-2 text-slate-100">{kpis.porRevisar}</h4>
          <p className="text-[9px] text-slate-400 mt-1">Atraso &gt; 10 días o nulo</p>
        </Card>

        {/* KPI 3: Reportaron en periodo */}
        <Card className="glass p-4 rounded-xl border border-blue-500/10 hover:border-blue-500/20 transition-all">
          <span className="text-[10px] text-blue-400 font-black uppercase tracking-wider block flex items-center gap-1">
            <Activity size={12} />
            Con Registros
          </span>
          <h4 className="text-2xl font-black mt-2 text-slate-100">{kpis.conRegistros}</h4>
          <p className="text-[9px] text-slate-400 mt-1">Registraron actividad local</p>
        </Card>

        {/* KPI 4: Sin registros */}
        <Card className="glass p-4 rounded-xl border border-rose-500/10 hover:border-rose-500/20 transition-all">
          <span className="text-[10px] text-rose-400 font-black uppercase tracking-wider block flex items-center gap-1">
            <Clock size={12} />
            Sin Registros
          </span>
          <h4 className="text-2xl font-black mt-2 text-slate-100">{kpis.sinRegistros}</h4>
          <p className="text-[9px] text-slate-400 mt-1">0 atenciones en el mes</p>
        </Card>

        {/* KPI 5: Sincronizadas Sin Datos */}
        <Card className="glass p-4 rounded-xl border border-cyan-500/10 hover:border-cyan-500/20 transition-all">
          <span className="text-[10px] text-cyan-400 font-black uppercase tracking-wider block flex items-center gap-1">
            <FileCheck size={12} />
            Sincronizadas Sin Datos
          </span>
          <h4 className="text-2xl font-black mt-2 text-slate-100">{kpis.sincSinDatos}</h4>
          <p className="text-[9px] text-slate-400 mt-1">Al día con 0 registros</p>
        </Card>
      </div>



      {/* 4. SECCIÓN DE LAS TRES TABLAS */}
      <div className="space-y-8">
        
        {/* TABLA 1: SINCRONIZADAS CON REGISTROS */}
        <Card className="border border-emerald-500/10 bg-emerald-500/[0.005]">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-emerald-500/5">
            <div>
              <CardTitle className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle size={15} />
                1. Sincronizadas Con Registros ({sincronizadasConRegistros.length})
              </CardTitle>
              <p className="text-[9px] text-slate-400 mt-0.5">Infoplazas con respaldos al día que registraron atenciones en el período seleccionado.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportCSV('Sincronizadas_Con_Registros', sincronizadasConRegistros)}
                disabled={sincronizadasConRegistros.length === 0}
                className="px-2.5 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 hover:border-emerald-500/30 text-emerald-400 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet size={12} />
                Exportar
              </button>
              <button
                onClick={() => setTable1Open(!table1Open)}
                className="p-1.5 rounded-lg border border-white/5 hover:border-emerald-500/20 bg-white/5 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                title={table1Open ? "Contraer tabla" : "Expandir tabla"}
              >
                {table1Open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          </CardHeader>
          {table1Open && (
            <CardContent className="p-0 overflow-x-auto">
            {sincronizadasConRegistros.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 w-12 text-center">N°</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400">Infoplaza</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400">Regional</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400">Provincia</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 text-center">Primera Sinc.</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 text-center">Última Sinc.</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 text-center">Atraso</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 text-center">Registros</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 text-center">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sincronizadasConRegistros.map((row, idx) => (
                    <tr key={idx} className="hover:bg-emerald-500/[0.01] transition-colors">
                      <td className="px-4 py-2 text-xs font-bold text-slate-400 text-center">{row.numero}</td>
                      <td className="px-4 py-2 text-xs font-bold text-white max-w-[180px] truncate" title={row.nombre}>{row.nombre}</td>
                      <td className="px-4 py-2 text-xs text-slate-300">{row.regional}</td>
                      <td className="px-4 py-2 text-xs text-slate-300">{row.provincia}</td>
                      <td className="px-4 py-2 text-xs text-slate-400 text-center">{formatFirstReportDate(firstReportMap[row.numero])}</td>
                      <td className="px-4 py-2 text-xs text-slate-300 text-center">{calculateLastSyncDate(row.dias_sin_sinc, ultimoCorteDate)}</td>
                      <td className="px-4 py-2 text-xs font-bold text-emerald-400 text-center bg-emerald-500/5">{row.dias_sin_sinc} d</td>
                      <td className="px-4 py-2 text-xs font-extrabold text-emerald-400 text-center bg-emerald-500/5">{(row.atenciones || 0).toLocaleString()}</td>
                      <td className="px-4 py-2 text-xs text-center">
                        <button onClick={() => onViewDetail(row)} className="p-1 rounded bg-white/5 hover:bg-blue-500/10 text-slate-300 hover:text-blue-400 transition-all cursor-pointer"><Eye size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 font-semibold">Ninguna infoplaza coincide con los criterios de esta tabla.</div>
            )}
          </CardContent>
          )}
        </Card>

        {/* TABLA 2: SINCRONIZADAS SIN REGISTROS */}
        <Card className="border border-cyan-500/10 bg-cyan-500/[0.005]">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-cyan-500/5">
            <div>
              <CardTitle className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck size={15} />
                2. Sincronizadas Sin Registros ({sincronizadasSinRegistros.length})
              </CardTitle>
              <p className="text-[9px] text-slate-400 mt-0.5">Infoplazas con respaldos al día pero con 0 atenciones registradas en el período seleccionado.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportCSV('Sincronizadas_Sin_Registros', sincronizadasSinRegistros)}
                disabled={sincronizadasSinRegistros.length === 0}
                className="px-2.5 py-1 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/20 hover:border-cyan-500/30 text-cyan-400 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet size={12} />
                Exportar
              </button>
              <button
                onClick={() => setTable2Open(!table2Open)}
                className="p-1.5 rounded-lg border border-white/5 hover:border-cyan-500/20 bg-white/5 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                title={table2Open ? "Contraer tabla" : "Expandir tabla"}
              >
                {table2Open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          </CardHeader>
          {table2Open && (
            <CardContent className="p-0 overflow-x-auto">
            {sincronizadasSinRegistros.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 w-12 text-center">N°</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400">Infoplaza</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400">Regional</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400">Provincia</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 text-center">Primera Sinc.</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 text-center">Última Sinc.</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 text-center">Atraso</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 text-center">Registros</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 text-center">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sincronizadasSinRegistros.map((row, idx) => (
                    <tr key={idx} className="hover:bg-cyan-500/[0.01] transition-colors">
                      <td className="px-4 py-2 text-xs font-bold text-slate-400 text-center">{row.numero}</td>
                      <td className="px-4 py-2 text-xs font-bold text-white max-w-[180px] truncate" title={row.nombre}>{row.nombre}</td>
                      <td className="px-4 py-2 text-xs text-slate-300">{row.regional}</td>
                      <td className="px-4 py-2 text-xs text-slate-300">{row.provincia}</td>
                      <td className="px-4 py-2 text-xs text-slate-400 text-center">{formatFirstReportDate(firstReportMap[row.numero])}</td>
                      <td className="px-4 py-2 text-xs text-slate-300 text-center">{calculateLastSyncDate(row.dias_sin_sinc, ultimoCorteDate)}</td>
                      <td className="px-4 py-2 text-xs font-bold text-cyan-400 text-center bg-cyan-500/5">{row.dias_sin_sinc} d</td>
                      <td className="px-4 py-2 text-xs font-extrabold text-cyan-400 text-center bg-cyan-500/5">0</td>
                      <td className="px-4 py-2 text-xs text-center">
                        <button onClick={() => onViewDetail(row)} className="p-1 rounded bg-white/5 hover:bg-blue-500/10 text-slate-300 hover:text-blue-400 transition-all cursor-pointer"><Eye size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 font-semibold">Ninguna infoplaza coincide con los criterios de esta tabla.</div>
            )}
          </CardContent>
          )}
        </Card>

        {/* TABLA 3: ATRASADAS / POR REVISAR */}
        <Card className="border border-amber-500/10 bg-amber-500/[0.005]">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-amber-500/5">
            <div>
              <CardTitle className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={15} />
                3. Atrasadas / Por Revisar ({atrasadasOPorRevisar.length})
              </CardTitle>
              <p className="text-[9px] text-slate-400 mt-0.5">Infoplazas con respaldos atrasados (más de 10 días sin sincronizar) o sin datos históricos de sincronización.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportCSV('Atrasadas_O_Por_Revisar', atrasadasOPorRevisar)}
                disabled={atrasadasOPorRevisar.length === 0}
                className="px-2.5 py-1 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 hover:border-amber-500/30 text-amber-400 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet size={12} />
                Exportar
              </button>
              <button
                onClick={() => setTable3Open(!table3Open)}
                className="p-1.5 rounded-lg border border-white/5 hover:border-amber-500/20 bg-white/5 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                title={table3Open ? "Contraer tabla" : "Expandir tabla"}
              >
                {table3Open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          </CardHeader>
          {table3Open && (
            <CardContent className="p-0 overflow-x-auto">
            {atrasadasOPorRevisar.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 w-12 text-center">N°</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400">Infoplaza</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400">Regional</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400">Provincia</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 text-center">Primera Sinc.</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 text-center">Última Sinc.</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 text-center">Atraso</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 text-center">Registros</th>
                    <th className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 text-center">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {atrasadasOPorRevisar.map((row, idx) => {
                    const isConRegistros = (row.atenciones || 0) > 0;
                    return (
                      <tr key={idx} className="hover:bg-amber-500/[0.01] transition-colors">
                        <td className="px-4 py-2 text-xs font-bold text-slate-400 text-center">{row.numero}</td>
                        <td className="px-4 py-2 text-xs font-bold text-white max-w-[180px] truncate" title={row.nombre}>{row.nombre}</td>
                        <td className="px-4 py-2 text-xs text-slate-300">{row.regional}</td>
                        <td className="px-4 py-2 text-xs text-slate-300">{row.provincia}</td>
                        <td className="px-4 py-2 text-xs text-slate-400 text-center">{formatFirstReportDate(firstReportMap[row.numero])}</td>
                        <td className="px-4 py-2 text-xs text-slate-300 text-center">{calculateLastSyncDate(row.dias_sin_sinc, ultimoCorteDate)}</td>
                        <td className="px-4 py-2 text-xs font-extrabold text-amber-500 text-center bg-amber-500/5">
                          {row.dias_sin_sinc !== null ? `${row.dias_sin_sinc} d` : 'Nunca'}
                        </td>
                        <td className={`px-4 py-2 text-xs font-extrabold text-center bg-amber-500/5 ${isConRegistros ? 'text-emerald-400 font-black' : 'text-slate-500'}`}>
                          {(row.atenciones || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-xs text-center">
                          <button onClick={() => onViewDetail(row)} className="p-1 rounded bg-white/5 hover:bg-blue-500/10 text-slate-300 hover:text-blue-400 transition-all cursor-pointer"><Eye size={12} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 font-semibold">Ninguna infoplaza coincide con los criterios de esta tabla.</div>
            )}
          </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
