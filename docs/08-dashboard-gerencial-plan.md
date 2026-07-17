# 08 - Dashboard Gerencial

## Objetivo

Redisenar el Dashboard principal como una vista gerencial tipo PowerBI: alto impacto visual, lectura rapida para direccion, foco en cobertura, demanda, perfil de visitantes y salud operativa de Infoplazas.

Este dashboard debe usar datos visibles segun rol/regional y excluir del reporte principal las Infoplazas con estado `Cerrada Definitivamente`.

## Auditoria de tablas

### `infoplazas`

Columnas reales:

- `numero` integer
- `nombre` text
- `nombre_carpeta` text
- `provincia` text
- `distrito` text
- `corregimiento` text
- `regional` text
- `estado` text

Estados reales verificados:

- `Activa`: 442
- `Cerrada Definitivamente`: 72
- Total: 514

Distribucion por regional:

| Regional | Total | Activas | Cerradas |
|---|---:|---:|---:|
| Chiriqui | 161 | 141 | 20 |
| Panama | 137 | 114 | 23 |
| Los Santos | 123 | 105 | 18 |
| Veraguas | 93 | 82 | 11 |

Regla para dashboard gerencial:

- Incluir solo `estado = 'Activa'`.
- Omitir `estado = 'Cerrada Definitivamente'` del reporte principal.
- Las cerradas pueden mostrarse solo como nota secundaria o card operativa separada si se requiere.

### `resumen_servicios`

Columnas reales:

- `id` bigint
- `numero_infoplaza` integer
- `regional` text
- `anio` integer
- `mes` text
- `taller` integer
- `reunion` integer
- `consulta` integer
- `venta` integer
- `scan` integer
- `correo` integer
- `tel` integer
- `lt` integer
- `impresion` integer
- `copia` integer
- `cine` integer
- `otros` integer
- `uso_de_pc` integer
- `total` integer
- `created_at` timestamptz

Registros: 12,390.

Totales 2026 sobre Infoplazas activas:

| Regional | Servicios | Infoplazas con servicios |
|---|---:|---:|
| Chiriqui | 297,804 | 141 |
| Los Santos | 193,674 | 105 |
| Panama | 170,601 | 112 |
| Veraguas | 78,210 | 81 |

Top servicios 2026 sobre Infoplazas activas:

| Servicio | Total |
|---|---:|
| Copia | 174,485 |
| Impresion | 145,805 |
| Uso de PC | 141,109 |
| Consulta | 117,726 |
| Taller | 91,320 |
| Otros | 44,755 |
| Reunion | 9,159 |
| LT | 4,843 |

### `resumen_demografico`

Columnas reales:

- `id` bigint
- `numero_infoplaza` integer
- `regional` text
- `anio` integer
- `mes` text
- `masculino` integer
- `femenino` integer
- `primaria` integer
- `secundaria` integer
- `universitario` integer
- `docente` integer
- `tercera_edad` integer
- `publico_general` integer
- `total` integer
- `created_at` timestamptz

Registros: 12,390.

Nota importante:

- Los totales 2026 de `resumen_demografico.total` coinciden con `resumen_servicios.total` por regional.
- No deben presentarse como dos conceptos independientes si representan la misma poblacion agregada.
- Usar `resumen_demografico` principalmente para perfil/composicion, no para duplicar el KPI total.

### `resumen_tipo_usuario_genero`

Columnas reales:

- `id` bigint
- `numero_infoplaza` integer
- `regional` text
- `anio` integer
- `mes` text
- `tipo_usuario` text
- `masculino` integer
- `femenino` integer
- `total` integer
- `created_at` timestamptz
- `updated_at` timestamptz

Registros: 29,270.

Esta tabla no esta usada actualmente en el codigo y debe incorporarse al Dashboard gerencial.

Tipos reales y composicion 2026 sobre Infoplazas activas:

