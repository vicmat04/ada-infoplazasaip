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
