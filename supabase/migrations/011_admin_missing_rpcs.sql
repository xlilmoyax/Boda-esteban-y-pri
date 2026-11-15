-- Migración 011: RPCs administrativas faltantes y ajuste de firmas.
-- Completa el modelo definitivo sin reproducir la migración 009 (denegada).
-- No crea usuarios, no toca tablas legacy, no aplica cambios remotos.

-- =============================================
-- Función: get_current_admin_profile
-- Devuelve el perfil del admin autenticado (id, email, role).
-- Firma alineada con database.types.ts (id como text).
-- =============================================
create or replace function public.get_current_admin_profile()
returns table (id text, email text, role text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_admin public.admin_profiles%rowtype;
begin
  if auth.uid() is null then
    return;
  end if;
  select * into v_admin
    from public.admin_profiles
    where id = auth.uid() and active = true;
  if not found then
    return;
  end if;
  return next;
end;
$$;

alter function public.get_current_admin_profile() owner to postgres;
revoke all on function public.get_current_admin_profile() from public, anon;
grant execute on function public.get_current_admin_profile() to authenticated;

-- =============================================
-- Función: owner_set_admin_role
-- Asigna rol owner/editor a un usuario. Solo owner actual.
-- Valida que el email corresponda a las cuentas autorizadas.
-- No permite autoasignación ni escalamiento de privilegios.
-- =============================================
create or replace function public.owner_set_admin_role(p_user_id uuid, p_role text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_previous_role text;
  v_owner_count bigint;
begin
  if not public.is_admin('owner') then
    raise exception using errcode = '42501', message = 'Solo el owner puede administrar roles.';
  end if;
  if p_role not in ('owner', 'editor') then
    raise exception using errcode = '22023', message = 'El rol solicitado no es válido.';
  end if;

  select lower(btrim(u.email))
    into v_email
    from auth.users as u
    where u.id = p_user_id
      and u.email_confirmed_at is not null
    for update;
  if v_email is null
    or (p_role = 'owner' and v_email <> 'matymoya18@gmail.com')
    or (p_role = 'editor' and v_email <> 'priscila.moya@mi.unc.edu.ar') then
    raise exception using errcode = '22023', message = 'La cuenta no corresponde al rol autorizado.';
  end if;

  select ap.role into v_previous_role
    from public.admin_profiles as ap
    where ap.id = p_user_id
    for update;
  if not found then
    insert into public.admin_profiles (id, email, role, active)
    values (p_user_id, v_email, p_role, true);
  else
    if v_previous_role = 'owner' and p_role <> 'owner' then
      select count(*) into v_owner_count
        from public.admin_profiles
        where role = 'owner' and active;
      if v_owner_count <= 1 then
        raise exception using errcode = '42501', message = 'No se puede quitar el último owner.';
      end if;
    end if;
    update public.admin_profiles
      set email = v_email, role = p_role, active = true, updated_at = now()
    where id = p_user_id;
  end if;

  perform public.write_audit(
    'admin', auth.uid(), 'set_admin_role', 'admin_profiles', p_user_id, null,
    gen_random_uuid(), 'owner_operation',
    jsonb_build_object('previous_role', v_previous_role),
    jsonb_build_object('role', p_role)
  );
end;
$$;

alter function public.owner_set_admin_role(uuid, text) owner to postgres;
revoke all on function public.owner_set_admin_role(uuid, text) from public, anon;
grant execute on function public.owner_set_admin_role(uuid, text) to authenticated;

-- =============================================
-- Función: owner_set_admin_active
-- Activa/desactiva un perfil administrativo. Solo owner.
-- Registra estado real anterior y nuevo. Bloquea cambios no autorizados.
-- No permite desactivar al último owner.
-- =============================================
create or replace function public.owner_set_admin_active(p_user_id uuid, p_active boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_previous_active boolean;
  v_owner_count bigint;
begin
  if not public.is_admin('owner') then
    raise exception using errcode = '42501', message = 'Solo el owner puede activar/desactivar perfiles.';
  end if;

  select role, active into v_role, v_previous_active
    from public.admin_profiles
    where id = p_user_id
    for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Perfil administrativo no encontrado.';
  end if;

  if p_active = false and v_role = 'owner' then
    select count(*) into v_owner_count
      from public.admin_profiles
      where role = 'owner' and active;
    if v_owner_count <= 1 then
      raise exception using errcode = '42501', message = 'No se puede desactivar el último owner.';
    end if;
  end if;

  update public.admin_profiles
    set active = p_active, updated_at = now()
  where id = p_user_id;

  perform public.write_audit(
    'admin', auth.uid(), 'set_admin_active', 'admin_profiles', p_user_id, null,
    gen_random_uuid(), 'owner_operation',
    jsonb_build_object('previous_active', v_previous_active),
    jsonb_build_object('active', p_active)
  );
end;
$$;

alter function public.owner_set_admin_active(uuid, boolean) owner to postgres;
revoke all on function public.owner_set_admin_active(uuid, boolean) from public, anon;
grant execute on function public.owner_set_admin_active(uuid, boolean) to authenticated;

-- =============================================
-- Función: admin_get_event_config
-- Devuelve configuración pública del evento para el panel admin.
-- Incluye datos bancarios solo si bank_details_published y el caller es owner.
-- =============================================
create or replace function public.admin_get_event_config()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'config', jsonb_build_object(
      'reception_time', c.reception_time,
      'ceremony_time', c.ceremony_time,
      'event_end_time', c.event_end_time,
      'venue_name', c.venue_name,
      'venue_address', c.venue_address,
      'rsvp_deadline', c.rsvp_deadline,
      'dress_code', c.dress_code,
      'public_content', c.public_content,
      'bank_details_published', c.bank_details_published
    ),
    'bankDetailsPublished', c.bank_details_published,
    'canManageBankDetails', public.is_admin('owner'),
    'bankFields', case
      when c.bank_details_published and public.is_admin('owner') then
        jsonb_build_object('alias', c.bank_alias, 'holder', c.bank_holder, 'bank', c.bank_name)
      else jsonb_build_object('alias', '', 'holder', '', 'bank', '')
    end
  )
  from public.event_public_config c
  where c.singleton;
$$;

alter function public.admin_get_event_config() owner to postgres;
revoke all on function public.admin_get_event_config() from public, anon;
grant execute on function public.admin_get_event_config() to authenticated;

-- =============================================
-- Función: admin_update_event_public_config
-- Alias de admin_update_public_config (mismo comportamiento, nombre esperado
-- por el tipado de Supabase y el cliente).
-- =============================================
create or replace function public.admin_update_event_public_config(p_patch jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.admin_update_public_config(p_patch);
end;
$$;

alter function public.admin_update_event_public_config(jsonb) owner to postgres;
revoke all on function public.admin_update_event_public_config(jsonb) from public, anon;
grant execute on function public.admin_update_event_public_config(jsonb) to authenticated;

-- =============================================
-- Función: admin_update_registration_details
-- Actualiza todos los campos de una inscripción (contacto, RSVP,
-- sugerencia de canción, restricciones alimentarias). Solo editor.
-- Valida todos los campos, verifica confirmación con asistentes activos,
-- evita duplicados de correo normalizado, registra campos modificados.
-- Operación transaccional.
-- =============================================
create or replace function public.admin_update_registration_details(
  p_id uuid,
  p_contact_name text,
  p_contact_surname text,
  p_email text,
  p_phone text,
  p_observations text,
  p_rsvp_status text,
  p_song_suggestion text,
  p_dietary_restrictions text[],
  p_dietary_details text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_old_email text;
  v_old_email_normalized text;
  v_old_status text;
  v_old_song text;
  v_old_restrictions_count integer;
  v_old_details text;
  v_changed text[] := array[]::text[];
  v_song text;
  v_details text;
  v_duplicate integer;
begin
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado.';
  end if;
  if p_contact_name is null or btrim(p_contact_name) = ''
     or length(btrim(p_contact_name)) > 120
     or p_contact_surname is null or btrim(p_contact_surname) = ''
     or length(btrim(p_contact_surname)) > 120
     or p_email is null or length(btrim(p_email)) > 254
     or btrim(p_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
     or p_phone is not null and length(p_phone) > 50
     or p_observations is not null and length(btrim(p_observations)) > 2000
     or p_rsvp_status not in ('pending', 'confirmed', 'declined', 'cancelled')
     or p_song_suggestion is not null and (
       length(btrim(p_song_suggestion)) > 200
       or btrim(p_song_suggestion) = ''
       or btrim(p_song_suggestion) ~ '[[:cntrl:]]'
     )
     or p_dietary_details is not null and (
       length(btrim(p_dietary_details)) > 500
       or btrim(p_dietary_details) = ''
       or btrim(p_dietary_details) ~ '[[:cntrl:]]'
     )
     or not public.dietary_restrictions_are_valid(p_dietary_restrictions) then
    raise exception using errcode = '22023', message = 'Los datos de inscripción no son válidos.';
  end if;

  select email, email_normalized, rsvp_status, song_suggestion,
         cardinality(dietary_restrictions), dietary_details
    into v_old_email, v_old_email_normalized, v_old_status, v_old_song,
         v_old_restrictions_count, v_old_details
    from public.registrations
   where id = p_id and deleted_at is null
   for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Inscripción no encontrada.';
  end if;

  -- Evitar duplicados de correo normalizado con otra inscripción existente
  select count(*) into v_duplicate
    from public.registrations
   where id is distinct from p_id
     and deleted_at is null
     and email_normalized = lower(btrim(p_email));
  if v_duplicate > 0 then
    raise exception using errcode = '23505', message = 'Ya existe una inscripción con ese correo electrónico.';
  end if;

  -- Si se confirma, debe haber al menos un asistente activo
  if p_rsvp_status = 'confirmed' and not exists (
    select 1 from public.attendees
    where registration_id = p_id and deleted_at is null and attending
  ) then
    raise exception using errcode = '22023', message = 'Una confirmación requiere al menos un asistente activo.';
  end if;

  v_song := nullif(btrim(p_song_suggestion), '');
  v_details := nullif(btrim(p_dietary_details), '');

  if v_old_email is distinct from lower(btrim(p_email)) then v_changed := array_append(v_changed, 'email'); end if;
  if v_old_status is distinct from p_rsvp_status then v_changed := array_append(v_changed, 'rsvp_status'); end if;
  if v_old_song is distinct from v_song then v_changed := array_append(v_changed, 'song_suggestion'); end if;
  if v_old_restrictions_count is distinct from cardinality(p_dietary_restrictions) then
    v_changed := array_append(v_changed, 'dietary_restrictions');
  end if;
  if v_old_details is distinct from v_details then v_changed := array_append(v_changed, 'dietary_details'); end if;

  update public.registrations
     set contact_name = btrim(p_contact_name),
         contact_surname = btrim(p_contact_surname),
         email = lower(btrim(p_email)),
         phone = nullif(btrim(p_phone), ''),
         observations = nullif(btrim(p_observations), ''),
         rsvp_status = p_rsvp_status,
         song_suggestion = v_song,
         dietary_restrictions = p_dietary_restrictions,
         dietary_details = v_details,
         updated_at = now()
   where id = p_id;

  perform public.write_audit(
    'admin', auth.uid(), 'update_registration_details', 'registrations', p_id, null,
    gen_random_uuid(), 'admin_ui',
    jsonb_build_object(
      'changed_fields', v_changed,
      'email_changed', v_old_email is distinct from lower(btrim(p_email)),
      'rsvp_status_changed', v_old_status is distinct from p_rsvp_status,
      'has_song_suggestion', v_old_song is not null
    ),
    jsonb_build_object(
      'contact_fields_updated', true,
      'rsvp_status', p_rsvp_status,
      'has_song_suggestion', v_song is not null,
      'dietary_restriction_count', cardinality(p_dietary_restrictions),
      'has_dietary_details', v_details is not null
    )
  );
end;
$$;

alter function public.admin_update_registration_details(
  uuid, text, text, text, text, text, text, text, text[], text
) owner to postgres;
revoke all on function public.admin_update_registration_details(
  uuid, text, text, text, text, text, text, text, text[], text
) from public, anon;
grant execute on function public.admin_update_registration_details(
  uuid, text, text, text, text, text, text, text, text[], text
) to authenticated;

-- =============================================
-- Función: admin_get_balance_summary
-- Alineada con database.types.ts: retorna registration_id, contact_name,
-- contact_surname, email, balance_due, included_attendees.
-- Usa calculate_registration_balance para los cálculos.
-- =============================================
drop function if exists public.admin_get_balance_summary();

create or replace function public.admin_get_balance_summary()
returns table (
  registration_id uuid,
  contact_name text,
  contact_surname text,
  email text,
  balance_due numeric(12,2),
  included_attendees bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado.';
  end if;
  return query
    select r.id,
           r.contact_name,
           r.contact_surname,
           r.email,
           b.balance_due,
           b.included_attendees
      from public.registrations r
      cross join lateral public.calculate_registration_balance(r.id) as b
     where r.deleted_at is null and r.rsvp_status = 'confirmed'
     order by b.balance_due desc nulls last, r.created_at desc;
end;
$$;

alter function public.admin_get_balance_summary() owner to postgres;
revoke all on function public.admin_get_balance_summary() from public, anon;
grant execute on function public.admin_get_balance_summary() to authenticated;

-- =============================================
-- Función: admin_get_dashboard_summary
-- Resumen para el panel de administración. Solo editor.
-- Utiliza calculate_registration_balance y considera el estado del registro.
-- No suma asistentes indiscriminadamente sin verificar rsvp_status = 'confirmed'.
-- =============================================
create or replace function public.admin_get_dashboard_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_summary jsonb;
begin
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado.';
  end if;

  select jsonb_build_object(
    'family_count', (select count(*) from public.registrations where deleted_at is null),
    'confirmed_family_count', (select count(*) from public.registrations where deleted_at is null and rsvp_status = 'confirmed'),
    'attendee_count', (
      select count(*)
      from public.attendees a
      join public.registrations r on r.id = a.registration_id
      where r.deleted_at is null and r.rsvp_status = 'confirmed'
        and a.deleted_at is null and a.attending
    ),
    'balance_due', coalesce((
      select sum(b.balance_due)
      from public.registrations r
      cross join lateral public.calculate_registration_balance(r.id) as b
      where r.deleted_at is null and r.rsvp_status = 'confirmed'
    ), 0)::numeric(12,2)
  ) into v_summary;

  return v_summary;
end;
$$;

alter function public.admin_get_dashboard_summary() owner to postgres;
revoke all on function public.admin_get_dashboard_summary() from public, anon;
grant execute on function public.admin_get_dashboard_summary() to authenticated;
