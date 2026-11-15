-- Versionado tarifario inmutable, saldos, RSVP y bajas/restauraciones.

create or replace function public.calculate_attendee_price(
  p_age_at_event integer,
  p_after_lunch boolean
)
returns table (pricing_version_id uuid, category text, price numeric(12,2))
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_category text;
begin
  if p_age_at_event is null or p_age_at_event < 0 or p_age_at_event > 120
    or p_after_lunch is null then
    raise exception using errcode = '22023', message = 'Edad u horario inválido.';
  end if;
  v_category := case
    when p_age_at_event between 0 and 1 then 'bebe'
    when p_age_at_event between 2 and 10 then 'nino'
    when p_after_lunch then 'post-almuerzo'
    else 'adulto'
  end;
  return query
    select pv.id, pr.category, pr.price
    from public.pricing_versions pv
    join public.pricing_rules pr on pr.pricing_version_id = pv.id
    where pv.status = 'active' and pr.category = v_category;
  if not found then
    raise exception using errcode = 'P0002', message = 'No hay una tarifa activa para esta categoría.';
  end if;
end;
$$;
alter function public.calculate_attendee_price(integer, boolean) owner to postgres;
revoke all on function public.calculate_attendee_price(integer, boolean) from public, anon, authenticated;

create or replace function public.protect_pricing_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'Las versiones tarifarias no se eliminan.';
  end if;
  if old.version_number is distinct from new.version_number
    or old.reason is distinct from new.reason
    or old.created_by is distinct from new.created_by
    or old.created_at is distinct from new.created_at then
    raise exception using errcode = '55000', message = 'Los datos históricos de la tarifa son inmutables.';
  end if;
  if not (
    (old.status = 'draft' and new.status = 'active' and new.activated_at is not null)
    or (old.status = 'active' and new.status = 'archived' and new.activated_at = old.activated_at)
    or (old.status = new.status and old.activated_by is not distinct from new.activated_by
      and old.activated_at is not distinct from new.activated_at)
  ) then
    raise exception using errcode = '55000', message = 'Transición de versión tarifaria no permitida.';
  end if;
  return new;
end;
$$;
create trigger pricing_versions_immutable
  before update or delete on public.pricing_versions
  for each row execute function public.protect_pricing_version();
revoke all on function public.protect_pricing_version() from public, anon, authenticated;

create or replace function public.protect_pricing_rule()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  if tg_op <> 'INSERT' then
    raise exception using errcode = '55000', message = 'Las reglas tarifarias históricas son inmutables.';
  end if;
  select status into v_status
    from public.pricing_versions where id = new.pricing_version_id;
  if v_status is distinct from 'draft' then
    raise exception using errcode = '55000', message = 'Solo se agregan reglas a una versión en borrador.';
  end if;
  return new;
end;
$$;
create trigger pricing_rules_immutable
  before insert or update or delete on public.pricing_rules
  for each row execute function public.protect_pricing_rule();
revoke all on function public.protect_pricing_rule() from public, anon, authenticated;

