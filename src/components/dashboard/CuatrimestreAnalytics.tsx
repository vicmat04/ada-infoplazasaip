'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { getCuatrimestralData } from '@/app/informes-actions';
import { AlertCircle, FileText, CheckCircle2, Clock, Users, BookOpen, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function CuatrimestreAnalytics({ filters }: { filters: any }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Si no hay año o cuatrimestre específico, no cargamos el detalle.
    if (!filters.anio || !filters.cuatrimestre) {
      setData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    getCuatrimestralData(filters, filters.anio, filters.cuatrimestre).then((res) => {
      if (isMounted && res.success) {
        setData(res.data);
      }
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [filters]);

  if (!filters.cuatrimestre || filters.cuatrimestre === 0) {
    return (
      <div className="glass rounded-xl p-8 flex flex-col items-center justify-center text-center text-slate-400 mb-6 animate-fade-in">
        <FileText size={48} className="mb-4 opacity-50" />
        <h3 className="text-lg font-bold text-slate-300 mb-2">Reporte Cuatrimestral</h3>
        <p className="max-w-md">Seleccione un cuatrimestre específico (Q1, Q2 o Q3) en los filtros superiores para visualizar el desglose de capacitaciones y actividades.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass rounded-xl p-8 flex flex-col items-center justify-center text-center text-slate-400 mb-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p>Cargando información del cuatrimestre...</p>
      </div>
    );
  }

  const hasData = data && (data.capacitaciones.length > 0 || data.actividades.length > 0 || data.servicios.length > 0);

  if (!hasData) {
    return (
      <div className="glass rounded-xl p-8 flex flex-col items-center justify-center text-center text-slate-400 mb-6 animate-fade-in border border-yellow-500/20">
        <AlertCircle size={48} className="mb-4 text-yellow-500/50" />
        <h3 className="text-lg font-bold text-slate-300 mb-2">Sin datos detallados</h3>
        <p className="max-w-md text-sm">No hay información pormenorizada de capacitaciones, actividades o servicios para el período <strong>Q{filters.cuatrimestre} {filters.anio}</strong>.</p>
        <p className="max-w-md text-xs mt-2 opacity-70">El registro detallado de estas métricas desde ADA comenzó a implementarse recientemente. Por favor seleccione el cuatrimestre actual.</p>
      </div>
    );
  }

  // PROCESAMIENTO DE DATOS - Normalizando categorías (case-insensitive)
  const capacitacionesAgrupadas = useMemo(() => {
    const acc: Record<string, { categoria: string; participantes: number; horas: number }> = {};
    data.capacitaciones.forEach((c: any) => {
      const catOriginal = c.categoria ? c.categoria.trim() : 'Sin Categoría';
      // Normalizamos la clave para agrupar (ej. "CINE" -> "cine")
      const catKey = catOriginal.toLowerCase();
      if (!acc[catKey]) {
        // Guardamos el nombre original con formato título (Capitalize) para mostrarlo bonito
        const catLabel = catOriginal.charAt(0).toUpperCase() + catKey.slice(1);
        acc[catKey] = { categoria: catLabel, participantes: 0, horas: 0 };
      }
      acc[catKey].participantes += Number(c.participantes) || 0;
      acc[catKey].horas += Number(c.horas) || 0;
    });
    return Object.values(acc).sort((a, b) => b.participantes - a.participantes);
  }, [data.capacitaciones]);

  const actividadesAgrupadas = useMemo(() => {
    const acc: Record<string, { categoria: string; participantes: number }> = {};
    data.actividades.forEach((a: any) => {
      const catOriginal = a.categoria ? a.categoria.trim() : 'Sin Categoría';
      const catKey = catOriginal.toLowerCase();
      if (!acc[catKey]) {
        const catLabel = catOriginal.charAt(0).toUpperCase() + catKey.slice(1);
        acc[catKey] = { categoria: catLabel, participantes: 0 };
      }
      acc[catKey].participantes += Number(a.participantes) || 0;
    });
    return Object.values(acc).sort((a, b) => b.participantes - a.participantes);
  }, [data.actividades]);
  
  const serviciosAgrupados = useMemo(() => {
    const acc: Record<string, { servicio: string; cantidad: number }> = {};
    data.servicios.forEach((s: any) => {
      if (!s.ofrecido) return;
      const sOriginal = s.servicio_nombre ? s.servicio_nombre.trim() : 'Sin Nombre';
      const sKey = sOriginal.toLowerCase();
      if (!acc[sKey]) {
        const sLabel = sOriginal.charAt(0).toUpperCase() + sKey.slice(1);
        acc[sKey] = { servicio: sLabel, cantidad: 0 };
      }
      acc[sKey].cantidad += 1; // Contamos cuántas infoplazas ofrecieron este servicio
    });
    return Object.values(acc).sort((a, b) => b.cantidad - a.cantidad);
  }, [data.servicios]);
  
  const totalParticipantesCap = capacitacionesAgrupadas.reduce((sum, item) => sum + item.participantes, 0);
  const totalHorasCap = capacitacionesAgrupadas.reduce((sum, item) => sum + item.horas, 0);
  const totalParticipantesAct = actividadesAgrupadas.reduce((sum, item) => sum + item.participantes, 0);

  // Control de entrega stats
  const ctrlEntregados = data.control.filter((c: any) => c.estado?.toLowerCase() === 'entregado').length;
  const ctrlPendientes = data.control.filter((c: any) => c.estado?.toLowerCase() === 'pendiente').length;
  const ctrlNoEntrega = data.control.filter((c: any) => c.estado?.toLowerCase() === 'no entrega').length;

  return (
    <div className="flex flex-col gap-6 mb-6 animate-fade-in">
      {/* Título de sección */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="text-blue-500" />
          Análisis Cuatrimestral Detallado (Q{filters.cuatrimestre} - {filters.anio})
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Datos provenientes directamente de la plataforma ADA ingresados por los Dinamizadores.
        </p>
      </div>

      {/* KPI Cards Cuatrimestrales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass border-[var(--card-border)] bg-gradient-to-br from-blue-900/20 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Entregados</p>
              <h3 className="text-2xl font-bold text-blue-400">{ctrlEntregados}</h3>
            </div>
            <CheckCircle2 size={32} className="text-blue-500/30" />
          </CardContent>
        </Card>
        <Card className="glass border-[var(--card-border)] bg-gradient-to-br from-purple-900/20 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Participantes Cap.</p>
              <h3 className="text-2xl font-bold text-purple-400">{totalParticipantesCap}</h3>
            </div>
            <Users size={32} className="text-purple-500/30" />
          </CardContent>
        </Card>
        <Card className="glass border-[var(--card-border)] bg-gradient-to-br from-teal-900/20 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Horas de Cap.</p>
              <h3 className="text-2xl font-bold text-teal-400">{totalHorasCap}</h3>
            </div>
            <Clock size={32} className="text-teal-500/30" />
          </CardContent>
        </Card>
        <Card className="glass border-[var(--card-border)] bg-gradient-to-br from-orange-900/20 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Part. Otras Activ.</p>
              <h3 className="text-2xl font-bold text-orange-400">{totalParticipantesAct}</h3>
            </div>
            <Activity size={32} className="text-orange-500/30" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Capacitaciones */}
        <Card className="glass border-[var(--card-border)] flex flex-col h-[400px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <BookOpen size={18} className="text-blue-400" />
              Capacitaciones por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pt-0">
            {capacitacionesAgrupadas.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={capacitacionesAgrupadas} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis 
                    dataKey="categoria" 
                    stroke="#94a3b8" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="participantes" name="Participantes" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="horas" name="Horas" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">Sin datos de capacitaciones</div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico Otras Actividades */}
        <Card className="glass border-[var(--card-border)] flex flex-col h-[400px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Activity size={18} className="text-orange-400" />
              Otras Actividades por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pt-0">
            {actividadesAgrupadas.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={actividadesAgrupadas} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis 
                    dataKey="categoria" 
                    stroke="#94a3b8" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="participantes" name="Participantes" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">Sin datos de otras actividades</div>
            )}
          </CardContent>
        </Card>
      {/* Gráfico Servicios */}
        <Card className="glass border-[var(--card-border)] flex flex-col h-[400px] lg:col-span-2 mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              Servicios Ofrecidos (Frecuencia)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pt-0">
            {serviciosAgrupados.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviciosAgrupados} margin={{ top: 10, right: 10, left: -20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis 
                    dataKey="servicio" 
                    stroke="#94a3b8" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="cantidad" name="Infoplazas que lo ofrecen" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">Sin datos de servicios</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

