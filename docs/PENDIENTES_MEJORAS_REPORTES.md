# Pendientes de Mejoras - Módulos Reportes y Capacitaciones

## 📋 Estado de Tareas

- ✅ **COMPLETADO**: Actualizar documentación con módulos Reportes y Capacitaciones
- ⏳ **PENDIENTE**: 5 tareas de mejora

---

## 🔧 Tareas Pendientes

### 2. Eliminar hardcoding de meses en ReportePersonalizadoSection
**Prioridad**: Media  
**Archivo**: `src/components/dashboard/ReportePersonalizadoSection.tsx`

**Problema**:
```typescript
// Línea ~70 - Hardcoded (VIOLACIÓN de AGENTS.md)
const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
```

**Solución Recomendada** (Opción A - Más simple):
```typescript
// Usar Intl API nativa de JavaScript
const MESES_NOMBRES = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat('es-PA', { month: 'long' })
    .format(new Date(2000, i, 1))
    .replace(/^\w/, c => c.toUpperCase())
);
```

**Solución Alternativa** (Opción B - Más consistente con el backend):
```sql
-- Crear función RPC en Supabase
CREATE OR REPLACE FUNCTION get_meses_catalogo()
RETURNS TABLE(mes_num int, mes_nombre text) AS $$
  SELECT * FROM (VALUES 
    (1, 'Enero'), (2, 'Febrero'), (3, 'Marzo'), (4, 'Abril'),
    (5, 'Mayo'), (6, 'Junio'), (7, 'Julio'), (8, 'Agosto'),
    (9, 'Septiembre'), (10, 'Octubre'), (11, 'Noviembre'), (12, 'Diciembre')
  ) AS m(mes_num, mes_nombre);
$$ LANGUAGE SQL IMMUTABLE;
```

```typescript
// Luego consumir en el componente
const [mesesCatalogo, setMesesCatalogo] = useState<string[]>([]);

useEffect(() => {
  supabase.rpc('get_meses_catalogo').then(({ data }) => {
    if (data) setMesesCatalogo(data.map(m => m.mes_nombre));
  });
}, []);
```

**Estimación**: 30 minutos (Opción A) o 1 hora (Opción B)

---

### 3. Mejorar responsividad móvil
**Prioridad**: Alta  
**Archivos afectados**:
- `src/components/dashboard/ReportesTabSection.tsx`
- `src/components/dashboard/ReportePersonalizadoSection.tsx`
- `src/components/dashboard/ReporteIndividualSection.tsx`
- `src/components/dashboard/CapacitacionesAnalytics.tsx`

**Problemas identificados**:

#### 3.1 Tablas con scroll horizontal no evidente
```tsx
// ANTES (sin indicador visual de scroll)
<div className="overflow-x-auto">
  <DataTable ... />
</div>

// DESPUÉS (con gradiente indicador)
<div className="relative">
  <div className="overflow-x-auto pb-2 scroll-smooth">
    <DataTable ... />
  </div>
  {/* Gradiente indicador de más contenido a la derecha */}
  <div className="md:hidden absolute right-0 top-0 bottom-0 w-8 
                  bg-gradient-to-l from-[var(--card-bg)] to-transparent 
                  pointer-events-none opacity-90" />
</div>
```

#### 3.2 Filtros de métricas difíciles de usar en móvil
**Archivo**: `ReportePersonalizadoSection.tsx` (líneas ~300-400)

```tsx
// Agregar Drawer/Modal para móviles
const [showMetricsDrawer, setShowMetricsDrawer] = useState(false);

// Botón compacto en móviles
<div className="lg:hidden">
  <button 
    onClick={() => setShowMetricsDrawer(true)}
    className="w-full flex items-center justify-between px-4 py-2 
               rounded-lg border border-[var(--card-border)] 
               bg-[var(--card-bg)] hover:bg-white/5"
  >
    <span className="text-sm">Columnas a mostrar</span>
    <span className="text-xs text-[var(--muted)]">
      {Object.values(selectedMetrics).filter(Boolean).length} seleccionadas
    </span>
  </button>
</div>

// Vista completa en escritorio (mantener actual)
<div className="hidden lg:block">
  {/* Checkboxes actuales */}
</div>
```

#### 3.3 Grid de KPIs muy denso en móviles
**Archivo**: `CapacitacionesAnalytics.tsx` (línea ~624)

```tsx
// ANTES
<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">

// DESPUÉS (mejor progresión)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
```

#### 3.4 Heatmap ilegible en móviles
**Archivo**: `CapacitacionesAnalytics.tsx` (componente Heatmap)

