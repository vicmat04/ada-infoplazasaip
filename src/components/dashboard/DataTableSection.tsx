'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Eye
} from 'lucide-react';

interface TableRow {
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

interface DataTableSectionProps {
  data: TableRow[];
  onViewDetail?: (row: TableRow) => void;
  isLoading?: boolean;
}

export default function DataTableSection({ data, onViewDetail, isLoading = false }: DataTableSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filtrar en memoria por búsqueda para que sea instantáneo
  const filteredData = useMemo(() => {
    setCurrentPage(1); // Resetear a la primera página ante nueva búsqueda
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase().trim();
    return data.filter(
      (row) =>
        row.nombre.toLowerCase().includes(query) ||
        row.numero.toString().includes(query) ||
        row.regional.toLowerCase().includes(query) ||
        row.provincia.toLowerCase().includes(query) ||
        row.distrito.toLowerCase().includes(query)
    );
  }, [data, searchQuery]);

  // Paginación en cliente
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  // Exportar a CSV contextual
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    
    // Cabeceras del CSV
    const headers = [
      'Número',
      'Nombre Infoplaza',
      'Regional',
      'Provincia',
      'Distrito',
      'Corregimiento',
      'Atenciones registradas',
      'Días sin sincronizar',
      'Estado Sinc',
      'Observación'
    ];

    // Filas correspondientes
    const rows = filteredData.map((row) => [
      row.numero,
      `"${row.nombre.replace(/"/g, '""')}"`,
      `"${row.regional}"`,
      `"${row.provincia}"`,
      `"${row.distrito}"`,
      `"${row.corregimiento}"`,
      row.atenciones,
      row.dias_sin_sinc ?? 'N/A',
      `"${row.sync_estado}"`,
      `"${row.observacion.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    
    // Crear blob y descargar
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Infoplazas_Analytics_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'Al día':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle size={12} />
            Al día
          </span>
        );
      case 'Para revisión':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle size={12} />
            Revisión
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <HelpCircle size={12} />
            Sin Reporte
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <Card className="h-[520px] animate-pulse flex flex-col justify-between">
        <div className="p-6">
          <div className="h-6 bg-white/10 rounded w-1/4 mb-4" />
          <div className="h-10 bg-white/5 rounded-lg w-full mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-10 bg-white/5 rounded-lg w-full" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--card-border)]">
        <div>
          <CardTitle className="text-base font-bold text-slate-200">
            Detalle de Infoplazas y Cobertura Operativa
          </CardTitle>
          <p className="text-xs text-[var(--muted)] mt-1">
            Visualización detallada del rendimiento e historial de la red seleccionada ({filteredData.length} registros).
          </p>
        </div>
        
        {/* Acciones de la tabla */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Buscador */}
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Buscar por número o nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-[var(--card-border)] rounded-xl text-sm focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-[var(--muted)]/60"
            />
          </div>
          
          {/* Botón Exportar */}
          <button
            onClick={handleExportCSV}
            disabled={filteredData.length === 0}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-200 border border-[var(--card-border)] rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            title="Exportar vista filtrada a CSV"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full min-w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-white/[0.01]">
              <th className="px-3 sm:px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">N°</th>
              <th className="px-3 sm:px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Nombre</th>
              <th className="hidden sm:table-cell px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Regional</th>
              <th className="hidden md:table-cell px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Distrito</th>
              <th className="px-3 sm:px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)] text-right">Atenciones</th>
              <th className="hidden sm:table-cell px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Sincronización</th>
              <th className="hidden lg:table-cell px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Observaciones</th>
              {onViewDetail && <th className="px-3 sm:px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)] text-center">Detalle</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={onViewDetail ? 8 : 7} className="px-6 py-12 text-center text-sm text-[var(--muted)]">
                  No se encontraron resultados para los filtros y búsqueda activa.
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr key={row.numero} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-3 sm:px-6 py-3.5 text-sm font-bold text-slate-300">#{row.numero}</td>
                  <td className="px-3 sm:px-6 py-3.5 text-sm font-semibold text-slate-100 max-w-[120px] sm:max-w-none truncate sm:whitespace-normal" title={row.nombre}>{row.nombre}</td>
                  <td className="hidden sm:table-cell px-6 py-3.5 text-sm text-[var(--muted)]">{row.regional}</td>
                  <td className="hidden md:table-cell px-6 py-3.5 text-sm text-[var(--muted)]">{row.distrito}</td>
                  <td className="px-3 sm:px-6 py-3.5 text-sm font-extrabold text-blue-400 text-right">
                    {row.atenciones.toLocaleString()}
                  </td>
                  <td className="hidden sm:table-cell px-6 py-3.5 text-sm">
                    <div className="flex flex-col gap-0.5">
                      {getStatusBadge(row.sync_estado)}
                      {row.dias_sin_sinc !== null && (
                        <span className="text-[10px] text-[var(--muted)] pl-1">
                          {row.dias_sin_sinc} días de retraso
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="hidden lg:table-cell px-6 py-3.5 text-xs text-[var(--muted)] max-w-[200px] truncate" title={row.observacion}>
                    {row.observacion}
                  </td>
                  {onViewDetail && (
                    <td className="px-3 sm:px-6 py-3.5 text-center">
                      <button
                        onClick={() => onViewDetail(row)}
                        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                        title="Ver detalle completo"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>

      {/* Paginador */}
      {totalPages > 1 && (
        <div className="px-6 py-4 flex items-center justify-between border-t border-[var(--card-border)] bg-white/[0.005]">
          <span className="text-xs text-[var(--muted)] font-medium">
            Mostrando pág. {currentPage} de {totalPages} ({filteredData.length} registros filtrados)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-[var(--card-border)] bg-white/5 text-[var(--muted)] hover:text-white disabled:opacity-40 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-[var(--card-border)] bg-white/5 text-[var(--muted)] hover:text-white disabled:opacity-40 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
