# AGENTS.md - Infoplazas Analytics

## Identidad del proyecto
El proyecto se llama **Infoplazas Analytics**.
Es una plataforma web para análisis, control operativo y seguimiento de Infoplazas usando datos alojados en Supabase/PostgreSQL.

## Regla de vocabulario obligatoria
- **Usuario del sistema**: persona que inicia sesión y usa el dashboard.
- **Visitante**: persona atendida o que visita una Infoplaza.
- Nunca llamar "usuarios" a los visitantes.
- Cuando se hable de cuentas, roles, login o permisos, usar "usuarios del sistema".

## Stack recomendado
- Frontend: Next.js + React + TypeScript.
- Estilos: Tailwind CSS.
- Backend/Data: Supabase.
- Auth: Supabase Auth.
- DB: PostgreSQL.
- Gráficos: Recharts, ECharts o equivalente.
- Exportación: CSV/XLSX desde la vista filtrada.

## Principios de desarrollo
1. No implementar funcionalidades sin revisar la documentación en `/docs`.
2. No inventar reglas de negocio; si falta una regla, crear un TODO y pedir validación.
3. Todo módulo debe respetar roles, regional y estado del usuario del sistema.
4. La seguridad no debe depender solo del frontend.
5. Aplicar filtros de regional desde consultas, vistas, RPC o RLS.
6. Todo listado debe tener loading, empty state, error state, búsqueda y paginación cuando aplique.
7. Todo gráfico debe reflejar los filtros activos.
8. Toda exportación debe incluir solo lo visible y permitido.
9. Todo formulario debe validar datos antes de guardar.
10. Toda acción administrativa importante debe registrarse en auditoría.
11. Las Infoplazas en estado "Cerrada Definitivamente" deben ser excluidas absolutamente de todos los agregados, tendencias, totales y gráficos del Dashboard (salvo si se requiere explícitamente un reporte histórico acumulado).
12. Adaptabilidad móvil obligatoria: Todo componente de interfaz de usuario y vista de datos debe ser diseñado y maquetado bajo estándares responsivos para que se adapte perfectamente a pantallas móviles y tablets.


## Roles y alcance
- Admin: ve todo y controla todo.
- Facilitador: solo su regional; edita Infoplazas; crea usuarios del sistema; no elimina usuarios.
- Enlace: solo su regional; edita Infoplazas; no crea ni elimina usuarios.
- Supervisor: solo su regional; edita Infoplazas; no crea ni elimina usuarios.
- Directivo: ve todas las regionales; solo lectura.
- Invitado: ve todas las regionales; solo lectura.
- Todos pueden exportar únicamente la vista permitida según rol y filtros.

## Módulos principales
- Login
- Dashboard
- Servicios
- Visitantes
- Infoplazas
- Sincronización
- Administración
  - Usuarios del sistema
  - Auditoría
  - Configuración

## Reglas de UI
- Sidebar contraíble: expandido muestra icono + texto; contraído muestra solo icono.
- Tema oscuro profesional por defecto.
- Tema claro opcional con buena visibilidad.
- Evitar colores chillones; usar acentos sobrios.
- Usar cards para KPIs, filtros arriba, gráficos al centro y tabla abajo.
- Usar drawers/paneles laterales para "Ver detalle".
- No usar CSS inline salvo casos mínimos justificados.
- Priorizar componentes reutilizables.

## Componentes base esperados
- AppShell
- Sidebar
- Topbar
- ThemeToggle
- UserMenu
- KPICard
- FiltersBar
- ChartCard
- DataTable
- ExportButton
- DrawerDetail
- StatusBadge
- EmptyState
- LoadingSkeleton
- ConfirmDialog
- FormField

## Reglas de Sincronización
- Umbral inicial: 10 días sin sincronizar.
- El umbral debe ser configurable por Admin.
- Estado "En periodo": dias_sin_sinc <= umbral.
- Estado "Para revisión": dias_sin_sinc > umbral.
- Estado "Cerrada definitivamente": según estado/observación/catálogo de Infoplazas.
- La vista debe filtrar por regional, Infoplaza, estado, días sin sincronizar y fecha de reporte.

## Flujo de trabajo con IA
Antes de escribir código:
1. Leer `README.md`, `AGENTS.md` y `/docs`.
2. Resumir qué se va a implementar.
3. Listar archivos que se crearán/modificarán.
4. Implementar en pasos pequeños.
5. Ejecutar lint/typecheck/tests si existen.
6. Entregar resumen de cambios, riesgos y siguientes pasos.

## Prohibiciones
- No guardar contraseñas en texto plano.
- No exponer claves privadas de Supabase.
- No usar service role key en el cliente.
- No omitir validaciones de permisos.
- No crear un menú separado de exportación; la exportación vive en cada vista.
- No llamar visitantes como usuarios.
- **Prohibido el hardcoding de catálogos y datos sensibles:** Absolutamente ningún dato como meses, años, fechas, provincias, regionales u otros datos dinámicos debe ser hardcodeado en el código frontend. Todo debe consultarse dinámicamente desde vistas, tablas o funciones RPC en base de datos.
- **Consultar ante dudas de hardcoding:** Si existe alguna limitación o duda técnica sobre si un dato puede o no estructurarse dinámicamente, se debe consultar y pedir validación explícita al usuario antes de proceder.

## Supabase Project Data

- Project ref: `jcozaaifpfukqlypfuqq`
- Supabase URL: `https://jcozaaifpfukqlypfuqq.supabase.co`
- Profile table: `profiles`

## Secrets Policy

- Never commit real keys.
- Never hardcode Supabase keys.
- The anon key belongs in frontend environment variables.
- The service role key is server-only and must never be used in frontend code.
- Use `.env.example` with placeholders.
- Use `.env.local` locally, but never commit it.
- If a service role key was exposed in chat, documents, screenshots, or logs, recommend rotating it.
