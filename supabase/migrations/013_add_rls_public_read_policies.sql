-- Migración 013: Agregar políticas RLS para lectura pública
-- Proyecto: unmsegdzihupqcihejut
-- Fecha: 2026-11-15
--
-- Todas las tablas tienen RLS habilitado pero carecen de políticas.
-- Esto impide que el frontend (rol anon) lea datos públicos.
-- Agrega políticas SELECT para las tablas que necesitan ser leídas públicamente.

-- =============================================
-- Políticas RLS para lectura pública de configuración del evento
-- =============================================

CREATE POLICY event_public_config_select_public
  ON public.event_public_config
  FOR SELECT
  TO anon, authenticated
  USING (singleton);

-- =============================================
-- Políticas RLS para lectura pública de reglas de precios
-- =============================================

CREATE POLICY pricing_rules_select_public
  ON public.pricing_rules
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY pricing_versions_select_public
  ON public.pricing_versions
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- =============================================
-- Políticas RLS para lectura pública de revisiones de invitación publicadas
-- =============================================

CREATE POLICY invitation_revisions_select_published
  ON public.invitation_revisions
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- =============================================
-- Otorgar USAGE en schema public al rol anon
-- =============================================

GRANT USAGE ON SCHEMA public TO anon;

-- =============================================
-- Otorgar SELECT en tablas al rol anon
-- =============================================

GRANT SELECT ON public.event_public_config TO anon;
GRANT SELECT ON public.pricing_rules TO anon;
GRANT SELECT ON public.pricing_versions TO anon;
GRANT SELECT ON public.invitation_revisions TO anon;
