'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { getNotificacionesSistema, getAlertasOperativas } from '../../app/actions';

// ── Tipos ────────────────────────────────────────────────────────────────────

type AlertaTipo = 'critico' | 'advertencia' | 'info';

interface AlertaOperativa {
  tipo: AlertaTipo;
  titulo: string;
  descripcion: string;
}

interface Novedad {
  id: number;
  titulo: string;
  cuerpo: string;
  tipo: string;
  creado_en: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  badgeColor: 'red' | 'amber' | 'none';
  activeRegional?: string;
  onNavigate?: (anchor: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function tiempoRelativo(isoDate: string): string {
  try {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins  = Math.floor(diff / 60_000);
    const horas = Math.floor(diff / 3_600_000);
    const dias  = Math.floor(diff / 86_400_000);
    if (mins < 1)   return 'Justo ahora';
    if (mins < 60)  return `Hace ${mins} min`;
    if (horas < 24) return `Hace ${horas} h`;
    if (dias < 30)  return `Hace ${dias} d`;
    return new Date(isoDate).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return isoDate;
  }
}

const ALERTA_CONFIG: Record<AlertaTipo, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  critico:     { icon: <AlertCircle size={15} />,   color: 'text-rose-400',  bg: 'bg-rose-500/10',  border: 'border-rose-500/20' },
  advertencia: { icon: <AlertTriangle size={15} />, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  info:        { icon: <Info size={15} />,          color: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/20' },
};

const NOVEDAD_CONFIG: Record<string, { chip: string }> = {
  critico:     { chip: 'bg-rose-500/15 text-rose-400 border-rose-500/20' },
  advertencia: { chip: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  mejora:      { chip: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  info:        { chip: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function NotificationPanel({ isOpen, onClose, activeRegional = '', onNavigate }: NotificationPanelProps) {
  const [activeTab, setActiveTab] = useState<'alertas' | 'novedades'>('alertas');

  const [alertas, setAlertas] = useState<AlertaOperativa[]>([]);
  const [alertasLoading, setAlertasLoading] = useState(false);
  const [alertasError, setAlertasError] = useState<string | null>(null);

  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [novedadesLoading, setNovedadesLoading] = useState(false);
  const [novedadesError, setNovedadesError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  // Cerrar al clickear fuera
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const fetchAlertas = useCallback(async () => {
    setAlertasLoading(true);
    setAlertasError(null);
    const res = await getAlertasOperativas(activeRegional);
    if (res.success && res.data) {
      setAlertas(res.data.alertas);
    } else {
      setAlertasError('No se pudieron cargar las alertas.');
    }
    setAlertasLoading(false);
  }, [activeRegional]);

  const fetchNovedades = useCallback(async () => {
    setNovedadesLoading(true);
    setNovedadesError(null);
    const res = await getNotificacionesSistema();
    if (res.success) {
      setNovedades(res.data as Novedad[]);
    } else {
      setNovedadesError('No se pudieron cargar las novedades.');
    }
    setNovedadesLoading(false);
  }, []);

  // Cargar alertas al abrir o al cambiar la regional
  useEffect(() => {
    if (!isOpen) return;
    fetchAlertas();
    fetchNovedades();
  }, [isOpen, activeRegional, fetchAlertas, fetchNovedades]);

  return (
    <>
      {/* Overlay para mobile */}
      <div
        className={`fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 md:hidden
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      />

      {/* Panel lateral */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Panel de notificaciones"
        className={`
          fixed top-0 right-0 h-full w-[340px] max-w-[92vw] z-40
          bg-[#0c1220] border-l border-white/8
          shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-blue-400" />
            <span className="font-bold text-sm text-white tracking-tight">Notificaciones</span>
            {/* Indicador global / regional */}
            {activeRegional ? (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border bg-indigo-500/15 text-indigo-400 border-indigo-500/20 ml-1">
                {activeRegional}
              </span>
            ) : (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border bg-slate-500/15 text-slate-400 border-slate-500/20 ml-1">
                Global
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all"
            title="Cerrar"
          >
            <X size={15} />
          </button>
        </div>

        {/* Pestañas */}
        <div className="flex border-b border-white/5 shrink-0">
          {(['alertas', 'novedades'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all
                ${activeTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              {tab === 'alertas' ? '🔔 Alertas' : '✨ Novedades'}
            </button>
          ))}
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Tab Alertas ── */}
          {activeTab === 'alertas' && (
            <div className="p-3 space-y-2">
              <div className="flex justify-end">
                <button
                  onClick={fetchAlertas}
                  disabled={alertasLoading}
                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <RefreshCw size={11} className={alertasLoading ? 'animate-spin' : ''} />
                  Actualizar
                </button>
              </div>

              {/* Acceso rápido a Auditoría de Sincronización */}
              <div 
                onClick={() => { onClose(); onNavigate?.('auditoria'); }}
                className="flex items-center justify-between p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 cursor-pointer transition-all gap-3 select-none"
                title="Abrir Auditoría de Sincronización"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Zap size={14} className="text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-200">Auditoría de Sincronización</p>
                    <p className="text-[10px] text-slate-400 truncate">Cruzar salud de red vs registros locales</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-blue-400 shrink-0">Abrir →</span>
              </div>

              {alertasLoading ? (
                <SkeletonList count={3} />
              ) : alertasError ? (
                <ErrorState msg={alertasError} onRetry={fetchAlertas} />
              ) : alertas.length === 0 ? (
                <EmptyState label="Sin alertas activas" />
              ) : (
                alertas.map((alerta, i) => {
                  const cfg = ALERTA_CONFIG[alerta.tipo] ?? ALERTA_CONFIG.info;
                  // Mapa tipo → anchor del DOM en SyncTabSection
                  const ANCHOR: Record<AlertaTipo, string> = {
                    critico:     'sync-tabla-criticos',
                    advertencia: 'sync-tabla-revision',
                    info:        'sync-tabla-saludable',
                  };
                  const anchor = ANCHOR[alerta.tipo];
                  const isClickable = !!onNavigate;
                  return (
                    <div
                      key={i}
                      onClick={() => { if (isClickable) { onClose(); onNavigate!(anchor); } }}
                      className={`flex gap-3 p-3 rounded-xl border ${cfg.bg} ${cfg.border}
                        ${isClickable ? 'cursor-pointer hover:brightness-125 transition-all' : ''}`}
                      title={isClickable ? 'Ir a la tabla en Sincronización' : undefined}
                    >
                      <span className={`mt-0.5 shrink-0 ${cfg.color}`}>{cfg.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[12px] font-semibold leading-snug ${cfg.color}`}>{alerta.titulo}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{alerta.descripcion}</p>
                        {isClickable && (
                          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            <span>Ver tabla →</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Tab Novedades ── */}
          {activeTab === 'novedades' && (
            <div className="p-3 space-y-2">
              {novedadesLoading ? (
                <SkeletonList count={4} />
              ) : novedadesError ? (
                <ErrorState msg={novedadesError} onRetry={fetchNovedades} />
              ) : novedades.length === 0 ? (
                <EmptyState label="Sin novedades publicadas" />
              ) : (
                novedades.map(n => {
                  const cfg = NOVEDAD_CONFIG[n.tipo] ?? NOVEDAD_CONFIG.info;
                  return (
                    <div
                      key={n.id}
                      className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${cfg.chip}`}>
                          {n.tipo}
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0">{tiempoRelativo(n.creado_en)}</span>
                      </div>
                      <p className="text-[12px] font-semibold text-white leading-snug">{n.titulo}</p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{n.cuerpo}</p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/5 shrink-0">
          <p className="text-[10px] text-slate-600 text-center select-none">
            Infoplazas Analytics · Alertas en tiempo real
          </p>
        </div>
      </div>
    </>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function SkeletonList({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] animate-pulse space-y-2">
          <div className="h-2.5 rounded bg-white/10 w-3/5" />
          <div className="h-2 rounded bg-white/5 w-4/5" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-slate-600">
      <CheckCircle size={28} className="text-emerald-800/60" />
      <p className="text-[11px] font-medium">{label}</p>
    </div>
  );
}

function ErrorState({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
      <AlertCircle size={24} className="text-rose-700/60" />
      <p className="text-[11px]">{msg}</p>
      <button onClick={onRetry} className="text-[10px] text-blue-400 hover:underline">
        Reintentar
      </button>
    </div>
  );
}
