'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Sun, Moon, Bell, Wifi, WifiOff, Menu, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getAlertasOperativas } from '../../app/actions';
import NotificationPanel from './NotificationPanel';

interface TopbarProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  title: string;
  onMenuClick?: () => void;
  ultimoCorteDate?: string;
  activeRegional?: string;
  onNavigateToSync?: (anchor: string) => void;
}

const formatCorteDate = (dateStr?: string) => {
  if (!dateStr) return 'Cargando...';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const ano = parts[0];
    const mesNum = parseInt(parts[1], 10);
    const dia = parseInt(parts[2], 10);

    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const mesName = meses[mesNum - 1] || '';
    return `${dia} de ${mesName}, ${ano}`;
  } catch (e) {
    return dateStr;
  }
};

export default function Topbar({ theme, toggleTheme, title, onMenuClick, ultimoCorteDate, activeRegional = '', onNavigateToSync }: TopbarProps) {
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [badgeColor, setBadgeColor] = useState<'red' | 'amber' | 'none'>('none');

  // Verificar conexión a base de datos
  useEffect(() => {
    async function checkConnection() {
      try {
        const { error } = await supabase.from('infoplazas').select('count', { count: 'exact', head: true });
        setDbConnected(!error);
      } catch {
        setDbConnected(false);
      }
    }
    checkConnection();
  }, []);

  // Calcular color del badge según alertas críticas
  const fetchBadgeColor = useCallback(async () => {
    const res = await getAlertasOperativas(activeRegional);
    if (res.success && res.data) {
      const { criticas, revision } = res.data.resumen;
      if (criticas > 0) setBadgeColor('red');
      else if (revision > 0) setBadgeColor('amber');
      else setBadgeColor('none');
    }
  }, [activeRegional]);

  useEffect(() => {
    fetchBadgeColor();
  }, [fetchBadgeColor]);

  const handleBellClick = useCallback(() => {
    setIsPanelOpen(prev => !prev);
  }, []);

  const handlePanelClose = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const badgeDotClass =
    badgeColor === 'red'
      ? 'bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]'
      : badgeColor === 'amber'
      ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]'
      : 'bg-blue-500';

  return (
    <>
      <header className="h-16 border-b border-[var(--card-border)] bg-transparent backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 print:hidden">
        {/* Título de la sección */}
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-xl border border-[var(--card-border)] hover:bg-white/5 text-[var(--muted)] hover:text-white transition-all shrink-0"
              title="Abrir menú"
            >
              <Menu size={20} />
            </button>
          )}
          <h1
            className="text-base sm:text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent light:from-slate-900 light:to-slate-600 truncate max-w-[150px] sm:max-w-none"
            title={title}
          >
            {title}
          </h1>
        </div>

        {/* Acciones del lado derecho */}
        <div className="flex items-center gap-4">
          {/* Indicador de Base de Datos */}
          <div
            className="hidden sm:flex items-center gap-2.5 rounded-lg bg-white/5 border border-white/5 px-3 py-1.5 text-[11px] font-medium select-none cursor-help"
            title="Conexión activa. Último corte de datos sincronizado en el sistema."
          >
            {dbConnected === null ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-[var(--muted)]">Conectando...</span>
              </>
            ) : dbConnected ? (
              <>
                <div className="flex items-center gap-1.5 pr-2.5 border-r border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <span className="text-emerald-400 font-semibold">Online</span>
                </div>
                <div className="flex items-center gap-1.5 text-[var(--muted)]">
                  <Calendar size={12} className="text-blue-400 shrink-0" />
                  <span>Corte: {formatCorteDate(ultimoCorteDate)}</span>
                </div>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-rose-400 font-semibold">Offline</span>
              </>
            )}
          </div>

          {/* Campana de notificaciones */}
          <button
            onClick={handleBellClick}
            className={`p-2 rounded-xl border transition-all relative
              ${isPanelOpen
                ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                : 'border-[var(--card-border)] hover:bg-white/5 text-[var(--muted)] hover:text-white'
              }`}
            title="Notificaciones"
            aria-label="Abrir panel de notificaciones"
          >
            <Bell size={18} />
            {badgeColor !== 'none' && (
              <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${badgeDotClass} animate-pulse`} />
            )}
          </button>

          {/* Selector de tema */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-[var(--card-border)] hover:bg-white/5 text-[var(--muted)] hover:text-white transition-all"
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Panel de notificaciones */}
      <NotificationPanel
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
        badgeColor={badgeColor}
        activeRegional={activeRegional}
        onNavigate={onNavigateToSync}
      />
    </>
  );
}