create or replace function public.owner_publish_pricing_version(
  p_rules jsonb,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_number integer;
  v_rule jsonb;
  v_count integer;
begin
  if not public.is_admin('owner') then
    raise exception using errcode = '42501', message = 'Solo el owner puede crear y activar tarifas.';
  end if;
  if jsonb_typeof(p_rules) is distinct from 'array' or jsonb_array_length(p_rules) <> 4
    or p_reason is null or btrim(p_reason) = '' or length(p_reason) > 500 then
    raise exception using errcode = '22023', message = 'La versión tarifaria no es válida.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_rules) as r(value)
    where jsonb_typeof(r.value) is distinct from 'object'
      or jsonb_typeof(r.value->'category') is distinct from 'string'
      or r.value->>'category' not in ('bebe', 'nino', 'adulto', 'post-almuerzo')
      or jsonb_typeof(r.value->'price') is distinct from 'number'
      or (r.value->>'price')::numeric < 0
      or (r.value ? 'currency' and r.value->>'currency' <> 'ARS')
  ) then
    raise exception using errcode = '22023', message = 'Categoría, importe o moneda de tarifa inválidos.';
  end if;
  select count(distinct value->>'category') into v_count
    from jsonb_array_elements(p_rules);
  if v_count <> 4 then
    raise exception using errcode = '22023', message = 'La versión debe incluir una sola regla por categoría.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rules) as r(value)
    where (r.value->>'category' = 'bebe' and (r.value->>'price')::numeric <> 0)
      or (r.value->>'category' = 'nino' and (r.value->>'price')::numeric <> 50000)
  ) then
    raise exception using errcode = '22023', message = 'Las tarifas de bebés y niños no pueden modificarse.';
  end if;

  perform pg_advisory_xact_lock(724621);
  select coalesce(max(version_number), 0) + 1 into v_number from public.pricing_versions;
  insert into public.pricing_versions (version_number, status, reason, created_by)
  values (v_number, 'draft', btrim(p_reason), auth.uid())
  returning id into v_id;

  for v_rule in select value from jsonb_array_elements(p_rules)
  loop
    insert into public.pricing_rules (pricing_version_id, category, price)
    values (v_id, v_rule->>'category', (v_rule->>'price')::numeric(12,2));
  end loop;

  update public.pricing_versions
    set status = 'archived'
    where status = 'active';
  update public.pricing_versions
    set status = 'active', activated_by = auth.uid(), activated_at = now()
    where id = v_id;

  perform public.write_audit(
    'admin', auth.uid(), 'activate_pricing_version', 'pricing_versions', v_id, null,
    gen_random_uuid(), 'owner_operation', null,
    jsonb_build_object('version', v_number, 'categories', 4)
  );
  return v_number;
end;
$$;
alter function public.owner_publish_pricing_version(jsonb, text) owner to postgres;
revoke all on function public.owner_publish_pricing_version(jsonb, text) from public, anon;
grant execute on function public.owner_publish_pricing_version(jsonb, text) to authenticated;

