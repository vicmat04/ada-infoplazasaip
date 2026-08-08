'use client';

import React, { useState } from 'react';
import ReporteIndividualSection from './ReporteIndividualSection';
import ReportePersonalizadoSection from './ReportePersonalizadoSection';
import { FileText, SlidersHorizontal, BarChart2 } from 'lucide-react';

interface InfoplazaItem {
  numero: number;
  nombre: string;
  regional: string;
  provincia: string;
  distrito: string;
  corregimiento: string;
}

interface ReportesTabSectionProps {
  allInfoplazas: InfoplazaItem[];
  availablePeriods: Array<{ anio: number; mes: string }>;
  filters: {
    anio: number;
    mes: string;
    regional: string;
    provincia: string;
    infoplaza: number;
  };
  onFiltersChange: (filters: any) => void;
}

export default function ReportesTabSection({
  allInfoplazas,
  availablePeriods,
  filters,
  onFiltersChange
}: ReportesTabSectionProps) {
  // Estado para alternar entre las Sub-pestañas del módulo de Reportes
  const [subTab, setSubTab] = useState<'individual' | 'personalizado'>('personalizado');

  return (
    <div className="space-y-6">
      {/* BARRA DE NAVEGACIÓN PRINCIPAL DE SUB-PESTAÑAS */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-2 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] w-full max-w-full overflow-hidden">
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          {/* Sub-tab 1: Reportes Personalizados Ad-hoc */}
          <button
            onClick={() => setSubTab('personalizado')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'personalizado'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/5'
            }`}
          >
            <SlidersHorizontal size={15} />
            Reporte Personalizado (Ad-Hoc)
          </button>

          {/* Sub-tab 2: Ficha / Diagnóstico Individual por Infoplaza */}
          <button
            onClick={() => setSubTab('individual')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'individual'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/5'
            }`}
          >
            <BarChart2 size={15} />
            Ficha por Infoplaza
          </button>
        </div>

        {/* Indicador contextual ajustado */}
        <div className="px-3 py-1 rounded-lg bg-white/5 border border-[var(--card-border)] text-[11px] text-[var(--muted)] hidden xl:block truncate max-w-sm shrink">
          {subTab === 'personalizado' 
            ? 'Generador de matrices ad-hoc, multi-regional y exportación dinámicos'
            : 'Diagnóstico ejecutivo, perfil social e historial individual por sucursal'
          }
        </div>
      </div>

      {/* RENDERIZADO CONDICIONAL SEGÚN SUB-PESTAÑA SELECCIONADA */}
      {subTab === 'personalizado' ? (
        <ReportePersonalizadoSection 
          allInfoplazas={allInfoplazas}
          availablePeriods={availablePeriods}
        />
      ) : (
        <ReporteIndividualSection 
          allInfoplazas={allInfoplazas}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      )}
    </div>
  );
}
