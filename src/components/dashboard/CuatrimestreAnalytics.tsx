'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { getCuatrimestralData } from '@/app/informes-actions';
import { AlertCircle, FileText, CheckCircle2, Clock, XCircle, Search, X, Building, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';


export default function CuatrimestreAnalytics({ filters }: { filters: any }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<any>(null);

  useEffect(() => {
    if (!filters.anio || !filters.cuatrimestre) {
      setData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    getCuatrimestralData(filters, filters.anio, filters.cuatrimestre).then((res) => {
      if (isMounted && res?.success) {
        setData(res.data);
      }
      if (isMounted) setLoading(false);
    }).catch((err) => {
      console.error(err);
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [filters]);

  const stats = useMemo(() => {
    if (!data || !data.infoplazas) return { entregados: 0, pendientes: 0, noEntrega: 0, list: [], byRegional: [] };
    
    let entregados = 0;
    let pendientes = 0;
    let noEntrega = 0;
    const list: any[] = [];
    const regMap: Record<string, any> = {};

    data.infoplazas.forEach((ip: any) => {
      const reg = ip.regional || 'Sin Regional';
      if (!regMap[reg]) regMap[reg] = { regional: reg, Entregado: 0, Pendiente: 0, 'No Entrega': 0 };

      const ctrl = data.control?.find((c: any) => c.infoplaza_numero === ip.numero);
      const reporteEstado = ctrl?.estado || 'Pendiente';
      const ipEstado = ip.estado || '';
      const isActiva = ipEstado.toLowerCase() === 'activa' || ipEstado.toLowerCase() === 'abierta';
      const motivo = ctrl?.motivo || '';
      
      // Si la infoplaza está cerrada y NO entregó reporte, no la contamos ni mostramos
      if (!isActiva && reporteEstado.toLowerCase() !== 'entregado') {
        return;
      }
      
      list.push({ ...ip, reporteEstado, motivo });

      if (reporteEstado.toLowerCase() === 'entregado') {
        entregados++;
        regMap[reg]['Entregado']++;
      } else if (reporteEstado.toLowerCase() === 'no entrega') {
        noEntrega++;
        regMap[reg]['No Entrega']++;
      } else {
        pendientes++;
        regMap[reg]['Pendiente']++;
      }
    });

    return {
      entregados,
      pendientes,
      noEntrega,
      list: list.sort((a, b) => a.regional.localeCompare(b.regional) || a.numero - b.numero),
      byRegional: Object.values(regMap).sort((a, b) => a.regional.localeCompare(b.regional))
    };
  }, [data]);

  const handleVerDetalle = (filterEstado?: string) => {
    const title = filterEstado 
      ? `Informes ${filterEstado}s (Q${filters.cuatrimestre} - ${filters.anio})`.toUpperCase()
      : `Estado de Entregas (Q${filters.cuatrimestre} - ${filters.anio})`;
      
    const filteredList = filterEstado 
      ? stats.list.filter(ip => ip.reporteEstado.toLowerCase() === filterEstado.toLowerCase())
      : stats.list;

    setDrawerData({
      title,
      list: filteredList,
      content: (
        <div className="flex flex-col gap-2">
          {filteredList.map((ip, i) => (
            <div key={i} className="p-3 bg-slate-900/50 rounded-lg flex items-center justify-between border border-slate-800">
              <div>
                <p className="font-semibold text-slate-200">{ip.numero} - {ip.nombre}</p>
                <p className="text-xs text-slate-400">{ip.regional}</p>
                {ip.reporteEstado.toLowerCase() === 'no entrega' && ip.motivo && (
                  <p className="text-xs text-red-400 mt-1 italic">Observación: {ip.motivo}</p>
                )}
              </div>
              <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                ip.reporteEstado.toLowerCase() === 'entregado' ? 'bg-emerald-500/20 text-emerald-400' :
                ip.reporteEstado.toLowerCase() === 'no entrega' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {ip.reporteEstado.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )
    });
    setIsDrawerOpen(true);
  };


  const handleExportCSV = () => {
    if (!drawerData?.list) return;
    
    const headers = ['Nro Infoplaza', 'Nombre', 'Regional', 'Provincia', 'Distrito', 'Corregimiento', 'Estado de Entrega', 'Observacion', 'Cuatrimestre'];
    const csvRows = drawerData.list.map((ip: any) => [
      ip.numero,
      `"${(ip.nombre || '').replace(/"/g, '""')}"`,
      `"${ip.regional || ''}"`,
      `"${ip.provincia || ''}"`,
      `"${ip.distrito || ''}"`,
      `"${ip.corregimiento || ''}"`,
      `"${ip.reporteEstado || ''}"`,
      `"${(ip.motivo || '').replace(/"/g, '""')}"`,
      `"Q${filters.cuatrimestre} - ${filters.anio}"`
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `listado_cuatrimestre_Q${filters.cuatrimestre}_${filters.anio}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!filters.cuatrimestre || filters.cuatrimestre === 0) {
    return (
      <div className="glass rounded-xl p-8 flex flex-col items-center justify-center text-center text-slate-400 mb-6 animate-fade-in">
        <FileText size={48} className="mb-4 opacity-50" />
        <h3 className="text-lg font-bold text-slate-300 mb-2">Análisis de Informes Cuatrimestrales</h3>
        <p className="max-w-md">Seleccione un cuatrimestre específico (Q1, Q2 o Q3) en el filtro de Meses para visualizar el control de entregas.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass rounded-xl p-8 flex flex-col items-center justify-center text-center text-slate-400 mb-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p>Cargando información de entregas...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 mb-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="text-blue-500" />
            Control de Informes Cuatrimestrales (Q{filters.cuatrimestre} - {filters.anio})
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Supervisión administrativa de la entrega de informes por Infoplaza.
          </p>
        </div>
        <button 
          onClick={() => handleVerDetalle()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Search size={16} /> Ver Listado Completo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass border-[var(--card-border)] bg-gradient-to-br from-blue-900/20 to-transparent flex flex-col justify-between">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Habilitadas</p>
                <h3 className="text-2xl font-bold text-blue-400" title="Infoplazas habilitadas para entregar">{(stats.entregados + stats.pendientes + stats.noEntrega).toLocaleString('es-PA')}</h3>
              </div>
              <Building size={32} className="text-blue-500/30" />
            </div>
            <div className="flex justify-end mt-2">
              <button 
                onClick={() => handleVerDetalle()}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline transition-all uppercase"
              >
                Ver
              </button>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-[var(--card-border)] bg-gradient-to-br from-emerald-900/20 to-transparent flex flex-col justify-between">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Entregados</p>
                <h3 className="text-2xl font-bold text-emerald-400" title="Informes Entregados">{stats.entregados.toLocaleString('es-PA')}</h3>
              </div>
              <CheckCircle2 size={32} className="text-emerald-500/30" />
            </div>
            <div className="flex justify-end mt-2">
              <button 
                onClick={() => handleVerDetalle('entregado')}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline transition-all uppercase"
              >
                Ver
              </button>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-[var(--card-border)] bg-gradient-to-br from-yellow-900/20 to-transparent flex flex-col justify-between">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pendientes</p>
                <h3 className="text-2xl font-bold text-yellow-400" title="Informes Pendientes">{stats.pendientes.toLocaleString('es-PA')}</h3>
              </div>
              <Clock size={32} className="text-yellow-500/30" />
            </div>
            <div className="flex justify-end mt-2">
              <button 
                onClick={() => handleVerDetalle('pendiente')}
                className="text-xs font-bold text-yellow-400 hover:text-yellow-300 hover:underline transition-all uppercase"
              >
                Ver
              </button>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-[var(--card-border)] bg-gradient-to-br from-red-900/20 to-transparent flex flex-col justify-between">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">No Entregan</p>
                <h3 className="text-2xl font-bold text-red-400" title="Infoplazas que no entregan informes">{stats.noEntrega.toLocaleString('es-PA')}</h3>
              </div>
              <XCircle size={32} className="text-red-500/30" />
            </div>
            <div className="flex justify-end mt-2">
              <button 
                onClick={() => handleVerDetalle('no entrega')}
                className="text-xs font-bold text-red-400 hover:text-red-300 hover:underline transition-all uppercase"
              >
                Ver
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-[var(--card-border)] flex flex-col h-[400px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-200">
            Comparativa de Entregas por Regional
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 pt-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.byRegional} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="regional" stroke="#94a3b8" fontSize={12} angle={-45} textAnchor="end" />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="Entregado" stackId="a" fill="#34d399" />
              <Bar dataKey="Pendiente" stackId="a" fill="#facc15" />
              <Bar dataKey="No Entrega" stackId="a" fill="#f87171" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Modal / Overlay para Ver Detalles */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{drawerData?.title}</h3>
              <button onClick={() => setIsDrawerOpen(false)} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {drawerData?.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

