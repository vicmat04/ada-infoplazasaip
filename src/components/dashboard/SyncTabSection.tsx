'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { 
  ComposedChart,
  Line,
  Area,
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';
import { 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Wifi, 
  Eye, 
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  X
} from 'lucide-react';
import { getSyncPageData } from '../../app/actions';

interface SyncKpis {
  totalActivas: number;
  alDia: number;
  paraRevision: number;
  sinReporte: number;
  casosCriticos: number;
  promedioRetraso: number;
  cumplimientoPorcentaje: number;
  sincronizadasSinUso: number;
}

interface DelayDistributionItem {
  rango: string;
  cantidad: number;
}

interface ComplianceTrendItem {
  fecha: string;
  alDia: number;
  paraRevision: number;
  total: number;
  cumplimiento: number;
  regionales?: { [key: string]: number };
}

interface SyncRegionalItem {
  regional: string;
  alDia: number;
  revision: number;
  sinReporte: number;
  total: number;
  cumplimiento: number;
}

interface SyncTableRow {
  numero: number;
  nombre: string;
  regional: string;
  provincia: string;
  distrito: string;
  corregimiento: string;
  atenciones: number;
  dias_sin_sinc: number | null;
  sync_estado: string;
  observacion: string;
}

interface SyncData {
  syncKpis: SyncKpis;
  delayDistribution: DelayDistributionItem[];
  complianceTrend: ComplianceTrendItem[];
  regionalRows: SyncRegionalItem[];
  tableRows: SyncTableRow[];
  ultimoCorteDate: string;
}

interface SyncTabSectionProps {
  filters: {
    anio: number;
    mes: string;
    regional: string;
    provincia: string;
    infoplaza: number;
  };
  onViewDetail: (row: any) => void;
}

