'use client';

import React, { useEffect, useState } from 'react';
import { Filter, X, RefreshCw } from 'lucide-react';

interface InfoplazaItem {
  numero: number;
  nombre: string;
  regional: string;
  provincia: string;
  distrito: string;
  corregimiento: string;
}

interface PeriodoItem {
  anio: number;
  mes: string;
}

interface FiltersBarProps {
  onFiltersChange: (filters: { anio: number; mes: string; regional: string; provincia: string; distrito: string; infoplaza: number }) => void;
  activeFilters: { anio: number; mes: string; regional: string; provincia: string; distrito: string; infoplaza: number };
  allInfoplazas: InfoplazaItem[];
  availablePeriods: PeriodoItem[];
}

export default function FiltersBar({ onFiltersChange, activeFilters, allInfoplazas, availablePeriods }: FiltersBarProps) {
  const [filteredIps, setFilteredIps] = useState<InfoplazaItem[]>([]);

  // Generar la lista de años dinámicamente desde availablePeriods
  const aniosDisponibles = React.useMemo(() => {
    const uniqueAnios = Array.from(new Set(availablePeriods.map((p) => p.anio)))
      .filter((a) => !!a)
      .sort((a, b) => b - a);
    return [
      { value: 0, label: 'Todos los años' },
      ...uniqueAnios.map((a) => ({ value: a, label: `Año ${a}` })),
    ];
  }, [availablePeriods]);

  // Generar la lista de meses dinámicamente según el año seleccionado
  const mesesDisponibles = React.useMemo(() => {
    const mesesFiltrados = activeFilters.anio
      ? availablePeriods.filter((p) => p.anio === activeFilters.anio).map((p) => p.mes)
      : Array.from(new Set(availablePeriods.map((p) => p.mes)));

    const mesesOrden = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const uniqueMeses = mesesOrden.filter((m) => mesesFiltrados.includes(m));

    return [
      { value: '', label: 'Todos los meses' },
      ...uniqueMeses.map((m) => ({ value: m, label: m })),
    ];
  }, [availablePeriods, activeFilters.anio]);

  // Generar la lista de regionales dinámicamente desde allInfoplazas
  const regionalesList = React.useMemo(() => {
    const uniqueRegionales = Array.from(
      new Set(
        allInfoplazas
          .map((ip) => ip.regional)
          .filter((r) => !!r)
      )
    ).sort();
    return [
      { value: '', label: 'Todas las regionales' },
      ...uniqueRegionales.map((r) => ({ value: r, label: r })),
    ];
  }, [allInfoplazas]);

  // Generar la lista de provincias dinámicamente según la regional seleccionada
  const provinciasList = React.useMemo(() => {
    const ipsParaProvincias = activeFilters.regional
      ? allInfoplazas.filter(
          (ip) => ip.regional.toLowerCase().trim() === activeFilters.regional.toLowerCase().trim()
        )
      : allInfoplazas;

    const uniqueProvincias = Array.from(
      new Set(
        ipsParaProvincias
          .map((ip) => ip.provincia)
          .filter((p) => !!p)
      )
    ).sort();

    return [
      { value: '', label: 'Todas las provincias' },
      ...uniqueProvincias.map((p) => ({ value: p, label: p })),
    ];
  }, [allInfoplazas, activeFilters.regional]);

  // Generar la lista de distritos según regional + provincia seleccionada
  const distritosList = React.useMemo(() => {
    let ips = allInfoplazas;
    if (activeFilters.regional) {
      ips = ips.filter(
        (ip) => ip.regional.toLowerCase().trim() === activeFilters.regional.toLowerCase().trim()
      );
    }
    if (activeFilters.provincia) {
      ips = ips.filter(
        (ip) => ip.provincia.toLowerCase().trim() === activeFilters.provincia.toLowerCase().trim()
      );
    }
    const uniqueDistritos = Array.from(
      new Set(ips.map((ip) => ip.distrito).filter((d) => !!d))
    ).sort();
    return [
      { value: '', label: 'Todos los distritos' },
      ...uniqueDistritos.map((d) => ({ value: d, label: d })),
    ];
  }, [allInfoplazas, activeFilters.regional, activeFilters.provincia]);

  // Filtrar las infoplazas disponibles según regional, provincia y distrito activos
  useEffect(() => {
    let filtered = allInfoplazas;
    if (activeFilters.regional) {
      filtered = filtered.filter(
        (ip) => ip.regional.toLowerCase().trim() === activeFilters.regional.toLowerCase().trim()
      );
    }
    if (activeFilters.provincia) {
      filtered = filtered.filter(
        (ip) => ip.provincia.toLowerCase().trim() === activeFilters.provincia.toLowerCase().trim()
      );
    }
    if (activeFilters.distrito) {
      filtered = filtered.filter(
        (ip) => ip.distrito.toLowerCase().trim() === activeFilters.distrito.toLowerCase().trim()
      );
    }
    setFilteredIps(filtered);

    // Si la infoplaza seleccionada no pertenece al ámbito activo, resetearla
    if (activeFilters.infoplaza !== 0) {
      const belongs = filtered.some((ip) => ip.numero === activeFilters.infoplaza);
      if (!belongs) {
        onFiltersChange({ ...activeFilters, infoplaza: 0 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters.regional, activeFilters.provincia, activeFilters.distrito, allInfoplazas]);

  const handleSelectAnio = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoAnio = parseInt(e.target.value, 10);
    // Validar dinámicamente si el mes seleccionado existe en el nuevo año.
    // Evita hardcodear listas de meses válidos por año.
    const mesesValidosParaNuevoAnio = nuevoAnio === 0
      ? Array.from(new Set(availablePeriods.map(p => p.mes)))
      : availablePeriods.filter(p => p.anio === nuevoAnio).map(p => p.mes);
    const nuevoMes = mesesValidosParaNuevoAnio.includes(activeFilters.mes) ? activeFilters.mes : '';
    onFiltersChange({ ...activeFilters, anio: nuevoAnio, mes: nuevoMes });
  };

  const handleSelectMes = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...activeFilters, mes: e.target.value });
  };

  const handleSelectRegional = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...activeFilters, regional: e.target.value, provincia: '', distrito: '', infoplaza: 0 });
  };

  const handleSelectProvincia = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...activeFilters, provincia: e.target.value, distrito: '', infoplaza: 0 });
  };

  const handleSelectDistrito = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...activeFilters, distrito: e.target.value, infoplaza: 0 });
  };

  const handleSelectInfoplaza = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...activeFilters, infoplaza: parseInt(e.target.value, 10) });
  };

  const handleResetFilters = () => {
    // Derivar el año más reciente desde la BD, sin hardcodear ningún valor
    const anioDefault = availablePeriods.length > 0 ? availablePeriods[0].anio : 0;
    onFiltersChange({
      anio: anioDefault,
      mes: '',
      regional: '',
      provincia: '',
      distrito: '',
      infoplaza: 0,
    });
  };

  const hasActiveFilters = 
    activeFilters.mes !== '' || 
    activeFilters.regional !== '' || 
    activeFilters.provincia !== '' || 
    activeFilters.distrito !== '' ||
    activeFilters.infoplaza !== 0;

  return (
    <div className="glass rounded-xl p-4 mb-6 flex flex-col gap-3 animate-fade-in">
      {/* Sección Superior - Selector de filtros */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 w-full">
        <div className="flex items-center justify-center text-sm text-[var(--muted)] sm:mr-2">
          <Filter size={16} className="text-blue-500" />
        </div>

        {/* Año */}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <select
            value={activeFilters.anio}
            onChange={handleSelectAnio}
            className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-white/5 border border-[var(--card-border)] text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
          >
            {aniosDisponibles.map((a) => (
              <option key={a.value} value={a.value} className="bg-slate-950 text-white">
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {/* Mes */}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <select
            value={activeFilters.mes}
            onChange={handleSelectMes}
            className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-white/5 border border-[var(--card-border)] text-sm focus:outline-none focus:border-blue-500/50 transition-colors sm:min-w-[150px]"
          >
            {mesesDisponibles.map((m) => (
              <option key={m.value} value={m.value} className="bg-slate-950 text-white">
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Regional */}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <select
            value={activeFilters.regional}
            onChange={handleSelectRegional}
            className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-white/5 border border-[var(--card-border)] text-sm focus:outline-none focus:border-blue-500/50 transition-colors sm:min-w-[180px]"
          >
            {regionalesList.map((r) => (
              <option key={r.value} value={r.value} className="bg-slate-950 text-white">
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Provincia */}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <select
            value={activeFilters.provincia}
            onChange={handleSelectProvincia}
            className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-white/5 border border-[var(--card-border)] text-sm focus:outline-none focus:border-blue-500/50 transition-colors sm:min-w-[180px]"
          >
            {provinciasList.map((p) => (
              <option key={p.value} value={p.value} className="bg-slate-950 text-white">
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Distrito */}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <select
            value={activeFilters.distrito}
            onChange={handleSelectDistrito}
            className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-white/5 border border-[var(--card-border)] text-sm focus:outline-none focus:border-blue-500/50 transition-colors sm:min-w-[180px]"
          >
            {distritosList.map((d) => (
              <option key={d.value} value={d.value} className="bg-slate-950 text-white">
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Infoplaza — se habilita al seleccionar provincia O distrito */}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <select
            value={activeFilters.infoplaza}
            onChange={handleSelectInfoplaza}
            disabled={activeFilters.provincia === '' && activeFilters.distrito === ''}
            className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-white/5 border border-[var(--card-border)] text-sm focus:outline-none focus:border-blue-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed sm:min-w-[200px] sm:max-w-[260px]"
            title={activeFilters.provincia === '' && activeFilters.distrito === '' ? 'Debe seleccionar una provincia o distrito primero' : 'Filtrar por Infoplaza'}
          >
            <option value={0} className="bg-slate-950 text-white">
              {activeFilters.provincia === '' && activeFilters.distrito === '' ? 'Seleccione provincia o distrito' : 'Todas las Infoplazas'}
            </option>
            {filteredIps.map((ip) => (
              <option key={ip.numero} value={ip.numero} className="bg-slate-950 text-white">
                {ip.numero} - {ip.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Botón de Reset ultra minimalista */}
      {hasActiveFilters && (
        <div className="flex justify-end w-full animate-fade-in mt-1">
          <button
            onClick={handleResetFilters}
            className="text-[11px] font-medium text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer"
          >
            <X size={12} />
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
