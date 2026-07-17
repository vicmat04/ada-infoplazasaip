'use client';

import React, { useState, useMemo } from 'react';
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
  Legend
} from 'recharts';
import { 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  Laptop, 
  BookOpen, 
  Percent, 
  Activity,
  HelpCircle
} from 'lucide-react';

interface ServiciosTabSectionProps {
  data: {
    serviceKpis: {
      totalAtenciones: number;
      promedioAtenciones: number;
      servicioLider: string;
      servicioLiderTotal: number;
      servicioLiderPorcentaje: number;
      crecimientoYTD?: number | null;
    };
    serviciosPorInfoplaza: Array<{
      numero: number;
      nombre: string;
      regional: string;
      provincia: string;
      uso_de_pc: number;
      copia: number;
      impresion: number;
      consulta: number;
      taller: number;
      reunion: number;
      otros: number;
      total: number;
    }>;
    tendenciaServicios: Array<{
      mes: string;
      uso_de_pc: number;
      copia: number;
      impresion: number;
      consulta: number;
      taller: number;
      reunion: number;
      otros: number;
      total: number;
    }>;
    serviciosPorRegional: Array<{
      regional: string;
      uso_de_pc: number;
      copia: number;
      impresion: number;
      consulta: number;
      taller: number;
      reunion: number;
      otros: number;
      total: number;
    }>;
  };
  filters: {
    anio: number;
    mes: string;
    regional: string;
    provincia: string;
    infoplaza: number;
  };
  isLoading?: boolean;
  allInfoplazas?: Array<{
    numero: number;
    nombre: string;
    regional: string;
    provincia: string;
    distrito: string;
    corregimiento: string;
  }>;
}

// Colores de la paleta premium
const COLORS = {
  uso_de_pc: '#3b82f6', // Azul
  copia: '#ec4899',     // Rosa
  impresion: '#8b5cf6', // Morado
  consulta: '#10b981',  // Verde esmeralda
  taller: '#f59e0b',    // Ámbar/Naranja
  reunion: '#06b6d4',   // Celeste/Cian
  otros: '#64748b'      // Gris pizarra
};

// Interface para las propiedades de los Custom Tooltips
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: {
      total?: number;
      [key: string]: unknown;
    };
  }>;
  label?: string;
}

