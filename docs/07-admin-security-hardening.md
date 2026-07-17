# 07 - Endurecimiento de seguridad administrativa

## Objetivo

Definir el modelo de seguridad real para operaciones administrativas de `Infoplazas Analytics`, separando:

- lecturas autenticadas con `anon key` + sesion
- operaciones privilegiadas con `service role`
- responsabilidades futuras de RLS y/o RPC

## Estado actual

- El login usa `Supabase Auth`.
- Las rutas internas se protegen en `proxy.ts`.
- La app consulta `profiles` desde servidor con sesion autenticada.
- Las acciones administrativas (`crear`, `editar`, `activar`, `inactivar`, `eliminar`) usan `createSupabaseAdminClient()` con `SUPABASE_SERVICE_ROLE_KEY`.
- La autorizacion actual se valida en server actions antes de tocar `auth.users` o `profiles`.

## Riesgo actual

La logica de autorizacion ya no depende del frontend, pero todavia depende de reglas implementadas en la app.

Si en el futuro otra ruta, script o integracion usa `service role` sin replicar estas validaciones, podria saltarse restricciones de rol o regional.

## Modelo objetivo

### 1. Lecturas autenticadas

Las consultas normales del dashboard deben ejecutarse con:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- sesion del usuario autenticado

Estas lecturas deben quedar respaldadas por RLS.

### 2. Operaciones privilegiadas

Las acciones administrativas reales seguiran usando `service role` para:

- crear usuarios en `auth.users`
- actualizar metadata de Auth
- eliminar usuarios de Auth

Pero antes de cada operacion, la app debe:

1. validar sesion autenticada
2. cargar `profiles`
3. confirmar `status = activo`
4. confirmar rol permitido
5. confirmar alcance regional permitido
6. registrar auditoria con `before_state` y `after_state`

### 3. RLS obligatorio

Debe existir RLS al menos para estas tablas:

- `profiles`
- `infoplazas`
- `resumen_servicios`
- `resumen_demografico`
- `resumen_tipo_usuario_genero`
- `historial_sincronizacion`
- `admin_audit_log`
- `historial_ejecuciones`

## Reglas mínimas de RLS

### `profiles`

- Un usuario autenticado debe poder leer su propio registro.
- `admin`, `directivo` e `invitado` pueden leer todos los perfiles.
- `facilitador`, `enlace` y `supervisor` solo pueden leer perfiles de su regional.
- Ningun rol de usuario autenticado debe editar `profiles` directamente desde el cliente.
- Las escrituras administrativas deben hacerse solo por server action con `service role`.

### Tablas operativas por regional

Para `infoplazas`, `resumen_servicios`, `resumen_demografico`, `resumen_tipo_usuario_genero` y `historial_sincronizacion`:

- `admin`, `directivo` e `invitado`: lectura global
- `facilitador`, `enlace`, `supervisor`: lectura filtrada por `profiles.regional`

### `admin_audit_log`

- `admin`: lectura global
- `facilitador`: lectura limitada a acciones donde actor o target pertenezcan a su regional, si se desea visibilidad regional
- otros roles: idealmente sin lectura, salvo que negocio pida lo contrario

### `historial_ejecuciones`

- `admin`: lectura global
- todos los demas roles: sin lectura

## Operaciones que deben seguir fuera de RLS

Estas operaciones no deben exponerse al cliente:

- crear cuenta en `auth.users`
- asignar contraseña temporal
- eliminar cuenta en `auth.users`
- cambiar metadata de Auth

Eso debe quedar en server actions o RPC privadas invocadas solo desde backend.

## Cuándo conviene RPC

Hoy las server actions son suficientes.

RPC conviene si quieres:

- consolidar reglas de permisos en PostgreSQL
- auditar dentro de una sola transaccion
- evitar divergencia entre varias apps o procesos
- reducir la cantidad de logica sensible duplicada en TypeScript

## Prioridad técnica recomendada

### Inmediato

- Verificar que RLS deja leer el propio `profile`.
- Endurecer `profiles` para evitar que `authenticated` pueda autoeditar `role`, `status` o `regional`.
- Validar que las vistas actuales siguen funcionando solo con acceso permitido por sesion.
- Mantener todas las escrituras administrativas detras de server actions.

### Siguiente

- Diseñar y aplicar politicas RLS para `profiles` y tablas operativas.
- Validar `admin_audit_log` y `historial_ejecuciones` contra reglas reales de visibilidad.

### Después

- Evaluar mover parte de la logica administrativa a RPC transaccionales.

## Criterio de aceptacion

Se considera endurecida esta fase cuando:

1. todo usuario autenticado puede leer su propio `profile`
2. roles regionales no pueden leer datos fuera de su regional
3. roles no administrativos no pueden ejecutar acciones administrativas
4. toda accion administrativa relevante deja traza en `admin_audit_log`
5. ninguna operacion sensible depende solo del frontend

## Estado aplicado el 2026-06-29

Se aplico la migracion [20260629123500_harden_profiles_rls.sql](/C:/Users/vdominguez/InfoplazasAnalytics/supabase/migrations/20260629123500_harden_profiles_rls.sql) con estos efectos:

- `public.profiles` mantiene RLS activo.
- Se conserva `profiles_read_own` para lectura del propio perfil.
- Se conserva `profiles_admin_read_all` para lectura global administrativa.
- Se eliminan `profiles_update_own` y `profiles_admin_write`.
- Se revocan grants amplios de `anon` y `authenticated`.
- `authenticated` queda solo con `SELECT` sobre `profiles`.

Se aplico tambien la migracion [20260629130500_harden_admin_visibility_rls.sql](/C:/Users/vdominguez/InfoplazasAnalytics/supabase/migrations/20260629130500_harden_admin_visibility_rls.sql) con estos efectos:

- `public.admin_audit_log` mantiene RLS activo con lectura solo por la politica `audit_admin_read`.
- `public.historial_ejecuciones` mantiene RLS activo con lectura solo por la politica `executions_admin_read`.
- Se elimina la politica abierta `Allow select for authenticated users` sobre `historial_ejecuciones`.
- `authenticated` queda solo con `SELECT` en ambas tablas, condicionado por RLS.
- `anon` queda sin grants sobre ambas tablas.