```tsx
// Agregar mensaje informativo en móviles
<div className="md:hidden mb-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
  <p className="text-xs text-blue-400">
    💡 Para mejor visualización de la matriz, rote su dispositivo a modo horizontal
  </p>
</div>

// Reducir tamaño de fuente en móviles
<td className="text-xs sm:text-sm">...</td>
```

**Estimación**: 3-4 horas

---

### 4. Centralizar utilidades compartidas
**Prioridad**: Baja (refactoring)  
**Beneficio**: Mantenibilidad y consistencia

**Crear archivo**: `src/lib/report-utils.ts`

```typescript
/**
 * Utilidades compartidas para módulos de reportes
 */

/**
 * Convierte texto a slug seguro para nombres de archivo
 */
export const slugify = (s: string): string =>
  s.normalize('NFD')
   .replace(/[\u0300-\u036f]/g, '')
   .replace(/[^A-Za-z0-9]+/g, '_')
   .toLowerCase();

/**
 * Formatea número con separadores de miles y decimales
 * @param v - Valor a formatear
 * @param dec - Cantidad de decimales (default: 0)
 */
export const n = (v: number | null | undefined, dec = 0): string =>
  (Number(v) || 0).toLocaleString('es-PA', {
    maximumFractionDigits: dec,
    minimumFractionDigits: dec
  });

/**
 * Calcula porcentaje evitando división por cero
 */
export const pct = (a: number, b: number): number => 
  (b > 0 ? (a / b) * 100 : 0);

/**
 * Formatea porcentaje como texto
 */
export const pctTxt = (a: number, b: number, dec = 0): string =>
  `${n(pct(a, b), dec)}%`;

/**
 * División segura evitando división por cero
 */
export const div = (a: number, b: number): number =>
  (b > 0 ? a / b : 0);

/**
 * Paleta de colores consistente para gráficos
 */
export const CHART_COLORS = {
  // Capacitaciones y Educación
  capacitacion: '#8b5cf6',
  educativo: '#10b981',
  
  // Actividades
  actividad: '#f97316',
  
  // Servicios
  servicio: '#10b981',
  uso_pc: '#3b82f6',
  copia: '#ec4899',
  impresion: '#8b5cf6',
  consulta: '#10b981',
  taller: '#f59e0b',
  reunion: '#06b6d4',
  otros: '#64748b',
  
  // Demografía
  primaria: '#10b981',
  secundaria: '#f59e0b',
  universitario: '#3b82f6',
  docente: '#8b5cf6',
  tercera_edad: '#ec4899',
  publico_general: '#06b6d4',
  
  // Auxiliares
  horas: '#0ea5e9',
} as const;
```

**Archivos a actualizar** (importar desde `report-utils.ts`):
- `CapacitacionesAnalytics.tsx`
- `ReportePersonalizadoSection.tsx`
- `ReporteIndividualSection.tsx`
- `ComparativeGrowthTable.tsx`
- `YoYGrowthTable.tsx`
- `CuatrimestreGrowthTable.tsx`

**Estimación**: 2 horas

---

### 5. Agregar validaciones de período personalizado
**Prioridad**: Media  
**Archivo**: `src/components/dashboard/ReportePersonalizadoSection.tsx`

**Problema**:
No valida que la fecha inicial sea anterior a la fecha final.

**Solución**:
```typescript
// Línea ~175 (función fetchReport)
const fetchReport = () => {
  // Validación de período personalizado
  if (periodoTipo === 'personalizado') {
    const desde = desdeAnio * 100 + desdeMesNum;
    const hasta = hastaAnio * 100 + hastaMesNum;
    
    if (desde > hasta) {
      // Opción A: Alert simple
      alert('⚠️ La fecha inicial debe ser anterior a la fecha final');
      return;
      
      // Opción B (mejor): Toast/Notification
      // Requiere agregar sistema de notificaciones
      // showNotification({
      //   type: 'error',
      //   title: 'Período inválido',
      //   message: 'La fecha inicial debe ser anterior a la fecha final'
      // });
      return;
    }
    
    // Validación de rango máximo (opcional)
    const diffMeses = (hastaAnio - desdeAnio) * 12 + (hastaMesNum - desdeMesNum);
    if (diffMeses > 24) {
      if (!confirm('El período seleccionado abarca más de 2 años. Esto puede generar un reporte muy grande. ¿Desea continuar?')) {
        return;
      }
    }
  }
  
  startTransition(async () => {
    // ... resto del código
  });
};
```

