import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface InfoplazaItem {
  numero: number;
  nombre: string;
  regional: string;
  provincia: string;
  distrito: string;
  corregimiento: string;
}

interface ExecutiveReportTemplateProps {
  selectedIp: InfoplazaItem;
  filters: any;
  reportData: any;
  syncState: any;
  resumenNarrativo: string;
  servicesPieData: any[];
  visitorBarData: any[];
  monthlyConsolidated: any[];
}

export default function ExecutiveReportTemplate({
  selectedIp,
  filters,
  reportData,
  syncState,
  resumenNarrativo,
  servicesPieData,
  visitorBarData,
  monthlyConsolidated
}: ExecutiveReportTemplateProps) {
  const currentDate = new Date().toLocaleDateString('es-PA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // KPIs
  const totalAtenciones = reportData?.serviceKpis?.totalAtenciones?.toLocaleString() || '0';
  const topServicio = reportData?.serviceKpis?.servicioLider || 'N/A';
  
  const topSegment = reportData?.visitorSegments?.reduce((max: any, current: any) => {
    return (current.value > (max?.value || 0)) ? current : max;
  }, null);
  const topUsuario = topSegment?.name || 'N/A';

  const syncStatus = syncState?.sync_estado || 'N/A';
  const syncDays = syncState?.dias_sin_sinc ?? 0;
  
  return (
    <div id="executive-pdf-content" className="w-[800px] bg-white text-slate-900 p-10 font-sans mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b-2 border-blue-800 pb-6 mb-6">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Logo Infoplazas" className="h-16 object-contain" />
          <div>
            <h1 className="text-2xl font-black text-blue-900 uppercase tracking-tight">Ficha Diagnóstica Ejecutiva</h1>
            <p className="text-sm font-semibold text-slate-600">
              Infoplaza #{selectedIp.numero} - {selectedIp.nombre}
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p><strong>Regional:</strong> {selectedIp.regional}</p>
          <p><strong>Ubicación:</strong> {selectedIp.provincia}, {selectedIp.distrito}</p>
          <p><strong>Fecha Emisión:</strong> {currentDate}</p>
        </div>
      </div>

      {/* KPIs FRONTALES */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="border border-slate-200 bg-slate-50 rounded-lg p-4 text-center">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Atenciones</h3>
          <p className="text-xl font-black text-blue-900">{totalAtenciones}</p>
        </div>
        <div className="border border-slate-200 bg-slate-50 rounded-lg p-4 text-center">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-1">Top Servicio</h3>
          <p className="text-sm font-black text-blue-900 mt-2 leading-tight">{topServicio}</p>
        </div>
        <div className="border border-slate-200 bg-slate-50 rounded-lg p-4 text-center">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-1">Top Usuario</h3>
          <p className="text-sm font-black text-blue-900 mt-2 leading-tight">{topUsuario}</p>
        </div>
        <div className="border border-slate-200 bg-slate-50 rounded-lg p-4 text-center">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-1">Estado Sync</h3>
          <p className={`text-sm font-black mt-2 leading-tight ${syncStatus === 'Al día' ? 'text-emerald-700' : 'text-red-600'}`}>
            {syncStatus}
          </p>
          <p className="text-[9px] text-slate-400 mt-1">{syncDays} días sin sincronizar</p>
        </div>
      </div>

      {/* RESUMEN EJECUTIVO */}
      <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 mb-8 shadow-sm">
        <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-2">
          Resumen Ejecutivo
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed text-justify">
          {resumenNarrativo}
        </p>
      </div>

      {/* GRÁFICOS (ANCHO COMPLETO) */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-xs font-bold text-slate-800 uppercase mb-4 text-center">Distribución de Servicios</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  isAnimationActive={false}
                  data={servicesPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={true}
                  style={{ fontSize: '10px', fill: '#334155' }}
                >
                  {servicesPieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-xs font-bold text-slate-800 uppercase mb-4 text-center">Perfil de Visitantes</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitorBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} interval={0} angle={-15} textAnchor="end" height={40} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Bar dataKey="Cantidad" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {visitorBarData.map((entry: any, index: number) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TABLAS SEPARADAS */}
      <div className="space-y-8 mb-4">
        
        {/* Tabla 1: Género */}
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase mb-2 border-b-2 border-slate-800 inline-block pb-1">1. Visitas por Mes según Género</h3>
          <table className="w-full text-left text-[11px] border-collapse shadow-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase border-y border-slate-300">
                <th className="py-2 px-3 font-bold">Mes</th>
                <th className="py-2 px-3 font-bold text-right text-blue-800">Masculino</th>
                <th className="py-2 px-3 font-bold text-right text-pink-700">Femenino</th>
                <th className="py-2 px-3 font-bold text-right bg-blue-100 text-blue-900">Total Género</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {monthlyConsolidated.length === 0 ? (
                <tr><td colSpan={4} className="py-4 text-center text-slate-500">Sin datos registrados.</td></tr>
              ) : (
                monthlyConsolidated.map((m) => (
                  <tr key={m.mes_numero} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3 font-medium">{m.mes}</td>
                    <td className="py-1.5 px-3 text-right">{m.masculino?.toLocaleString() || 0}</td>
                    <td className="py-1.5 px-3 text-right">{m.femenino?.toLocaleString() || 0}</td>
                    <td className="py-1.5 px-3 text-right font-bold bg-blue-50">{((m.masculino || 0) + (m.femenino || 0)).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Tabla 2: Tipo de Usuario */}
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase mb-2 border-b-2 border-slate-800 inline-block pb-1">2. Visitas por Mes según Tipo de Usuario</h3>
          <table className="w-full text-left text-[11px] border-collapse shadow-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase border-y border-slate-300 text-[9px]">
                <th className="py-2 px-2 font-bold">Mes</th>
                <th className="py-2 px-2 font-bold text-right">Primaria</th>
                <th className="py-2 px-2 font-bold text-right">Secundaria</th>
                <th className="py-2 px-2 font-bold text-right">Universitario</th>
                <th className="py-2 px-2 font-bold text-right">Docente</th>
                <th className="py-2 px-2 font-bold text-right">Tercera Edad</th>
                <th className="py-2 px-2 font-bold text-right">Púb. General</th>
                <th className="py-2 px-2 font-bold text-right bg-blue-100 text-blue-900">Total Usuarios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {monthlyConsolidated.length === 0 ? (
                <tr><td colSpan={8} className="py-4 text-center text-slate-500">Sin datos registrados.</td></tr>
              ) : (
                monthlyConsolidated.map((m) => {
                  const totalUsr = (m.primaria||0) + (m.secundaria||0) + (m.universitario||0) + (m.docente||0) + (m.tercera_edad||0) + (m.publico_general||0);
                  return (
                    <tr key={m.mes_numero} className="hover:bg-slate-50">
                      <td className="py-1.5 px-2 font-medium">{m.mes}</td>
                      <td className="py-1.5 px-2 text-right">{m.primaria?.toLocaleString() || 0}</td>
                      <td className="py-1.5 px-2 text-right">{m.secundaria?.toLocaleString() || 0}</td>
                      <td className="py-1.5 px-2 text-right">{m.universitario?.toLocaleString() || 0}</td>
                      <td className="py-1.5 px-2 text-right">{m.docente?.toLocaleString() || 0}</td>
                      <td className="py-1.5 px-2 text-right">{m.tercera_edad?.toLocaleString() || 0}</td>
                      <td className="py-1.5 px-2 text-right">{m.publico_general?.toLocaleString() || 0}</td>
                      <td className="py-1.5 px-2 text-right font-bold bg-blue-50">{totalUsr.toLocaleString()}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Tabla 3: Servicios */}
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase mb-2 border-b-2 border-slate-800 inline-block pb-1">3. Visitas por Mes según Servicios</h3>
          <table className="w-full text-left text-[11px] border-collapse shadow-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase border-y border-slate-300 text-[10px]">
                <th className="py-2 px-2 font-bold">Mes</th>
                <th className="py-2 px-2 font-bold text-right">Uso PC</th>
                <th className="py-2 px-2 font-bold text-right">Impresión</th>
                <th className="py-2 px-2 font-bold text-right">Copias</th>
                <th className="py-2 px-2 font-bold text-right">Consultas</th>
                <th className="py-2 px-2 font-bold text-right">Talleres</th>
                <th className="py-2 px-2 font-bold text-right">Reunión</th>
                <th className="py-2 px-2 font-bold text-right">Otros</th>
                <th className="py-2 px-2 font-bold text-right bg-blue-100 text-blue-900">Total Servicios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {monthlyConsolidated.length === 0 ? (
                <tr><td colSpan={9} className="py-4 text-center text-slate-500">Sin datos registrados.</td></tr>
              ) : (
                monthlyConsolidated.map((m) => (
                  <tr key={m.mes_numero} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2 font-medium">{m.mes}</td>
                    <td className="py-1.5 px-2 text-right">{m.uso_de_pc?.toLocaleString() || 0}</td>
                    <td className="py-1.5 px-2 text-right">{m.impresion?.toLocaleString() || 0}</td>
                    <td className="py-1.5 px-2 text-right">{m.copia?.toLocaleString() || 0}</td>
                    <td className="py-1.5 px-2 text-right">{m.consulta?.toLocaleString() || 0}</td>
                    <td className="py-1.5 px-2 text-right">{m.taller?.toLocaleString() || 0}</td>
                    <td className="py-1.5 px-2 text-right">{m.reunion?.toLocaleString() || 0}</td>
                    <td className="py-1.5 px-2 text-right">{m.otros?.toLocaleString() || 0}</td>
                    <td className="py-1.5 px-2 text-right font-bold bg-blue-50">{m.total_servicios?.toLocaleString() || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
        <p>Generado automáticamente por el Sistema de Control Operativo - Infoplazas AIP</p>
        <p>Documento de Uso Ejecutivo e Institucional</p>
      </div>
    </div>
  );
}