// 1. Componentes Tooltip declarados fuera del renderizado principal (Evita recreación de componentes)
const CustomAreaTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const sortedPayload = [...payload].sort((a, b) => b.value - a.value);
    const totalVal = sortedPayload[0]?.payload?.total || payload.reduce((acc, item) => acc + (item.value || 0), 0);
    return (
      <div className="glass rounded-lg p-3 text-xs border border-white/10 shadow-xl min-w-[200px]">
        <p className="font-bold mb-2 text-slate-200">{label}</p>
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {sortedPayload.map((item, idx) => {
            const pct = totalVal > 0 ? (item.value / totalVal) * 100 : 0;
            return (
              <p key={idx} className="flex justify-between gap-4 font-semibold" style={{ color: item.color }}>
                <span className="capitalize">{item.name}:</span>
                <span className="text-white font-extrabold">
                  {item.value.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">({pct.toFixed(1)}%)</span>
                </span>
              </p>
            );
          })}
          <div className="border-t border-white/5 my-1.5 pt-1.5 flex justify-between text-blue-400 font-black">
            <span>Total Atenciones:</span>
            <span className="text-white font-black">{totalVal.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const totalVal = payload.reduce((acc, item) => acc + (item.value || 0), 0);
    return (
      <div className="glass rounded-lg p-3 text-xs border border-white/10 shadow-xl min-w-[200px]">
        <p className="font-bold mb-2 text-slate-200">{label}</p>
        <div className="space-y-1.5">
          {payload.map((item, idx) => {
            const pct = totalVal > 0 ? (item.value / totalVal) * 100 : 0;
            return (
              <p key={idx} className="flex justify-between gap-4 font-semibold" style={{ color: item.color }}>
                <span>{item.name}:</span>
                <span className="text-white font-bold">
                  {item.value.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">({pct.toFixed(1)}%)</span>
                </span>
              </p>
            );
          })}
          <div className="border-t border-white/5 my-1.5 pt-1.5 flex justify-between text-violet-400 font-extrabold">
            <span>Total Regional:</span>
            <span className="text-white">{totalVal.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function ServiciosTabSection({ 
  data, 
  filters, 
  isLoading = false,
  allInfoplazas = []
}: ServiciosTabSectionProps) {
  // Estados para la tabla matriz
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
    key: 'total',
    direction: 'desc'
  });

  // 2. Cálculos dinámicos agregados para los KPIs basados en la data actual
  const {
    totalAtenciones,
    totalUsoPc,
    pcPct,
    impactoTotal,
    impactoPct,
    diversificacionPct,
    servicioLiderName,
    servicioLiderPct
  } = useMemo(() => {
    const list = data?.serviciosPorInfoplaza || [];
    
    let total = 0;
    let pc = 0;
    let copia = 0;
    let imp = 0;
    let cons = 0;
    let tall = 0;
    let reun = 0;
    let otr = 0;

    list.forEach((item) => {
      total += Number(item.total || 0);
      pc += Number(item.uso_de_pc || 0);
      copia += Number(item.copia || 0);
      imp += Number(item.impresion || 0);
      cons += Number(item.consulta || 0);
      tall += Number(item.taller || 0);
      reun += Number(item.reunion || 0);
      otr += Number(item.otros || 0);
    });

    const pcPercent = total > 0 ? (pc / total) * 100 : 0;
    const impacTotal = tall;
    const impacPercent = total > 0 ? (impacTotal / total) * 100 : 0;
    const divPercent = total > 0 ? ((total - pc) / total) * 100 : 0;

    const ranking = [
      { name: 'Uso de PC', val: pc },
      { name: 'Copia', val: copia },
      { name: 'Impresión', val: imp },
      { name: 'Consulta', val: cons },
      { name: 'Taller', val: tall },
      { name: 'Reunión', val: reun },
      { name: 'Otros', val: otr }
    ].sort((a, b) => b.val - a.val);

    const liderName = ranking[0]?.val > 0 ? ranking[0].name : 'Ninguno';
    const liderPct = total > 0 ? (ranking[0].val / total) * 100 : 0;

    return {
      totalAtenciones: total,
      totalUsoPc: pc,
      pcPct: pcPercent,
      impactoTotal: impacTotal,
      impactoPct: impacPercent,
      diversificacionPct: divPercent,
      servicioLiderName: liderName,
      servicioLiderPct: liderPct
    };
  }, [data?.serviciosPorInfoplaza]);

  // 3. Generación de títulos contextualizados
  const regionalContextText = useMemo(() => {
    if (filters.infoplaza > 0 && data?.serviciosPorInfoplaza?.length > 0) {
      const match = data.serviciosPorInfoplaza.find(ip => ip.numero === filters.infoplaza);
      return match ? `Infoplaza ${match.nombre} (#${match.numero})` : 'Infoplaza Seleccionada';
    }
    if (filters.regional) return `Región ${filters.regional}`;
    if (filters.provincia) return `Provincia de ${filters.provincia}`;
    return 'Total Red Nacional';
  }, [filters, data?.serviciosPorInfoplaza]);

  const periodContextText = useMemo(() => {
    if (filters.anio === 0) return 'Período Plurianual (2023 - 2026)';
    return `${filters.mes ? `${filters.mes} ` : ''}${filters.anio}`;
  }, [filters]);

  // Preparar tendencia para gráficos de Recharts cuando hay un solo mes (para que trace línea y área)
  const displayTrend = useMemo(() => {
    const trend = data?.tendenciaServicios || [];
    if (trend.length === 1) {
      return [
        { mes: '', uso_de_pc: 0, copia: 0, impresion: 0, consulta: 0, taller: 0, reunion: 0, otros: 0, total: 0 },
        { ...trend[0] },
        { mes: '', uso_de_pc: 0, copia: 0, impresion: 0, consulta: 0, taller: 0, reunion: 0, otros: 0, total: 0 }
      ];
    }
    return trend;
  }, [data?.tendenciaServicios]);

  // 4. Lógica de Ordenamiento y Filtrado de la Tabla
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedRows = useMemo(() => {
    const rawList = data?.serviciosPorInfoplaza || [];
    
    // Cruzar con allInfoplazas para obtener el distrito
    const list = rawList.map(item => {
      const match = allInfoplazas?.find(ip => ip.numero === item.numero);
      return {
        ...item,
        distrito: match?.distrito || 'N/A'
      };
    });
    
    // Filtrar localmente por término de búsqueda (Ignora mayúsculas/minúsculas y tildes de forma segura)
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    const searchNormalized = normalize(searchTerm);
    
    let result = list;
    if (searchNormalized) {
      result = list.filter(item => 
        normalize(item.nombre).includes(searchNormalized) || 
        item.numero.toString().includes(searchNormalized) ||
        normalize(item.regional).includes(searchNormalized) ||
        normalize(item.provincia).includes(searchNormalized) ||
        normalize(item.distrito).includes(searchNormalized)
      );
    }

    // Ordenamiento dinámico
    if (sortConfig) {
      result = [...result].sort((a: any, b: any) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        
        if (typeof valA === 'string') {
          return sortConfig.direction === 'asc' 
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        } else {
          return sortConfig.direction === 'asc'
            ? (valA || 0) - (valB || 0)
            : (valB || 0) - (valA || 0);
        }
      });
    }

    return result;
  }, [data?.serviciosPorInfoplaza, searchTerm, sortConfig, allInfoplazas]);

  // Paginación
  const totalRows = filteredAndSortedRows.length;
  const paginatedRows = useMemo(() => {
    return filteredAndSortedRows.slice(0, visibleCount);
  }, [filteredAndSortedRows, visibleCount]);

  // Restablecer cantidad visible al cambiar búsqueda
  React.useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm]);

  // 5. Exportación a CSV
  const handleExportCSV = () => {
    const csvHeaders = [
      'Numero',
      'Nombre',
      'Regional',
      'Provincia',
      'Distrito',
      'Uso de PC',
      'Copia',
      'Impresion',
      'Consulta',
      'Taller',
      'Reunion',
      'Otros',
      'Total Atenciones'
    ];

    const csvRows = filteredAndSortedRows.map(row => [
      row.numero,
      `"${row.nombre.replace(/"/g, '""')}"`,
      `"${row.regional}"`,
      `"${row.provincia}"`,
      `"${(row as any).distrito || 'N/A'}"`,
      row.uso_de_pc,
      row.copia,
      row.impresion,
      row.consulta,
      row.taller,
      row.reunion,
      row.otros,
      row.total
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
      + [csvHeaders.join(','), ...csvRows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    
    // Nombre dinámico basado en filtros para evitar hardcodeo
    const fileName = `Servicios_${filters.regional || 'Nacional'}_${filters.anio}_${filters.mes || 'Anual'}.csv`
      .replace(/\s+/g, '_');
      
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse h-28 bg-white/5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3 h-80 animate-pulse bg-white/5" />
          <Card className="lg:col-span-2 h-80 animate-pulse bg-white/5" />
        </div>
        <Card className="h-96 animate-pulse bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. KPIs Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI: Atenciones Totales */}
        <Card className="glass glass-hover flex flex-col justify-between p-4.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block">Atenciones Totales</span>
            <h4 className="text-2xl font-black mt-2 text-blue-400">{totalAtenciones.toLocaleString()}</h4>
          </div>
          <p className="text-[10px] text-[var(--muted)] border-t border-white/5 pt-2 mt-2 font-medium">
            {regionalContextText}
          </p>
        </Card>

        {/* KPI: Uso de PC */}
        <Card className="glass glass-hover flex flex-col justify-between p-4.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block flex items-center gap-1">
              <Laptop size={12} className="text-blue-500" />
              Demanda Uso de PC
            </span>
            <h4 className="text-2xl font-black mt-2 text-sky-400">{totalUsoPc.toLocaleString()}</h4>
          </div>
          <p className="text-[10px] text-sky-300 font-semibold border-t border-white/5 pt-2 mt-2 flex justify-between items-center">
            <span>Participación:</span>
            <span className="font-extrabold">{pcPct.toFixed(1)}%</span>
          </p>
        </Card>

        {/* KPI: Impacto Comunitario */}
        <Card className="glass glass-hover flex flex-col justify-between p-4.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block flex items-center gap-1">
              <BookOpen size={12} className="text-amber-500" />
              Impacto Comunitario
            </span>
            <h4 className="text-2xl font-black mt-2 text-amber-400">{impactoTotal.toLocaleString()}</h4>
          </div>
          <p className="text-[10px] text-amber-300 font-semibold border-t border-white/5 pt-2 mt-2 flex justify-between items-center">
            <span>Talleres / Capacitaciones:</span>
            <span className="font-extrabold">{impactoPct.toFixed(1)}%</span>
          </p>
        </Card>

        {/* KPI: Servicios Complementarios */}
        <Card className="glass glass-hover flex flex-col justify-between p-4.5 rounded-xl border border-white/10">
          <div>
            <span 
              className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block flex items-center gap-1 cursor-help select-none"
              title="Representa la proporción de atenciones brindadas en servicios con valor agregado que no son el uso básico de computadoras (como talleres, copias, impresiones, etc.)."
            >
              <Percent size={12} className="text-emerald-500" />
              Servicios Complementarios
              <HelpCircle size={10} className="text-slate-500 hover:text-slate-300 transition-colors" />
            </span>
            <h4 className="text-2xl font-black mt-2 text-emerald-400">{diversificacionPct.toFixed(1)}%</h4>
          </div>
          <p className="text-[10px] text-emerald-300 font-semibold border-t border-white/5 pt-2 mt-2 flex justify-between items-center">
            <span>Servicios no-PC:</span>
            <span className="font-extrabold">{(totalAtenciones - totalUsoPc).toLocaleString()}</span>
          </p>
        </Card>

        {/* KPI: Servicio Líder */}
        <Card className="glass glass-hover flex flex-col justify-between p-4.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block flex items-center gap-1">
              <Activity size={12} className="text-violet-500" />
              Servicio Líder
            </span>
            <h4 className="text-lg font-black mt-2.5 text-violet-400 truncate" title={servicioLiderName}>
              {servicioLiderName}
            </h4>
          </div>
          <p className="text-[10px] text-violet-300 font-semibold border-t border-white/5 pt-2 mt-2 flex justify-between items-center">
            <span>Participación:</span>
            <span className="font-extrabold">{servicioLiderPct.toFixed(1)}%</span>
          </p>
        </Card>

      </div>

      {/* 2. Sección de Gráficos (Evolución Temporal e Impacto Regional) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Gráfico A: Evolución Temporal de Servicios */}
        <Card className="glass flex flex-col justify-between lg:col-span-3 rounded-xl border border-white/10">
          <CardHeader>
            <CardTitle className="text-xs font-black text-[var(--muted)] uppercase tracking-wider">
              Evolución Mensual de Servicios &bull; {regionalContextText}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={displayTrend} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="mes" stroke="var(--muted)" fontSize={10} tickLine={false} />
                <YAxis 
                  stroke="var(--muted)" 
                  fontSize={10} 
                  tickLine={false} 
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                />
                <Tooltip content={<CustomAreaTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '9px', color: 'var(--muted)' }} />
                
                {/* Áreas Apiladas (Uso de PC actúa como base de conectividad) */}
                <Area type="monotone" dataKey="uso_de_pc" stackId="1" name="Uso de PC" stroke={COLORS.uso_de_pc} fill={COLORS.uso_de_pc} fillOpacity={0.4} />
                <Area type="monotone" dataKey="copia" stackId="1" name="Copia" stroke={COLORS.copia} fill={COLORS.copia} fillOpacity={0.4} />
                <Area type="monotone" dataKey="impresion" stackId="1" name="Impresión" stroke={COLORS.impresion} fill={COLORS.impresion} fillOpacity={0.4} />
                <Area type="monotone" dataKey="consulta" stackId="1" name="Consulta" stroke={COLORS.consulta} fill={COLORS.consulta} fillOpacity={0.4} />
                <Area type="monotone" dataKey="taller" stackId="1" name="Taller" stroke={COLORS.taller} fill={COLORS.taller} fillOpacity={0.4} />
                <Area type="monotone" dataKey="reunion" stackId="1" name="Reunión" stroke={COLORS.reunion} fill={COLORS.reunion} fillOpacity={0.4} />
                <Area type="monotone" dataKey="otros" stackId="1" name="Otros" stroke={COLORS.otros} fill={COLORS.otros} fillOpacity={0.4} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico B: Distribución por Regional */}
        <Card className="glass flex flex-col justify-between lg:col-span-2 rounded-xl border border-white/10">
          <CardHeader>
            <CardTitle className="text-xs font-black text-[var(--muted)] uppercase tracking-wider">
              Mix de Servicios por Regional &bull; {periodContextText}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80 w-full mt-2">
            {data.serviciosPorRegional?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={data.serviciosPorRegional} 
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis 
                    type="number" 
                    stroke="var(--muted)" 
                    fontSize={10} 
                    tickLine={false}
                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                  />
                  <YAxis dataKey="regional" type="category" stroke="var(--muted)" fontSize={10} tickLine={false} width={80} />
                  <Tooltip content={<CustomBarTooltip />} />
                  
                  {/* Barras Apiladas */}
                  <Bar dataKey="uso_de_pc" stackId="a" fill={COLORS.uso_de_pc} name="Uso de PC" />
                  <Bar dataKey="copia" stackId="a" fill={COLORS.copia} name="Copia" />
                  <Bar dataKey="impresion" stackId="a" fill={COLORS.impresion} name="Impresión" />
                  <Bar dataKey="consulta" stackId="a" fill={COLORS.consulta} name="Consulta" />
                  <Bar dataKey="taller" stackId="a" fill={COLORS.taller} name="Taller" />
                  <Bar dataKey="reunion" stackId="a" fill={COLORS.reunion} name="Reunión" />
                  <Bar dataKey="otros" stackId="a" fill={COLORS.otros} name="Otros" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[var(--muted)] font-medium">
                Sin datos regionales en el período filtrado
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* 3. Tabla Matriz de Servicios por Infoplaza */}
      <Card className="glass rounded-xl border border-white/10">
        
        {/* Cabecera de Tabla con Buscador y Exportación */}
        <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xs font-black text-[var(--muted)] uppercase tracking-wider">
              Matriz de Atenciones por Infoplaza
            </CardTitle>
            <p className="text-[10px] text-[var(--muted)] mt-1 font-medium">
              Detalle unitario por servicio ofrecido a visitantes. Excluye sucursales cerradas definitivamente.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Buscador Local */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Buscar Infoplaza..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium placeholder-[var(--muted)] text-slate-100 focus:outline-none focus:border-blue-500 w-52 sm:w-64 transition-colors"
              />
            </div>
            
            {/* Exportar CSV */}
            <button
              onClick={handleExportCSV}
              disabled={filteredAndSortedRows.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <Download size={13} />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* Contenedor de la Tabla Matrix */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th 
                  onClick={() => handleSort('numero')}
                  className="px-5 py-3 text-[10px] font-black uppercase text-[var(--muted)] cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    No. <ArrowUpDown size={10} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('nombre')}
                  className="px-5 py-3 text-[10px] font-black uppercase text-[var(--muted)] cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Nombre <ArrowUpDown size={10} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('regional')}
                  className="px-5 py-3 text-[10px] font-black uppercase text-[var(--muted)] cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Regional <ArrowUpDown size={10} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('uso_de_pc')}
                  className="px-4 py-3 text-[10px] font-black uppercase text-[var(--muted)] text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Uso de PC <ArrowUpDown size={10} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('copia')}
                  className="px-4 py-3 text-[10px] font-black uppercase text-[var(--muted)] text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Copia <ArrowUpDown size={10} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('impresion')}
                  className="px-4 py-3 text-[10px] font-black uppercase text-[var(--muted)] text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Impresión <ArrowUpDown size={10} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('consulta')}
                  className="px-4 py-3 text-[10px] font-black uppercase text-[var(--muted)] text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Consulta <ArrowUpDown size={10} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('taller')}
                  className="px-4 py-3 text-[10px] font-black uppercase text-[var(--muted)] text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Taller <ArrowUpDown size={10} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('reunion')}
                  className="px-4 py-3 text-[10px] font-black uppercase text-[var(--muted)] text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Reunión <ArrowUpDown size={10} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('otros')}
                  className="px-4 py-3 text-[10px] font-black uppercase text-[var(--muted)] text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Otros <ArrowUpDown size={10} />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('total')}
                  className="px-5 py-3 text-[10px] font-black uppercase text-[var(--muted)] text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Total <ArrowUpDown size={10} />
                  </div>
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-white/5">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-5 py-2.5 text-xs text-[var(--muted)] font-semibold">{row.numero}</td>
                    <td className="px-5 py-2.5 text-xs text-slate-100 font-bold max-w-[200px] truncate" title={row.nombre}>{row.nombre}</td>
                    <td className="px-5 py-2.5 text-xs text-[var(--muted)] font-medium">{row.regional}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-semibold text-slate-300">{row.uso_de_pc.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-medium text-slate-400">{row.copia.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-medium text-slate-400">{row.impresion.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-medium text-slate-400">{row.consulta.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-bold text-amber-500">{row.taller.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-semibold text-sky-400">{row.reunion.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-medium text-slate-500">{row.otros.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-xs text-right font-black text-blue-400">{row.total.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-xs text-[var(--muted)] font-semibold">
                    No se encontraron Infoplazas coincidentes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mostrar más y progreso */}
        <div className="p-3 border-t border-white/5 bg-white/[0.01] flex flex-col items-center justify-center gap-1.5 font-semibold">
          <span className="text-[10px] text-[var(--muted)]">
            Mostrando {paginatedRows.length} de {totalRows} registros
          </span>
          
          {visibleCount < totalRows ? (
            <button
              onClick={() => setVisibleCount(prev => Math.min(prev + 10, totalRows))}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold border border-blue-500/50 hover:border-blue-400 shadow-md transition-all cursor-pointer"
            >
              Mostrar más
            </button>
          ) : (
            <button
              disabled
              className="px-3 py-1.5 bg-white/5 text-slate-500 rounded-lg text-[10px] font-bold border border-white/5 cursor-not-allowed"
            >
              No hay más registros
            </button>
          )}
        </div>

      </Card>
    </div>
  );
}
