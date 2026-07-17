'use client';

import React from 'react';
import { Card } from '../ui/card';
import { 
  UserCheck, 
  Layers, 
  CheckCircle, 
  AlertTriangle, 
  Users,
  Zap,
  VenusAndMars,
  GraduationCap,
  Calendar
} from 'lucide-react';

// Helper: formatea '2026-07-08' → '08 Jul 2026'
const formatChipDate = (dateStr?: string): string => {
  if (!dateStr) return '...';
  try {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]} ${meses[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
  } catch { return dateStr; }
};

interface KpisData {
  totalActivas: number;
  totalReportadas: number;
  porcentajeCobertura: number;
  totalAtenciones: number;
  promedioAtenciones: number;
  totalVisitantes: number;
  totalEducativo: number;
  servicioLider: string;
  servicioLiderTotal?: number;
  servicioLiderPorcentaje?: number;
  segmentoLider: string;
  segmentoLiderTotal?: number;
  segmentoLiderPorcentaje?: number;
  generoLider: string;
  generoLiderTotal?: number;
  generoLiderPorcentaje?: number;
  porcentajeFemenino: number;
  cumplimientoSinc: number;
  ipsRevision: number;
  ipsConActividadPeriodo?: number;
  crecimientoYTD?: number | null;
  ultimoCorteDate?: string;
}

interface KpiGridProps {
  data: KpisData;
  filters?: {
    anio?: number;
    mes?: string;
    regional?: string;
    provincia?: string;
    infoplaza?: number;
  };
  isLoading?: boolean;
}