**Mejora adicional**: Feedback visual en tiempo real
```typescript
// Agregar estado de validación
const [periodoValido, setPeriodoValido] = useState(true);

// Validar en tiempo real al cambiar fechas
useEffect(() => {
  if (periodoTipo === 'personalizado') {
    const desde = desdeAnio * 100 + desdeMesNum;
    const hasta = hastaAnio * 100 + hastaMesNum;
    setPeriodoValido(desde <= hasta);
  } else {
    setPeriodoValido(true);
  }
}, [periodoTipo, desdeAnio, desdeMesNum, hastaAnio, hastaMesNum]);

// Mostrar mensaje de error
{!periodoValido && (
  <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
    <AlertCircle size={16} className="text-red-400" />
    <span className="text-xs text-red-400">
      La fecha inicial debe ser anterior a la fecha final
    </span>
  </div>
)}

// Deshabilitar botón de búsqueda si es inválido
<button
  onClick={fetchReport}
  disabled={!periodoValido || isPending}
  className={...}
>
```

**Estimación**: 1 hora

---

### 6. Mejorar manejo de errores en exportación
**Prioridad**: Media  
**Archivos**: 
- `src/components/dashboard/CapacitacionesAnalytics.tsx`
- `src/components/dashboard/ReportePersonalizadoSection.tsx`

**Problema actual**:
```typescript
// Solo log en consola, el usuario no sabe qué pasó
catch (e) {
  console.error('Error exportando Excel:', e);
}
```

**Solución Fase 1** (sin sistema de notificaciones):
```typescript
// En el estado del componente
const [exportError, setExportError] = useState<string | null>(null);

// En la función de exportación
const exportarExcel = async () => {
  try {
    setExportando('xlsx');
    setExportError(null);
    // ... código de exportación
  } catch (e) {
    console.error('Error exportando Excel:', e);
    const errorMsg = e instanceof Error 
      ? e.message 
      : 'Error desconocido al generar el archivo';
    setExportError(`No se pudo exportar el archivo Excel: ${errorMsg}`);
  } finally {
    setExportando(null);
  }
};

// En el render
{exportError && (
  <div className="mt-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
    <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
    <div>
      <p className="text-sm font-medium text-red-400">Error de exportación</p>
      <p className="text-xs text-red-300 mt-1">{exportError}</p>
      <button
        onClick={() => setExportError(null)}
        className="text-xs text-red-400 underline mt-2 hover:text-red-300"
      >
        Cerrar
      </button>
    </div>
  </div>
)}
```

**Solución Fase 2** (con sistema de notificaciones - recomendado):
```typescript
// Crear componente Toast/Notification global
// src/components/ui/toast.tsx

// Luego usar en exportación
import { toast } from '@/components/ui/toast';

const exportarExcel = async () => {
  try {
    setExportando('xlsx');
    // ... código de exportación
    toast.success('Archivo Excel exportado correctamente');
  } catch (e) {
    console.error('Error exportando Excel:', e);
    toast.error('No se pudo exportar el archivo Excel', {
      description: e instanceof Error ? e.message : undefined
    });
  } finally {
    setExportando(null);
  }
};
```

**Estimación**: 
- Fase 1: 1 hora
- Fase 2 (con Toast global): 3 horas

---

## 📊 Resumen de Estimaciones

| Tarea | Prioridad | Estimación | Complejidad |
|-------|-----------|------------|-------------|
| 2. Eliminar hardcoding meses | Media | 30min - 1h | Baja |
| 3. Responsividad móvil | Alta | 3-4h | Media |
| 4. Centralizar utilidades | Baja | 2h | Baja |
| 5. Validaciones período | Media | 1h | Baja |
| 6. Manejo errores export | Media | 1-3h | Baja-Media |
| **TOTAL** | - | **7.5 - 11h** | - |

---

## 🎯 Orden Sugerido de Implementación

1. **Tarea 2** (Eliminar hardcoding) - Rápido y elimina violación de AGENTS.md
2. **Tarea 5** (Validaciones) - Previene errores del usuario
3. **Tarea 6 Fase 1** (Errores exportación) - Mejora UX sin mucho esfuerzo
4. **Tarea 3** (Responsividad) - Mayor impacto en usuarios móviles
5. **Tarea 4** (Centralizar utils) - Mejora mantenibilidad a largo plazo
6. **Tarea 6 Fase 2** (Toast global) - Solo si vale la pena el esfuerzo

---

## 📝 Notas Adicionales

- Todas las tareas son independientes, se pueden realizar en cualquier orden.
- Las tareas 2, 4, 5 y 6-Fase1 son "quick wins" con alto retorno de inversión.
- La tarea 3 (responsividad) es la más compleja pero tiene el mayor impacto en UX.
- Considerar crear issues en GitHub para trackear cada tarea si el proyecto lo usa.

---

**Última actualización**: 2026-01-27
