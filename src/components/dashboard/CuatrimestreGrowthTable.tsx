'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { getCuatrimestreData } from '@/app/actions';
import { RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp, PieChart, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';

const CUATRIMESTRES = [
  { value: 1, label: 'C1 (Ene-Abr)' },
  { value: 2, label: 'C2 (May-Ago)' },
  { value: 3, label: 'C3 (Sep-Dic)' },
];

export default function CuatrimestreGrowthTable({ filters }: { filters: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState<'intra' | 'inter'>('intra');
  
  const currentYear = new Date().getFullYear();
  const AVAILABLE_YEARS = Array.from({ length: currentYear - 2023 + 1 }, (_, i) => 2023 + i);

  // Estados para modo Intra-anual (QoQ)
  const [intraAnio, setIntraAnio] = useState<number>(currentYear);
  const [intraCuatrimestres, setIntraCuatrimestres] = useState<number[]>([1, 2, 3]);

  // Estados para modo Inter-anual (YoY)
  const [interCuatrimestre, setInterCuatrimestre] = useState<number>(1);
  const [interAnios, setInterAnios] = useState<number[]>([currentYear - 1, currentYear]);

  const [data, setData] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Calcular crecimiento
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
      } else if (sortConfig.key === 'estado') {
        aValue = a.estado || '';
        bValue = b.estado || '';
      } else if (sortConfig.key.startsWith('crec_')) {
        const [, prevKey, currKey] = sortConfig.key.split('_').map(Number);
        
        if (mode === 'intra') {
          aValue = calculateGrowth(a.valores[intraAnio]?.[currKey] || 0, a.valores[intraAnio]?.[prevKey] || 0);
          bValue = calculateGrowth(b.valores[intraAnio]?.[currKey] || 0, b.valores[intraAnio]?.[prevKey] || 0);
        } else {
          aValue = calculateGrowth(a.valores[currKey]?.[interCuatrimestre] || 0, a.valores[prevKey]?.[interCuatrimestre] || 0);
          bValue = calculateGrowth(b.valores[currKey]?.[interCuatrimestre] || 0, b.valores[prevKey]?.[interCuatrimestre] || 0);
        }
      } else {
        const val = parseInt(sortConfig.key);
        if (mode === 'intra') {
          aValue = a.valores[intraAnio]?.[val] || 0;
          bValue = b.valores[intraAnio]?.[val] || 0;
        } else {
          aValue = a.valores[val]?.[interCuatrimestre] || 0;
          bValue = b.valores[val]?.[interCuatrimestre] || 0;
        }
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig, mode, intraAnio, interCuatrimestre]);

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown size={14} className="ml-1 inline opacity-50" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="ml-1 inline text-purple-400" />
      : <ArrowDown size={14} className="ml-1 inline text-purple-400" />;
  };

  // Fetch data
  useEffect(() => {
    if (!isExpanded) return;

    let targetAnios = mode === 'intra' ? [intraAnio] : interAnios;
    if (targetAnios.length === 0) return;

    startTransition(async () => {
      const res = await getCuatrimestreData(filters, targetAnios);
      if (res.success) {
        setData(res.data || []);
      }
    });
  }, [filters, mode, intraAnio, interAnios, isExpanded]);

  const toggleIntraCuatrimestre = (val: number) => {
    setIntraCuatrimestres(prev => 
      prev.includes(val) ? prev.filter(c => c !== val).sort() : [...prev, val].sort()
    );
  };

  const toggleInterAnio = (val: number) => {
    setInterAnios(prev => 
      prev.includes(val) ? prev.filter(y => y !== val).sort() : [...prev, val].sort()
    );
  };

  const handleExport = () => {
    if (data.length === 0) return;
    
    const exportData = sortedData.map((row, idx) => {
      const isActiva = (row.estado || '').toLowerCase() === 'activa';
      const obj: any = { 
        '#': idx + 1,
        'No.': row.numero, 
        'Infoplaza': row.nombre, 
        'Regional': row.regional, 
        'Provincia': row.provincia,
        'Estado': isActiva ? 'Activa' : 'Cerrada',
      };
      
      if (mode === 'intra') {
        intraCuatrimestres.forEach((cVal, mIdx) => {
          const currentVal = row.valores[intraAnio]?.[cVal] || 0;
          if (mIdx > 0) {
            const prevCVal = intraCuatrimestres[mIdx - 1];
            const prevVal = row.valores[intraAnio]?.[prevCVal] || 0;
            const growth = calculateGrowth(currentVal, prevVal);
            obj[`Crecimiento C${prevCVal}->C${cVal} (%)`] = growth.toFixed(2);
          }
          obj[`Visitas C${cVal}`] = currentVal;
        });
      } else {
        interAnios.forEach((anioVal, aIdx) => {
          const currentVal = row.valores[anioVal]?.[interCuatrimestre] || 0;
          if (aIdx > 0) {
            const prevAnioVal = interAnios[aIdx - 1];
            const prevVal = row.valores[prevAnioVal]?.[interCuatrimestre] || 0;
            const growth = calculateGrowth(currentVal, prevVal);
            obj[`Crecimiento ${prevAnioVal}->${anioVal} (%)`] = growth.toFixed(2);
          }
          obj[`Visitas ${anioVal}`] = currentVal;
        });
      }
      return obj;
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cuatrimestres");
    const filename = mode === 'intra' 
      ? `Cuatrimestres_${intraAnio}.xlsx` 
      : `Cuatrimestres_C${interCuatrimestre}_Historico.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const renderGrowthNode = (currentVal: number, prevVal: number, prevLabel: string) => {
    const growth = calculateGrowth(currentVal, prevVal);
    const isPositive = growth > 0;
    const isNegative = growth < 0;
    
    let displayGrowth = growth.toFixed(1) + '%';
    if (Math.abs(growth) >= 999.5) {
      displayGrowth = (growth / 1000).toFixed(1) + 'k%';
    }
    
    const tooltipTitle = prevVal < 50 && prevVal > 0
      ? `Base muy baja para calcular crecimiento real (${prevLabel}: ${prevVal} visitas)` 
      : `Crecimiento respecto al período anterior`;

    return (
      <td className="px-4 py-3 text-center bg-purple-900/10 border-l border-purple-500/10">
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
  };

  return (
    <Card className="border border-white/10 shadow-xl mt-6 overflow-hidden bg-slate-900/40 backdrop-blur-sm">
      <div 
        className="bg-slate-900/50 p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
            <PieChart size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-200">Comparativa por Cuatrimestres</h3>
              {data.length > 0 && isExpanded && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Mostrando {sortedData.length} infoplazas
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--muted)]">Analiza el rendimiento por períodos de 4 meses (C1: Ene-Abr, C2: May-Ago, C3: Sep-Dic)</p>
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
          {/* Selector de Modo */}
          <div className="p-4 bg-slate-950/40 border-b border-white/5 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode('intra')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'intra'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                Comparar Cuatrimestres de un Año
              </button>
              <button
                onClick={() => setMode('inter')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'inter'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                Mismo Cuatrimestre entre Años
              </button>
            </div>
            {data.length > 0 && (
              <span className="text-xs text-slate-400 font-medium">
                Mostrando <strong className="text-slate-200">{sortedData.length}</strong> infoplazas
              </span>
            )}
          </div>

          {/* Controles Dinámicos */}
          <div className="p-4 bg-slate-950/20 border-b border-white/5 flex flex-wrap gap-6 items-center">
            {mode === 'intra' ? (
              <>
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Año a Analizar</span>
                  <select 
                    value={intraAnio} 
                    onChange={(e) => setIntraAnio(Number(e.target.value))}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50"
                  >
                    {AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cuatrimestres a Comparar</span>
                  <div className="flex gap-2">
                    {CUATRIMESTRES.map(c => (
                      <button
                        key={c.value}
                        onClick={() => toggleIntraCuatrimestre(c.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all border ${
                          intraCuatrimestres.includes(c.value) 
                            ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20' 
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cuatrimestre Base</span>
                  <select 
                    value={interCuatrimestre} 
                    onChange={(e) => setInterCuatrimestre(Number(e.target.value))}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50"
                  >
                    {CUATRIMESTRES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Años a Comparar</span>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_YEARS.map(y => (
                      <button
                        key={y}
                        onClick={() => toggleInterAnio(y)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all border ${
                          interAnios.includes(y) 
                            ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20' 
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Tabla */}
          <div className="relative overflow-x-auto min-h-[200px] max-h-[500px] custom-scrollbar">
            {isPending && (
              <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mb-3" />
                <span className="text-sm font-semibold text-slate-300">Calculando cuatrimestres...</span>
              </div>
            )}

            {(mode === 'intra' ? intraCuatrimestres.length : interAnios.length) < 2 ? (
              <div className="p-10 flex flex-col items-center justify-center text-center text-[var(--muted)]">
                <PieChart size={32} className="mb-3 opacity-20" />
                <p className="text-sm">Selecciona al menos 2 períodos para ver el crecimiento comparativo.</p>
              </div>
            ) : data.length === 0 && !isPending ? (
              <div className="p-10 flex flex-col items-center justify-center text-center text-[var(--muted)]">
                <p className="text-sm">No hay datos registrados para la selección actual.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-300 uppercase bg-slate-900/90 sticky top-0 z-10 shadow-md">
                  <tr>
                    <th className="px-3 py-4 font-semibold w-12 text-center whitespace-nowrap text-slate-400">
                      #
                    </th>
                    <th className="px-4 py-4 font-semibold w-16 whitespace-nowrap cursor-pointer hover:bg-slate-800" onClick={() => handleSort('numero')}>
                      No. <SortIcon columnKey="numero" />
                    </th>
                    <th className="px-4 py-4 font-semibold min-w-[200px] whitespace-nowrap cursor-pointer hover:bg-slate-800" onClick={() => handleSort('nombre')}>
                      Infoplaza <SortIcon columnKey="nombre" />
                    </th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-800" onClick={() => handleSort('regional')}>
                      Regional <SortIcon columnKey="regional" />
                    </th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-800" onClick={() => handleSort('provincia')}>
                      Provincia <SortIcon columnKey="provincia" />
                    </th>
                    <th className="px-4 py-4 font-semibold whitespace-nowrap cursor-pointer hover:bg-slate-800 text-center" onClick={() => handleSort('estado')}>
                      Estado <SortIcon columnKey="estado" />
                    </th>
                    {mode === 'intra' ? intraCuatrimestres.map((cVal, idx) => (
                      <React.Fragment key={cVal}>
                        <th className="px-4 py-4 font-semibold text-right border-l border-white/5 whitespace-nowrap cursor-pointer hover:bg-slate-800" onClick={() => handleSort(cVal.toString())}>
                          Visitas C{cVal} {intraAnio} <SortIcon columnKey={cVal.toString()} />
                        </th>
                        {idx > 0 && (
                          <th className="px-4 py-4 font-semibold text-center bg-purple-900/20 border-l border-purple-500/20 w-32 whitespace-nowrap text-purple-200 cursor-pointer hover:bg-purple-900/40" onClick={() => handleSort(`crec_${intraCuatrimestres[idx-1]}_${cVal}`)}>
                            Crec. C{intraCuatrimestres[idx-1]}→C{cVal} <SortIcon columnKey={`crec_${intraCuatrimestres[idx-1]}_${cVal}`} />
                          </th>
                        )}
                      </React.Fragment>
                    )) : interAnios.map((anioVal, idx) => (
                      <React.Fragment key={anioVal}>
                        <th className="px-4 py-4 font-semibold text-right border-l border-white/5 whitespace-nowrap cursor-pointer hover:bg-slate-800" onClick={() => handleSort(anioVal.toString())}>
                          Visitas C{interCuatrimestre} {anioVal} <SortIcon columnKey={anioVal.toString()} />
                        </th>
                        {idx > 0 && (
                          <th className="px-4 py-4 font-semibold text-center bg-purple-900/20 border-l border-purple-500/20 w-32 whitespace-nowrap text-purple-200 cursor-pointer hover:bg-purple-900/40" onClick={() => handleSort(`crec_${interAnios[idx-1]}_${anioVal}`)}>
                            Crec. '{interAnios[idx-1].toString().slice(-2)}→'{anioVal.toString().slice(-2)} <SortIcon columnKey={`crec_${interAnios[idx-1]}_${anioVal}`} />
                          </th>
                        )}
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedData.map((row, index) => {
                    const isActiva = (row.estado || '').toLowerCase() === 'activa';
                    return (
                      <tr key={row.numero} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-3 py-3 text-slate-500 font-mono text-xs text-center">{index + 1}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{row.numero}</td>
                        <td className="px-4 py-3 font-medium text-slate-300">{row.nombre}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{row.regional}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{row.provincia}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isActiva 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {isActiva ? 'Activa' : 'Cerrada'}
                          </span>
                        </td>
                        
                        {mode === 'intra' ? intraCuatrimestres.map((cVal, idx) => {
                          const currentVal = row.valores[intraAnio]?.[cVal] || 0;
                          return (
                            <React.Fragment key={cVal}>
                              <td className="px-4 py-3 text-right font-mono text-slate-300 border-l border-white/5">
                                {currentVal.toLocaleString()}
                              </td>
                              {idx > 0 && renderGrowthNode(currentVal, row.valores[intraAnio]?.[intraCuatrimestres[idx-1]] || 0, `C${intraCuatrimestres[idx-1]}`)}
                            </React.Fragment>
                          );
                        }) : interAnios.map((anioVal, idx) => {
                          const currentVal = row.valores[anioVal]?.[interCuatrimestre] || 0;
                          return (
                            <React.Fragment key={anioVal}>
                              <td className="px-4 py-3 text-right font-mono text-slate-300 border-l border-white/5">
                                {currentVal.toLocaleString()}
                              </td>
                              {idx > 0 && renderGrowthNode(currentVal, row.valores[interAnios[idx-1]]?.[interCuatrimestre] || 0, `'${interAnios[idx-1].toString().slice(-2)}`)}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
