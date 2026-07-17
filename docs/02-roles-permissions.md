# 02 - Roles y permisos

| Rol | Alcance | Dashboard | Exportar | Editar Infoplazas | Crear usuarios | Eliminar usuarios | Configuración | Ejecuciones/Cargas |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Admin | Todo | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Facilitador | Su regional | Sí | Sí | Sí | Sí | No | No | No |
| Enlace | Su regional | Sí | Sí | Sí | No | No | No | No |
| Supervisor | Su regional | Sí | Sí | Sí | No | No | No | No |
| Directivo | Todo | Sí | Sí | No | No | No | No | No |
| Invitado | Todo | Sí | Sí | No | No | No | No | No |

## Regla de consulta
- Roles globales: no aplicar filtro regional obligatorio.
- Roles regionales: filtrar siempre por `profiles.regional`.

## Validación importante
El frontend puede ocultar acciones, pero la autorización real debe aplicarse en la capa de datos, RPC, server actions, API routes o RLS.
