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
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface VisitorGenderTypeItem {
  tipo_usuario: string;
  masculino: number;
  femenino: number;
  total: number;
}

interface VisitorSectionProps {
  data: VisitorGenderTypeItem[];
  isLoading?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const male = payload[0]?.value || 0;
    const female = payload[1]?.value || 0;
    const total = male + female;
    
    return (
      <div className="glass rounded-lg p-3 text-xs border border-white/10 shadow-xl">
        <p className="font-semibold mb-2 text-slate-300">{label}</p>
        <div className="space-y-1.5">
          <p className="text-blue-400">
            Masculino: <span className="text-white font-bold">{male.toLocaleString()}</span>
          </p>
          <p className="text-pink-400">
            Femenino: <span className="text-white font-bold">{female.toLocaleString()}</span>
          </p>
          <div className="border-t border-white/10 pt-1 mt-1 font-semibold text-slate-200">
            Total: {total.toLocaleString()}
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function VisitorSection({ data, isLoading = false }: VisitorSectionProps) {

  if (isLoading) {
    return (
      <Card className="h-96 animate-pulse flex flex-col justify-between mb-6">
        <div className="h-6 bg-white/10 rounded w-1/4" />
        <div className="h-72 bg-white/5 rounded-lg w-full mt-4" />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col justify-between mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider">
          Composición de Visitantes por Género y Segmento
        </CardTitle>
      </CardHeader>
      <CardContent className="h-80 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="tipo_usuario" 
              stroke="var(--muted)" 
              fontSize={11} 
              tickLine={false}
            />
            <YAxis 
              stroke="var(--muted)" 
              fontSize={11} 
              tickLine={false}
              tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle" 
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', color: 'var(--muted)' }}
            />
            <Bar 
              dataKey="masculino" 
              name="Masculino" 
              stackId="a" 
              fill="#3b82f6" 
              radius={[0, 0, 4, 4]} 
              barSize={24}
            />
            <Bar 
              dataKey="femenino" 
              name="Femenino" 
              stackId="a" 
              fill="#ec4899" 
              radius={[4, 4, 0, 0]} 
              barSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
