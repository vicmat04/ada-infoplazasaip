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
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  Users, 
  BookOpen, 
  Heart,
  TrendingUp
} from 'lucide-react';

interface VisitantesTabSectionProps {
  data: {
    visitorKpis: {
      totalVisitantes: number;
      totalEducativo: number;
      porcentajeFemenino: number;
      generoLider: string;
      generoLiderTotal: number;
      generoLiderPorcentaje: number;
      segmentoLider: string;
      segmentoLiderTotal: number;
      segmentoLiderPorcentaje: number;
    };
    visitorGenderTypeRows: Array<{
      tipo_usuario: string;
      masculino: number;
      femenino: number;
      total: number;
    }>;
    tendenciaVisitantes: Array<{
      mes: string;
      masculino: number;
      femenino: number;
      total: number;
    }>;
    visitantesPorRegional: Array<{
      regional: string;
      masculino: number;
      femenino: number;
      total: number;
    }>;
    visitantesPorInfoplaza: Array<{
      numero: number;
      nombre: string;
      regional: string;
      provincia: string;
      total: number;
      masculino: number;
      femenino: number;
      primaria: number;
      secundaria: number;
      universitario: number;
      docente: number;
      tercera_edad: number;
      publico_general: number;
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

// Colores demográficos premium
const COLOR_MASCULINO = '#3b82f6'; // Azul eléctrico
const COLOR_FEMENINO = '#ec4899';  // Rosa vibrante

const SEGMENT_COLORS: Record<string, string> = {
  'Público General': '#64748b', // Gris pizarra
  'Secundaria': '#f59e0b',      // Ámbar
  'Universitario': '#8b5cf6',   // Violeta
  'Primaria': '#10b981',        // Esmeralda
  'Tercera Edad': '#ef4444',     // Rojo
  'Docente': '#06b6d4'          // Cian
};

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

// Tooltips personalizados declarados fuera para evitar re-renderizaciones
const CustomAreaTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const totalVal = payload.reduce((acc, item) => acc + (item.value || 0), 0);
    return (
      <div className="glass rounded-lg p-3 text-xs border border-white/10 shadow-xl min-w-[180px]">
        <p className="font-bold mb-2 text-slate-200">{label}</p>
        <div className="space-y-1.5">
          {payload.map((item, idx) => {
            const pct = totalVal > 0 ? (item.value / totalVal) * 100 : 0;
            return (
              <p key={idx} className="flex justify-between gap-4 font-semibold" style={{ color: item.color }}>
                <span>{item.name}:</span>
                <span className="text-white font-extrabold">
                  {item.value.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">({pct.toFixed(1)}%)</span>
                </span>
              </p>
            );
          })}
          <div className="border-t border-white/5 my-1.5 pt-1.5 flex justify-between text-pink-400 font-black">
            <span>Total Visitas:</span>
            <span className="text-white">{totalVal.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomGenderTypeTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const totalVal = payload.reduce((acc, item) => acc + (item.value || 0), 0);
    return (
      <div className="glass rounded-lg p-3 text-xs border border-white/10 shadow-xl min-w-[180px]">
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
          <div className="border-t border-white/5 my-1.5 pt-1.5 flex justify-between text-blue-400 font-black">
            <span>Total Segmento:</span>
            <span className="text-white">{totalVal.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const totalVal = Number(data.payload?.totalSum) || 1;
    const pct = ((data.value || 0) / totalVal) * 100;
    return (
      <div className="glass rounded-lg p-2.5 text-xs border border-white/10 shadow-xl">
        <p className="font-bold text-slate-200 mb-1">{data.name}</p>
        <p className="font-semibold" style={{ color: data.color }}>
          Visitas: <span className="text-white font-extrabold">{Number(data.value).toLocaleString()}</span> 
          <span className="text-slate-400 text-[10px] font-normal ml-1.5">({pct.toFixed(1)}%)</span>
        </p>
      </div>
    );
  }
  return null;
};

interface SortButtonProps {
  columnKey: string;
  label: string;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
}

const SortButton = ({ columnKey, label, sortConfig, onSort }: SortButtonProps) => {
  const isActive = sortConfig && sortConfig.key === columnKey;
  return (
    <button 
      onClick={() => onSort(columnKey)} 
      className={`flex items-center gap-1.5 font-bold uppercase transition-colors hover:text-white ${
        isActive ? 'text-white' : 'text-[var(--muted)]'
      }`}
    >
      {label}
      <ArrowUpDown size={12} className={isActive ? 'text-blue-400' : 'text-slate-500'} />
    </button>
  );
};

export default function VisitantesTabSection({ 
  data, 
  filters, 
  isLoading = false,
  allInfoplazas = []
}: VisitantesTabSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
    key: 'total',
    direction: 'desc'
  });


  // 1. Cálculos dinámicos agregados para los KPIs basados en la data filtrada
  const {
    totalVisitantes,
    totalMasculino,
    totalFemenino,
    femeninoPct,
    masculinoPct,
    totalEducativo,
    educativoPct,
    totalTerceraEdad,
    terceraEdadPct,
    pieData
  } = useMemo(() => {
    const list = data?.visitantesPorInfoplaza || [];
    
    let total = 0;
    let masc = 0;
    let fem = 0;
    let prim = 0;
    let sec = 0;
    let univ = 0;
    let doc = 0;
    let tEdad = 0;
    let pubGen = 0;

    list.forEach((item) => {
      total += Number(item.total || 0);
      masc += Number(item.masculino || 0);
      fem += Number(item.femenino || 0);
      prim += Number(item.primaria || 0);
      sec += Number(item.secundaria || 0);
      univ += Number(item.universitario || 0);
      doc += Number(item.docente || 0);
      tEdad += Number(item.tercera_edad || 0);
      pubGen += Number(item.publico_general || 0);
    });

    const femPct = total > 0 ? (fem / total) * 100 : 0;
    const mascPct = total > 0 ? (masc / total) * 100 : 0;
    const totalEd = prim + sec + univ + doc;
    const edPct = total > 0 ? (totalEd / total) * 100 : 0;
    const tePct = total > 0 ? (tEdad / total) * 100 : 0;

    const ranking = [
      { name: 'Público General', val: pubGen },
      { name: 'Secundaria', val: sec },
      { name: 'Universitario', val: univ },
      { name: 'Primaria', val: prim },
      { name: 'Tercera Edad', val: tEdad },
      { name: 'Docente', val: doc }
    ].sort((a, b) => b.val - a.val);

    // Formatear data de la dona
    const pData = ranking.filter(r => r.val > 0).map(r => ({
      name: r.name,
      value: r.val,
      totalSum: total
    }));

    return {
      totalVisitantes: total,
      totalMasculino: masc,
      totalFemenino: fem,
      femeninoPct: femPct,
      masculinoPct: mascPct,
      totalEducativo: totalEd,
      educativoPct: edPct,
      totalTerceraEdad: tEdad,
      terceraEdadPct: tePct,
      pieData: pData
    };
  }, [data]);

  // Títulos contextuales
  const regionalContextText = useMemo(() => {
    if (filters.infoplaza > 0 && data?.visitantesPorInfoplaza?.length > 0) {
      const match = data.visitantesPorInfoplaza.find(ip => ip.numero === filters.infoplaza);
      return match ? `Infoplaza ${match.nombre} (#${match.numero})` : 'Infoplaza Seleccionada';
    }
    if (filters.regional) return `Región ${filters.regional}`;
    if (filters.provincia) return `Provincia de ${filters.provincia}`;
    return 'Total Red Nacional';
  }, [filters, data]);

  const periodContextText = useMemo(() => {
    if (filters.anio === 0) return 'Período Plurianual (2023 - 2026)';
    return `${filters.mes ? `${filters.mes} ` : ''}${filters.anio}`;
  }, [filters]);

  // Preparar tendencia para gráficos de Recharts cuando hay un solo mes (para que trace línea y área)
  const displayTrend = useMemo(() => {
    const trend = data?.tendenciaVisitantes || [];
    if (trend.length === 1) {
      return [
        { mes: '', masculino: 0, femenino: 0, total: 0 },
        { ...trend[0] },
        { mes: '', masculino: 0, femenino: 0, total: 0 }
      ];
    }
    return trend;
  }, [data?.tendenciaVisitantes]);

  // Lógica de ordenamiento de tabla
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedRows = useMemo(() => {
    const rawList = data?.visitantesPorInfoplaza || [];
    
    // Cruzar con allInfoplazas para obtener el distrito
    const list = rawList.map(item => {
      const match = allInfoplazas?.find(ip => ip.numero === item.numero);
      return {
        ...item,
        distrito: match?.distrito || 'N/A'
      };
    });
    
    // Normalizar cadenas para búsqueda case-insensitive
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

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const valA = (a as Record<string, unknown>)[sortConfig.key];
        const valB = (b as Record<string, unknown>)[sortConfig.key];
        
        if (typeof valA === 'string') {
          return sortConfig.direction === 'asc' 
            ? valA.localeCompare(valB as string)
            : (valB as string).localeCompare(valA);
        } else {
          return sortConfig.direction === 'asc'
            ? (Number(valA) || 0) - (Number(valB) || 0)
            : (Number(valB) || 0) - (Number(valA) || 0);
        }
      });
    }

    return result;
  }, [data, searchTerm, sortConfig, allInfoplazas]);

  // Paginación
  const paginatedRows = useMemo(() => {
    return filteredAndSortedRows.slice(0, visibleCount);
  }, [filteredAndSortedRows, visibleCount]);

  // Restablecer cantidad visible al cambiar búsqueda
  React.useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm]);

  // Exportar a CSV contextualizado
  const handleExportCSV = () => {
    const headers = [
      'Numero Infoplaza',
      'Nombre',
      'Regional',
      'Provincia',
      'Distrito',
      'Total Visitantes',
      'Masculino',
      'Femenino',
      'Primaria',
      'Secundaria',
      'Universitario',
      'Docente',
      'Tercera Edad',
      'Publico General'
    ];

    const rows = filteredAndSortedRows.map(r => [
      r.numero,
      `"${r.nombre.replace(/"/g, '""')}"`,
      `"${r.regional.replace(/"/g, '""')}"`,
      `"${r.provincia.replace(/"/g, '""')}"`,
      `"${(r as any).distrito || 'N/A'}"`,
      r.total,
      r.masculino,
      r.femenino,
      r.primaria,
      r.secundaria,
      r.universitario,
      r.docente,
      r.tercera_edad,
      r.publico_general
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const regName = filters.regional ? `-${filters.regional.trim().replace(/\s+/g, '_')}` : '';
    const periodName = filters.anio === 0 ? '-plurianual' : `-${filters.mes || 'todo'}_${filters.anio}`;
    link.setAttribute("download", `reporte_visitantes${regName}${periodName}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse h-32 flex flex-col justify-between p-6">
              <div className="h-4 bg-white/10 rounded w-1/2" />
              <div className="h-8 bg-white/5 rounded w-3/4" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 h-[350px] animate-pulse bg-white/5" />
          <Card className="h-[350px] animate-pulse bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Header Informativo Contextual */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md">
        <div>
          <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">
            Filtros Activos
          </span>
          <h3 className="text-base font-black text-slate-100 flex items-center gap-2 mt-0.5">
            <Users size={18} className="text-pink-500 shrink-0 animate-pulse" />
            Perfil Demográfico &bull; {regionalContextText}
          </h3>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">
            Periodo de Análisis
          </span>
          <span className="text-xs font-extrabold text-blue-400 block mt-0.5">
            {periodContextText}
          </span>
        </div>
      </div>

      {/* 2. Grid de KPIs Demográficos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Visitantes */}
        <Card className="glass glass-hover flex flex-col justify-between p-4.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block flex items-center gap-1">
              <Users size={12} className="text-pink-500" />
              Total Visitantes
            </span>
            <h4 className="text-2xl font-black mt-2 text-pink-400">{totalVisitantes.toLocaleString()}</h4>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold border-t border-white/5 pt-2 mt-2">
            Visitas consolidadas en el periodo
          </p>
        </Card>

        {/* KPI 2: Brecha de Género (Femenino vs Masculino) */}
        <Card className="glass glass-hover flex flex-col justify-between p-4.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block flex items-center gap-1">
              <Users size={12} className="text-violet-500" />
              Distribución de Género
            </span>
            <div className="flex items-center justify-between mt-2">
              <div>
                <span className="text-xs font-black text-pink-400">{femeninoPct.toFixed(1)}%</span>
                <span className="block text-[8px] text-[var(--muted)] font-bold uppercase">Fem</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-blue-400">{masculinoPct.toFixed(1)}%</span>
                <span className="block text-[8px] text-[var(--muted)] font-bold uppercase">Masc</span>
              </div>
            </div>
            {/* Barra bicolor */}
            <div className="h-1.5 rounded-full overflow-hidden flex bg-white/5 mt-1.5">
              <div className="bg-pink-500 h-full" style={{ width: `${femeninoPct}%` }} />
              <div className="bg-blue-500 h-full" style={{ width: `${masculinoPct}%` }} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold border-t border-white/5 pt-2 mt-2">
            Predominan visitas de: <strong className="text-slate-200 uppercase">{totalFemenino >= totalMasculino ? 'Femenino' : 'Masculino'}</strong>
          </p>
        </Card>

        {/* KPI 3: Foco Educativo */}
        <Card className="glass glass-hover flex flex-col justify-between p-4.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block flex items-center gap-1">
              <BookOpen size={12} className="text-emerald-500" />
              Enfoque Educativo
            </span>
            <h4 className="text-2xl font-black mt-2 text-emerald-400">{totalEducativo.toLocaleString()}</h4>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold border-t border-white/5 pt-2 mt-2 flex justify-between items-center">
            <span>Participación:</span>
            <span className="font-extrabold text-emerald-400">{educativoPct.toFixed(1)}%</span>
          </p>
        </Card>

        {/* KPI 4: Inclusión Adulto Mayor */}
        <Card className="glass glass-hover flex flex-col justify-between p-4.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block flex items-center gap-1">
              <Heart size={12} className="text-red-500" />
              Tercera Edad
            </span>
            <h4 className="text-2xl font-black mt-2 text-red-400">{totalTerceraEdad.toLocaleString()}</h4>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold border-t border-white/5 pt-2 mt-2 flex justify-between items-center">
            <span>Participación:</span>
            <span className="font-extrabold text-red-400">{terceraEdadPct.toFixed(1)}%</span>
          </p>
        </Card>
      </div>

      {/* 3. Sección de Gráficos de Análisis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico 1: Tendencia Temporal por Género */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
              Evolución Mensual de Asistencia por Género
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80 w-full p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={displayTrend}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorFem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLOR_FEMENINO} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={COLOR_FEMENINO} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMasc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLOR_MASCULINO} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={COLOR_MASCULINO} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis 
                  dataKey="mes" 
                  stroke="var(--muted)" 
                  fontSize={10} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="var(--muted)" 
                  fontSize={10} 
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                />
                <Tooltip content={<CustomAreaTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={32} 
                  iconType="circle" 
                  iconSize={7}
                  wrapperStyle={{ fontSize: '10px', color: 'var(--muted)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="femenino" 
                  name="Femenino" 
                  stroke={COLOR_FEMENINO} 
                  fillOpacity={1} 
                  fill="url(#colorFem)" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="masculino" 
                  name="Masculino" 
                  stroke={COLOR_MASCULINO} 
                  fillOpacity={1} 
                  fill="url(#colorMasc)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico 2: Composición del Perfil Social (Dona) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
              Composición de Perfil Social (Segmento)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80 w-full p-2 flex flex-col justify-between">
            {pieData.length > 0 ? (
              <>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={SEGMENT_COLORS[entry.name] || '#64748b'} 
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Leyendas compactas */}
                <div className="grid grid-cols-3 gap-2 px-1 text-[9px] font-semibold text-slate-300">
                  {pieData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                      <span 
                        className="w-1.5 h-1.5 rounded-full shrink-0" 
                        style={{ backgroundColor: SEGMENT_COLORS[item.name] || '#64748b' }} 
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[var(--muted)]">
                No hay datos demográficos cargados.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Gráfico 3: Composición de Género por Segmento y Distribución Regional */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 3A: Composición por Género y Segmento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
              Brecha de Género por Segmento de Población
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80 w-full p-2">
            {data?.visitorGenderTypeRows?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.visitorGenderTypeRows}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis 
                    dataKey="tipo_usuario" 
                    stroke="var(--muted)" 
                    fontSize={10} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="var(--muted)" 
                    fontSize={10} 
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  />
                  <Tooltip content={<CustomGenderTypeTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={32} 
                    iconType="circle" 
                    iconSize={7}
                    wrapperStyle={{ fontSize: '10px', color: 'var(--muted)' }}
                  />
                  <Bar 
                    dataKey="femenino" 
                    name="Femenino" 
                    stackId="genderStack" 
                    fill={COLOR_FEMENINO} 
                    radius={[4, 4, 0, 0]} 
                    barSize={18} 
                  />
                  <Bar 
                    dataKey="masculino" 
                    name="Masculino" 
                    stackId="genderStack" 
                    fill={COLOR_MASCULINO} 
                    radius={[0, 0, 4, 4]} 
                    barSize={18} 
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[var(--muted)]">
                No hay datos de segmentos y género disponibles.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico 3B: Distribución Regional de Visitantes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
              Afluencia Demográfica por Regional
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80 w-full p-2">
            {data?.visitantesPorRegional?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.visitantesPorRegional}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                  <XAxis 
                    type="number"
                    stroke="var(--muted)" 
                    fontSize={10} 
                    tickLine={false} 
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  />
                  <YAxis 
                    type="category"
                    dataKey="regional" 
                    stroke="var(--muted)" 
                    fontSize={9} 
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip content={<CustomGenderTypeTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={32} 
                    iconType="circle" 
                    iconSize={7}
                    wrapperStyle={{ fontSize: '10px', color: 'var(--muted)' }}
                  />
                  <Bar 
                    dataKey="femenino" 
                    name="Femenino" 
                    stackId="regionStack" 
                    fill={COLOR_FEMENINO} 
                    radius={[0, 4, 4, 0]} 
                  />
                  <Bar 
                    dataKey="masculino" 
                    name="Masculino" 
                    stackId="regionStack" 
                    fill={COLOR_MASCULINO} 
                    radius={[4, 0, 0, 4]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[var(--muted)]">
                No hay datos regionales disponibles.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Tabla de Matriz Detallada Demográfica */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--card-border)]">
          <div>
            <CardTitle className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
              Matriz Demográfica Granular de Visitantes
            </CardTitle>
            <p className="text-[10px] text-[var(--muted)] mt-1">
              Desglose completo por Infoplaza, género y nivel de escolaridad.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Buscador */}
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Buscar Infoplaza, región..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
                className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-white/5 border border-[var(--card-border)] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 transition-all"
              />
            </div>
            
            {/* Botón Exportación */}
            <button
              onClick={handleExportCSV}
              disabled={filteredAndSortedRows.length === 0}
              className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-pink-600/10 border border-pink-500/20 hover:bg-pink-600/20 text-pink-400 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Download size={14} />
              <span>Exportar Vista</span>
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {filteredAndSortedRows.length > 0 ? (
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-white/[0.01]">
                  <th className="px-4 py-3 text-xs"><SortButton columnKey="numero" label="Nº" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-4 py-3 text-xs"><SortButton columnKey="nombre" label="Infoplaza" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-4 py-3 text-xs"><SortButton columnKey="regional" label="Regional" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-4 py-3 text-xs"><SortButton columnKey="provincia" label="Provincia" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-4 py-3 text-xs text-right"><SortButton columnKey="total" label="Visitas" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-4 py-3 text-xs text-right text-pink-400"><SortButton columnKey="femenino" label="Fem" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-4 py-3 text-xs text-right text-blue-400"><SortButton columnKey="masculino" label="Masc" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-3 py-3 text-xs text-right text-slate-400"><SortButton columnKey="primaria" label="Prim" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-3 py-3 text-xs text-right text-slate-400"><SortButton columnKey="secundaria" label="Sec" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-3 py-3 text-xs text-right text-slate-400"><SortButton columnKey="universitario" label="Univ" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-3 py-3 text-xs text-right text-slate-400"><SortButton columnKey="docente" label="Doc" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-3 py-3 text-xs text-right text-slate-400"><SortButton columnKey="tercera_edad" label="Jub" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-3 py-3 text-xs text-right text-slate-400"><SortButton columnKey="publico_general" label="Gral" sortConfig={sortConfig} onSort={handleSort} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {paginatedRows.map((row, idx) => {
                  const femPctRow = row.total > 0 ? (row.femenino / row.total) * 100 : 0;
                  return (
                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors text-[11px] font-medium">
                      <td className="px-4 py-2.5 text-slate-400 font-bold">{row.numero}</td>
                      <td className="px-4 py-2.5 text-slate-200 font-bold truncate max-w-[150px]" title={row.nombre}>{row.nombre}</td>
                      <td className="px-4 py-2.5 text-slate-400">{row.regional}</td>
                      <td className="px-4 py-2.5 text-slate-400">{row.provincia}</td>
                      <td className="px-4 py-2.5 text-right font-black text-slate-100">{row.total.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-pink-400/90">{row.femenino.toLocaleString()} <span className="text-[9px] font-normal text-slate-500">({femPctRow.toFixed(0)}%)</span></td>
                      <td className="px-4 py-2.5 text-right font-bold text-blue-400/90">{row.masculino.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right text-emerald-400/80">{row.primaria.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right text-amber-500/80">{row.secundaria.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right text-violet-400/80">{row.universitario.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right text-cyan-400/80">{row.docente.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right text-red-400/80">{row.tercera_edad.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right text-slate-400">{row.publico_general.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-10 text-xs text-[var(--muted)]">
              No se encontraron Infoplazas que coincidan con la búsqueda.
            </div>
          )}
        </CardContent>

        {/* Mostrar más y progreso */}
        {filteredAndSortedRows.length > 0 && (
          <div className="p-3 border-t border-white/5 bg-white/[0.01] flex flex-col items-center justify-center gap-1.5 font-semibold text-xs">
            <span className="text-[10px] text-[var(--muted)]">
              Mostrando {paginatedRows.length} de {filteredAndSortedRows.length} registros
            </span>
            
            {visibleCount < filteredAndSortedRows.length ? (
              <button
                onClick={() => setVisibleCount(prev => Math.min(prev + 10, filteredAndSortedRows.length))}
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
        )}
      </Card>

    </div>
  );
}
