'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { getYoYGrowthData } from '@/app/actions';
import { RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp, CalendarDays, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';

const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

export default function YoYGrowthTable({ filters }: { filters: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedMes, setSelectedMes] = useState<number>(currentMonth);
  const [selectedAnios, setSelectedAnios] = useState<number[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Años disponibles: desde 2023 hasta el actual
  const AVAILABLE_YEARS = Array.from({ length: currentYear - 2023 + 1 }, (_, i) => 2023 + i);

  // Helper para calcular crecimiento
  const calculateGrowth = (current: number, prev: number) => {
    if (!prev || prev === 0) return current > 0 ? 100 : 0;
    return ((current - prev) / prev) * 100;
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      if (sortConfig.key === 'numero') {
        aValue = a.numero;
        bValue = b.numero;
      } else if (sortConfig.key === 'nombre') {
        aValue = a.nombre;
        bValue = b.nombre;
      } else if (sortConfig.key === 'regional') {
        aValue = a.regional;
        bValue = b.regional;
      } else if (sortConfig.key === 'provincia') {
        aValue = a.provincia;
        bValue = b.provincia;
      } else if (sortConfig.key.startsWith('crec_')) {
        const [, prevAnio, currAnio] = sortConfig.key.split('_').map(Number);
        aValue = calculateGrowth(a.valoresPorAnio[currAnio] || 0, a.valoresPorAnio[prevAnio] || 0);
        bValue = calculateGrowth(b.valoresPorAnio[currAnio] || 0, b.valoresPorAnio[prevAnio] || 0);
      } else {
        const anioVal = parseInt(sortConfig.key);
        aValue = a.valoresPorAnio[anioVal] || 0;
        bValue = b.valoresPorAnio[anioVal] || 0;
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown size={14} className="ml-1 inline opacity-50" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="ml-1 inline text-emerald-400" />
      : <ArrowDown size={14} className="ml-1 inline text-emerald-400" />;
  };

  // Calcular años por defecto al montar
  useEffect(() => {
    setSelectedAnios([currentYear - 1, currentYear]);
  }, [currentYear]);

  // Fetch data cuando cambian los filtros, mes o años, y está expandido
  useEffect(() => {
    if (!isExpanded || selectedAnios.length === 0) return;

    startTransition(async () => {
      const res = await getYoYGrowthData(filters, selectedMes, selectedAnios);
      if (res.success) {
        setData(res.data || []);
      }
    });
  }, [filters, selectedMes, selectedAnios, isExpanded]);

  const toggleAnio = (anioVal: number) => {
    setSelectedAnios(prev => {
      if (prev.includes(anioVal)) {
        return prev.filter(y => y !== anioVal).sort((a, b) => a - b);
      } else {
        return [...prev, anioVal].sort((a, b) => a - b);
      }
    });
  };

  const handleExport = () => {
    if (data.length === 0) return;
    
    const mesLabel = MESES.find(m => m.value === selectedMes)?.label || '';
    
    const exportData = sortedData.map(row => {
      const obj: any = {
        'No.': row.numero,
        'Infoplaza': row.nombre,
        'Regional': row.regional,
        'Provincia': row.provincia,
      };
      
      selectedAnios.forEach((anioVal, idx) => {
        const currentVal = row.valoresPorAnio[anioVal] || 0;
        
        if (idx > 0) {
          const prevAnioVal = selectedAnios[idx - 1];
          const prevVal = row.valoresPorAnio[prevAnioVal] || 0;
          const growth = calculateGrowth(currentVal, prevVal);
          
          obj[`Crecimiento ${prevAnioVal}->${anioVal} (%)`] = growth.toFixed(2);
        }
        
        obj[`Visitas ${anioVal}`] = currentVal;
      });
      
      return obj;
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comparativa Interanual");
    XLSX.writeFile(wb, `Comparativa_Interanual_${mesLabel}_${currentYear}.xlsx`);
  };

  return (
    <Card className="border border-white/10 shadow-xl mt-6 overflow-hidden bg-slate-900/40 backdrop-blur-sm">
      <div 
        className="bg-slate-900/50 p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
            <CalendarDays size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">Comparativa Interanual (YoY) por Mes</h3>
            <p className="text-xs text-[var(--muted)]">Analiza la evolución histórica de un mes específico a través de los años</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data.length > 0 && isExpanded && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleExport(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors"
            >
              <Download size={14} />
              Exportar
            </button>
          )}
          <div className="p-1 rounded bg-white/5 text-slate-400">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <CardContent className="p-0 border-t border-white/5">
          <div className="p-4 bg-slate-950/30 border-b border-white/5 flex flex-col md:flex-row gap-6">
            {/* Controles de mes */}
            <div className="flex flex-col gap-3 flex-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                1. Elige un mes a analizar
              </span>
              <select 
                value={selectedMes} 
                onChange={(e) => setSelectedMes(Number(e.target.value))}
                className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
              >
                {MESES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Controles de años */}
            <div className="flex flex-col gap-3 flex-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                2. Selecciona los años a comparar
              </span>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_YEARS.map(anioVal => {
                  const isSelected = selectedAnios.includes(anioVal);
                  return (
                    <button
                      key={anioVal}
                      onClick={() => toggleAnio(anioVal)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all border ${
                        isSelected 
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {anioVal}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="relative overflow-x-auto min-h-[200px] max-h-[500px] custom-scrollbar">
            {isPending && (
              <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                <span className="text-sm font-semibold text-slate-300 shadow-sm">Cargando comparativa...</span>
              </div>
            )}

            {selectedAnios.length < 2 ? (
              <div className="p-10 flex flex-col items-center justify-center text-center text-[var(--muted)]">
                <CalendarDays size={32} className="mb-3 opacity-20" />
                <p className="text-sm">Selecciona al menos 2 años para ver el crecimiento comparativo.</p>
              </div>
            ) : data.length === 0 && !isPending ? (
              <div className="p-10 flex flex-col items-center justify-center text-center text-[var(--muted)]">
                <p className="text-sm">No hay datos registrados para la selección actual.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-300 uppercase bg-slate-900/90 sticky top-0 z-10 shadow-md">
                  <tr>
                    <th className="px-4 py-4 font-semibold w-16 whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('numero')}>
                      No. <SortIcon columnKey="numero" />
                    </th>
                    <th className="px-4 py-4 font-semibold min-w-[200px] whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('nombre')}>
                      Infoplaza <SortIcon columnKey="nombre" />
                    </th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('regional')}>
                      Regional <SortIcon columnKey="regional" />
                    </th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('provincia')}>
                      Provincia <SortIcon columnKey="provincia" />
                    </th>
                    {selectedAnios.map((anioVal, idx) => (
                      <React.Fragment key={anioVal}>
                        <th className="px-4 py-4 font-semibold text-right border-l border-white/5 whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort(anioVal.toString())}>
                          {MESES.find(m => m.value === selectedMes)?.label} {anioVal} <SortIcon columnKey={anioVal.toString()} />
                        </th>
                        {idx > 0 && (
                          <th className="px-4 py-4 font-semibold text-center bg-emerald-900/20 border-l border-emerald-500/20 w-32 whitespace-nowrap text-emerald-200 cursor-pointer hover:bg-emerald-900/40 transition-colors" onClick={() => handleSort(`crec_${selectedAnios[idx-1]}_${anioVal}`)}>
                            Crec. '{selectedAnios[idx-1].toString().slice(-2)}→'{anioVal.toString().slice(-2)} <SortIcon columnKey={`crec_${selectedAnios[idx-1]}_${anioVal}`} />
                          </th>
                        )}
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedData.map((row) => (
                    <tr key={row.numero} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{row.numero}</td>
                      <td className="px-4 py-3 font-medium text-slate-300">{row.nombre}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{row.regional}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{row.provincia}</td>
                      
                      {selectedAnios.map((anioVal, idx) => {
                        const currentVal = row.valoresPorAnio[anioVal] || 0;
                        let growthNode = null;
                        
                        if (idx > 0) {
                          const prevAnioVal = selectedAnios[idx - 1];
                          const prevVal = row.valoresPorAnio[prevAnioVal] || 0;
                          const growth = calculateGrowth(currentVal, prevVal);
                          const isPositive = growth > 0;
                          const isNegative = growth < 0;
                          
                          let displayGrowth = growth.toFixed(1) + '%';
                          if (Math.abs(growth) >= 999.5) {
                            displayGrowth = (growth / 1000).toFixed(1) + 'k%';
                          }
                          
                          const tooltipTitle = prevVal < 50 && prevVal > 0
                            ? `Base muy baja para calcular crecimiento real (${prevAnioVal}: ${prevVal} visitas)` 
                            : `Crecimiento respecto al mismo mes del año anterior`;

                          growthNode = (
                            <td className="px-4 py-3 text-center bg-emerald-900/10 border-l border-emerald-500/10">
                              {prevVal === 0 && currentVal === 0 ? (
                                <span className="text-[var(--muted)] text-xs font-medium">-</span>
                              ) : (
                                <div 
                                  title={tooltipTitle}
                                  className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-bold w-full max-w-[80px] mx-auto transition-colors ${
                                  isPositive ? 'text-emerald-400 bg-emerald-400/10' :
                                  isNegative ? 'text-rose-400 bg-rose-400/10' :
                                  'text-slate-400 bg-slate-400/10'
                                } ${prevVal < 50 && prevVal > 0 ? 'cursor-help border border-dashed border-emerald-500/30 hover:bg-emerald-400/20' : ''}`}>
                                  {isPositive && <TrendingUp size={12} />}
                                  {isNegative && <TrendingDown size={12} />}
                                  {isPositive ? '+' : ''}{displayGrowth}
                                </div>
                              )}
                            </td>
                          );
                        }
                        
                        return (
                          <React.Fragment key={anioVal}>
                            <td className="px-4 py-3 text-right font-mono text-slate-300 border-l border-white/5">
                              {currentVal.toLocaleString()}
                            </td>
                            {growthNode}
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