export default function SyncTabSection({ filters, onViewDetail }: SyncTabSectionProps) {
  const [syncData, setSyncData] = useState<SyncData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para Tabla de Alerta Crítica (Atraso > 30 días)
  const [criticalVisibleCount, setCriticalVisibleCount] = useState(10);

  // Estados para Tabla de Alerta Preventiva (Atraso entre 11 y 30 días)
  const [preventiveVisibleCount, setPreventiveVisibleCount] = useState(10);

  // Estados para Tabla de Conectividad Saludable (Al día)
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState<keyof SyncTableRow>('numero');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showTotalGeneral, setShowTotalGeneral] = useState(true);
  const [hoveredRegional, setHoveredRegional] = useState<string | null>(null);
  
  // Estado para el panel lateral de detalles de Sincronizadas Sin Datos
  const [isSinDatosPanelOpen, setIsSinDatosPanelOpen] = useState(false);

  const sincSinDatosRows = useMemo(() => {
    if (!syncData?.tableRows) return [];
    return syncData.tableRows.filter(
      row => row.sync_estado === 'Al día' && row.atenciones === 0
    );
  }, [syncData?.tableRows]);

  // Periodo dinámico abreviado para etiquetas (ej. 'jul-26', 'año-26', 'acumulado')
  const periodoAbreviado = useMemo(() => {
    if (filters.anio === 0) return 'acumulado';
    const anioCorto = String(filters.anio).slice(-2);
    if (filters.mes) {
      const mesesAbrev: Record<string, string> = {
        'Enero': 'ene', 'Febrero': 'feb', 'Marzo': 'mar', 'Abril': 'abr',
        'Mayo': 'may', 'Junio': 'jun', 'Julio': 'jul', 'Agosto': 'ago',
        'Septiembre': 'sep', 'Octubre': 'oct', 'Noviembre': 'nov', 'Diciembre': 'dic'
      };
      const mesAbrev = mesesAbrev[filters.mes] || filters.mes.slice(0, 3).toLowerCase();
      return `${mesAbrev}-${anioCorto}`;
    }
    return `año-${anioCorto}`;
  }, [filters.mes, filters.anio]);

  // Cálculo de la variación del cumplimiento porcentual respecto al mes anterior
  const variacionSincronizacion = useMemo(() => {
    if (!syncData?.complianceTrend || !syncData.ultimoCorteDate) return null;
    const trend = syncData.complianceTrend;
    
    // 1. Obtener año y mes del último corte (ej: '2026-07-17' -> 2026 y 7)
    const parts = syncData.ultimoCorteDate.split('-');
    const currentYear = parseInt(parts[0], 10);
    const currentMonth = parseInt(parts[1], 10);
    
    // 2. Calcular año y mes anterior
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    
    const currentPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const prevPrefix = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    
    // 3. Filtrar puntos
    const currentPoints = trend.filter(item => item.fecha && item.fecha.startsWith(currentPrefix));
    const prevPoints = trend.filter(item => item.fecha && item.fecha.startsWith(prevPrefix));
    
    if (currentPoints.length === 0 || prevPoints.length === 0) return null;
    
    // 4. Calcular cumplimientos promedio ponderados
    const currentAlDia = currentPoints.reduce((sum, c) => sum + (c.alDia || 0), 0);
    const currentTotal = currentPoints.reduce((sum, c) => sum + (c.total || 0), 0);
    
    const prevAlDia = prevPoints.reduce((sum, c) => sum + (c.alDia || 0), 0);
    const prevTotal = prevPoints.reduce((sum, c) => sum + (c.total || 0), 0);
    
    if (currentTotal === 0 || prevTotal === 0) return null;
    
    const pctCurrent = (currentAlDia / currentTotal) * 100;
    const pctPrev = (prevAlDia / prevTotal) * 100;
    
    const diff = pctCurrent - pctPrev;
    return {
      valor: Math.abs(diff).toFixed(1),
      esPositivo: diff >= 0,
      mesAnteriorLabel: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][prevMonth - 1]
    };
  }, [syncData]);

  // Cargar datos reactivamente al cambiar filtros
  useEffect(() => {
    let active = true;
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      const res = await getSyncPageData(filters);
      if (!active) return;
      if (res.success && res.data) {
        setSyncData(res.data);
      } else {
        setError(res.error || 'No se pudieron cargar los datos de sincronización');
      }
      setIsLoading(false);
    }
    fetchData();
    // Resetear contadores al filtrar
    setCriticalVisibleCount(10);
    setPreventiveVisibleCount(10);
    setCurrentPage(1);
    return () => {
      active = false;
    };
  }, [filters]);

  // --- FILTRADO Y PROCESAMIENTO DE DATOS ---

  const MES_A_NUMERO: { [key: string]: number } = useMemo(() => ({
    'Enero': 1, 'Febrero': 2, 'Marzo': 3, 'Abril': 4, 'Mayo': 5, 'Junio': 6,
    'Julio': 7, 'Agosto': 8, 'Septiembre': 9, 'Octubre': 10, 'Noviembre': 11, 'Diciembre': 12
  }), []);

  const chartTitle = useMemo(() => {
    let periodText = '';
    if (filters.anio === 0) {
      periodText = 'Todos los años';
    } else {
      periodText = filters.anio.toString();
    }
    
    if (filters.mes) {
      periodText = `${filters.mes} ${filters.anio === 0 ? '(Todos los años)' : filters.anio}`;
    }

    let tipoTendencia = 'Histórica';
    if (filters.anio === 0 && filters.mes === '') {
      tipoTendencia = 'Trimestral';
    } else if (filters.anio > 0 && filters.mes === '') {
      tipoTendencia = 'Mensual';
    } else if (filters.mes !== '') {
      tipoTendencia = 'Detallada';
    }

    return `Tendencia ${tipoTendencia} de Cumplimiento de Red (${periodText})`;
  }, [filters.anio, filters.mes]);

  // Lista dinámica de regionales extraída de la data de Supabase
  const listadoRegionales = useMemo(() => {
    if (!syncData || !syncData.regionalRows) return [];
    return syncData.regionalRows.map(r => r.regional).filter(Boolean);
  }, [syncData]);

  // Helper para generar colores HSL dinámicos para las líneas de regionales
  const getRegionalColor = (index: number, total: number) => {
    if (total <= 1) return '#10b981';
    const hue = (index * (360 / total)) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  const processedComplianceTrend = useMemo(() => {
    const trend = syncData?.complianceTrend || [];
    
    // Caso A: Todos los años
    if (filters.anio === 0 && filters.mes === '') {
      const quartersMap: { 
        [key: string]: { 
          alDia: number; 
          paraRevision: number; 
          total: number;
          regionalesVal: { [reg: string]: { sum: number; count: number } }
        } 
      } = {};
      
      trend.forEach(item => {
        if (!item.fecha) return;
        const anio = item.fecha.substring(0, 4);
        const mesNum = parseInt(item.fecha.substring(5, 7), 10);
        
        let quarter = 'Q1';
        if (mesNum >= 4 && mesNum <= 6) quarter = 'Q2';
        else if (mesNum >= 7 && mesNum <= 9) quarter = 'Q3';
        else if (mesNum >= 10 && mesNum <= 12) quarter = 'Q4';
        
        const key = `${quarter} '${anio.substring(2, 4)}`;
        
        if (!quartersMap[key]) {
          quartersMap[key] = { alDia: 0, paraRevision: 0, total: 0, regionalesVal: {} };
        }
        
        quartersMap[key].alDia += item.alDia || 0;
        quartersMap[key].paraRevision += item.paraRevision || 0;
        quartersMap[key].total += item.total || 0;

        if (item.regionales) {
          Object.keys(item.regionales).forEach(reg => {
            const val = item.regionales![reg];
            if (val !== null && val !== undefined) {
              if (!quartersMap[key].regionalesVal[reg]) {
                quartersMap[key].regionalesVal[reg] = { sum: 0, count: 0 };
              }
              quartersMap[key].regionalesVal[reg].sum += val;
              quartersMap[key].regionalesVal[reg].count += 1;
            }
          });
        }
      });

      return Object.keys(quartersMap).map(key => {
        const q = quartersMap[key];
        const res: any = {
          fecha: key,
          alDia: q.alDia,
          paraRevision: q.paraRevision,
          total: q.total,
          cumplimiento: q.total > 0 ? parseFloat(((q.alDia / q.total) * 100).toFixed(1)) : 0
        };

        Object.keys(q.regionalesVal).forEach(reg => {
          const r = q.regionalesVal[reg];
          res[reg] = r.count > 0 ? parseFloat((r.sum / r.count).toFixed(1)) : 0;
        });

        return res;
      });
    }

    // Caso B: Un año
    if (filters.anio > 0 && filters.mes === '') {
      const mesesMap: { 
        [key: string]: { 
          alDia: number; 
          paraRevision: number; 
          total: number; 
          ord: number;
          regionalesVal: { [reg: string]: { sum: number; count: number } }
        } 
      } = {};
      const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

      const filteredByYear = trend.filter(item => item.fecha && item.fecha.startsWith(filters.anio.toString()));

      filteredByYear.forEach(item => {
        const mesNum = parseInt(item.fecha.substring(5, 7), 10);
        const label = `${mesesNombres[mesNum - 1]} '${filters.anio.toString().substring(2, 4)}`;

        if (!mesesMap[label]) {
          mesesMap[label] = { alDia: 0, paraRevision: 0, total: 0, ord: mesNum, regionalesVal: {} };
        }

        mesesMap[label].alDia += item.alDia || 0;
        mesesMap[label].paraRevision += item.paraRevision || 0;
        mesesMap[label].total += item.total || 0;

        if (item.regionales) {
          Object.keys(item.regionales).forEach(reg => {
            const val = item.regionales![reg];
            if (val !== null && val !== undefined) {
              if (!mesesMap[label].regionalesVal[reg]) {
                mesesMap[label].regionalesVal[reg] = { sum: 0, count: 0 };
              }
              mesesMap[label].regionalesVal[reg].sum += val;
              mesesMap[label].regionalesVal[reg].count += 1;
            }
          });
        }
      });

      return Object.keys(mesesMap)
        .map(key => {
          const m = mesesMap[key];
          const res: any = {
            fecha: key,
            alDia: m.alDia,
            paraRevision: m.paraRevision,
            total: m.total,
            cumplimiento: m.total > 0 ? parseFloat(((m.alDia / m.total) * 100).toFixed(1)) : 0,
            ord: m.ord
          };

          Object.keys(m.regionalesVal).forEach(reg => {
            const r = m.regionalesVal[reg];
            res[reg] = r.count > 0 ? parseFloat((r.sum / r.count).toFixed(1)) : 0;
          });

          return res;
        })
        .sort((a, b) => a.ord - b.ord);
    }

    // Caso C: Un mes seleccionado
    if (filters.mes !== '') {
      const targetMesNum = MES_A_NUMERO[filters.mes];
      if (!targetMesNum) return [];

      let filteredTrend = trend.filter(item => {
        if (!item.fecha) return false;
        const itemAnio = parseInt(item.fecha.substring(0, 4), 10);
        const itemMes = parseInt(item.fecha.substring(5, 7), 10);
        return (filters.anio === 0 || itemAnio === filters.anio) && itemMes === targetMesNum;
      });

      // Ponderación dinámica si hay más de 12 puntos
      if (filteredTrend.length > 12) {
        const maxPoints = 8;
        const groupSize = Math.ceil(filteredTrend.length / maxPoints);
        const weightedTrend: any[] = [];
        
        for (let i = 0; i < filteredTrend.length; i += groupSize) {
          const chunk = filteredTrend.slice(i, i + groupSize);
          const sumAlDia = chunk.reduce((sum, c) => sum + c.alDia, 0);
          const sumParaRevision = chunk.reduce((sum, c) => sum + c.paraRevision, 0);
          const sumTotal = chunk.reduce((sum, c) => sum + c.total, 0);
          
          const startDay = chunk[0].fecha.substring(8, 10);
          const endDay = chunk[chunk.length - 1].fecha.substring(8, 10);
          const label = startDay === endDay 
            ? startDay 
            : `${startDay} al ${endDay}`;

          // Promediar cumplimientos regionales por grupo
          const regionalesVal: { [reg: string]: { sum: number; count: number } } = {};
          chunk.forEach(item => {
            if (item.regionales) {
              Object.keys(item.regionales).forEach(reg => {
                const val = item.regionales![reg];
                if (val !== null && val !== undefined) {
                  if (!regionalesVal[reg]) {
                    regionalesVal[reg] = { sum: 0, count: 0 };
                  }
                  regionalesVal[reg].sum += val;
                  regionalesVal[reg].count += 1;
                }
              });
            }
          });
          
          const resPoint: any = {
            fecha: label,
            alDia: sumAlDia,
            paraRevision: sumParaRevision,
            total: sumTotal,
            cumplimiento: sumTotal > 0 ? parseFloat(((sumAlDia / sumTotal) * 100).toFixed(1)) : 0
          };

          Object.keys(regionalesVal).forEach(reg => {
            const r = regionalesVal[reg];
            resPoint[reg] = r.count > 0 ? parseFloat((r.sum / r.count).toFixed(1)) : 0;
          });

          weightedTrend.push(resPoint);
        }
        return weightedTrend;
      }

      // Si no hay más de 12 puntos, devolvemos los puntos individuales formateando la fecha para que sea solo el día (ej: "09")
      return filteredTrend.map(item => {
        const dia = item.fecha.substring(8, 10);
        const res: any = {
          ...item,
          fecha: dia
        };
        if (item.regionales) {
          Object.keys(item.regionales).forEach(reg => {
            res[reg] = item.regionales![reg];
          });
        }
        return res;
      });
    }

    return trend;
  }, [syncData?.complianceTrend, filters.anio, filters.mes, MES_A_NUMERO]);

  // Obtener casos con retraso crítico (> 30 días)
  const allCriticalRows = useMemo(() => {
    if (!syncData) return [];
    return syncData.tableRows.filter(row => 
      row.dias_sin_sinc !== null && row.dias_sin_sinc > 30
    );
  }, [syncData]);

  // Porción visible de casos críticos
  const visibleCriticalRows = useMemo(() => {
    return allCriticalRows.slice(0, criticalVisibleCount);
  }, [allCriticalRows, criticalVisibleCount]);

  // Handler para "Mostrar más" en Alertas Críticas
  const handleShowMoreCritical = () => {
    setCriticalVisibleCount(prev => Math.min(prev + 10, allCriticalRows.length));
  };

  // Obtener casos con retraso preventivo (11 a 30 días)
  const allPreventiveRows = useMemo(() => {
    if (!syncData) return [];
    return syncData.tableRows.filter(row => 
      row.dias_sin_sinc !== null && row.dias_sin_sinc > 10 && row.dias_sin_sinc <= 30
    );
  }, [syncData]);

  // Porción visible de casos preventivos
  const visiblePreventiveRows = useMemo(() => {
    return allPreventiveRows.slice(0, preventiveVisibleCount);
  }, [allPreventiveRows, preventiveVisibleCount]);

  // Handler para "Mostrar más" en Alertas Preventivas
  const handleShowMorePreventive = () => {
    setPreventiveVisibleCount(prev => Math.min(prev + 10, allPreventiveRows.length));
  };

  // Filtrar gráfico de distribución para rangos > 10 días
  const filteredDelayDistribution = useMemo(() => {
    if (!syncData) return [];
    return syncData.delayDistribution.filter(item => 
      item.rango === '11-15 días' || 
      item.rango === '16-30 días' || 
      item.rango === '+30 días'
    );
  }, [syncData]);

  // Tabla General de Conectividad Saludable (Al día: <= 10 días)
  const processedGeneralRows = useMemo(() => {
    if (!syncData) return [];
    
    // Filtro estricto de buena salud: <= 10 días
    let rows = syncData.tableRows.filter(row => 
      row.dias_sin_sinc !== null && row.dias_sin_sinc <= 10
    );

    // 1. Filtrar por término de búsqueda
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(row => 
        row.nombre.toLowerCase().includes(term) || 
        row.numero.toString().includes(term) ||
        row.regional.toLowerCase().includes(term) ||
        row.provincia.toLowerCase().includes(term)
      );
    }

    // 2. Ordenar
    rows.sort((a, b) => {
      let aVal: any = a[sortColumn];
      let bVal: any = b[sortColumn];

      if (aVal === null || aVal === undefined) aVal = sortDirection === 'desc' ? -999999 : 999999;
      if (bVal === null || bVal === undefined) bVal = sortDirection === 'desc' ? -999999 : 999999;

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      } else {
        return sortDirection === 'asc' 
          ? aVal - bVal 
          : bVal - aVal;
      }
    });

    return rows;
  }, [syncData, searchTerm, sortColumn, sortDirection]);

  // Paginación de la Tabla General
  const paginatedGeneralRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedGeneralRows.slice(startIndex, startIndex + pageSize);
  }, [processedGeneralRows, currentPage, pageSize]);

  const totalPages = Math.ceil(processedGeneralRows.length / pageSize) || 1;

  // Cambiar ordenamiento
  const handleSort = (column: keyof SyncTableRow) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Exportar vista saludable a CSV
  const handleExportCSV = () => {
    if (processedGeneralRows.length === 0) return;

    const headers = ['Nro Infoplaza', 'Nombre', 'Regional', 'Provincia', 'Distrito', 'Corregimiento', 'Dias Sin Sincronizar', 'Estado Sincronizacion', 'Atenciones Periodo', 'Observacion'];
    const csvRows = processedGeneralRows.map(row => [
      row.numero,
      `"${row.nombre.replace(/"/g, '""')}"`,
      `"${row.regional}"`,
      `"${row.provincia}"`,
      `"${row.distrito}"`,
      `"${row.corregimiento}"`,
      row.dias_sin_sinc !== null ? row.dias_sin_sinc : 'N/A',
      `"${row.sync_estado}"`,
      row.atenciones,
      `"${(row.observacion || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const regionalFilename = filters.regional ? `_${filters.regional.trim().replace(/\s+/g, '_')}` : '';
    link.setAttribute('download', `reporte_sincronizacion_saludable${regionalFilename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar casos críticos (>30 días) a CSV
  const handleExportCriticalCSV = () => {
    if (allCriticalRows.length === 0) return;

    const headers = ['Nro Infoplaza', 'Nombre', 'Regional', 'Provincia', 'Distrito', 'Corregimiento', 'Dias Sin Sincronizar', 'Estado Sincronizacion', 'Diagnostico/Observacion'];
    const csvRows = allCriticalRows.map(row => [
      row.numero,
      `"${row.nombre.replace(/"/g, '""')}"`,
      `"${row.regional}"`,
      `"${row.provincia}"`,
      `"${row.distrito}"`,
      `"${row.corregimiento}"`,
      row.dias_sin_sinc,
      `"${row.sync_estado}"`,
      `"${(row.observacion || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const regionalFilename = filters.regional ? `_${filters.regional.trim().replace(/\s+/g, '_')}` : '';
    link.setAttribute('download', `reporte_sincronizacion_critica${regionalFilename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar casos en revisión preventora (11-30 días) a CSV
  const handleExportPreventiveCSV = () => {
    if (allPreventiveRows.length === 0) return;

    const headers = ['Nro Infoplaza', 'Nombre', 'Regional', 'Provincia', 'Distrito', 'Corregimiento', 'Dias Sin Sincronizar', 'Estado Sincronizacion', 'Diagnostico/Observacion'];
    const csvRows = allPreventiveRows.map(row => [
      row.numero,
      `"${row.nombre.replace(/"/g, '""')}"`,
      `"${row.regional}"`,
      `"${row.provincia}"`,
      `"${row.distrito}"`,
      `"${row.corregimiento}"`,
      row.dias_sin_sinc,
      `"${row.sync_estado}"`,
      `"${(row.observacion || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const regionalFilename = filters.regional ? `_${filters.regional.trim().replace(/\s+/g, '_')}` : '';
    link.setAttribute('download', `reporte_sincronizacion_revision${regionalFilename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar sincronizadas sin datos a CSV
  const handleExportSinDatosCSV = () => {
    if (sincSinDatosRows.length === 0) return;

    const periodoTexto = filters.mes && filters.anio > 0
      ? `${filters.mes} ${filters.anio}`
      : filters.anio > 0
        ? `Año ${filters.anio}`
        : 'Todos los años';

    const fechaExportacion = new Date().toLocaleDateString('es-PA');

    const headers = ['Nro Infoplaza', 'Nombre', 'Regional', 'Provincia', 'Dias Sin Sincronizar', 'Ultima Sincronizacion Estimada', 'Atenciones Periodo', 'Periodo Sin Datos', 'Fecha de Exportacion'];
    const csvRows = sincSinDatosRows.map(row => {
      let fechaSincEstimada = 'Sin reporte';
      if (row.dias_sin_sinc !== null && syncData?.ultimoCorteDate) {
        try {
          const date = new Date(syncData.ultimoCorteDate);
          date.setDate(date.getDate() - row.dias_sin_sinc);
          fechaSincEstimada = date.toLocaleDateString('es-PA');
        } catch {
          fechaSincEstimada = 'Error de cálculo';
        }
      }
      return [
        row.numero,
        `"${row.nombre.replace(/"/g, '""')}"`,
        `"${row.regional}"`,
        `"${row.provincia}"`,
        row.dias_sin_sinc,
        `"${fechaSincEstimada}"`,
        row.atenciones,
        `"${periodoTexto}"`,
        `"${fechaExportacion}"`
      ];
    });

    const csvContent = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // Generar sufijos de archivo limpios y seguros para regional y fecha
    const regionalSuffix = filters.regional ? `_${filters.regional.trim().replace(/\s+/g, '_').toLowerCase()}` : '';
    const dateObj = new Date();
    const dia = String(dateObj.getDate()).padStart(2, '0');
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const anio = dateObj.getFullYear();
    const dateSuffix = `_${dia}-${mes}-${anio}`;

    link.setAttribute('download', `reporte_sincronizadas_sin_datos${regionalSuffix}${dateSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- RENDERIZADO DE SKELETONS ---
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* KPI Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-28 bg-white/5 border-white/5 rounded-2xl"><div /></Card>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="h-80 lg:col-span-2 bg-white/5 border-white/5 rounded-2xl"><div /></Card>
          <Card className="h-80 bg-white/5 border-white/5 rounded-2xl"><div /></Card>
        </div>

        {/* Table Skeleton */}
        <Card className="h-96 bg-white/5 border-white/5 rounded-2xl"><div /></Card>
      </div>
    );
  }

  if (error || !syncData) {
    return (
      <Card className="border border-rose-500/20 bg-rose-500/5 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
        <AlertCircle className="text-rose-500 w-12 h-12 mb-3" />
        <h4 className="text-lg font-bold text-white mb-1">Error de carga de datos</h4>
        <p className="text-sm text-rose-300 max-w-md">{error || 'No se han recibido datos del servidor.'}</p>
      </Card>
    );
  }

  const { syncKpis, delayDistribution, complianceTrend, regionalRows, ultimoCorteDate } = syncData;





  // Leyenda personalizada interactiva con checkbox y separador
  const CustomLegend = (props: any) => {
    const { payload } = props;
    if (!payload) return null;

    const regionales = payload.filter((item: any) => item.dataKey !== 'cumplimiento');

    return (
      <div className="flex flex-wrap items-center justify-between gap-4 text-[10px] mb-3 px-2">
        {/* Regionales */}
        <div className="flex flex-wrap items-center gap-3">
          {regionales.map((entry: any, index: number) => {
            const isHovered = hoveredRegional === entry.value;
            const hasActiveHover = hoveredRegional !== null;
            return (
              <div 
                key={`item-${index}`} 
                className="flex items-center gap-1.5 cursor-pointer transition-all duration-200"
                style={{
                  opacity: hasActiveHover ? (isHovered ? 1.0 : 0.3) : 0.85
                }}
                onMouseEnter={() => setHoveredRegional(entry.value)}
                onMouseLeave={() => setHoveredRegional(null)}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-300 font-semibold">{entry.value}</span>
              </div>
            );
          })}
        </div>

        {/* Promedio General con Checkbox Interactivo (Siempre Visible) */}
        <div className="flex items-center gap-3 pl-3 border-l border-white/10">
          <label 
            className="flex items-center gap-2 cursor-pointer select-none transition-all duration-200"
            style={{
              opacity: hoveredRegional !== null ? (hoveredRegional === 'Promedio General' ? 1.0 : 0.3) : 0.85
            }}
            onMouseEnter={() => setHoveredRegional('Promedio General')}
            onMouseLeave={() => setHoveredRegional(null)}
          >
            <input
              type="checkbox"
              checked={showTotalGeneral}
              onChange={(e) => setShowTotalGeneral(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-blue-500 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer accent-blue-500"
            />
            <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
            <span className="text-slate-200 font-bold">Promedio General</span>
          </label>
        </div>
      </div>
    );
  };

  // Custom tooltips para gráficos
  const CustomIntervalTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass rounded-lg p-2.5 text-xs border border-white/10 shadow-xl">
          <p className="font-bold text-slate-300 mb-1">{payload[0].name}</p>
          <p className="text-white font-extrabold text-sm">
            {payload[0].value} <span className="text-[10px] text-slate-400 font-normal">infoplazas</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const typeLabel = label.includes('Q') 
        ? 'Trimestre' 
        : (label.includes("'") && !label.includes('-')) 
          ? 'Mes' 
          : label.includes('al') 
            ? 'Rango de Días' 
            : 'Día';
      
      const globalItem = payload.find((item: any) => item.dataKey === 'cumplimiento');
      const regionalItems = payload.filter((item: any) => item.dataKey !== 'cumplimiento');
      
      return (
        <div className="glass rounded-lg p-3 text-xs border border-white/10 shadow-xl space-y-1.5 max-h-60 overflow-y-auto">
          <p className="font-bold text-slate-300 mb-1">{typeLabel}: {label}</p>
          
          {globalItem && (
            <div className="flex justify-between gap-4 font-extrabold text-blue-400 pb-1 border-b border-white/5">
              <span>{globalItem.name}:</span>
              <span>{globalItem.value}%</span>
            </div>
          )}
          
          {regionalItems.length > 0 && (
            <div className="space-y-1 pt-1">
              {regionalItems.map((item: any) => (
                <div key={item.name} className="flex justify-between gap-4 font-medium" style={{ color: item.stroke || item.color }}>
                  <span>{item.name}:</span>
                  <span className="text-slate-200 font-bold">{item.value}%</span>
                </div>
              ))}
            </div>
          )}
          
          {globalItem && (
            <div className="border-t border-white/5 pt-1 mt-1 text-[9px] text-slate-400 flex gap-2 justify-between">
              <span>Al día: {globalItem.payload.alDia}</span>
              <span>Revisión: {globalItem.payload.paraRevision}</span>
              <span>Total: {globalItem.payload.total}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 1. SECCIÓN DE KPIS OPERATIVOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* KPI 1: Sincronización Actual */}
        <Card className="glass glass-hover flex flex-col justify-between p-4.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block flex items-center gap-1">
              <Wifi size={12} className="text-emerald-500" />
              Sincronización Actual
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <h4 className="text-2xl font-black text-emerald-400">{Number(syncKpis.cumplimientoPorcentaje).toFixed(1)}%</h4>
              {variacionSincronizacion && (
                <span 
                  className={`text-[9px] font-extrabold flex items-center gap-0.5 shrink-0 px-1.5 py-0.5 rounded border ${
                    variacionSincronizacion.esPositivo
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                  }`}
                  title={`Variación respecto al promedio de ${variacionSincronizacion.mesAnteriorLabel}`}
                >
                  {variacionSincronizacion.esPositivo ? '▲' : '▼'} {variacionSincronizacion.valor}%
                </span>
              )}
            </div>
          </div>
          <div className="border-t border-white/5 pt-2 mt-2 space-y-1">
            <p className="text-[10px] text-slate-400 font-semibold">{syncKpis.alDia} de {syncKpis.totalActivas} sincronizadas al día</p>
            {ultimoCorteDate && (
              <div
                className="flex items-center gap-1 text-[9px] font-medium text-slate-500 cursor-help"
                title="El porcentaje refleja el estado de sincronización al último corte disponible. No varía con el período seleccionado en los filtros."
              >
                <Calendar size={9} className="text-blue-400 shrink-0" />
                <span>Corte actual: <span className="text-slate-400 font-semibold">{(() => {
                  try {
                    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                    const parts = ultimoCorteDate.split('-');
                    return `${parts[2]} ${meses[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
                  } catch { return ultimoCorteDate; }
                })()}</span></span>
              </div>
            )}
          </div>
        </Card>

        {/* KPI 2: Retraso Promedio */}
        <Card className="glass glass-hover flex flex-col justify-between p-4.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block flex items-center gap-1">
              <Clock size={12} className="text-amber-500" />
              Retraso Promedio
            </span>
            <h4 className="text-2xl font-black mt-2 text-amber-400">{syncKpis.promedioRetraso} días</h4>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold border-t border-white/5 pt-2 mt-2">
            Promedio de la red atrasada
          </p>
        </Card>

        {/* KPI 3: Para Revisión */}
        <Card className="glass glass-hover flex flex-col justify-between p-4.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block flex items-center gap-1">
              <AlertTriangle size={12} className="text-amber-500" />
              Para Revisión
            </span>
            <h4 className="text-2xl font-black mt-2 text-amber-500">
              {syncKpis.paraRevision}
            </h4>
          </div>
          <div className="border-t border-white/5 pt-2 mt-2 flex flex-col gap-1.5">
            <p className="text-[10px] text-slate-400 font-semibold">Inactividad de 11 a 30 días</p>
            {syncKpis.paraRevision > 0 && (
              <button 
                onClick={() => {
                  document.getElementById('sync-tabla-revision')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[9px] font-bold transition-all uppercase tracking-wider cursor-pointer border border-amber-500/15 w-max"
              >
                <Eye size={10} />
                Detalles
              </button>
            )}
          </div>
        </Card>

        {/* KPI 4: Casos Críticos */}
        <Card className="glass glass-hover flex flex-col justify-between p-4.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block flex items-center gap-1">
              <AlertTriangle size={12} className="text-rose-500" />
              Casos Críticos
            </span>
            <h4 className="text-2xl font-black mt-2 text-rose-400">
              {syncKpis.casosCriticos}
            </h4>
          </div>
          <div className="border-t border-white/5 pt-2 mt-2 flex flex-col gap-1.5">
            <p className="text-[10px] text-slate-400 font-semibold">Inactividad superior a 30 días</p>
            {syncKpis.casosCriticos > 0 && (
              <button 
                onClick={() => {
                  document.getElementById('sync-tabla-criticos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[9px] font-bold transition-all uppercase tracking-wider cursor-pointer border border-rose-500/15 w-max"
              >
                <Eye size={10} />
                Detalles
              </button>
            )}
          </div>
        </Card>

        {/* KPI 5: Sincronizadas sin datos */}
        <Card className="glass glass-hover flex flex-col justify-between p-4.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block flex items-center gap-1">
              <CheckCircle size={12} className="text-blue-500" />
              Sincronizadas Sin Datos
            </span>
            <h4 className="text-2xl font-black mt-2 text-blue-400">
              {syncKpis.sincronizadasSinUso}
            </h4>
          </div>
          <div className="border-t border-white/5 pt-2 mt-2 flex flex-col gap-1.5">
            <p className="text-[10px] text-slate-400 font-semibold">Al día con 0 registros - {periodoAbreviado}</p>
            {sincSinDatosRows.length > 0 && (
              <button 
                onClick={() => setIsSinDatosPanelOpen(true)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[9px] font-bold transition-all uppercase tracking-wider cursor-pointer border border-blue-500/15 w-max"
              >
                <Eye size={10} />
                Detalles
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* 2. GRÁFICOS DE ANÁLISIS COMPLEJO (Línea de Tendencia + Intervalos de Retraso) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico A: Evolución Histórica del Cumplimiento */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
              <RefreshCw size={14} className="text-blue-500" />
              {chartTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {processedComplianceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={processedComplianceTrend} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCumplimiento" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="fecha" stroke="var(--muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip content={<CustomTrendTooltip />} />
                  <Legend content={<CustomLegend />} />
                  
                  {/* Área sombreada del Total General (Red General o regional activa) - ATRÁS */}
                  {showTotalGeneral && (
                    <Area 
                      type="monotone" 
                      dataKey="cumplimiento" 
                      stroke="none" 
                      fill="url(#colorCumplimiento)" 
                      opacity={hoveredRegional !== null ? (hoveredRegional === 'Promedio General' ? 1.0 : 0.15) : 1.0}
                    />
                  )}

                  {/* Línea del Total General (azul destacada) - ATRÁS, SIN PUNTOS SI ES RED GENERAL */}
                  {showTotalGeneral && (
                    <Line 
                      type="monotone" 
                      dataKey="cumplimiento" 
                      name="Promedio General" 
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      dot={filters.regional !== '' ? { fill: '#3b82f6', r: 4 } : false}
                      activeDot={{ r: 6 }} 
                      opacity={hoveredRegional !== null ? (hoveredRegional === 'Promedio General' ? 1.0 : 0.15) : 1.0}
                    />
                  )}

                  {/* Líneas por regional (finas) - ADELANTE, CON HOVER INTERACTIVO */}
                  {filters.regional === '' && listadoRegionales.map((reg, index) => {
                    const isHovered = hoveredRegional === reg;
                    const hasActiveHover = hoveredRegional !== null;
                    const opacity = hasActiveHover ? (isHovered ? 1.0 : 0.15) : 0.85;
                    const strokeWidth = hasActiveHover ? (isHovered ? 3.0 : 1.0) : 1.5;
                    const dotRadius = hasActiveHover ? (isHovered ? 3 : 0) : 2;

                    return (
                      <Line
                        key={reg}
                        type="monotone"
                        dataKey={reg}
                        name={reg}
                        stroke={getRegionalColor(index, listadoRegionales.length)}
                        strokeWidth={strokeWidth}
                        opacity={opacity}
                        dot={dotRadius > 0 ? { r: dotRadius } : false}
                        activeDot={{ r: 4 }}
                      />
                    );
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[var(--muted)]">
                No hay datos históricos suficientes para mostrar la tendencia
              </div>
            )}
          </CardContent>
          {filters.anio === 0 && filters.mes === '' && processedComplianceTrend.length > 0 && (
            <div className="px-6 pb-4 text-right -mt-2">
              <span className="text-[10px] text-[var(--muted)] font-medium italic">
                * Q = Trimestre
              </span>
            </div>
          )}
        </Card>

        {/* Gráfico B: Distribución por Rangos de Atraso */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-amber-500" />
              Distribución de Retrasos en la Red
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredDelayDistribution} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted)" fontSize={10} tickLine={false} />
                <YAxis dataKey="rango" type="category" stroke="var(--muted)" fontSize={10} tickLine={false} width={75} />
                <Tooltip content={<CustomIntervalTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar 
                  dataKey="cantidad" 
                  name="Infoplazas" 
                  fill="#f59e0b" 
                  radius={[0, 4, 4, 0]} 
                  barSize={16}
                >
                  {filteredDelayDistribution.map((entry, index) => {
                    const color = entry.rango === '11-15 días' 
                      ? '#6366f1'
                      : entry.rango === '16-30 días'
                      ? '#f59e0b'
                      : entry.rango === '+30 días'
                      ? '#ef4444'
                      : '#64748b';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 3. CASOS CON RETRASO DE SINCRONIZACIÓN (TABLAS DE ALERTA) */}
      <div className="space-y-6">
        
        {/* TABLA A: RETRASO CRÍTICO (> 30 días) */}
        <Card id="sync-tabla-criticos" className="border border-rose-500/10 bg-rose-500/[0.01]">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-rose-500/5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle size={16} />
                  Atraso Crítico (+30 días sin sincronizar)
                </CardTitle>
                <span className="text-[9px] font-extrabold uppercase text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 select-none">
                  Urgente
                </span>
              </div>
              <p className="text-[10px] text-slate-400">{allCriticalRows.length} Infoplazas con inactividad prolongada</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCriticalCSV}
                disabled={allCriticalRows.length === 0}
                className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                  allCriticalRows.length > 0
                    ? 'bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border-rose-500/20 hover:border-rose-500/30'
                    : 'bg-white/5 text-slate-600 border-white/5 cursor-not-allowed'
                }`}
                title="Exportar casos críticos a CSV"
              >
                <FileSpreadsheet size={12} />
                <span>Exportar</span>
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {allCriticalRows.length > 0 ? (
              <div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="px-4 py-2.5 text-xs font-bold uppercase text-[var(--muted)] w-10 text-center">#</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase text-[var(--muted)]">N°</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase text-[var(--muted)]">Infoplaza</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase text-[var(--muted)]">Regional</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase text-[var(--muted)]">Provincia</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase text-[var(--muted)] text-center">Atraso</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase text-[var(--muted)] text-center">Registros</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase text-[var(--muted)] text-center">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {visibleCriticalRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-rose-500/[0.02] transition-colors">
                        <td className="px-4 py-2.5 text-sm text-slate-500 font-semibold text-center">{idx + 1}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-400 font-bold">{row.numero}</td>
                        <td className="px-4 py-2.5 text-sm text-white font-bold max-w-[160px] truncate" title={row.nombre}>{row.nombre}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-300">{row.regional}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-300">{row.provincia}</td>
                        <td className="px-4 py-2.5 text-sm text-center font-extrabold text-rose-400 bg-rose-500/5">
                          {row.dias_sin_sinc} días
                        </td>
                        <td className="px-4 py-2.5 text-sm text-center font-semibold text-slate-300">
                          {row.atenciones !== null && row.atenciones !== undefined 
                            ? row.atenciones.toLocaleString() 
                            : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-center">
                          <button
                            onClick={() => onViewDetail(row)}
                            className="p-1 rounded-lg border border-white/5 hover:border-blue-500/30 bg-white/5 hover:bg-blue-500/10 text-slate-300 hover:text-blue-400 transition-all cursor-pointer"
                            title="Ver detalle"
                          >
                            <Eye size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Mostrar más y progreso */}
                <div className="p-3 border-t border-white/5 bg-white/[0.01] flex flex-col items-center justify-center gap-1.5">
                  <span className="text-[10px] text-[var(--muted)] font-semibold">
                    Mostrando {visibleCriticalRows.length} de {allCriticalRows.length} casos críticos
                  </span>
                  
                  {criticalVisibleCount < allCriticalRows.length ? (
                    <button
                      onClick={handleShowMoreCritical}
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
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                No hay infoplazas con atraso crítico (+30 días)
              </div>
            )}
          </CardContent>
        </Card>

        {/* TABLA B: RETRASO PREVENTIVO / PARA REVISIÓN (11 a 30 días) */}
        <Card id="sync-tabla-revision" className="border border-amber-500/10 bg-amber-500/[0.01]">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-amber-500/5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={16} />
                  Para Revisión (11 a 30 días sin sincronizar)
                </CardTitle>
                <span className="text-[9px] font-extrabold uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 select-none">
                  Revisar
                </span>
              </div>
              <p className="text-[10px] text-slate-400">{allPreventiveRows.length} Infoplazas con inactividad media</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPreventiveCSV}
                disabled={allPreventiveRows.length === 0}
                className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                  allPreventiveRows.length > 0
                    ? 'bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border-amber-500/20 hover:border-amber-500/30'
                    : 'bg-white/5 text-slate-600 border-white/5 cursor-not-allowed'
                }`}
                title="Exportar casos en revisión a CSV"
              >
                <FileSpreadsheet size={12} />
                <span>Exportar</span>
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {allPreventiveRows.length > 0 ? (
              <div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="px-4 py-2.5 text-xs font-bold uppercase text-[var(--muted)] w-10 text-center">#</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase text-[var(--muted)]">N°</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase text-[var(--muted)]">Infoplaza</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase text-[var(--muted)]">Regional</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase text-[var(--muted)]">Provincia</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase text-[var(--muted)] text-center">Atraso</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase text-[var(--muted)] text-center">Registros</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase text-[var(--muted)] text-center">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {visiblePreventiveRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-amber-500/[0.02] transition-colors">
                        <td className="px-4 py-2.5 text-sm text-slate-500 font-semibold text-center">{idx + 1}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-400 font-bold">{row.numero}</td>
                        <td className="px-4 py-2.5 text-sm text-white font-bold max-w-[160px] truncate" title={row.nombre}>{row.nombre}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-300">{row.regional}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-300">{row.provincia}</td>
                        <td className="px-4 py-2.5 text-sm text-center font-extrabold text-amber-400 bg-amber-500/5">
                          {row.dias_sin_sinc} días
                        </td>
                        <td className="px-4 py-2.5 text-sm text-center font-semibold text-slate-300">
                          {row.atenciones !== null && row.atenciones !== undefined 
                            ? row.atenciones.toLocaleString() 
                            : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-center">
                          <button
                            onClick={() => onViewDetail(row)}
                            className="p-1 rounded-lg border border-white/5 hover:border-blue-500/30 bg-white/5 hover:bg-blue-500/10 text-slate-300 hover:text-blue-400 transition-all cursor-pointer"
                            title="Ver detalle"
                          >
                            <Eye size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Mostrar más y progreso */}
                <div className="p-3 border-t border-white/5 bg-white/[0.01] flex flex-col items-center justify-center gap-1.5">
                  <span className="text-[10px] text-[var(--muted)] font-semibold">
                    Mostrando {visiblePreventiveRows.length} de {allPreventiveRows.length} casos preventivos
                  </span>
                  
                  {preventiveVisibleCount < allPreventiveRows.length ? (
                    <button
                      onClick={handleShowMorePreventive}
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
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                No hay infoplazas con retraso preventivo (11 a 30 días)
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. TABLA GENERAL DE CONECTIVIDAD SALUDABLE */}
      <Card id="sync-tabla-saludable" className="border border-emerald-500/10 bg-emerald-500/[0.005]">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-white/5 gap-3">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle size={16} className="text-emerald-500" />
              Infoplazas con Conectividad de Red Saludable
            </CardTitle>
            <p className="text-[10px] text-slate-400">
              Infoplazas con buena salud de sincronización (0 a 10 días). Último corte: {ultimoCorteDate}
            </p>
          </div>
          
          {/* Controles de la Tabla */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 text-slate-500 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar infoplaza..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 w-44 transition-all"
              />
            </div>

            {/* Botón Exportar */}
            <button
              onClick={handleExportCSV}
              disabled={processedGeneralRows.length === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                processedGeneralRows.length > 0
                  ? 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/30'
                  : 'bg-white/5 text-slate-600 border-white/5 cursor-not-allowed'
              }`}
              title="Exportar vista saludable a CSV"
            >
              <FileSpreadsheet size={13} />
              <span>Exportar</span>
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {paginatedGeneralRows.length > 0 ? (
            <div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                    <th className="px-6 py-3 text-xs font-bold uppercase text-[var(--muted)] w-12 text-center">#</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase text-[var(--muted)]">
                      <button onClick={() => handleSort('numero')} className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
                        N° {sortColumn === 'numero' && <ArrowUpDown size={12} className="text-blue-400" />}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-xs font-bold uppercase text-[var(--muted)]">
                      <button onClick={() => handleSort('nombre')} className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
                        Infoplaza {sortColumn === 'nombre' && <ArrowUpDown size={12} className="text-blue-400" />}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-xs font-bold uppercase text-[var(--muted)]">
                      <button onClick={() => handleSort('regional')} className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
                        Regional {sortColumn === 'regional' && <ArrowUpDown size={12} className="text-blue-400" />}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-xs font-bold uppercase text-[var(--muted)]">
                      <button onClick={() => handleSort('provincia')} className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
                        Provincia {sortColumn === 'provincia' && <ArrowUpDown size={12} className="text-blue-400" />}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-xs font-bold uppercase text-[var(--muted)] text-center">
                      <button onClick={() => handleSort('dias_sin_sinc')} className="flex items-center gap-1 mx-auto hover:text-white transition-colors cursor-pointer">
                        Días sin Sinc {sortColumn === 'dias_sin_sinc' && <ArrowUpDown size={12} className="text-blue-400" />}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-xs font-bold uppercase text-[var(--muted)] text-center">Registros</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase text-[var(--muted)]">Estado</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase text-[var(--muted)] text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedGeneralRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-3 text-sm text-slate-500 font-semibold text-center">{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td className="px-6 py-3 text-sm text-slate-400 font-bold">{row.numero}</td>
                      <td className="px-6 py-3 text-sm text-slate-100 font-semibold">{row.nombre}</td>
                      <td className="px-6 py-3 text-sm text-slate-300">{row.regional}</td>
                      <td className="px-6 py-3 text-sm text-slate-300">{row.provincia}</td>
                      <td className="px-6 py-3 text-sm text-center font-bold text-slate-200">
                        {row.dias_sin_sinc} días
                      </td>
                      <td className="px-6 py-3 text-sm text-center font-semibold text-slate-300">
                        {row.atenciones !== null && row.atenciones !== undefined 
                          ? row.atenciones.toLocaleString() 
                          : '-'}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {row.sync_estado}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-center">
                        <button
                          onClick={() => onViewDetail(row)}
                          className="p-1 rounded-lg border border-white/5 hover:border-blue-500/30 bg-white/5 hover:bg-blue-500/10 text-slate-300 hover:text-blue-400 transition-all cursor-pointer"
                          title="Ver detalle operativo"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Paginación */}
              <div className="p-4 border-t border-white/5 bg-white/[0.01] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <span className="text-[var(--muted)] font-semibold">
                  Mostrando {processedGeneralRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} a {Math.min(currentPage * pageSize, processedGeneralRows.length)} de {processedGeneralRows.length} infoplazas saludables
                </span>
                
                <div className="flex items-center gap-4">
                  {/* Selector del tamaño de página */}
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--muted)]">Por página:</span>
                    <select
                      value={pageSize}
                      onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      className="px-2 py-1 rounded bg-slate-900 border border-white/5 text-slate-300 focus:outline-none focus:border-blue-500/50 cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  {/* Botones de Navegación */}
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="p-1.5 rounded-lg border border-white/5 bg-white/5 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    
                    <span className="font-bold text-slate-300">
                      Página {currentPage} de {totalPages}
                    </span>

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="p-1.5 rounded-lg border border-white/5 bg-white/5 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs italic">
              No hay infoplazas saludables que coincidan con la búsqueda o filtros aplicados.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── PANEL LATERAL: Sincronizadas Sin Datos (Estilo similar a NotificationPanel) ── */}
      {/* Overlay de fondo para móvil */}
      <div
        className={`fixed inset-0 z-30 bg-black/45 backdrop-blur-[2px] transition-opacity duration-200
          ${isSinDatosPanelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSinDatosPanelOpen(false)}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-label="Detalles de Sincronizadas Sin Datos"
        className={`
          fixed top-0 right-0 h-full w-[380px] max-w-[92vw] z-40
          bg-[#0c1220] border-l border-white/8
          shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col
          transition-transform duration-300 ease-in-out
          ${isSinDatosPanelOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header del Panel */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle size={15} className="text-blue-400" />
            <span className="font-bold text-sm text-white tracking-tight">Sincronizadas Sin Datos</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
              {sincSinDatosRows.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {sincSinDatosRows.length > 0 && (
              <button
                onClick={handleExportSinDatosCSV}
                className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/15 text-[10px] font-bold uppercase transition-all cursor-pointer"
                title="Exportar a CSV"
              >
                <Download size={11} />
                Exportar
              </button>
            )}
            <button
              onClick={() => setIsSinDatosPanelOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all cursor-pointer"
              title="Cerrar"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Info Box sobre el período activo */}
        <div className="p-3 bg-blue-600/5 border-b border-blue-500/10 text-[10px] text-slate-400 flex flex-col gap-1 shrink-0">
          <p className="font-semibold text-slate-300">
            Filtro: {filters.mes ? `${filters.mes} ` : ''}{filters.anio > 0 ? filters.anio : 'Todos los años'}
          </p>
          <p>
            Infoplazas con estado <span className="text-emerald-400 font-bold">Al día</span> (sincronización &le; 10 días) con <span className="text-blue-400 font-bold">0 registros</span> en este período.
          </p>
        </div>

        {/* Contenido / Listado con Scroll */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sincSinDatosRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
              <CheckCircle size={24} className="text-slate-600" />
              <p className="text-xs text-slate-500 italic">No hay registros con esta condición.</p>
            </div>
          ) : (
            sincSinDatosRows.map((row) => {
              // Calcular la fecha aproximada a partir de los dias_sin_sinc y el ultimoCorteDate del backend
              let fechaSincEstimada = 'Sin reporte';
              if (row.dias_sin_sinc !== null && syncData?.ultimoCorteDate) {
                try {
                  const date = new Date(syncData.ultimoCorteDate);
                  date.setDate(date.getDate() - row.dias_sin_sinc);
                  fechaSincEstimada = date.toLocaleDateString('es-PA', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                } catch {
                  fechaSincEstimada = 'Corte actual';
                }
              }

              return (
                <div
                  key={row.numero}
                  className="p-3 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col gap-1.5"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      N° {row.numero}
                    </span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/10">
                      {row.regional}
                    </span>
                  </div>

                  <h5 className="font-bold text-xs text-slate-200 truncate">
                    {row.nombre}
                  </h5>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 border-t border-white/5 pt-1.5">
                    <div>
                      <span className="text-slate-500">Última sinc:</span>{' '}
                      <span className="text-slate-300 font-semibold">{fechaSincEstimada}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-emerald-400 font-bold">{row.dias_sin_sinc}d sin sinc</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
