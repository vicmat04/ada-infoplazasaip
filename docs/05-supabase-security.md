# 05 - Supabase y seguridad

## Tablas relevantes
- `profiles`: usuarios del sistema, rol, estado y regional.
- `infoplazas`: catálogo de centros.
- `resumen_servicios`: métricas de servicios.
- `resumen_demografico`: métricas demográficas.
- `resumen_tipo_usuario_genero`: tipo de visitante por género.
- `historial_sincronizacion`: estado de sincronización.
- `historial_ejecuciones`: cargas/procesos.
- `admin_audit_log`: auditoría administrativa.

## Seguridad
- Usar Supabase Auth para autenticación.
- No guardar contraseñas.
- No exponer service role key en cliente.
- Verificar perfil después del login.
- Bloquear acceso si `status != activo`.

## RLS / políticas
Debe diseñarse para que:
- Admin/Directivo/Invitado puedan leer todo.
- Facilitador/Enlace/Supervisor lean solo su regional.
- Ediciones de Infoplazas respeten regional y rol.
- Creación de usuarios esté limitada a Admin y Facilitador.
- Eliminación de usuarios sea solo Admin.

## Recomendación técnica
Para operaciones sensibles, usar funciones RPC o API/server actions que verifiquen permisos antes de ejecutar cambios.
