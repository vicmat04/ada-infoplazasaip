'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface MonthlyTrendItem {
  mes: string;
  total: number;
  total_anterior?: number;
  masculino?: number;
  femenino?: number;
}

interface RegionalDataItem {
  regional: string;
  atenciones: number;
}

interface ServiceSectionProps {
  trend: MonthlyTrendItem[];
  regionalData: RegionalDataItem[];
  isLoading?: boolean;
  filters: {
    anio: number;
    mes: string;
    regional: string;
    provincia: string;
    infoplaza: number;
  };
}

const REGIONAL_COLORS = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981'];

export default function ServiceSection({ trend, regionalData, isLoading = false, filters }: ServiceSectionProps) {
  const getTrendTitle = () => {
    let periodText = '';
    if (filters.anio === 0) {
      periodText = '(2023 a 2026)';
    } else {
      periodText = `${filters.anio}`;
    }

    let regionalText = '';
    if (filters.regional) {
      regionalText = `Reg. ${filters.regional}`;
    } else {
      regionalText = 'Total Nacional';
    }

    return `Tendencia Mensual de Visitas ${periodText} - ${regionalText}`;
  };

  const totalVisitas = regionalData.reduce((sum, item) => sum + item.atenciones, 0);

  // Cuando se filtra por un mes único, generamos puntos ficticios en cero antes y
  // después del punto real para producir el efecto visual de curva tipo campana.
  const displayTrend = trend.length === 1
    ? [
        { mes: '', total: 0, masculino: 0, femenino: 0 },
        { ...trend[0] },
        { mes: '', total: 0, masculino: 0, femenino: 0 },
      ]
    : trend;

  // Custom tooltip con diseño premium glass para atenciones/visitas
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.find((p: any) => p.dataKey === 'total')?.value || 0;
      const totalAnt = payload.find((p: any) => p.dataKey === 'total_anterior')?.value || 0;
      const masc = payload.find((p: any) => p.dataKey === 'masculino')?.value || 0;
      const fem = payload.find((p: any) => p.dataKey === 'femenino')?.value || 0;
      
      const dif = total - totalAnt;
      const pct = totalAnt > 0 ? (dif / totalAnt) * 100 : 0;
      const pctText = pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
      const pctColor = pct >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';

      return (
        <div className="glass rounded-lg p-3 text-xs border border-white/10 shadow-xl min-w-[180px]">
          <p className="font-semibold mb-2 text-slate-300">{label}</p>
          <div className="space-y-1.5">
            <p className="text-blue-400 font-bold flex justify-between gap-4">
              <span>Total Visitas:</span>
              <span className="text-white font-extrabold">{total.toLocaleString()}</span>
            </p>
            {filters.anio > 0 && totalAnt > 0 && (
              <>
                <p className="text-slate-400 font-semibold flex justify-between gap-4">
                  <span>Año Anterior ({filters.anio - 1}):</span>
                  <span className="text-slate-300 font-bold">{totalAnt.toLocaleString()}</span>
                </p>
                <p className="font-semibold flex justify-between gap-4 border-t border-white/5 pt-1">
                  <span>Crecimiento:</span>
                  <span className={pctColor}>{pctText}</span>
                </p>
              </>
            )}
            {(masc > 0 || fem > 0) && <div className="border-t border-white/5 my-1" />}
            {masc > 0 && (
              <p className="text-blue-300 font-semibold flex justify-between gap-4" style={{ color: '#60a5fa' }}>
                <span>Masculino:</span>
                <span className="text-white font-bold">{masc.toLocaleString()}</span>
              </p>
            )}
            {fem > 0 && (
              <p className="text-pink-400 font-semibold flex justify-between gap-4">
                <span>Femenino:</span>
                <span className="text-white font-bold">{fem.toLocaleString()}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Tooltip premium para el PieChart de Regionales
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass rounded-lg p-3 text-xs border border-white/10 shadow-xl">
          <p className="font-bold text-slate-200">{data.regional}</p>
          <p className="text-violet-400 font-extrabold mt-1">
            Atenciones: <span className="text-white font-extrabold">{data.atenciones.toLocaleString()}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <Card className="h-96 animate-pulse flex flex-col justify-between lg:col-span-3">
          <div className="h-6 bg-white/10 rounded w-1/3" />
          <div className="h-72 bg-white/5 rounded-lg w-full mt-4" />
        </Card>
        <Card className="h-96 animate-pulse flex flex-col justify-between lg:col-span-1">
          <div className="h-6 bg-white/10 rounded w-1/3" />
          <div className="h-72 bg-white/5 rounded-lg w-full mt-4" />
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
      {/* Gráfico 1: Tendencia Mensual de Visitas */}
      <Card className="flex flex-col justify-between lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider">
            {getTrendTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayTrend} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="mes" 
                stroke="var(--muted)" 
                fontSize={11} 
                tickLine={false}
                tickFormatter={(val) => val === '' ? '' : val}
              />
              <YAxis 
                stroke="var(--muted)" 
                fontSize={11} 
                tickLine={false}
                tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle" 
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', color: 'var(--muted)' }}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                name={filters.anio === 0 ? "Total Visitas" : `Total Visitas ${filters.anio}`}
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorTotal)" 
              />
              {filters.anio > 0 && (
                <Line 
                  type="monotone" 
                  dataKey="total_anterior" 
                  name={`Visitas ${filters.anio - 1} (Año Anterior)`} 
                  stroke="#64748b" 
                  strokeWidth={1.8} 
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
              <Line 
                type="monotone" 
                dataKey="masculino" 
                name="Masculino" 
                stroke="#60a5fa" 
                strokeWidth={1.2} 
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="femenino" 
                name="Femenino" 
                stroke="#ec4899" 
                strokeWidth={1.2} 
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico 2: Distribución por Regional */}
      <Card className="flex flex-col justify-between lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider">
            Distribución de visitas por regional
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72 w-full mt-2 relative">
          {/* Total de visitas en el centro del donut */}
          <div className="absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none z-10">
            <span className="text-2xl font-black text-white leading-none">
              {totalVisitas.toLocaleString()}
            </span>
          </div>
          
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={regionalData}
                dataKey="atenciones"
                nameKey="regional"
                cx="50%"
                cy="45%"
                innerRadius={65}
                outerRadius={110}
                paddingAngle={4}
                label={regionalData.length > 1 ? (({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  if (percent < 0.05) return null;
                  return (
                    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }) : false}
                labelLine={false}
              >
                {regionalData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={REGIONAL_COLORS[index % REGIONAL_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle" 
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', color: 'var(--muted)' }}
                  formatter={(value: string) => {
                    const item = regionalData.find(d => d.regional === value);
                    return item ? `${value} (${item.atenciones.toLocaleString()})` : value;
                  }}
                />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