create or replace function public.create_registration_core(
  p_actor_type text,
  p_request_id uuid,
  p_contact_name text,
  p_contact_surname text,
  p_email text,
  p_phone text,
  p_rsvp_status text,
  p_attendees jsonb,
  p_observations text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registration_id uuid;
  v_item jsonb;
  v_pricing record;
  v_count integer := 0;
  v_total numeric(12,2) := 0;
  v_result jsonb;
begin
  if p_actor_type not in ('admin', 'guest')
    or p_contact_name is null or btrim(p_contact_name) = ''
    or length(p_contact_name) > 120
    or p_contact_surname is null or btrim(p_contact_surname) = ''
    or length(p_contact_surname) > 120
    or p_email is null or length(btrim(p_email)) > 254
    or btrim(p_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    or p_phone is not null and length(p_phone) > 50
    or p_observations is not null and length(p_observations) > 2000
    or p_rsvp_status not in ('pending', 'confirmed', 'declined', 'cancelled')
    or p_attendees is null or jsonb_typeof(p_attendees) is distinct from 'array'
    or jsonb_array_length(p_attendees) > 20
    or octet_length(p_attendees::text) > 20000 then
    raise exception using errcode = '22023', message = 'Los datos de inscripción no son válidos.';
  end if;
  if p_actor_type = 'admin' and not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado.';
  end if;
  if p_rsvp_status = 'confirmed' and jsonb_array_length(p_attendees) = 0 then
    raise exception using errcode = '22023', message = 'Una confirmación requiere al menos un asistente.';
  end if;
  if p_rsvp_status in ('declined', 'cancelled') and jsonb_array_length(p_attendees) <> 0 then
    raise exception using errcode = '22023', message = 'Una inscripción declinada o cancelada no puede incluir asistentes activos.';
  end if;

  insert into public.registrations (
    contact_name, contact_surname, email, phone, rsvp_status,
    created_by, created_source, request_id, observations
  )
  values (
    btrim(p_contact_name), btrim(p_contact_surname), lower(btrim(p_email)),
    nullif(btrim(p_phone), ''), p_rsvp_status,
    case when p_actor_type = 'admin' then auth.uid() else null end,
    case when p_actor_type = 'admin' then 'admin_ui' else 'public_rsvp' end,
    p_request_id, nullif(btrim(p_observations), '')
  )
  returning id into v_registration_id;

  for v_item in select value from jsonb_array_elements(p_attendees)
  loop
    if jsonb_typeof(v_item) is distinct from 'object'
      or jsonb_typeof(v_item->'name') is distinct from 'string'
      or jsonb_typeof(v_item->'surname') is distinct from 'string'
      or jsonb_typeof(v_item->'age_at_event') is distinct from 'number'
      or v_item->>'age_at_event' !~ '^(0|[1-9][0-9]{0,2})$'
      or (v_item->>'age_at_event')::integer > 120
      or jsonb_typeof(v_item->'after_lunch') is distinct from 'boolean'
      or length(btrim(v_item->>'name')) not between 1 and 120
      or length(btrim(v_item->>'surname')) not between 1 and 120
      or (v_item ? 'attending' and jsonb_typeof(v_item->'attending') is distinct from 'boolean') then
      raise exception using errcode = '22023', message = 'Los datos de un asistente no son válidos.';
    end if;
    select * into v_pricing from public.calculate_attendee_price(
      (v_item->>'age_at_event')::integer, (v_item->>'after_lunch')::boolean
    );
    insert into public.attendees (
      registration_id, name, surname, age_at_event, after_lunch, attending,
      category, pricing_version_id, price_applied
    )
    values (
      v_registration_id, btrim(v_item->>'name'), btrim(v_item->>'surname'),
      (v_item->>'age_at_event')::integer, (v_item->>'after_lunch')::boolean,
      coalesce((v_item->>'attending')::boolean, true),
      v_pricing.category, v_pricing.pricing_version_id, v_pricing.price
    );
    if coalesce((v_item->>'attending')::boolean, true) then
      v_total := v_total + v_pricing.price;
      v_count := v_count + 1;
    end if;
  end loop;

  if p_rsvp_status = 'confirmed' and v_count = 0 then
    raise exception using errcode = '22023', message = 'Una confirmación requiere al menos un asistente que asista.';
  end if;

  v_result := jsonb_build_object(
    'registration_id', v_registration_id,
    'balance_due', v_total,
    'included_attendees', v_count
  );
  perform public.write_audit(
    p_actor_type,
    case when p_actor_type = 'admin' then auth.uid() else v_registration_id end,
    'create_registration', 'registrations', v_registration_id, null,
    p_request_id,
    case when p_actor_type = 'admin' then 'admin_ui' else 'public_rsvp' end,
    null,
    jsonb_build_object('rsvp_status', p_rsvp_status, 'attendee_count', jsonb_array_length(p_attendees))
  );
  return v_result;
end;
$$;
alter function public.create_registration_core(text, uuid, text, text, text, text, text, jsonb, text) owner to postgres;
revoke all on function public.create_registration_core(text, uuid, text, text, text, text, text, jsonb, text)
  from public, anon, authenticated, service_role;

create or replace function public.admin_create_registration(
  p_contact_name text,
  p_contact_surname text,
  p_email text,
  p_phone text,
  p_rsvp_status text,
  p_attendees jsonb,
  p_observations text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado.';
  end if;
  return public.create_registration_core(
    'admin', null, p_contact_name, p_contact_surname, p_email, p_phone,
    p_rsvp_status, p_attendees, p_observations
  );
end;
$$;
alter function public.admin_create_registration(text, text, text, text, text, jsonb, text) owner to postgres;
revoke all on function public.admin_create_registration(text, text, text, text, text, jsonb, text) from public, anon;
grant execute on function public.admin_create_registration(text, text, text, text, text, jsonb, text) to authenticated;

create or replace function public.admin_update_registration(
  p_id uuid,
  p_contact_name text,
  p_contact_surname text,
  p_email text,
  p_phone text,
  p_observations text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_email text;
begin
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado.';
  end if;
  if p_contact_name is null or btrim(p_contact_name) = ''
    or p_contact_surname is null or btrim(p_contact_surname) = ''
    or p_email is null or length(btrim(p_email)) > 254
    or btrim(p_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    or p_phone is not null and length(p_phone) > 50
    or p_observations is not null and length(p_observations) > 2000 then
    raise exception using errcode = '22023', message = 'Los datos de inscripción no son válidos.';
  end if;
  select email into v_old_email from public.registrations
    where id = p_id and deleted_at is null for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Inscripción no encontrada.';
  end if;
  update public.registrations
    set contact_name = btrim(p_contact_name),
        contact_surname = btrim(p_contact_surname),
        email = lower(btrim(p_email)),
        phone = nullif(btrim(p_phone), ''),
        observations = nullif(btrim(p_observations), ''),
        updated_at = now()
    where id = p_id;
  perform public.write_audit(
    'admin', auth.uid(), 'update_registration', 'registrations', p_id, null,
    gen_random_uuid(), 'admin_ui',
    jsonb_build_object('email_changed', lower(btrim(v_old_email)) <> lower(btrim(p_email))),
    jsonb_build_object('contact_fields_updated', true)
  );
end;
$$;
alter function public.admin_update_registration(uuid, text, text, text, text, text) owner to postgres;
revoke all on function public.admin_update_registration(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.admin_update_registration(uuid, text, text, text, text, text) to authenticated;

create or replace function public.submit_public_rsvp(
  p_request_id uuid,
  p_contact_name text,
  p_contact_surname text,
  p_email text,
  p_phone text,
  p_attending boolean,
  p_attendees jsonb,
  p_observations text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash bytea;
  v_existing public.rsvp_request_results%rowtype;
  v_result jsonb;
  v_status text;
  v_registration_id uuid;
begin
  if p_request_id is null or p_attending is null
    or p_attendees is null or octet_length(p_attendees::text) > 20000 then
    raise exception using errcode = '22023', message = 'La solicitud no es válida.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  v_hash := extensions.digest(convert_to(jsonb_build_object(
    'name', btrim(coalesce(p_contact_name, '')),
    'surname', btrim(coalesce(p_contact_surname, '')),
    'email', lower(btrim(coalesce(p_email, ''))),
    'phone', nullif(btrim(coalesce(p_phone, '')), ''),
    'attending', p_attending,
    'attendees', p_attendees,
    'observations', nullif(btrim(coalesce(p_observations, '')), '')
  )::text, 'UTF8'), 'sha256');

  select * into v_existing
    from public.rsvp_request_results
    where request_id = p_request_id;
  if found then
    if v_existing.payload_hash <> v_hash then
      raise exception using errcode = '22023', message = 'La solicitud no es válida.';
    end if;
    return v_existing.response;
  end if;

  v_status := case when p_attending then 'confirmed' else 'declined' end;
  begin
    v_result := public.create_registration_core(
      'guest', p_request_id, p_contact_name, p_contact_surname, p_email,
      p_phone, v_status,
      case when p_attending then p_attendees else '[]'::jsonb end,
      p_observations
    );
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'No se pudo procesar la solicitud.';
  end;
  v_registration_id := (v_result->>'registration_id')::uuid;
  v_result := v_result - 'registration_id';
  insert into public.rsvp_request_results (request_id, payload_hash, registration_id, response)
  values (p_request_id, v_hash, v_registration_id, v_result);
  return v_result;
end;
$$;
alter function public.submit_public_rsvp(uuid, text, text, text, text, boolean, jsonb, text) owner to postgres;
revoke all on function public.submit_public_rsvp(uuid, text, text, text, text, boolean, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.submit_public_rsvp(uuid, text, text, text, text, boolean, jsonb, text)
  to service_role;

create or replace function public.consume_rsvp_rate_limit(
  p_ip_hash bytea,
  p_request_id uuid,
  p_window_seconds integer,
  p_max_requests integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_ip_hash is null or octet_length(p_ip_hash) <> 32 or p_request_id is null
    or p_window_seconds not between 60 and 3600 or p_max_requests not between 1 and 30 then
    raise exception using errcode = '22023', message = 'Parámetros de rate limit no válidos.';
  end if;
  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  insert into public.rsvp_rate_limits (ip_hash, window_started_at, request_count, expires_at)
  values (p_ip_hash, v_window, 1, v_window + make_interval(secs => p_window_seconds * 2))
  on conflict (ip_hash, window_started_at) do update
    set request_count = public.rsvp_rate_limits.request_count + 1
  returning request_count into v_count;
  if v_count > p_max_requests then
    perform public.write_audit(
      'system', null, 'rsvp_rate_limited', 'rsvp_attempts', null,
      p_request_id::text, p_request_id, 'edge_function',
      null, jsonb_build_object('window_seconds', p_window_seconds)
    );
    return false;
  end if;
  return true;
end;
$$;
alter function public.consume_rsvp_rate_limit(bytea, uuid, integer, integer) owner to postgres;
revoke all on function public.consume_rsvp_rate_limit(bytea, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rsvp_rate_limit(bytea, uuid, integer, integer) to service_role;

create or replace function public.purge_expired_rsvp_rate_limits()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.rsvp_rate_limits where expires_at <= now();
  get diagnostics v_deleted = row_count;
  if v_deleted > 0 then
    perform public.write_audit(
      'system', null, 'purge_rsvp_rate_limits', 'rsvp_rate_limits', null,
      'expired_windows', null, 'scheduled_job', null,
      jsonb_build_object('deleted_windows', v_deleted)
    );
  end if;
  return v_deleted;
end;
$$;
alter function public.purge_expired_rsvp_rate_limits() owner to postgres;
revoke all on function public.purge_expired_rsvp_rate_limits() from public, anon, authenticated;
grant execute on function public.purge_expired_rsvp_rate_limits() to service_role;

create or replace function public.admin_set_registration_status(p_registration_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old text;
begin
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado.';
  end if;
  if p_status not in ('pending', 'confirmed', 'declined', 'cancelled') then
    raise exception using errcode = '22023', message = 'Estado RSVP no válido.';
  end if;
  select rsvp_status into v_old
    from public.registrations where id = p_registration_id and deleted_at is null
    for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Inscripción no encontrada.';
  end if;
  if p_status = 'confirmed' and not exists (
    select 1 from public.attendees
    where registration_id = p_registration_id and deleted_at is null and attending
  ) then
    raise exception using errcode = '22023', message = 'Una confirmación requiere al menos un asistente activo.';
  end if;
  update public.registrations set rsvp_status = p_status, updated_at = now()
    where id = p_registration_id;
  perform public.write_audit(
    'admin', auth.uid(), 'update_rsvp_status', 'registrations', p_registration_id, null,
    gen_random_uuid(), 'admin_ui', jsonb_build_object('rsvp_status', v_old),
    jsonb_build_object('rsvp_status', p_status)
  );
end;
$$;
alter function public.admin_set_registration_status(uuid, text) owner to postgres;
revoke all on function public.admin_set_registration_status(uuid, text) from public, anon;
grant execute on function public.admin_set_registration_status(uuid, text) to authenticated;

create or replace function public.admin_add_attendee(
  p_registration_id uuid,
  p_name text,
  p_surname text,
  p_age_at_event integer,
  p_after_lunch boolean,
  p_attending boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pricing record;
  v_id uuid;
begin
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado.';
  end if;
  perform 1 from public.registrations
    where id = p_registration_id and deleted_at is null
    for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Inscripción no encontrada o dada de baja.';
  end if;
  if p_name is null or btrim(p_name) = '' or length(p_name) > 120
    or p_surname is null or btrim(p_surname) = '' or length(p_surname) > 120
    or p_attending is null then
    raise exception using errcode = '22023', message = 'Nombre, apellido o asistencia inválidos.';
  end if;
  select * into v_pricing from public.calculate_attendee_price(p_age_at_event, p_after_lunch);
  insert into public.attendees (
    registration_id, name, surname, age_at_event, after_lunch, attending,
    category, pricing_version_id, price_applied
  )
  values (
    p_registration_id, btrim(p_name), btrim(p_surname), p_age_at_event,
    p_after_lunch, p_attending, v_pricing.category,
    v_pricing.pricing_version_id, v_pricing.price
  )
  returning id into v_id;
  perform public.write_audit(
    'admin', auth.uid(), 'add_attendee', 'attendees', v_id, null,
    gen_random_uuid(), 'admin_ui', null,
    jsonb_build_object('registration_id', p_registration_id, 'category', v_pricing.category,
      'price_applied', v_pricing.price, 'pricing_version_id', v_pricing.pricing_version_id)
  );
  return v_id;
end;
$$;
alter function public.admin_add_attendee(uuid, text, text, integer, boolean, boolean) owner to postgres;
revoke all on function public.admin_add_attendee(uuid, text, text, integer, boolean, boolean) from public, anon;
grant execute on function public.admin_add_attendee(uuid, text, text, integer, boolean, boolean) to authenticated;

create or replace function public.admin_soft_delete_registration(p_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado.';
  end if;
  update public.registrations
    set deleted_at = now(), deleted_by = auth.uid(),
        deletion_reason = nullif(btrim(p_reason), ''), updated_at = now()
    where id = p_id and deleted_at is null;
  if not found then
    raise exception using errcode = 'P0002', message = 'Inscripción no encontrada o ya dada de baja.';
  end if;
  perform public.write_audit(
    'admin', auth.uid(), 'soft_delete_registration', 'registrations', p_id, null,
    gen_random_uuid(), 'admin_ui', null, jsonb_build_object('deleted', true)
  );
end;
$$;
alter function public.admin_soft_delete_registration(uuid, text) owner to postgres;
revoke all on function public.admin_soft_delete_registration(uuid, text) from public, anon;
grant execute on function public.admin_soft_delete_registration(uuid, text) to authenticated;

create or replace function public.admin_restore_registration(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado.';
  end if;
  update public.registrations
    set deleted_at = null, deleted_by = null, deletion_reason = null, updated_at = now()
    where id = p_id and deleted_at is not null;
  if not found then
    raise exception using errcode = 'P0002', message = 'Inscripción no encontrada o no está dada de baja.';
  end if;
  perform public.write_audit(
    'admin', auth.uid(), 'restore_registration', 'registrations', p_id, null,
    gen_random_uuid(), 'admin_ui', jsonb_build_object('deleted', true),
    jsonb_build_object('deleted', false)
  );
end;
$$;
alter function public.admin_restore_registration(uuid) owner to postgres;
revoke all on function public.admin_restore_registration(uuid) from public, anon;
grant execute on function public.admin_restore_registration(uuid) to authenticated;

create or replace function public.admin_soft_delete_attendee(p_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registration_id uuid;
begin
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado.';
  end if;
  select registration_id into v_registration_id
    from public.attendees
    where id = p_id and deleted_at is null;
  if not found then
    raise exception using errcode = 'P0002', message = 'Asistente no encontrado o ya dado de baja.';
  end if;
  perform 1 from public.registrations
    where id = v_registration_id and deleted_at is null
    for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'La inscripción familiar no está activa.';
  end if;
  update public.attendees
    set deleted_at = now(), deleted_by = auth.uid(),
        deletion_reason = nullif(btrim(p_reason), ''), updated_at = now()
    where id = p_id and deleted_at is null
    returning registration_id into v_registration_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Asistente no encontrado o ya dado de baja.';
  end if;
  perform public.write_audit(
    'admin', auth.uid(), 'soft_delete_attendee', 'attendees', p_id, null,
    gen_random_uuid(), 'admin_ui', null,
    jsonb_build_object('registration_id', v_registration_id, 'deleted', true)
  );
end;
$$;
alter function public.admin_soft_delete_attendee(uuid, text) owner to postgres;
revoke all on function public.admin_soft_delete_attendee(uuid, text) from public, anon;
grant execute on function public.admin_soft_delete_attendee(uuid, text) to authenticated;

create or replace function public.admin_restore_attendee(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_registration_id uuid;
begin
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado.';
  end if;
  select registration_id into v_registration_id
    from public.attendees where id = p_id and deleted_at is not null;
  if not found then
    raise exception using errcode = 'P0002', message = 'Asistente no encontrado o no está dado de baja.';
  end if;
  perform 1 from public.registrations
    where id = v_registration_id and deleted_at is null
    for update;
  if not found then
    raise exception using errcode = '23514', message = 'Primero debe restaurarse la inscripción familiar.';
  end if;
  perform 1 from public.attendees
    where id = p_id and registration_id = v_registration_id and deleted_at is not null
    for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Asistente no encontrado o ya restaurado.';
  end if;
  update public.attendees
    set deleted_at = null, deleted_by = null, deletion_reason = null, updated_at = now()
    where id = p_id;
  perform public.write_audit(
    'admin', auth.uid(), 'restore_attendee', 'attendees', p_id, null,
    gen_random_uuid(), 'admin_ui',
    jsonb_build_object('deleted', true),
    jsonb_build_object('registration_id', v_registration_id, 'deleted', false)
  );
end;
$$;
alter function public.admin_restore_attendee(uuid) owner to postgres;
revoke all on function public.admin_restore_attendee(uuid) from public, anon;
grant execute on function public.admin_restore_attendee(uuid) to authenticated;

create or replace function public.admin_update_attendee(
  p_id uuid,
  p_name text,
  p_surname text,
  p_age_at_event integer,
  p_after_lunch boolean,
  p_attending boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.attendees%rowtype;
  v_pricing record;
  v_registration_id uuid;
begin
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado.';
  end if;
  select registration_id into v_registration_id
    from public.attendees
    where id = p_id and deleted_at is null;
  if not found then
    raise exception using errcode = 'P0002', message = 'Asistente no encontrado.';
  end if;
  perform 1 from public.registrations
    where id = v_registration_id and deleted_at is null
    for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'La inscripción familiar no está activa.';
  end if;
  select * into v_old
    from public.attendees
    where id = p_id and registration_id = v_registration_id and deleted_at is null
    for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Asistente no encontrado.';
  end if;
  if p_name is null or btrim(p_name) = '' or length(p_name) > 120
    or p_surname is null or btrim(p_surname) = '' or length(p_surname) > 120
    or p_attending is null then
    raise exception using errcode = '22023', message = 'Nombre, apellido o asistencia inválidos.';
  end if;
  if p_age_at_event is distinct from v_old.age_at_event
    or p_after_lunch is distinct from v_old.after_lunch then
    select * into v_pricing from public.calculate_attendee_price(p_age_at_event, p_after_lunch);
  else
    select v_old.pricing_version_id, v_old.category, v_old.price_applied into v_pricing;
  end if;
  update public.attendees
    set name = btrim(p_name),
        surname = btrim(p_surname),
        age_at_event = p_age_at_event,
        after_lunch = p_after_lunch,
        attending = p_attending,
        category = v_pricing.category,
        pricing_version_id = v_pricing.pricing_version_id,
        price_applied = v_pricing.price,
        updated_at = now()
    where id = p_id;
  perform public.write_audit(
    'admin', auth.uid(), 'update_attendee', 'attendees', p_id, null,
    gen_random_uuid(), 'admin_ui',
    jsonb_build_object(
      'age_at_event', v_old.age_at_event,
      'after_lunch', v_old.after_lunch,
      'attending', v_old.attending,
      'category', v_old.category,
      'price_applied', v_old.price_applied,
      'pricing_version_id', v_old.pricing_version_id
    ),
    jsonb_build_object(
      'age_at_event', p_age_at_event,
      'after_lunch', p_after_lunch,
      'attending', p_attending,
      'category', v_pricing.category,
      'price_applied', v_pricing.price,
      'pricing_version_id', v_pricing.pricing_version_id
    )
  );
end;
$$;
alter function public.admin_update_attendee(uuid, text, text, integer, boolean, boolean) owner to postgres;
revoke all on function public.admin_update_attendee(uuid, text, text, integer, boolean, boolean) from public, anon;
grant execute on function public.admin_update_attendee(uuid, text, text, integer, boolean, boolean) to authenticated;

create or replace function public.admin_get_balance_summary()
returns table (
  registration_id uuid,
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
    select r.id, b.balance_due, b.included_attendees
    from public.registrations r
    cross join lateral public.calculate_registration_balance(r.id) as b
    where r.deleted_at is null and r.rsvp_status = 'confirmed';
end;
$$;
alter function public.admin_get_balance_summary() owner to postgres;
revoke all on function public.admin_get_balance_summary() from public, anon;
grant execute on function public.admin_get_balance_summary() to authenticated;

create or replace function public.calculate_registration_balance(p_registration_id uuid)
returns table (balance_due numeric(12,2), included_attendees bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(sum(a.price_applied) filter (
      where r.deleted_at is null and r.rsvp_status = 'confirmed'
        and a.deleted_at is null and a.attending
    ), 0)::numeric(12,2),
    count(a.id) filter (
      where r.deleted_at is null and r.rsvp_status = 'confirmed'
        and a.deleted_at is null and a.attending
    )
  from public.registrations r
  left join public.attendees a on a.registration_id = r.id
  where r.id = p_registration_id;
$$;
alter function public.calculate_registration_balance(uuid) owner to postgres;
revoke all on function public.calculate_registration_balance(uuid) from public, anon, authenticated, service_role;
