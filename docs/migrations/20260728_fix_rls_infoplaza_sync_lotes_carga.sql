-- ============================================================
-- Migración: Habilitar RLS en tablas sin protección
-- Fecha: 2026-07-28
-- Tablas: infoplaza_sync_status, lotes_carga
-- Motivo: Alerta de seguridad Supabase (rls_disabled_in_public)
-- ============================================================

-- ============================================================
-- TABLA: infoplaza_sync_status
-- Tiene columna regional → mismo patrón que historial_sincronizacion
-- ============================================================

ALTER TABLE public.infoplaza_sync_status ENABLE ROW LEVEL SECURITY;

-- Admin, directivo e invitado: lectura global
CREATE POLICY "sync_status_global_read"
ON public.infoplaza_sync_status
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'activo'
      AND p.role IN ('admin', 'directivo', 'invitado')
  )
);

-- Facilitador, enlace, supervisor: solo su regional
CREATE POLICY "sync_status_regional_read"
ON public.infoplaza_sync_status
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'activo'
      AND p.role IN ('facilitador', 'enlace', 'supervisor')
      AND LOWER(TRIM(p.regional)) = LOWER(TRIM(infoplaza_sync_status.regional))
  )
);

-- ============================================================
-- TABLA: lotes_carga
-- Equivalente a historial_ejecuciones → solo admin puede leer
-- ============================================================

ALTER TABLE public.lotes_carga ENABLE ROW LEVEL SECURITY;

-- Solo admin: lectura global
CREATE POLICY "lotes_carga_admin_read"
ON public.lotes_carga
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'activo'
      AND p.role = 'admin'
  )
);
