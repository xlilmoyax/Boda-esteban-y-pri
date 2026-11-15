-- Funciones de auditoría y utilidades del modelo definitivo.
-- Esta migración SÓLO define funciones que operan sobre las nueve tablas
-- definitivas (registrations, attendees, pricing_versions, pricing_rules,
-- admin_profiles, audit_logs, event_public_config, event_private_config,
-- invitation_revisions).
--
-- FUNCIONES LEGADO ELIMINADAS (no formar parte del modelo definitivo):
--   - registrar_confirmacion()      (referenciaba guests / payment_records)
--   - calculate_group_amount()      (legado, cálculo movido al servidor)
--   - audit_log()                   (firma inconsistente; reemplazada por write_audit)
--   - calculate_attendee_price()    (se conserva en 004_pricing_history.sql)
--
-- No hay referencias a guests, payment_records, pricing_history, event_settings
-- ni registrar_confirmacion() en este archivo.

-- =============================================
-- Función: write_audit
-- Registra una entrada de auditoría. Es VOLATILE (INSERT en audit_logs).
-- Firma consistente con las llamadas realizadas desde 004 y 008.
-- Ejecución restringida: revocada de PUBLIC; solo los roles admin/editor
-- pueden escribir realmente gracias a RLS en audit_logs.
-- =============================================
create or replace function public.write_audit(
  p_actor_type text,
  p_actor_id uuid,
  p_action text,
  p_entity_type text,
  p_record_id uuid,
  p_entity_key text,
  p_request_id uuid,
  p_source text,
  p_old_data jsonb default null,
  p_new_data jsonb default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  -- Defensa en profundidad: solo administradores pueden escribir auditoría.
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado: se requiere rol de administrador para escribir auditoría.';
  end if;

  insert into public.audit_logs (
    actor_type, actor_id, action, entity_type, record_id, entity_key,
    request_id, source, old_data, new_data
  )
  values (
    p_actor_type, p_actor_id, p_action, p_entity_type, p_record_id, p_entity_key,
    p_request_id, p_source, p_old_data, p_new_data
  )
  returning id into v_id;
  return v_id;
end;
$$;

alter function public.write_audit(text, uuid, text, text, uuid, text, uuid, text, jsonb, jsonb) owner to postgres;
revoke all on function public.write_audit(text, uuid, text, text, uuid, text, uuid, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.write_audit(text, uuid, text, text, uuid, text, uuid, text, jsonb, jsonb)
  to authenticated;

-- is_admin ya está definida en 002_rls_policies.sql. Se vuelve a declarar con
-- create or replace por coherencia (no cambia el comportamiento).
create or replace function public.is_admin(p_required_role text default 'editor')
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid()
      and active = true
      and (
        (p_required_role = 'editor' and role in ('editor', 'owner'))
        or (p_required_role = 'owner' and role = 'owner')
      )
  );
$$;
alter function public.is_admin(text) owner to postgres;
revoke all on function public.is_admin(text) from public, anon;
grant execute on function public.is_admin(text) to authenticated;
