'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronDown, ChevronRight, MapPin, Search, X } from 'lucide-react';

interface InfoplazaItem {
  numero: number;
  nombre: string;
  regional: string;
  provincia: string;
  distrito: string;
  corregimiento: string;
}

interface PeriodoItem {
  anio: number;
  mes: string;
}

/** Rango de meses en formato AAAAMM (ej. 202605). Solo lo usan las vistas que lo soportan. */
export interface RangoMeses {
  desde: number;
  hasta: number;
}

type Filtros = { anio: number; mes: string; regional: string; provincia: string; distrito: string; infoplaza: number; cuatrimestre: number };

interface FiltersBarProps {
  onFiltersChange: (filters: Filtros) => void;
  activeFilters: Filtros;
  allInfoplazas: InfoplazaItem[];
  availablePeriods: PeriodoItem[];
  /** Habilita el interruptor "Rango de meses" (p. ej. en Reportes). */
  permitirRango?: boolean;
  rango?: RangoMeses | null;
  onRangoChange?: (rango: RangoMeses | null) => void;
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const CUATRIMESTRES = [
  { n: 1, label: 'C1', meses: 'Ene–Abr' },
  { n: 2, label: 'C2', meses: 'May–Ago' },
  { n: 3, label: 'C3', meses: 'Sep–Dic' },
];

const normalizar = (t: string) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const ymTexto = (v: number) => `${MESES_CORTO[(v % 100) - 1]} ${Math.floor(v / 100)}`;

/* ───────────────────────── Piezas compartidas ───────────────────────── */

function Chip({ activo, onClick, children, disabled, title, className = '' }: {
  activo?: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean; title?: string; className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={!!activo}
      className={`px-2.5 py-1.5 rounded-lg border text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500
        disabled:opacity-30 disabled:cursor-not-allowed
        ${activo ? 'bg-blue-600 border-blue-600 text-white' : 'border-[var(--card-border)] text-[var(--foreground)] hover:bg-white/5'} ${className}`}
    >
      {children}
    </button>
  );
}

/** Botón que abre un panel; se cierra al hacer clic fuera o con Escape. */
function Desplegable({ icono, etiqueta, valor, abierto, onToggle, onClose, children, ancho = 380 }: {
  icono: React.ReactNode; etiqueta: string; valor: string; abierto: boolean;
  onToggle: () => void; onClose: () => void; children: React.ReactNode; ancho?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc); };
  }, [abierto, onClose]);

  return (
    <div ref={ref} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={panelId}
        className={`w-full sm:w-auto flex items-center gap-2.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-white/5 border text-left transition-colors
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
          ${abierto ? 'border-blue-500' : 'border-[var(--card-border)] hover:border-blue-500/50'}`}
      >
        <span className="text-[var(--muted)] shrink-0">{icono}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] leading-tight text-[var(--muted)]">{etiqueta}</span>
          <span className="block text-sm font-semibold text-[var(--foreground)] truncate sm:max-w-[340px]">{valor}</span>
        </span>
        <ChevronDown size={14} className={`text-[var(--muted)] shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <div
          id={panelId}
          role="dialog"
          aria-label={etiqueta}
          className="absolute z-50 top-full left-0 mt-1.5 p-3 rounded-xl border border-[var(--card-border)] bg-[var(--sidebar-bg)] shadow-2xl"
          style={{ width: `min(${ancho}px, calc(100vw - 2rem))` }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Período ───────────────────────── */

function PanelPeriodo({ filtros, onFiltersChange, availablePeriods, permitirRango, rango, onRangoChange, cerrar }: {
  filtros: Filtros; onFiltersChange: (f: Filtros) => void; availablePeriods: PeriodoItem[];
  permitirRango: boolean; rango: RangoMeses | null; onRangoChange?: (r: RangoMeses | null) => void; cerrar: () => void;
}) {
  const anios = useMemo(
    () => Array.from(new Set(availablePeriods.map((p) => p.anio))).filter(Boolean).sort((a, b) => b - a),
    [availablePeriods]
  );
  const mesesConDatos = useMemo(() => {
    const m = new Map<number, Set<number>>();
    availablePeriods.forEach((p) => {
      const i = MESES.indexOf(p.mes);
      if (!p.anio || i < 0) return;
      if (!m.has(p.anio)) m.set(p.anio, new Set());
      m.get(p.anio)!.add(i + 1);
    });
    return m;
  }, [availablePeriods]);

  const [modoRango, setModoRango] = useState(permitirRango && !!rango);
  const [inicioPendiente, setInicioPendiente] = useState<number | null>(null);
  const [anioVista, setAnioVista] = useState<number>(
    rango ? Math.floor(rango.hasta / 100) : filtros.anio || anios[0] || new Date().getFullYear()
  );

  const anioActual = modoRango ? anioVista : filtros.anio;

  const elegirAnio = (a: number) => {
    if (modoRango) { setAnioVista(a); return; }
    const mesValido = a === 0 || !filtros.mes || mesesConDatos.get(a)?.has(MESES.indexOf(filtros.mes) + 1);
    onFiltersChange({ ...filtros, anio: a, mes: mesValido ? filtros.mes : '' });
  };

  const elegirCuatrimestre = (n: number) => {
    onRangoChange?.(null);
    onFiltersChange({ ...filtros, mes: '', cuatrimestre: n });
    cerrar();
  };

  const elegirMes = (num: number) => {
    if (modoRango) {
      const v = anioVista * 100 + num;
      if (inicioPendiente === null) { setInicioPendiente(v); return; }
      onRangoChange?.({ desde: Math.min(inicioPendiente, v), hasta: Math.max(inicioPendiente, v) });
      setInicioPendiente(null);
      cerrar();
      return;
    }
    onFiltersChange({ ...filtros, mes: MESES[num - 1], cuatrimestre: 0 });
    cerrar();
  };

  const alternarRango = (on: boolean) => {
    setModoRango(on);
    setInicioPendiente(null);
    if (on) setAnioVista(filtros.anio || anios[0] || anioVista);
    else onRangoChange?.(null);
  };

  // Resaltado del rango (confirmado o en curso)
  const rangoVisible = modoRango
    ? inicioPendiente !== null ? { desde: inicioPendiente, hasta: inicioPendiente } : rango
    : null;

  return (
    <div className="text-[var(--foreground)]">
      <p className="text-[11px] text-[var(--muted)] mb-1.5">Año</p>
      <div className="flex flex-wrap gap-1.5">
        {!modoRango && <Chip activo={filtros.anio === 0} onClick={() => elegirAnio(0)}>Todos</Chip>}
        {anios.map((a) => <Chip key={a} activo={anioActual === a} onClick={() => elegirAnio(a)}>{a}</Chip>)}
      </div>

      {!modoRango && filtros.anio !== 0 && (
        <>
          <p className="text-[11px] text-[var(--muted)] mt-3 mb-1.5">Año completo o cuatrimestre</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip activo={!filtros.mes && !filtros.cuatrimestre} onClick={() => { onRangoChange?.(null); onFiltersChange({ ...filtros, mes: '', cuatrimestre: 0 }); cerrar(); }}>
              Año completo
            </Chip>
            {CUATRIMESTRES.map((c) => (
              <Chip key={c.n} activo={filtros.cuatrimestre === c.n && !filtros.mes} onClick={() => elegirCuatrimestre(c.n)}>
                {c.label}<span className="opacity-70 ml-1">{c.meses}</span>
              </Chip>
            ))}
          </div>
        </>
      )}

      {anioActual !== 0 && (
        <>
          <p className="text-[11px] text-[var(--muted)] mt-3 mb-1.5">
            {modoRango ? `Meses de ${anioVista}: elija el mes inicial y el final` : 'Mes'}
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {MESES_CORTO.map((m, i) => {
              const num = i + 1;
              const v = anioActual * 100 + num;
              const conDatos = mesesConDatos.get(anioActual)?.has(num) ?? false;
              let activo = false;
              let enRango = false;
              if (rangoVisible) {
                activo = v === rangoVisible.desde || v === rangoVisible.hasta;
                enRango = v > rangoVisible.desde && v < rangoVisible.hasta;
              } else if (!modoRango) {
                activo = filtros.mes === MESES[i];
              }
              return (
                <Chip
                  key={m}
                  activo={activo}
                  disabled={!conDatos}
                  title={conDatos ? MESES[i] : 'Sin datos cargados'}
                  onClick={() => elegirMes(num)}
                  className={`py-2 text-center ${enRango ? '!bg-blue-500/15 !border-transparent' : ''}`}
                >
                  {m}
                </Chip>
              );
            })}
          </div>
        </>
      )}

      {permitirRango && (
        <label className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-[var(--card-border)] text-[13px] cursor-pointer">
          <span>
            Rango de meses
            <span className="block text-[11px] text-[var(--muted)]">Puede cruzar años</span>
          </span>
          <input
            type="checkbox"
            checked={modoRango}
            onChange={(e) => alternarRango(e.target.checked)}
            className="w-9 h-5 accent-blue-600"
          />
        </label>
      )}
      {modoRango && (
        <p className="text-xs text-[var(--muted)] mt-2">
          {inicioPendiente !== null
            ? `Inicio: ${ymTexto(inicioPendiente)}. Cambie de año si lo necesita y elija el mes final.`
            : rango ? `Rango actual: ${ymTexto(rango.desde)} – ${ymTexto(rango.hasta)}. Elija un nuevo mes inicial para cambiarlo.`
            : 'Elija el mes inicial.'}
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── Ubicación ───────────────────────── */

type Nivel = 'Regional' | 'Provincia' | 'Infoplaza';
interface Nodo { nivel: Nivel; nombre: string; regional: string; provincia?: string; ip?: InfoplazaItem }

function PanelUbicacion({ filtros, onFiltersChange, allInfoplazas, cerrar }: {
  filtros: Filtros; onFiltersChange: (f: Filtros) => void; allInfoplazas: InfoplazaItem[]; cerrar: () => void;
}) {
  // Árbol Regional › Provincia › Infoplazas
  const arbol = useMemo(() => {
    const t = new Map<string, Map<string, InfoplazaItem[]>>();
    allInfoplazas.forEach((ip) => {
      const r = ip.regional || 'Sin regional';
      const p = ip.provincia || 'Sin provincia';
      if (!t.has(r)) t.set(r, new Map());
      const provs = t.get(r)!;
      if (!provs.has(p)) provs.set(p, []);
      provs.get(p)!.push(ip);
    });
    t.forEach((provs) => provs.forEach((ips) => ips.sort((a, b) => a.numero - b.numero)));
    return t;
  }, [allInfoplazas]);

  const nodos = useMemo(() => {
    const lista: Nodo[] = [];
    Array.from(arbol.keys()).sort().forEach((r) => {
      lista.push({ nivel: 'Regional', nombre: r, regional: r });
      Array.from(arbol.get(r)!.keys()).sort().forEach((p) => {
        lista.push({ nivel: 'Provincia', nombre: p, regional: r, provincia: p });
        arbol.get(r)!.get(p)!.forEach((ip) => lista.push({ nivel: 'Infoplaza', nombre: `${ip.numero} - ${ip.nombre}`, regional: r, provincia: p, ip }));
      });
    });
    return lista;
  }, [arbol]);

  // Punto de partida del explorador: el nivel padre de la selección actual
  const [ruta, setRuta] = useState<string[]>(() => {
    if (filtros.infoplaza || filtros.provincia) return filtros.regional && filtros.provincia ? [filtros.regional, filtros.provincia] : [];
    return [];
  });
  const [texto, setTexto] = useState('');
  const [activo, setActivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const elegir = (n: Nodo | null) => {
    if (!n) onFiltersChange({ ...filtros, regional: '', provincia: '', distrito: '', infoplaza: 0 });
    else if (n.nivel === 'Regional') onFiltersChange({ ...filtros, regional: n.regional, provincia: '', distrito: '', infoplaza: 0 });
    else if (n.nivel === 'Provincia') onFiltersChange({ ...filtros, regional: n.regional, provincia: n.provincia!, distrito: '', infoplaza: 0 });
    else onFiltersChange({ ...filtros, regional: n.ip!.regional, provincia: n.ip!.provincia, distrito: n.ip!.distrito, infoplaza: n.ip!.numero });
    cerrar();
  };

  const q = normalizar(texto);

  // Filas visibles: explorador jerárquico o resultados de búsqueda agrupados
  type Fila = { tipo: 'grupo'; texto: string } | { tipo: 'nodo'; nodo: Nodo | null; titulo: string; sub?: string; bajar?: string[] };
  const filas: Fila[] = useMemo(() => {
    const out: Fila[] = [];
    if (!q) {
      if (ruta.length === 0) {
        out.push({ tipo: 'nodo', nodo: null, titulo: 'Todo el país' });
        Array.from(arbol.keys()).sort().forEach((r) => {
          const n = arbol.get(r)!;
          const total = Array.from(n.values()).reduce((s, l) => s + l.length, 0);
          out.push({ tipo: 'nodo', nodo: { nivel: 'Regional', nombre: r, regional: r }, titulo: r, sub: `${n.size} provincias, ${total} Infoplazas`, bajar: [r] });
        });
      } else if (ruta.length === 1) {
        const r = ruta[0];
        out.push({ tipo: 'nodo', nodo: { nivel: 'Regional', nombre: r, regional: r }, titulo: `Toda la regional ${r}` });
        Array.from(arbol.get(r)?.keys() ?? []).sort().forEach((p) => {
          const ips = arbol.get(r)!.get(p)!;
          out.push({ tipo: 'nodo', nodo: { nivel: 'Provincia', nombre: p, regional: r, provincia: p }, titulo: p, sub: `${ips.length} Infoplazas`, bajar: [r, p] });
        });
      } else {
        const [r, p] = ruta;
        out.push({ tipo: 'nodo', nodo: { nivel: 'Provincia', nombre: p, regional: r, provincia: p }, titulo: `Toda la provincia ${p}` });
        (arbol.get(r)?.get(p) ?? []).forEach((ip) =>
          out.push({ tipo: 'nodo', nodo: { nivel: 'Infoplaza', nombre: ip.nombre, regional: r, provincia: p, ip }, titulo: `${ip.numero} - ${ip.nombre}`, sub: `Distrito ${ip.distrito}` }));
      }
      return out;
    }
    const coincide = (n: Nodo) =>
      normalizar(n.nombre).includes(q) ||
      (n.ip && (String(n.ip.numero).startsWith(q) || normalizar(n.ip.distrito).includes(q) || normalizar(n.ip.corregimiento).includes(q)));
    const res = nodos.filter(coincide);
    const grupos: [Nivel, string][] = [['Regional', 'Regionales'], ['Provincia', 'Provincias'], ['Infoplaza', 'Infoplazas']];
    grupos.forEach(([nivel, titulo]) => {
      const g = res.filter((n) => n.nivel === nivel).slice(0, nivel === 'Infoplaza' ? 40 : 10);
      if (!g.length) return;
      out.push({ tipo: 'grupo', texto: titulo });
      g.forEach((n) => out.push({
        tipo: 'nodo', nodo: n, titulo: n.nombre,
        sub: n.nivel === 'Infoplaza' ? `${n.ip!.distrito}, ${n.provincia}, Regional ${n.regional}` : n.nivel === 'Provincia' ? `Regional ${n.regional}` : undefined,
      }));
    });
    return out;
  }, [q, ruta, arbol, nodos]);

  const opciones = filas.filter((f): f is Extract<Fila, { tipo: 'nodo' }> => f.tipo === 'nodo');

  const esSeleccion = (n: Nodo | null) => {
    if (!n) return !filtros.regional && !filtros.provincia && !filtros.infoplaza;
    if (n.nivel === 'Infoplaza') return filtros.infoplaza === n.ip!.numero;
    if (n.nivel === 'Provincia') return !filtros.infoplaza && filtros.provincia === n.provincia && filtros.regional === n.regional;
    return !filtros.infoplaza && !filtros.provincia && filtros.regional === n.regional;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((a) => Math.min(a + 1, opciones.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && opciones[activo]) { e.preventDefault(); elegir(opciones[activo].nodo); }
  };

  let idx = -1;
  return (
    <div>
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setActivo(0); }}
          onKeyDown={onKeyDown}
          placeholder="Regional, provincia o Infoplaza (N.º, nombre o distrito)"
          aria-label="Buscar ubicación"
          className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-[var(--card-border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-blue-500"
        />
      </div>

      {!q && (
        <nav className="flex flex-wrap items-center gap-1 text-xs text-[var(--muted)] mt-2.5 mb-1 px-0.5" aria-label="Nivel actual">
          <button type="button" onClick={() => setRuta([])} className="text-blue-400 hover:underline">Todo el país</button>
          {ruta.map((r, i) => (
            <React.Fragment key={r}>
              <ChevronRight size={12} />
              <button type="button" onClick={() => setRuta(ruta.slice(0, i + 1))} className="text-blue-400 hover:underline">{r}</button>
            </React.Fragment>
          ))}
        </nav>
      )}

      <ul role="listbox" aria-label="Ubicaciones" className="mt-1 max-h-72 overflow-y-auto">
        {filas.map((f, i) => {
          if (f.tipo === 'grupo') return <li key={`g${i}`} className="px-2 pt-2 pb-0.5 text-[11px] text-[var(--muted)]">{f.texto}</li>;
          idx++;
          const miIdx = idx;
          const sel = esSeleccion(f.nodo);
          return (
            <li
              key={`n${i}`}
              role="option"
              aria-selected={sel}
              onMouseEnter={() => setActivo(miIdx)}
              className={`flex items-stretch rounded-lg ${q && miIdx === activo ? 'bg-white/5' : 'hover:bg-white/5'}`}
            >
              <button
                type="button"
                onClick={() => elegir(f.nodo)}
                className={`flex-1 text-left px-2 py-2 text-sm ${sel ? 'text-blue-400 font-semibold' : 'text-[var(--foreground)]'}`}
              >
                {f.titulo}
                {q && f.nodo && f.nodo.nivel !== 'Infoplaza' && (
                  <span className="ml-1.5 text-[10px] text-[var(--muted)] border border-[var(--card-border)] rounded px-1 align-[1px]">{f.nodo.nivel}</span>
                )}
                {f.sub && <span className="block text-xs text-[var(--muted)] font-normal">{f.sub}</span>}
              </button>
              {f.bajar && (
                <button
                  type="button"
                  onClick={() => setRuta(f.bajar!)}
                  aria-label={`Ver dentro de ${f.titulo}`}
                  className="px-2.5 text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  <ChevronRight size={16} />
                </button>
              )}
            </li>
          );
        })}
        {q && opciones.length === 0 && <li className="px-2 py-3 text-xs text-[var(--muted)]">Sin coincidencias</li>}
      </ul>
    </div>
  );
}

/* ───────────────────────── Barra ───────────────────────── */

export default function FiltersBar({
  onFiltersChange, activeFilters, allInfoplazas, availablePeriods,
  permitirRango = false, rango = null, onRangoChange,
}: FiltersBarProps) {
  const [abierto, setAbierto] = useState<'periodo' | 'ubicacion' | null>(null);
  const cerrar = React.useCallback(() => setAbierto(null), []);
  const rangoActivo = permitirRango && !!rango;

  const anioDefault = useMemo(
    () => availablePeriods.reduce((m, p) => Math.max(m, p.anio || 0), 0),
    [availablePeriods]
  );

  const textoPeriodo = (() => {
    if (rangoActivo && rango) return `${ymTexto(rango.desde)} – ${ymTexto(rango.hasta)}`;
    const f = activeFilters;
    if (!f.anio) return f.mes ? `${f.mes}, todos los años` : f.cuatrimestre ? `Cuatrimestre ${f.cuatrimestre}, todos los años` : 'Todos los años';
    if (f.mes) return `${f.mes} ${f.anio}`;
    if (f.cuatrimestre) return `Cuatrimestre ${f.cuatrimestre} ${f.anio}`;
    return `Año ${f.anio}`;
  })();

  const ubicacion = (() => {
    const f = activeFilters;
    if (f.infoplaza) {
      const ip = allInfoplazas.find((i) => i.numero === f.infoplaza);
      return { etiqueta: 'Infoplaza', valor: ip ? `${ip.numero} - ${ip.nombre} (${ip.distrito}, ${ip.provincia})` : `N.º ${f.infoplaza}` };
    }
    if (f.provincia) return { etiqueta: 'Provincia', valor: `${f.provincia}${f.regional ? `, Regional ${f.regional}` : ''}` };
    if (f.regional) return { etiqueta: 'Regional', valor: f.regional };
    return { etiqueta: 'Ubicación', valor: 'Todo el país' };
  })();

  const hayFiltros =
    rangoActivo || !!activeFilters.mes || !!activeFilters.cuatrimestre ||
    (anioDefault !== 0 && activeFilters.anio !== anioDefault) ||
    !!activeFilters.regional || !!activeFilters.provincia || !!activeFilters.distrito || !!activeFilters.infoplaza;

  const limpiar = () => {
    onRangoChange?.(null);
    onFiltersChange({ anio: anioDefault, mes: '', regional: '', provincia: '', distrito: '', infoplaza: 0, cuatrimestre: 0 });
  };

  return (
    <div className="glass relative z-40 rounded-xl p-3 mb-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5" role="search" aria-label="Filtros">
      <Desplegable
        icono={<Calendar size={16} />}
        etiqueta="Período"
        valor={textoPeriodo}
        abierto={abierto === 'periodo'}
        onToggle={() => setAbierto(abierto === 'periodo' ? null : 'periodo')}
        onClose={cerrar}
        ancho={360}
      >
        <PanelPeriodo
          filtros={activeFilters}
          onFiltersChange={onFiltersChange}
          availablePeriods={availablePeriods}
          permitirRango={permitirRango}
          rango={rango}
          onRangoChange={onRangoChange}
          cerrar={cerrar}
        />
      </Desplegable>

      <Desplegable
        icono={<MapPin size={16} />}
        etiqueta={ubicacion.etiqueta}
        valor={ubicacion.valor}
        abierto={abierto === 'ubicacion'}
        onToggle={() => setAbierto(abierto === 'ubicacion' ? null : 'ubicacion')}
        onClose={cerrar}
        ancho={400}
      >
        <PanelUbicacion filtros={activeFilters} onFiltersChange={onFiltersChange} allInfoplazas={allInfoplazas} cerrar={cerrar} />
      </Desplegable>

      {hayFiltros && (
        <button
          type="button"
          onClick={limpiar}
          className="sm:ml-auto self-end sm:self-auto flex items-center gap-1 text-xs font-medium text-rose-400 hover:text-rose-300 px-1 py-1"
        >
          <X size={13} /> Limpiar filtros
        </button>
      )}
    </div>
  );
}
