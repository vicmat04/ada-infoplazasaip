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
  profiling: any;
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
  profiling,
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

      {/* RESUMEN EJECUTIVO */}
      <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 mb-6 shadow-sm">
        <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-2 border-b border-slate-200 pb-2">
          Resumen Ejecutivo
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed text-justify">
          {resumenNarrativo}
        </p>
      </div>

      {/* KPIs DE PERFILADO */}
      {profiling && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4">
            <h3 className="text-xs font-bold text-emerald-800 uppercase mb-1">Foco Comunitario / Educativo</h3>
            <p className="text-base font-black text-emerald-900">{profiling.focoLabel}</p>
            <p className="text-xs text-emerald-700 mt-1">{profiling.impactoDominante}</p>
          </div>
          <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-4">
            <h3 className="text-xs font-bold text-indigo-800 uppercase mb-1">Perfil Operativo de Servicios</h3>
            <p className="text-base font-black text-indigo-900">{profiling.perfilLabel}</p>
            <p className="text-xs text-indigo-700 mt-1">Basado en volumen de servicios base vs valor agregado</p>
          </div>
        </div>
      )}

      {/* GRÁFICOS */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-xs font-bold text-slate-800 uppercase mb-4 text-center">Distribución de Servicios</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  isAnimationActive={false}
                  data={servicesPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  style={{ fontSize: '9px', fill: '#334155' }}
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
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitorBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} interval={0} angle={-30} textAnchor="end" height={40} />
                <YAxis stroke="#64748b" fontSize={9} />
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

      {/* TABLA DE DETALLE */}
      <div className="mb-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase mb-2">Desglose Operativo Mensual ({filters.anio})</h3>
        <table className="w-full text-left text-[10px] border-collapse shadow-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-700 uppercase border-y border-slate-300">
              <th className="py-2 px-2 font-bold">Mes</th>
              <th className="py-2 px-2 font-bold text-right">Uso PC</th>
              <th className="py-2 px-2 font-bold text-right">Impresión</th>
              <th className="py-2 px-2 font-bold text-right">Copias</th>
              <th className="py-2 px-2 font-bold text-right">Consultas</th>
              <th className="py-2 px-2 font-bold text-right">Talleres</th>
              <th className="py-2 px-2 font-bold text-right bg-slate-200">Servicios</th>
              <th className="py-2 px-2 font-bold text-right">Vis. Masc</th>
              <th className="py-2 px-2 font-bold text-right">Vis. Fem</th>
              <th className="py-2 px-2 font-bold text-right bg-blue-100 text-blue-900">Total Vis.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {monthlyConsolidated.length === 0 ? (
              <tr><td colSpan={10} className="py-4 text-center text-slate-500">Sin datos registrados.</td></tr>
            ) : (
              monthlyConsolidated.map((m) => (
                <tr key={m.mes_numero} className="hover:bg-slate-50">
                  <td className="py-1.5 px-2 font-medium">{m.mes}</td>
                  <td className="py-1.5 px-2 text-right">{m.uso_de_pc?.toLocaleString() || 0}</td>
                  <td className="py-1.5 px-2 text-right">{m.impresion?.toLocaleString() || 0}</td>
                  <td className="py-1.5 px-2 text-right">{m.copia?.toLocaleString() || 0}</td>
                  <td className="py-1.5 px-2 text-right">{m.consulta?.toLocaleString() || 0}</td>
                  <td className="py-1.5 px-2 text-right">{m.taller?.toLocaleString() || 0}</td>
                  <td className="py-1.5 px-2 text-right font-bold bg-slate-50">{m.total_servicios?.toLocaleString() || 0}</td>
                  <td className="py-1.5 px-2 text-right">{m.masculino?.toLocaleString() || 0}</td>
                  <td className="py-1.5 px-2 text-right">{m.femenino?.toLocaleString() || 0}</td>
                  <td className="py-1.5 px-2 text-right font-bold bg-blue-50 text-blue-800">{m.total_visitantes?.toLocaleString() || 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
        <p>Generado automáticamente por el Sistema de Control Operativo - Infoplazas AIP</p>
        <p>Documento de Uso Ejecutivo e Institucional</p>
      </div>
    </div>
  );
}
