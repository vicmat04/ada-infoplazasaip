'use client';

import React, { useEffect } from 'react';
import { X, Calendar, Activity, RefreshCw, MapPin, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface InfoplazaDetail {
  numero: number;
  nombre: string;
  regional: string;
  provincia: string;
  distrito: string;
  corregimiento: string;
  atenciones: number | null;
  dias_sin_sinc: number | null;
  sync_estado: string;
  observacion: string;
}

interface DrawerDetailProps {
  isOpen: boolean;
  onClose: () => void;
  data: InfoplazaDetail | null;
}

export default function DrawerDetail({ isOpen, onClose, data }: DrawerDetailProps) {
  // Cerrar en tecla escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen || !data) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-screen w-full sm:w-[480px] bg-slate-900 border-l border-white/5 z-50 shadow-2xl p-6 flex flex-col justify-between transform transition-transform duration-300 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
              Detalle Operativo
            </span>
            <h3 className="text-lg font-bold text-slate-100 mt-2 truncate max-w-[340px]" title={data.nombre}>
              {data.nombre}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-[var(--muted)] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto my-6 space-y-6 pr-1">
          {/* Card Resumen de Atenciones */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Atenciones en el Período</p>
                <h4 className="text-xl font-black text-white mt-0.5">
                  {data.atenciones !== null && data.atenciones !== undefined 
                    ? data.atenciones.toLocaleString() 
                    : '-'}
                </h4>
              </div>
            </div>
          </div>

          {/* Sección Localización */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1">
              <MapPin size={14} className="text-blue-400" />
              Ubicación Geográfica
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-[var(--muted)]">Regional</span>
                <p className="text-xs font-semibold text-slate-200 mt-1">{data.regional}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-[var(--muted)]">Provincia</span>
                <p className="text-xs font-semibold text-slate-200 mt-1">{data.provincia}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-[var(--muted)]">Distrito</span>
                <p className="text-xs font-semibold text-slate-200 mt-1">{data.distrito}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-[var(--muted)]">Corregimiento</span>
                <p className="text-xs font-semibold text-slate-200 mt-1">{data.corregimiento}</p>
              </div>
            </div>
          </div>

          {/* Sección Sincronización */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1">
              <RefreshCw size={14} className="text-blue-400" />
              Estado de Sincronización
            </h4>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--muted)]">Estado actual:</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  data.sync_estado === 'Al día' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : data.sync_estado === 'Para revisión'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {data.sync_estado === 'Al día' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  {data.sync_estado}
                </span>
              </div>
              
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-xs text-[var(--muted)]">Días sin sincronizar:</span>
                <span className={`text-sm font-black ${data.dias_sin_sinc && data.dias_sin_sinc > 10 ? 'text-amber-500' : 'text-slate-200'}`}>
                  {data.dias_sin_sinc !== null ? `${data.dias_sin_sinc} días` : 'N/A'}
                </span>
              </div>

              <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                <span className="text-xs text-[var(--muted)]">Observación / Reporte:</span>
                <p className="text-xs bg-slate-950 p-2.5 rounded-lg border border-white/5 text-slate-300 leading-relaxed italic">
                  "{data.observacion}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/5 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 text-center text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </>
  );
}
