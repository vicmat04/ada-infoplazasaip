# 00 - Project Blueprint

## Visión
Infoplazas Analytics será una plataforma de análisis y control operativo para consultar indicadores de servicios, visitantes, Infoplazas y sincronización.

## Objetivos
- Centralizar indicadores en dashboards claros.
- Permitir consultas por regional e Infoplaza.
- Respetar permisos por rol y regional.
- Facilitar exportaciones filtradas.
- Detectar problemas de sincronización.
- Administrar usuarios del sistema, Infoplazas y configuraciones.

## Fuente de datos
Supabase/PostgreSQL con tablas como:
- `profiles`
- `infoplazas`
- `resumen_servicios`
- `resumen_demografico`
- `resumen_tipo_usuario_genero`
- `historial_sincronizacion`
- `historial_ejecuciones`
- `admin_audit_log`

## Decisiones tomadas
- Usar "Visitantes" para las personas atendidas en Infoplazas.
- Usar "Usuarios del sistema" para las cuentas internas.
- Sidebar contraíble.
- Tema oscuro profesional con opción de tema claro.
- Exportación contextual en cada módulo.
- Sincronización tendrá filtros por regional e Infoplaza.
- Directivo e Invitado ven todo, pero solo lectura.
- Ejecuciones/Cargas será solo Admin.
- Umbral de sincronización inicial: 10 días, configurable desde Administración.
