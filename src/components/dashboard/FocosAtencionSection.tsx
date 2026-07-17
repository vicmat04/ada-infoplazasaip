'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { AlertTriangle, Clock, Eye } from 'lucide-react';

interface RiskRow {
  numero: number;
  nombre: string;
  regional: string;
  dias_sin_sinc: number;
  observacion: string;
  provincia: string;
  distrito: string;
  corregimiento: string;
  atenciones: number;
  sync_estado: string;
}

interface FocosAtencionSectionProps {
  riskIps: RiskRow[];
  onViewDetail?: (row: any) => void;
  isLoading?: boolean;
}

export default function FocosAtencionSection({ riskIps, onViewDetail, isLoading = false }: FocosAtencionSectionProps) {
  const [topLimit, setTopLimit] = useState(10);

  if (isLoading) {
    return (
      <Card className="h-60 w-full animate-pulse mb-6">
        <div className="p-6">
          <div className="h-6 bg-white/10 rounded w-1/4 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-24 bg-white/5 rounded-xl w-full" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const displayedIps = riskIps.slice(0, topLimit);

  return (
    <Card className="mb-6 animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-[var(--card-border)]">
        <div>
          <CardTitle className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle size={16} />
            Focos de Atención (Riesgos de Sincronización)
          </CardTitle>
          <p className="text-[10px] text-[var(--muted)] mt-1">
            Infoplazas que requieren revisión debido al retraso en su reporte operativo.
          </p>
        </div>
        <select
          value={topLimit}
          onChange={(e) => setTopLimit(Number(e.target.value))}
          className="text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500/50 text-slate-300 font-semibold"
        >
          <option value={5} className="bg-slate-900">Top 5</option>
          <option value={10} className="bg-slate-900">Top 10</option>
          <option value={15} className="bg-slate-900">Top 15</option>
          <option value={20} className="bg-slate-900">Top 20</option>
        </select>
      </CardHeader>
      <CardContent className="p-6">
        {riskIps.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 text-[var(--muted)]">
            <Clock className="w-12 h-12 mb-3 opacity-30 text-emerald-500" />
            <p className="text-sm font-semibold text-emerald-400">Toda la red al día</p>
            <p className="text-xs mt-1">Ninguna Infoplaza tiene más de 10 días de retraso en sus reportes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedIps.map((ip) => (
              <div 
                key={ip.numero}
                className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3 hover:border-amber-500/30 transition-all duration-300 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-100 truncate" title={ip.nombre}>
                      {ip.nombre}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold shrink-0">
                      #{ip.numero}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--muted)] mt-1 truncate">
                    {ip.regional} &bull; {ip.distrito}
                  </p>
                  <p className="text-[9px] text-amber-500/80 mt-0.5 italic truncate" title={ip.observacion}>
                    Obs: {ip.observacion}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="block text-sm font-extrabold text-amber-500">
                      {ip.dias_sin_sinc === 999 ? 'N/A' : ip.dias_sin_sinc}
                    </span>
                    <span className="text-[8px] text-[var(--muted)] uppercase font-semibold">
                      {ip.dias_sin_sinc === 999 ? 'sin reporte' : 'días sin sinc'}
                    </span>
                  </div>
                  {onViewDetail && (
                    <button
                      onClick={() => onViewDetail(ip)}
                      className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                      title="Ver detalle completo"
                    >
                      <Eye size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
