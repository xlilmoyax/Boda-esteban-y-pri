-- Migración 014: Corregir permisos de ejecución y políticas RLS
-- Proyecto: Tarjeta de Casamiento — Esteban y Priscila
-- Fecha: 2026-11-16
-- Problema: submit_public_rsvp y create_registration_core fallan con
-- "Database error saving new user" debido a permisos y políticas RLS incompletas.

-- =============================================
-- 1. GRANT DE EJECUCIÓN PARA FUNCIONES RPC
-- =============================================

-- submit_public_rsvp: usada por la Edge Function submit-rsvp (service_role)
-- y posiblemente por el cliente (anon/authenticated) para pruebas directas
GRANT EXECUTE ON FUNCTION public.submit_public_rsvp(
    uuid, text, text, text, text, boolean, jsonb, text, text, text[], text
) TO anon, authenticated, service_role;

-- create_registration_core: llamada internamente por submit_public_rsvp
GRANT EXECUTE ON FUNCTION public.create_registration_core(
    text, uuid, text, text, text, text, text, jsonb, text
) TO anon, authenticated, service_role;

-- calculate_attendee_price: llamada internamente por create_registration_core
GRANT EXECUTE ON FUNCTION public.calculate_attendee_price(integer, boolean)
TO anon, authenticated, service_role;

-- write_audit: llamada internamente por create_registration_core y otras funciones
GRANT EXECUTE ON FUNCTION public.write_audit(
    text, uuid, text, text, uuid, text, uuid, text, jsonb, jsonb
) TO anon, authenticated, service_role;

-- get_public_invitation: usada por el frontend para obtener precios y configuración
GRANT EXECUTE ON FUNCTION public.get_public_invitation() TO anon, authenticated;

-- admin_get_event_config: usada por el panel administrativo
GRANT EXECUTE ON FUNCTION public.admin_get_event_config() TO authenticated;

-- admin_update_public_config: usada por el panel administrativo
GRANT EXECUTE ON FUNCTION public.admin_update_public_config(jsonb) TO authenticated;

-- owner_publish_pricing_version: usada por el owner
GRANT EXECUTE ON FUNCTION public.owner_publish_pricing_version(jsonb, text) TO authenticated;

-- owner_set_admin_role: usada por el owner
GRANT EXECUTE ON FUNCTION public.owner_set_admin_role(uuid, text) TO authenticated;

-- owner_set_admin_active: usada por el owner
GRANT EXECUTE ON FUNCTION public.owner_set_admin_active(uuid, boolean) TO authenticated;

-- get_current_admin_profile: usada por el panel administrativo
GRANT EXECUTE ON FUNCTION public.get_current_admin_profile() TO authenticated;

-- owner_update_private_config: usada por el owner
GRANT EXECUTE ON FUNCTION public.owner_update_private_config(jsonb) TO authenticated;

-- admin_update_registration_details: usada por el editor
GRANT EXECUTE ON FUNCTION public.admin_update_registration_details(
    uuid, text, text, text, text, text, text, text, text[], text
) TO authenticated;

-- admin_get_balance_summary: usada por el editor
GRANT EXECUTE ON FUNCTION public.admin_get_balance_summary() TO authenticated;

-- admin_get_dashboard_summary: usada por el editor
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_summary() TO authenticated;

-- save_invitation_draft: usada por el editor
GRANT EXECUTE ON FUNCTION public.save_invitation_draft(jsonb, text) TO authenticated;

-- publish_invitation_draft: usada por el owner
GRANT EXECUTE ON FUNCTION public.publish_invitation_draft(text) TO authenticated;

-- admin_restore_invitation_revision: usada por el editor
GRANT EXECUTE ON FUNCTION public.admin_restore_invitation_revision(uuid, text) TO authenticated;

-- =============================================
-- 2. POLÍTICAS RLS PARA TABLAS DE INSCRIPCIONES Y ASISTENTES
-- =============================================

-- Las tablas tienen RLS habilitado pero NO tienen políticas de escritura.
-- Las funciones SECURITY DEFINER (como submit_public_rsvp) se ejecutan como
-- postgres (superusuario), por lo que RLS no debería aplicarlas. Sin embargo,
-- para garantizar compatibilidad y seguridad, agregamos políticas explícitas.

-- Registros (registrations): permitir INSERT a authenticated (para submit_public_rsvp
-- cuando es llamada desde el cliente) y SELECT a authenticated
CREATE POLICY registrations_insert_authenticated
  ON public.registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY registrations_select_authenticated
  ON public.registrations
  FOR SELECT
  TO authenticated
  USING (true);

-- Asistentes (attendees): permitir INSERT y SELECT a authenticated
CREATE POLICY attendees_insert_authenticated
  ON public.attendees
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY attendees_select_authenticated
  ON public.attendees
  FOR SELECT
  TO authenticated
  USING (true);

-- Auditoría (audit_logs): permitir INSERT a authenticated y service_role
CREATE POLICY audit_logs_insert_authenticated
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Versiones tarifarias (pricing_versions): permitir lectura a authenticated
CREATE POLICY pricing_versions_select_authenticated
  ON public.pricing_versions
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Reglas tarifarias (pricing_rules): permitir lectura a authenticated
CREATE POLICY pricing_rules_select_authenticated
  ON public.pricing_rules
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================
-- 3. VERIFICACIÓN: Tablas con RLS habilitado
-- Estas tablas ya tienen RLS habilitado en la base de datos remota:
--   admin_profiles, attendees, audit_logs, event_private_config,
--   event_public_config, invitation_revisions, pricing_rules,
--   pricing_versions, registrations, rsvp_rate_limits, rsvp_request_results
-- Todas necesitan políticas explícitas para funcionar correctamente
-- con funciones SECURITY DEFINER.
