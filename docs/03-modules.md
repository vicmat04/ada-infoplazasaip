# 03 - Módulos

## Login
- Diseño limpio y moderno.
- Campos: correo y contraseña.
- Mostrar/ocultar contraseña.
- Sesión persistente.
- Verificar `profiles.status`.

## Dashboard
- KPIs globales.
- Filtros por año, mes, regional e Infoplaza.
- Gráficos principales.
- Resumen ejecutivo.
- Notificaciones.

## Servicios
- Uso de servicios: talleres, reuniones, consultas, ventas, scan, correo, teléfono, LT, impresión, copia, cine, otros, uso de PC.
- Gráficos por tipo de servicio.
- Tabla y exportación filtrada.

## Visitantes
- Demografía por género y tipo de visitante.
- Tipos: primaria, secundaria, universitario, docente, tercera edad, público general.
- Gráficos de distribución y tendencia.

## Infoplazas
- Catálogo de Infoplazas.
- Campos: número, nombre, nombre carpeta, provincia, distrito, corregimiento, regional, estado.
- Vista tabla, filtros y edición según rol.

## Sincronización
- KPIs: verificadas, en periodo, para revisión, cerradas, promedio al día, promedio para revisión.
- Filtros: regional, Infoplaza, estado, días sin sincronizar, fecha.
- Gráficos: estado, top con más días, tendencia, resumen por regional.
- Drawer de detalle por Infoplaza.

## Reportes
Módulo de generación de reportes con dos sub-módulos principales:

### Reporte Personalizado
- Filtros de período flexibles:
  - Mes actual, mes anterior
  - Este año, año anterior
  - Rango personalizado (desde/hasta mes y año)
- Selección multi-regional o todas las regionales.
- Columnas configurables por categoría:
  - Género: masculino, femenino
  - Tipo de usuario: primaria, secundaria, universitario, docente, tercera edad, público general
  - Servicios: uso de PC, copias, impresión, consultas, talleres, reuniones, otros
- Dataset en tiempo real con búsqueda y paginación.
- Exportación a Excel (XLSX) con columnas seleccionadas.
- Vista previa tabular con totales dinámicos.

### Ficha Individual por Infoplaza
- Búsqueda y selección de Infoplaza con dropdown inteligente.
- Sincronización bidireccional con filtros globales (FiltersBar).
- Perfilado inteligente automático:
  - Foco: Social vs Educativo
  - Perfil de servicios: Capacitación vs Conectividad
  - Segmento predominante
- Visualizaciones completas:
  - KPIs consolidados de la Infoplaza
  - Tendencia mensual del año (gráfico de área)
  - Distribución de servicios (gráfico de barras)
  - Perfil demográfico (gráfico circular)
  - Historial de sincronización
- Exportación a PDF ejecutivo con plantilla profesional.
- Respeta permisos por rol y filtros geográficos.

## Capacitaciones y Actividades
Informe consolidado integral de capacitaciones, actividades y servicios con agregación del lado del servidor para manejar grandes volúmenes de datos.

### Características principales
- RPC optimizada: `ipa_get_capacitaciones_report` para evitar límite de 1000 filas de PostgREST.
- Filtros completos: año, cuatrimestre, mes, regional, provincia, distrito, Infoplaza.
- Opciones de período:
  - Cuatrimestre 0 = todo el año
  - Año 0 = todos los años
  - Mes: capacitaciones por mes exacto; actividades/servicios por su cuatrimestre
- Opción de incluir detalle granular de cada capacitación/actividad.

### KPIs y métricas
- Infoplazas activas vs reportantes.
- Capacitaciones: sesiones, participantes, horas, Infoplazas que reportan.
- Actividades: cantidad, participantes, Infoplazas.
- Servicios: Infoplazas que ofrecen, promedio por Infoplaza.
- Control de entrega de informes: entregados, pendientes, no entrega.

### Visualizaciones y análisis
- Portada con resumen ejecutivo del período y ámbito.
- Capacitaciones por categoría (gráfico de barras, tabla).
- Actividades por categoría (gráfico de barras, tabla).
- Evolución mensual de capacitaciones (gráfico de líneas + barras).
- Top temas de capacitación más impartidos.
- Servicios más ofrecidos (gráfico de barras compuestas).
- Servicios por regional (tabla detallada).
- Heatmap regional × categoría (capacitaciones y actividades).
- Análisis por regional: tabla comparativa completa.
- Top Infoplazas con mayor alcance.
- Infoplazas activas sin registros en el período.

### Exportación profesional
- **Excel (XLSX)** multi-hoja:
  - KPIs generales
  - Capacitaciones por categoría
  - Actividades por categoría
  - Capacitaciones por mes
  - Top temas
  - Servicios
  - Servicios por regional
  - Análisis por regional
  - Regional × categoría (capacitaciones y actividades)
  - Top Infoplazas
  - Infoplazas sin reporte
  - Detalle completo de capacitaciones (si se incluye)
  - Detalle completo de actividades (si se incluye)
- **PDF renderizado**:
  - Captura visual de todas las secciones con gráficos
  - Usa html2canvas + jsPDF
  - Filtrado de elementos no exportables (`data-export-ignore`)

### Navegación interna
- Índice con saltos a secciones (scroll suave + pulso visual).
- Feedback visual al navegar entre secciones.

## Administración
- Usuarios del sistema.
- Auditoría.
- Configuración.
- Ejecuciones/Cargas solo Admin.
