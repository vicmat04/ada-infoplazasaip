'use client';

import React from 'react';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  RefreshCw, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck,
  ServerCrash,
  Activity,
  FileText
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export default function Sidebar({ 
  isCollapsed, 
  setIsCollapsed, 
  activeTab, 
  setActiveTab,
  isMobileOpen = false,
  setIsMobileOpen
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'servicios', label: 'Servicios', icon: Activity },
    { id: 'visitantes', label: 'Visitantes', icon: Users },
    { id: 'sincronizacion', label: 'Sincronización', icon: RefreshCw },
    { id: 'reportes', label: 'Reportes', icon: FileText },
    { id: 'administracion', label: 'Administración', icon: Settings },
  ];

  return (
    <aside 
      style={{ backgroundColor: 'var(--sidebar-bg)' }}
      className={`fixed left-0 top-0 h-screen border-r border-[var(--card-border)] z-40 transition-all duration-300 flex flex-col print:hidden ${
        isCollapsed ? 'md:w-20' : 'md:w-64'
      } w-64 transform ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      {/* Header Logo */}
      <div className={`p-4 flex items-center h-16 border-b border-[var(--card-border)] ${isCollapsed ? 'md:justify-center justify-between' : 'justify-between'}`}>
        <div className={`flex items-center gap-2 select-none ${isCollapsed ? 'block md:hidden' : 'block'}`}>
          <Image 
            src="/logo.png" 
            alt="Logo Infoplazas" 
            width={65} 
            height={16} 
            style={{ height: 'auto' }}
            className="object-contain"
            priority
          />
        </div>
        {isCollapsed && (
          <div className="hidden md:flex w-10 h-10 relative items-center justify-center rounded-lg bg-blue-600/10 text-blue-500 font-bold text-lg select-none">
            I
          </div>
        )}
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex p-1.5 rounded-lg border border-[var(--card-border)] hover:bg-white/5 transition-colors text-[var(--muted)] hover:text-white"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Menú de Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (setIsMobileOpen) setIsMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-blue-600/15 text-blue-400 font-medium border border-blue-500/20' 
                  : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/5'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-blue-400' : 'text-[var(--muted)] group-hover:text-[var(--foreground)]'} />
              <span className={`text-sm ${isCollapsed ? 'block md:hidden' : 'block'}`}>{item.label}</span>
              
              {/* Tooltip cuando está colapsado */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-white opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sección Inferior - Perfil de Usuario Simulado */}
      <div className="p-3 border-t border-[var(--card-border)]">
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5 ${isCollapsed ? 'md:justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20 animate-fade-in shrink-0">
            AD
          </div>
          <div className={`flex-1 min-w-0 ${isCollapsed ? 'block md:hidden' : 'block'}`}>
            <p className="text-xs font-semibold truncate">Administrador</p>
            <div className="flex items-center gap-1 text-[10px] text-blue-400 font-medium mt-0.5">
              <ShieldCheck size={12} />
              <span>Global Acceso</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