| Tipo de visitante | Masculino | Femenino | Total |
|---|---:|---:|---:|
| Publico General | 140,242 | 187,282 | 327,524 |
| Primaria | 82,375 | 69,277 | 151,652 |
| Secundaria | 63,482 | 54,292 | 117,774 |
| Universitario | 26,600 | 32,463 | 59,063 |
| Docente | 18,418 | 26,310 | 44,728 |
| Tercera Edad | 6,621 | 7,438 | 14,059 |

Uso recomendado:

- Matriz o barras apiladas `tipo_usuario x genero`.
- Ranking de segmentos atendidos.
- Porcentaje femenino/masculino por segmento.

### `historial_sincronizacion`

Columnas reales:

- `id` bigint
- `fecha_reporte` date
- `regional` text
- `sucursal` text
- `dias_sin_sinc` integer
- `observacion` text
- `created_at` timestamptz

Registros: 4,951.

Umbral actual:

- En codigo: `DEFAULT_SYNC_DAYS = 10` en `lib/dashboard/sync-services.ts`.
- Tambien puede variar por el filtro `days` en la vista de sincronizacion.
- Todavia no existe configuracion administrativa persistida para este valor.

Hallazgo de matching:

- `historial_sincronizacion.sucursal` viene como `numero-nombre`, por ejemplo `1-Tijeras`.
- No debe unirse contra `infoplazas.nombre` directamente.
- Para metricas gerenciales, extraer el numero antes del guion y unir contra `infoplazas.numero` + `regional`.

Foto al `2026-06-30`, umbral 10 dias, solo Infoplazas activas:

| Regional | Activas | Reportadas | Al dia | Para revision | Sin reporte |
|---|---:|---:|---:|---:|---:|
| Chiriqui | 141 | 138 | 110 | 28 | 3 |
| Los Santos | 105 | 0 | 0 | 0 | 105 |
| Panama | 114 | 114 | 94 | 20 | 0 |
| Veraguas | 82 | 0 | 0 | 0 | 82 |

Total reportadas al ultimo corte:

- Activas reportadas: 252
- Al dia: 204
- Para revision: 48
- Cumplimiento sobre reportadas: 81.0%

## Diseno gerencial propuesto

### Bloque 1 - Encabezado ejecutivo

KPIs principales:

1. Servicios / atenciones 2026
2. Infoplazas activas
3. Infoplazas activas con datos en el periodo
4. Cumplimiento de sincronizacion
5. Infoplazas para revision
6. Segmento principal de visitante

Notas:

- No duplicar `total servicios` y `total visitantes` si ambos provienen del mismo total agregado.
- Presentar un unico KPI superior como `Atenciones registradas` o `Interacciones registradas`, y usar los demas bloques para composicion.

### Bloque 2 - Cobertura de red

Visuales:

- Card grande: `442 Infoplazas activas`.
- Dona o barra: activas vs cerradas, solo como contexto.
- Barras por regional: activas, reportadas, sin reporte.
- Indicador de cobertura: `reportadas / activas`.

Objetivo:

- Responder si la red esta cubierta por datos y donde hay vacios.

### Bloque 3 - Demanda de servicios

Visuales:

- Ranking horizontal de servicios.
- Participacion porcentual por servicio.
- Tendencia mensual de atenciones.
- Ranking de regionales por volumen.

KPIs derivados:

- Servicio lider.
- Concentracion Top 3 servicios.
- Promedio de atenciones por Infoplaza activa con datos.

### Bloque 4 - Perfil de visitantes

Fuente principal:

- `resumen_tipo_usuario_genero`.

Visuales:

- Barras apiladas por tipo de visitante y genero.
- Ranking de segmentos atendidos.
- Porcentaje femenino/masculino del total.

KPIs derivados:

- Segmento lider.
- Participacion de Publico General.
- Segmentos educativos totalizados: Primaria + Secundaria + Universitario + Docente.