export default function KpiGrid({ data, filters, isLoading = false }: KpiGridProps) {
  // 1. Construir etiqueta inteligente para Atenciones Registradas (Año, Mes, Regional, etc.)
  let subtextAtenciones = 'Total de registros';
  if (filters) {
    const tieneAdicionales = !!(
      filters.mes ||
      filters.regional ||
      filters.provincia ||
      (filters.infoplaza && filters.infoplaza !== 0)
    );

    if (tieneAdicionales) {
      const partes: string[] = [];
      if (filters.anio && filters.anio !== 0) {
        partes.push(String(filters.anio));
      }
      if (filters.mes) {
        partes.push(filters.mes);
      }
      if (filters.regional) {
        partes.push(`Reg. ${filters.regional}`);
      }
      if (filters.provincia) {
        partes.push(`Prov. ${filters.provincia}`);
      }
      if (filters.infoplaza && filters.infoplaza !== 0) {
        partes.push(`IP #${filters.infoplaza}`);
      }
      if (partes.length > 0) {
        subtextAtenciones = `Registros - ${partes.join(' - ')}`;
      } else {
        subtextAtenciones = 'Registros';
      }
    } else {
      if (filters.anio && filters.anio !== 0) {
        subtextAtenciones = `Total de registros - ${filters.anio}`;
      } else {
        subtextAtenciones = 'Total de registros';
      }
    }
  }

  // 2. Construir etiqueta inteligente para Infoplazas Activas basada en los filtros activos (regional y provincia, excluyendo infoplaza)
  let subtextActivas = 'Excluye Cerradas Definitivamente';
  if (filters) {
    const partes: string[] = [];
    if (filters.regional) {
      partes.push(`Reg. ${filters.regional}`);
    }
    if (filters.provincia) {
      partes.push(`Prov. ${filters.provincia}`);
    }
    
    if (partes.length > 0) {
      subtextActivas = partes.join(' - ');
    }
  }

  const kpis = [
    {
      title: 'Atenciones Registradas',
      value: data.totalAtenciones.toLocaleString(),
      subtext: subtextAtenciones,
      icon: UserCheck,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      crecimientoYTD: data.crecimientoYTD
    },
    {
      title: 'Infoplazas Activas',
      value: data.totalActivas.toString(),
      extraValue: data.ipsConActividadPeriodo !== undefined && data.ipsConActividadPeriodo > 0
        ? `(${data.ipsConActividadPeriodo} reportaron)`
        : undefined,
      subtext: subtextActivas,
      icon: Layers,
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
    },
    {
      title: 'Sincronización Actual',
      value: `${data.cumplimientoSinc.toFixed(1)}%`,
      subtext: `${data.totalReportadas} de ${data.totalActivas} sincronizadas al día`,
      corteChip: formatChipDate(data.ultimoCorteDate),
      icon: CheckCircle,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
    {
      title: 'Infoplazas para Revisión',
      value: data.ipsRevision.toString(),
      subtext: 'Entre 11 y 30 días sin sincronizar',
      icon: AlertTriangle,
      color: data.ipsRevision > 0 ? 'text-amber-500' : 'text-slate-400',
      bgColor: data.ipsRevision > 0 ? 'bg-amber-500/10' : 'bg-slate-500/10',
    },
    {
      title: 'Servicio Líder',
      value: data.servicioLider,
      subtext: `${(data.servicioLiderTotal ?? 0).toLocaleString()} atenciones (${(data.servicioLiderPorcentaje ?? 0).toFixed(1)}%)`,
      icon: Zap,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Género Líder',
      value: data.generoLider,
      subtext: `${(data.generoLiderTotal ?? 0).toLocaleString()} visitas (${(data.generoLiderPorcentaje ?? 0).toFixed(1)}%)`,
      icon: VenusAndMars,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
    {
      title: 'Tipo de Usuario Líder',
      value: data.segmentoLider,
      subtext: `${(data.segmentoLiderTotal ?? 0).toLocaleString()} visitas (${(data.segmentoLiderPorcentaje ?? 0).toFixed(1)}%)`,
      icon: Users,
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
    },
    {
      title: 'Impacto Educativo',
      value: data.totalEducativo.toLocaleString(),
      subtext: `${data.totalVisitantes > 0 ? ((data.totalEducativo / data.totalVisitantes) * 100).toFixed(1) : '0.0'}% estudiantes y docentes`,
      icon: GraduationCap,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-6">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="glass rounded-xl p-6 h-28 animate-pulse flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <div className="h-4 bg-white/10 rounded w-2/3" />
              <div className="w-8 h-8 bg-white/10 rounded-lg" />
            </div>
            <div className="h-6 bg-white/10 rounded w-1/3 mt-2" />
            <div className="h-3 bg-white/10 rounded w-1/2 mt-1" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-6">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <Card key={idx} className="flex flex-col justify-between relative overflow-hidden group">
            {/* Gradiente sutil de fondo en hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 via-blue-600/0 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                  {kpi.title}
                </p>
                <h4 className="text-2xl font-bold tracking-tight mt-1.5 flex items-baseline gap-2">
                  {kpi.value}
                  {kpi.extraValue && (
                    <span className="text-xs font-medium text-[var(--muted)]/80 whitespace-nowrap">
                      {kpi.extraValue}
                    </span>
                  )}
                </h4>
              </div>
              <div className={`p-2 rounded-xl ${kpi.bgColor} ${kpi.color}`}>
                <Icon size={20} />
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-[var(--card-border)] flex items-center justify-between gap-2">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs text-[var(--muted)] truncate">
                  {kpi.subtext}
                </span>
                {(kpi as any).corteChip && (
                  <div
                    className="flex items-center gap-1 text-[9px] font-medium text-slate-500 cursor-help"
                    title="El porcentaje refleja el estado de sincronización al último corte disponible. No varía con el período seleccionado en los filtros."
                  >
                    <Calendar size={9} className="text-blue-400 shrink-0" />
                    <span>Corte actual: <span className="text-slate-400 font-semibold">{(kpi as any).corteChip}</span></span>
                  </div>
                )}
              </div>
              {kpi.crecimientoYTD !== undefined && kpi.crecimientoYTD !== null && (
                <span className={`text-[10px] font-extrabold flex items-center gap-0.5 shrink-0 px-1.5 py-0.5 rounded border ${
                  kpi.crecimientoYTD >= 0 
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                    : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                }`} title={`Crecimiento acumulado respecto al mismo período del año anterior`}>
                  {kpi.crecimientoYTD >= 0 ? '▲' : '▼'} {Math.abs(kpi.crecimientoYTD).toFixed(1)}%
                </span>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
