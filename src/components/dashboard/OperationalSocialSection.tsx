'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList
} from 'recharts';

interface VisitorSegmentItem {
  name: string;
  value: number;
}

interface ServiceRankingItem {
  servicio: string;
  total: number;
}

interface SyncRegionalItem {
  regional: string;
  alDia: number;
  revision: number;
  sinReporte: number;
  total: number;
}

interface OperationalSocialSectionProps {
  visitorSegments?: VisitorSegmentItem[];
  visitorKpis?: { totalVisitantes: number; totalEducativo: number };
  serviceRanking: ServiceRankingItem[];
  syncRegionalRows: SyncRegionalItem[];
  isLoading?: boolean;
}

// Paleta de 6 colores premium para las 6 categorías de usuarios
const SEGMENT_COLORS = [
  '#3b82f6', // Público General (Azul)
  '#8b5cf6', // Secundaria (Violeta)
  '#06b6d4', // Universitario (Cian)
  '#ec4899', // Primaria (Rosa)
  '#f59e0b', // Tercera Edad (Ambar)
  '#10b981'  // Docente (Esmeralda)
];

export default function OperationalSocialSection({ 
  visitorSegments = [], 
  visitorKpis,
  serviceRanking = [], 
  syncRegionalRows = [], 
  isLoading = false 
}: OperationalSocialSectionProps) {

  // 1. Datos de Impacto Social (Filtrar segmentos mayores a 0 con fallback seguro)
  const segmentData = React.useMemo(() => {
    if (visitorSegments && visitorSegments.length > 0) {
      return visitorSegments.filter(item => item.value > 0);
    }
    // Fallback binario si el RPC aún no fue actualizado en base de datos
    const totalVis = visitorKpis?.totalVisitantes || 0;
    const totalEdu = visitorKpis?.totalEducativo || 0;
    const totalGen = Math.max(0, totalVis - totalEdu);
    if (totalVis === 0) return [];
    return [
      { name: 'Ámbito Educativo', value: totalEdu },
      { name: 'Público General / Otros', value: totalGen }
    ];
  }, [visitorSegments, visitorKpis]);

  const totalVisitantes = React.useMemo(() => {
    return segmentData.reduce((sum, item) => sum + item.value, 0);
  }, [segmentData]);

  // 2. Datos de Top 5 Servicios (Slice del ranking ya ordenado por el RPC)
  const topServicesData = React.useMemo(() => {
    return (serviceRanking || []).slice(0, 5);
  }, [serviceRanking]);

  const totalServices = React.useMemo(() => {
    return (serviceRanking || []).reduce((sum, item) => sum + item.total, 0);
  }, [serviceRanking]);

  // 3. Preparar y ordenar el Ranking de Sincronización por Regional
  const rankingData = React.useMemo(() => {
    if (!syncRegionalRows || syncRegionalRows.length === 0) return [];
    return syncRegionalRows
      .map((r) => {
        const compliance = r.total > 0 ? (r.alDia / r.total) * 100 : 0;
        return {
          regional: r.regional,
          compliance,
          alDia: r.alDia,
          total: r.total
        };
      })
      .sort((a, b) => b.compliance - a.compliance);
  }, [syncRegionalRows]);

  // Helper para asignar color del semáforo
  const getSemafotoColor = (compliance: number) => {
    if (compliance >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (compliance >= 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const getDotColor = (compliance: number) => {
    if (compliance >= 80) return 'bg-emerald-500';
    if (compliance >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  // Tooltip para el Donut de Impacto Social
  const CustomDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const pct = totalVisitantes > 0 ? (val / totalVisitantes) * 100 : 0;
      return (
        <div className="glass rounded-lg p-2.5 text-xs border border-white/10 shadow-xl">
          <p className="font-semibold text-slate-300 mb-1">{payload[0].name}</p>
          <p className="font-bold text-white text-sm">
            {val.toLocaleString()} <span className="text-[var(--muted)] font-normal text-xs">({pct.toFixed(1)}%)</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Tooltip para el BarChart de Servicios
  const CustomServiceTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass rounded-lg p-2.5 text-xs border border-white/10 shadow-xl">
          <p className="font-semibold text-slate-300 mb-1">{payload[0].payload.servicio}</p>
          <p className="font-bold text-blue-400 text-sm">
            {payload[0].value.toLocaleString()} <span className="text-[var(--muted)] font-normal text-xs">atenciones</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading || totalVisitantes === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="h-96 animate-pulse">
          <div className="h-6 bg-white/10 rounded w-1/3" />
          <div className="h-72 bg-white/5 rounded-lg w-full mt-4" />
        </Card>
        <Card className="h-96 animate-pulse">
          <div className="h-6 bg-white/10 rounded w-1/3" />
          <div className="h-72 bg-white/5 rounded-lg w-full mt-4" />
        </Card>
        <Card className="h-96 animate-pulse">
          <div className="h-6 bg-white/10 rounded w-1/3" />
          <div className="h-72 bg-white/5 rounded-lg w-full mt-4" />
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* 1. Distribución del Impacto Social (Segmentación Desagregada) */}
      <Card className="flex flex-col justify-between">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider">
            Distribución del Impacto Social
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-[22rem] sm:min-h-0 sm:h-48 w-full mt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="w-full sm:w-[65%] h-[180px] sm:h-[150px] relative shrink-0">
            {/* Centrado geométrico absoluto del total en medio del donut */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none">
              <span className="text-[9px] uppercase font-bold text-[var(--muted)] tracking-wider">Total</span>
              <h4 className="text-base sm:text-lg font-black text-white leading-none mt-0.5">{totalVisitantes.toLocaleString()}</h4>
              <span className="text-[9px] text-[var(--muted)]">visitas</span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {segmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomDonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Leyenda desagregada */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 sm:flex sm:flex-col sm:gap-1.5 w-full sm:w-[35%] shrink-0 text-[10px] px-1 select-none overflow-y-auto max-h-full">
            {segmentData.map((item, idx) => {
              const pct = totalVisitantes > 0 ? (item.value / totalVisitantes) * 100 : 0;
              return (
                <div key={idx} className="flex items-start gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length] }} />
                  <div className="leading-tight min-w-0">
                    <p className="font-semibold text-slate-300 truncate" title={item.name}>{item.name}</p>
                    <p className="text-[9px] text-[var(--muted)] font-medium">
                      {pct.toFixed(0)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2. Top 5 de Servicios Graficados (Barras Horizontales) */}
      <Card className="flex flex-col justify-between">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider">
            Top 5 Servicios Solicitados
          </CardTitle>
        </CardHeader>
        <CardContent className="h-48 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topServicesData}
              layout="vertical"
              margin={{ top: 10, right: 35, left: 15, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
              <XAxis 
                type="number" 
                stroke="var(--muted)" 
                fontSize={9} 
                tickLine={false} 
                tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              />
              <YAxis 
                type="category" 
                dataKey="servicio" 
                stroke="var(--muted)" 
                fontSize={9} 
                tickLine={false}
                width={90}
              />
              <Tooltip content={<CustomServiceTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Bar 
                dataKey="total" 
                fill="#3b82f6" 
                radius={[0, 4, 4, 0]} 
                barSize={14}
              >
                <LabelList 
                  dataKey="total" 
                  position="right" 
                  formatter={(value: any) => {
                    const numVal = Number(value) || 0;
                    const pct = totalServices > 0 ? (numVal / totalServices) * 100 : 0;
                    return `${pct.toFixed(0)}%`;
                  }} 
                  style={{ fill: '#94a3b8', fontSize: 9, fontWeight: 'bold' }} 
                  offset={6}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 3. Ranking de Sincronización por Regional */}
      <Card className="flex flex-col justify-between">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider">
            Ranking de Sincronización por Regional
          </CardTitle>
        </CardHeader>
        <CardContent className="h-48 w-full mt-2 overflow-y-auto pr-1">
          <div className="space-y-3.5">
            {rankingData.map((r, idx) => (
              <div key={idx} className="flex flex-col gap-1.5">
                {/* Cabecera de fila */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(r.compliance)}`} />
                    <span className="font-bold text-slate-200">{r.regional}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSemafotoColor(r.compliance)}`}>
                    {r.compliance.toFixed(1)}% <span className="font-normal opacity-70">({r.alDia}/{r.total})</span>
                  </span>
                </div>
                {/* Barra de progreso */}
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${r.compliance}%`,
                      backgroundColor: r.compliance >= 80 ? '#10b981' : r.compliance >= 60 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