### Bloque 5 - Salud de sincronizacion

Fuente:

- `historial_sincronizacion` + `infoplazas` activas.

Regla temporal:

- Umbral actual: 10 dias.
- Futuro: mover a configuracion administrativa persistida.

Visuales:

- Gauge o card de cumplimiento: al dia / reportadas.
- Barras por regional: al dia, para revision, sin reporte.
- Top 10 Infoplazas activas con mas dias sin sincronizar.

Regla funcional obligatoria:

- `Cobertura de red` y `Salud de sincronizacion` deben calcularse siempre contra el ultimo corte global disponible en sincronizacion, respetando solo el alcance permitido por rol/regional del usuario del sistema.
- Esos bloques no deben recalcular su base por filtros de `anio`, `mes`, `provincia` o `infoplaza`.
- Los filtros visibles pueden recortar que filas/regionales se muestran en pantalla, pero no deben alterar el corte base ni los conteos regionales calculados.
- `Ultimo corte` mostrado en estos bloques debe venir de `historial_ejecuciones`; el detalle por Infoplaza sigue usando el ultimo `fecha_reporte` disponible de sincronizacion.

## Implementacion recomendada por fases

### Fase A - Base de datos para dashboard gerencial

- Crear un servicio server-only nuevo: `lib/dashboard/executive-services.ts`.
- Consolidar consultas de:
  - `infoplazas` activas
  - `resumen_servicios`
  - `resumen_demografico`
  - `resumen_tipo_usuario_genero`
  - `historial_sincronizacion`
- Aplicar siempre filtros por rol/regional desde servidor.
- Aplicar siempre `infoplazas.estado = 'Activa'` para metricas principales.

### Fase B - Snapshot gerencial unico

Crear una funcion:

```ts
getExecutiveDashboardSnapshot(profile, filters)
```

Debe devolver:

- `networkKpis`
- `serviceKpis`
- `visitorKpis`
- `syncKpis`
- `regionalRows`
- `serviceRanking`
- `visitorGenderTypeRows`
- `syncRegionalRows`
- `riskRows`

### Fase C - Rediseño visual

Actualizar `app/dashboard/page.tsx` para mostrar:

1. Banda superior de KPIs gerenciales.
2. Seccion de cobertura de red.
3. Seccion de demanda de servicios.
4. Seccion de perfil de visitantes.
5. Seccion de salud de sincronizacion.
6. Tabla final: focos de atencion.

### Fase D - Configuracion futura de umbral

- Mantener temporalmente `DEFAULT_SYNC_DAYS = 10`.
- Luego mover a una tabla de configuracion, por ejemplo `app_settings` o `dashboard_settings`.
- Exponer edicion solo para Admin desde Administracion.

## Performance / preagregacion

- Se agregaron artefactos Supabase-side para preagregacion del dashboard: `v_dashboard_active_infoplazas`, `mv_dashboard_service_monthly` y `mv_dashboard_visitor_segments_monthly`.
- Estos artefactos son aditivos en esta primera etapa segura: no reemplazan todavia las lecturas actuales de la aplicacion.
- Las lecturas TypeScript del dashboard no deben cambiarse a estas materialized views hasta completar una verificacion de paridad contra las consultas actuales.
- Las materialized views deben refrescarse despues de cada carga o actualizacion de datos fuente para evitar mostrar agregados desactualizados.

## Riesgos y decisiones

- La union de sincronizacion por nombre es incorrecta; usar numero extraido de `sucursal`.
- `resumen_tipo_usuario_genero` debe incorporarse para evitar un dashboard pobre en perfil de visitantes.
- Excluir cerradas definitivas y cerradas temporalmente es obligatorio para no distorsionar cobertura y rendimiento.
- Los datos 2026 muestran huecos fuertes de sincronizacion en Los Santos y Veraguas al ultimo corte, lo cual debe verse como alerta gerencial.
