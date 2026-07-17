'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import Topbar from '../components/dashboard/Topbar';
import FiltersBar from '../components/dashboard/FiltersBar';
import KpiGrid from '../components/dashboard/KpiGrid';
import ServiceSection from '../components/dashboard/ServiceSection';
import VisitantesTabSection from '../components/dashboard/VisitantesTabSection';
import SyncTabSection from '../components/dashboard/SyncTabSection';
import OperationalSocialSection from '../components/dashboard/OperationalSocialSection';
import DrawerDetail from '../components/dashboard/DrawerDetail';
import ServiciosTabSection from '../components/dashboard/ServiciosTabSection';
import ReportesTabSection from '../components/dashboard/ReportesTabSection';
import AuditTabSection from '../components/dashboard/AuditTabSection';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { getDashboardData, getInfoplazasCatalog, getAvailablePeriods } from './actions';
import { 
  Activity, 
  Users, 
  RefreshCw, 
  Settings, 
  Database, 
  ShieldCheck,
  CheckCircle,
  FileText
} from 'lucide-react';

interface InfoplazaItem {
  numero: number;
  nombre: string;
  regional: string;
  provincia: string;
  distrito: string;
  corregimiento: string;
}

export default function Page() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [syncSubTab, setSyncSubTab] = useState<'salud' | 'auditoria'>('salud');

  // Navegar a la pestaña de sincronización y hacer scroll a una tabla específica o cambiar sub-pestaña
  const handleNavigateToSync = React.useCallback((anchor: string) => {
    setActiveTab('sincronizacion');
    if (anchor === 'auditoria') {
      setSyncSubTab('auditoria');
      return;
    }
    setSyncSubTab('salud');
    // Esperar a que el tab renderice antes de hacer scroll
    setTimeout(() => {
      const el = document.getElementById(anchor);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Pulso visual para indicar la sección destino
        el.style.transition = 'box-shadow 0.3s ease';
        el.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.5)';
        setTimeout(() => { el.style.boxShadow = ''; }, 1200);
      }
    }, 350);
  }, []); 
  
  // Filtros activos (Año 2026 por defecto, actualizado dinámicamente al cargar periodos)
  const [filters, setFilters] = useState({
    anio: 2026,
    mes: '',
    regional: '',
    provincia: '',
    distrito: '',
    infoplaza: 0,
  });

  const [allInfoplazas, setAllInfoplazas] = useState<InfoplazaItem[]>([]);
  const [availablePeriods, setAvailablePeriods] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  
  const [isPending, startTransition] = useTransition();
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);

  // Estados de Ver detalle (Drawer)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedIpData, setSelectedIpData] = useState<any>(null);

  // Forzar redirección de pestañas restringidas fuera de entorno de desarrollo local
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev && (activeTab === 'reportes' || activeTab === 'administracion')) {
      setActiveTab('dashboard');
    }
  }, [activeTab]);

  // Inicializar tema, catálogo de infoplazas y períodos dinámicos
  useEffect(() => {
    // Tema por defecto oscuro
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');

    async function initData() {
      setIsCatalogLoading(true);
      const [resCatalog, resPeriods] = await Promise.all([
        getInfoplazasCatalog(),
        getAvailablePeriods()
      ]);

      if (resCatalog.success && resCatalog.data) {
        setAllInfoplazas(resCatalog.data);
      }
      if (resPeriods.success && resPeriods.data) {
        setAvailablePeriods(resPeriods.data);
        if (resPeriods.data.length > 0) {
          const maxAnio = resPeriods.data[0].anio;
          setFilters(prev => ({ ...prev, anio: maxAnio }));
        }
      }
      setIsCatalogLoading(false);
    }
    initData();
  }, []);

  // Cargar/Actualizar data agregada del dashboard mediante RPC al cambiar filtros
  useEffect(() => {
    if (allInfoplazas.length === 0) return;
    
    startTransition(async () => {
      const res = await getDashboardData(filters);
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    });
  }, [filters, allInfoplazas]);

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      setTheme('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  };

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const handleViewDetail = (row: any) => {
    setSelectedIpData(row);
    setIsDrawerOpen(true);
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard Gerencial';
      case 'servicios':
        return 'Análisis de Servicios';
      case 'visitantes':
        return 'Perfil demográfico de Visitantes';
      case 'sincronizacion':
        return syncSubTab === 'salud'
          ? 'Salud y Sincronización de Red'
          : 'Auditoría de Sincronización';
      case 'reportes':
        return 'Reporte Individual por Infoplaza';
      case 'administracion':
        return 'Panel de Administración';
      default:
        return 'Infoplazas Analytics';
    }
  };

  return (
    <div className="min-h-screen flex bg-transparent">
      {/* Sidebar */}
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Backdrop de menú móvil */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-35 md:hidden transition-opacity duration-300"
        />
      )}

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col transition-all duration-300 min-h-screen print:pl-0 ${
          isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        } pl-0`}
      >
        {/* Topbar */}
        <Topbar 
          theme={theme} 
          toggleTheme={toggleTheme} 
          title={getTabTitle()} 
          onMenuClick={() => setIsMobileMenuOpen(true)}
          ultimoCorteDate={dashboardData?.ultimoCorteDate}
          activeRegional={filters.regional}
          onNavigateToSync={handleNavigateToSync}
        />

        {/* Contenido Principal */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-[1600px] w-full mx-auto print:p-0">
          {/* Barra de Filtros */}
          {!(activeTab === 'sincronizacion' && syncSubTab === 'auditoria') && (
            <div className="print:hidden">
              <FiltersBar 
                activeFilters={filters} 
                onFiltersChange={handleFiltersChange} 
                allInfoplazas={allInfoplazas} 
                availablePeriods={availablePeriods}
              />
            </div>
          )}

          {/* Estado de Carga / Transiciones del Server Action */}
          {dashboardData && (
            <div className="relative">
              {/* Overlay de carga translúcido para transiciones fluidas */}
              {isPending && (
                <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl pointer-events-none">
                  <div className="bg-slate-900/90 border border-white/10 px-4 py-2 rounded-lg flex items-center gap-2 shadow-2xl">
                    <RefreshCw size={16} className="animate-spin text-blue-500" />
                    <span className="text-xs font-semibold text-slate-300">Actualizando datos...</span>
                  </div>
                </div>
              )}

              {/* VISTA 1: DASHBOARD PRINCIPAL */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <KpiGrid 
                    data={{
                      totalActivas: dashboardData.networkKpis.totalActivas,
                      totalReportadas: dashboardData.networkKpis.totalReportadas,
                      porcentajeCobertura: dashboardData.networkKpis.porcentajeCobertura,
                      totalAtenciones: dashboardData.serviceKpis.totalAtenciones,
                      promedioAtenciones: dashboardData.serviceKpis.promedioAtenciones,
                      crecimientoYTD: dashboardData.serviceKpis.crecimientoYTD,
                      totalVisitantes: dashboardData.visitorKpis.totalVisitantes,
                      totalEducativo: dashboardData.visitorKpis.totalEducativo,
                      servicioLider: dashboardData.serviceKpis.servicioLider,
                      servicioLiderTotal: dashboardData.serviceKpis.servicioLiderTotal,
                      servicioLiderPorcentaje: dashboardData.serviceKpis.servicioLiderPorcentaje,
                      segmentoLider: dashboardData.visitorKpis.segmentoLider,
                      segmentoLiderTotal: dashboardData.visitorKpis.segmentoLiderTotal,
                      segmentoLiderPorcentaje: dashboardData.visitorKpis.segmentoLiderPorcentaje,
                      porcentajeFemenino: dashboardData.visitorKpis.porcentajeFemenino,
                      generoLider: dashboardData.visitorKpis.generoLider,
                      generoLiderTotal: dashboardData.visitorKpis.generoLiderTotal,
                      generoLiderPorcentaje: dashboardData.visitorKpis.generoLiderPorcentaje,
                      cumplimientoSinc: dashboardData.networkKpis.cumplimientoSinc,
                      ipsRevision: dashboardData.networkKpis.ipsRevision,
                      ipsConActividadPeriodo: dashboardData.networkKpis.ipsConActividadPeriodo,
                      ultimoCorteDate: dashboardData.ultimoCorteDate,
                    }} 
                    filters={filters}
                    isLoading={isPending && !dashboardData} 
                  />

                  {/* Sección Demanda de Servicios */}
                  <ServiceSection 
                    regionalData={dashboardData.regionalRows} 
                    trend={dashboardData.tendenciaMensual} 
                    filters={filters}
                  />

                  {/* Sección Control Operativo e Impacto Social */}
                  <OperationalSocialSection 
                    visitorSegments={dashboardData.visitorSegments}
                    visitorKpis={dashboardData.visitorKpis}
                    serviceRanking={dashboardData.serviceRanking}
                    syncRegionalRows={dashboardData.syncRegionalRows}
                    isLoading={isPending && !dashboardData}
                  />
                 </div>
              )}

              {/* VISTA 2: SERVICIOS */}
              {activeTab === 'servicios' && (
                <ServiciosTabSection 
                  data={dashboardData} 
                  filters={filters} 
                  isLoading={isPending && !dashboardData}
                  allInfoplazas={allInfoplazas}
                />
              )}

              {/* VISTA 3: VISITANTES */}
              {activeTab === 'visitantes' && (
                <VisitantesTabSection 
                  data={dashboardData} 
                  filters={filters} 
                  isLoading={isPending && !dashboardData}
                  allInfoplazas={allInfoplazas}
                />
              )}

              {/* VISTA 4: SINCRONIZACION */}
              {activeTab === 'sincronizacion' && (
                <div className="space-y-6">
                  {/* Sub-navegación de Sincronización */}
                  <div className="flex border-b border-white/10 pb-1 gap-4 print:hidden">
                    <button
                      onClick={() => setSyncSubTab('salud')}
                      className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        syncSubTab === 'salud'
                          ? 'text-blue-400 border-b-2 border-blue-500'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Sincronización
                    </button>
                    <button
                      onClick={() => setSyncSubTab('auditoria')}
                      className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        syncSubTab === 'auditoria'
                          ? 'text-blue-400 border-b-2 border-blue-500'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Auditoría de Sincronización
                    </button>
                  </div>

                  {syncSubTab === 'salud' ? (
                    <SyncTabSection 
                      filters={filters} 
                      onViewDetail={handleViewDetail} 
                    />
                  ) : (
                    <AuditTabSection 
                      allInfoplazas={allInfoplazas} 
                      availablePeriods={availablePeriods} 
                      onViewDetail={handleViewDetail}
                    />
                  )}
                </div>
              )}

              {/* VISTA REPORTES INDIVIDUALES */}
              {activeTab === 'reportes' && (
                <ReportesTabSection 
                  allInfoplazas={allInfoplazas} 
                  filters={filters} 
                  onFiltersChange={handleFiltersChange}
                />
              )}

              {/* VISTA 5: ADMINISTRACION (Hardening & Cargas) */}
              {activeTab === 'administracion' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Columna Izquierda: Configuración del Umbral */}
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                          <Settings size={16} className="text-blue-500" />
                          Configuración General
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-2">
                            Umbral de Sincronización
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              disabled
                              value={10}
                              className="px-3 py-1.5 rounded-lg bg-white/5 border border-[var(--card-border)] text-sm w-20 text-center text-slate-300 font-bold focus:outline-none"
                            />
                            <span className="text-xs text-[var(--muted)]">días hábiles</span>
                          </div>
                          <p className="text-[10px] text-blue-400 mt-2">
                            * El umbral está fijo temporalmente en 10 días por regla del negocio.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck size={16} className="text-emerald-500" />
                          Información de Roles y Auth
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-[var(--muted)] leading-relaxed space-y-3">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                          <CheckCircle size={14} />
                          Base lista para Supabase Auth
                        </div>
                        <p>
                          La capa de datos está montada utilizando Server Actions server-side con la Service Role Key, evitando la exposición en el cliente.
                        </p>
                        <p>
                          Las validaciones por regional (`profiles.regional`) e inactividad de usuarios del sistema están mapeadas en la lógica base, listas para activarse una vez acoplado el inicio de sesión.
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Columna Derecha: Historial de Cargas Reales (ejecuciones) */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-sm font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                        <Database size={16} className="text-violet-500" />
                        Historial de Procesamiento / Cargas (Ejecuciones)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* TODO: Implementar tabla `audit_cargas` en Supabase con campos:
                           regional, fecha_carga, periodo_inicio, periodo_fin,
                           total_registros, archivos_subidos.
                           Una vez disponible, consultar via RPC y renderizar aquí dinámicamente.
                           No se deben hardcodear registros de cargas en el frontend. */}
                      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                        <div className="p-4 rounded-2xl bg-violet-500/10 text-violet-400">
                          <FileText size={28} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-300">
                            Historial de cargas pendiente de implementación
                          </p>
                          <p className="text-xs text-[var(--muted)] max-w-sm">
                            Esta sección requiere una tabla de auditoría en base de datos.
                            Los registros de carga no pueden ser datos estáticos.
                          </p>
                        </div>
                        <span className="text-[10px] font-bold uppercase text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded">
                          Pendiente — Requiere tabla audit_cargas en Supabase
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Estado de carga general inicial */}
          {!dashboardData && (
            <div className="h-[460px] flex flex-col items-center justify-center text-center p-6">
              <RefreshCw className="w-10 h-10 mb-4 animate-spin text-blue-500" />
              <p className="text-sm font-semibold text-slate-300">Cargando base de datos de Supabase...</p>
              <p className="text-xs text-[var(--muted)] mt-1.5">Conectando con la red e indexando atenciones y logs.</p>
            </div>
          )}
        </main>
      </div>

      {/* Drawer lateral de detalles */}
      <DrawerDetail 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        data={selectedIpData} 
      />
    </div>
  );
}
