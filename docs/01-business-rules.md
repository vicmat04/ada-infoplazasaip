# 01 - Reglas de negocio

## Catálogo

### RN-001 - Separación conceptual
Un usuario del sistema no es un visitante. Las métricas operativas deben hablar de visitantes/personas atendidas, no de usuarios.

### RN-002 - Regional por rol
Facilitador, Enlace y Supervisor solo pueden ver datos de su regional.

### RN-003 - Visión global
Admin, Directivo e Invitado pueden ver todas las regionales.

### RN-004 - Control total Admin
Admin puede crear, editar, eliminar y configurar todo el sistema.

### RN-005 - Facilitador
Facilitador puede ver su regional, editar Infoplazas de su regional y crear usuarios del sistema, pero no eliminarlos.

### RN-006 - Enlace y Supervisor
Enlace y Supervisor pueden ver su regional y editar Infoplazas de su regional, pero no crear ni eliminar usuarios del sistema.

### RN-007 - Directivo e Invitado
Directivo e Invitado pueden ver todas las regionales, pero no editar.

### RN-008 - Exportaciones
Todos los usuarios del sistema pueden exportar, pero solo los datos visibles según permisos y filtros activos.

### RN-009 - Umbral de sincronización
El sistema inicia con un umbral de 10 días para considerar una Infoplaza "Para revisión". Este valor debe ser configurable por Admin.

### RN-010 - Estado En periodo
Una Infoplaza está "En periodo" cuando sus días sin sincronizar son menores o iguales al umbral configurado.

### RN-011 - Estado Para revisión
Una Infoplaza está "Para revisión" cuando sus días sin sincronizar superan el umbral configurado.

### RN-012 - Usuarios inactivos
Un usuario del sistema con estado inactivo no debe poder acceder al dashboard.

### RN-013 - Auditoría
Toda acción administrativa relevante debe registrarse en `admin_audit_log` o mecanismo equivalente.

### RN-014 - Ejecuciones/Cargas
El módulo Ejecuciones/Cargas es solo para Admin.

### RN-015 - Exportación contextual
No existirá un menú independiente de exportaciones; cada módulo tendrá su botón de exportar vista actual.

### RN-016 - Inclusión Histórica por Actividad en Reportes y Tablas
1. Las Infoplazas en estado "Cerrada Definitivamente" se deben contabilizar y presentar en reportes, tablas comparativas y exportaciones históricas si y solo si poseen registros con actividad (`total > 0`) en el período/rango consultado (indicando su estado como "Cerrada"). Si no tuvieron actividad en ese período, se excluyen de la vista.
2. Las Infoplazas en estado "Activa" se deben presentar siempre en el listado de las tablas (con valor 0 o `-` si no tuvieron registros en el período) para evidenciar su pertenencia a la red viva.
3. El módulo de Sincronización y Monitoreo operativo mantiene la regla estricta de evaluar únicamente la red de infoplazas activas vivas.

