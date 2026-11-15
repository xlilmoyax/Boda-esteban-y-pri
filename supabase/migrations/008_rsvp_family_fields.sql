-- RSVP family-level preferences. These are private administrative data and
-- are intentionally excluded from get_public_invitation().

create or replace function public.dietary_restrictions_are_valid(p_values text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_values is not null
    and cardinality(p_values) <= 4
    and not exists (
      select 1
      from unnest(p_values) as item(value)
      where item.value is null
        or item.value not in ('celiaquia', 'vegetariana', 'vegana', 'diabetes')
    )
    and (select count(*) = count(distinct value) from unnest(p_values) as item(value));
$$;
alter function public.dietary_restrictions_are_valid(text[]) owner to postgres;
revoke all on function public.dietary_restrictions_are_valid(text[]) from public, anon, authenticated, service_role;

alter table public.registrations
  add column song_suggestion text,
  add column dietary_restrictions text[] not null default array[]::text[],
  add column dietary_details text;

alter table public.registrations
  add constraint registrations_song_suggestion_valid check (
    song_suggestion is null
    or (
      song_suggestion = btrim(song_suggestion)
      and char_length(song_suggestion) between 1 and 200
      and song_suggestion !~ '[[:cntrl:]]'
    )
  ),
  add constraint registrations_dietary_restrictions_valid check (
    public.dietary_restrictions_are_valid(dietary_restrictions)
  ),
  add constraint registrations_dietary_details_valid check (
    dietary_details is null
    or (
      dietary_details = btrim(dietary_details)
      and char_length(dietary_details) between 1 and 500
      and dietary_details !~ '[[:cntrl:]]'
    )
  );

create or replace function public.create_registration_core(
  p_actor_type text,
  p_request_id uuid,
  p_contact_name text,
  p_contact_surname text,
  p_email text,
  p_phone text,
  p_rsvp_status text,
  p_attendees jsonb,
  p_observations text,
  p_song_suggestion text,
  p_dietary_restrictions text[],
  p_dietary_details text
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
  v_song_suggestion text;
  v_dietary_details text;
  v_result jsonb;
begin
  if p_actor_type is null or p_actor_type not in ('admin', 'guest')
    or p_contact_name is null or btrim(p_contact_name) = ''
    or length(btrim(p_contact_name)) > 120
    or p_contact_surname is null or btrim(p_contact_surname) = ''
    or length(btrim(p_contact_surname)) > 120
    or p_email is null or length(btrim(p_email)) > 254
    or btrim(p_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    or p_phone is not null and length(p_phone) > 50
    or p_observations is not null and length(btrim(p_observations)) > 2000
    or p_rsvp_status not in ('pending', 'confirmed', 'declined', 'cancelled')
    or p_attendees is null or jsonb_typeof(p_attendees) is distinct from 'array'
    or jsonb_array_length(p_attendees) > 20
    or octet_length(p_attendees::text) > 20000
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
  if p_actor_type = 'admin' and not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado.';
  end if;
  if p_rsvp_status = 'confirmed' and jsonb_array_length(p_attendees) = 0 then
    raise exception using errcode = '22023', message = 'Una confirmación requiere al menos un asistente.';
  end if;
  if p_rsvp_status in ('declined', 'cancelled') and jsonb_array_length(p_attendees) <> 0 then
    raise exception using errcode = '22023', message = 'Una inscripción declinada o cancelada no puede incluir asistentes activos.';
  end if;

  v_song_suggestion := nullif(btrim(p_song_suggestion), '');
  v_dietary_details := nullif(btrim(p_dietary_details), '');
  insert into public.registrations (
    contact_name, contact_surname, email, phone, rsvp_status,
    created_by, created_source, request_id, observations,
    song_suggestion, dietary_restrictions, dietary_details
  )
  values (
    btrim(p_contact_name), btrim(p_contact_surname), lower(btrim(p_email)),
    nullif(btrim(p_phone), ''), p_rsvp_status,
    case when p_actor_type = 'admin' then auth.uid() else null end,
    case when p_actor_type = 'admin' then 'admin_ui' else 'public_rsvp' end,
    p_request_id, nullif(btrim(p_observations), ''),
    v_song_suggestion, p_dietary_restrictions, v_dietary_details
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
    jsonb_build_object(
      'rsvp_status', p_rsvp_status,
      'attendee_count', jsonb_array_length(p_attendees),
      'has_song_suggestion', v_song_suggestion is not null,
      'dietary_restriction_count', cardinality(p_dietary_restrictions),
      'has_dietary_details', v_dietary_details is not null
    )
  );
  return v_result;
end;
$$;
alter function public.create_registration_core(text, uuid, text, text, text, text, text, jsonb, text, text, text[], text)
  owner to postgres;
revoke all on function public.create_registration_core(text, uuid, text, text, text, text, text, jsonb, text, text, text[], text)
  from public, anon, authenticated, service_role;

drop function public.create_registration_core(text, uuid, text, text, text, text, text, jsonb, text);

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
    p_rsvp_status, p_attendees, p_observations, null, array[]::text[], null
  );
end;
$$;
alter function public.admin_create_registration(text, text, text, text, text, jsonb, text) owner to postgres;
revoke all on function public.admin_create_registration(text, text, text, text, text, jsonb, text) from public, anon;
grant execute on function public.admin_create_registration(text, text, text, text, text, jsonb, text) to authenticated;

create or replace function public.admin_update_registration_rsvp_details(
  p_id uuid,
  p_song_suggestion text,
  p_dietary_restrictions text[],
  p_dietary_details text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_had_song boolean;
  v_restriction_count integer;
  v_had_details boolean;
  v_song_suggestion text;
  v_dietary_details text;
begin
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado.';
  end if;
  if p_song_suggestion is not null and (
    length(btrim(p_song_suggestion)) > 200 or btrim(p_song_suggestion) = ''
    or btrim(p_song_suggestion) ~ '[[:cntrl:]]'
  ) or p_dietary_details is not null and (
    length(btrim(p_dietary_details)) > 500 or btrim(p_dietary_details) = ''
    or btrim(p_dietary_details) ~ '[[:cntrl:]]'
  ) or not public.dietary_restrictions_are_valid(p_dietary_restrictions) then
    raise exception using errcode = '22023', message = 'Los datos alimentarios o la sugerencia no son válidos.';
  end if;
  v_song_suggestion := nullif(btrim(p_song_suggestion), '');
  v_dietary_details := nullif(btrim(p_dietary_details), '');

  select song_suggestion is not null, cardinality(dietary_restrictions),
      dietary_details is not null
    into v_had_song, v_restriction_count, v_had_details
    from public.registrations
    where id = p_id and deleted_at is null
    for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Inscripción no encontrada.';
  end if;

  update public.registrations
    set song_suggestion = v_song_suggestion,
        dietary_restrictions = p_dietary_restrictions,
        dietary_details = v_dietary_details,
        updated_at = now()
    where id = p_id;
  perform public.write_audit(
    'admin', auth.uid(), 'update_registration_rsvp_details', 'registrations', p_id, null,
    gen_random_uuid(), 'admin_ui',
    jsonb_build_object(
      'has_song_suggestion', v_had_song,
      'dietary_restriction_count', v_restriction_count,
      'has_dietary_details', v_had_details
    ),
    jsonb_build_object(
      'has_song_suggestion', v_song_suggestion is not null,
      'dietary_restriction_count', cardinality(p_dietary_restrictions),
      'has_dietary_details', v_dietary_details is not null
    )
  );
end;
$$;
alter function public.admin_update_registration_rsvp_details(uuid, text, text[], text) owner to postgres;
revoke all on function public.admin_update_registration_rsvp_details(uuid, text, text[], text) from public, anon;
grant execute on function public.admin_update_registration_rsvp_details(uuid, text, text[], text) to authenticated;

create or replace function public.admin_get_registration_balance(p_registration_id uuid)
returns table (balance_due numeric(12,2), included_attendees bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado.';
  end if;
  if not exists (
    select 1 from public.registrations
    where id = p_registration_id and deleted_at is null
  ) then
    raise exception using errcode = 'P0002', message = 'Inscripción no encontrada.';
  end if;
  return query
    select b.balance_due, b.included_attendees
    from public.calculate_registration_balance(p_registration_id) as b;
end;
$$;
alter function public.admin_get_registration_balance(uuid) owner to postgres;
revoke all on function public.admin_get_registration_balance(uuid) from public, anon;
grant execute on function public.admin_get_registration_balance(uuid) to authenticated;

drop function public.submit_public_rsvp(uuid, text, text, text, text, boolean, jsonb, text);

create function public.submit_public_rsvp(
  p_request_id uuid,
  p_contact_name text,
  p_contact_surname text,
  p_email text,
  p_phone text,
  p_attending boolean,
  p_attendees jsonb,
  p_observations text,
  p_song_suggestion text,
  p_dietary_restrictions text[],
  p_dietary_details text
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
    or p_attendees is null or jsonb_typeof(p_attendees) is distinct from 'array'
    or octet_length(p_attendees::text) > 20000
    or not public.dietary_restrictions_are_valid(p_dietary_restrictions)
    or (not p_attending and jsonb_array_length(p_attendees) <> 0) then
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
    'observations', nullif(btrim(coalesce(p_observations, '')), ''),
    'song_suggestion', nullif(btrim(coalesce(p_song_suggestion, '')), ''),
    'dietary_restrictions', p_dietary_restrictions,
    'dietary_details', nullif(btrim(coalesce(p_dietary_details, '')), '')
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
      p_phone, v_status, p_attendees, p_observations,
      p_song_suggestion, p_dietary_restrictions, p_dietary_details
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
alter function public.submit_public_rsvp(uuid, text, text, text, text, boolean, jsonb, text, text, text[], text)
  owner to postgres;
revoke all on function public.submit_public_rsvp(uuid, text, text, text, text, boolean, jsonb, text, text, text[], text)
  from public, anon, authenticated;
grant execute on function public.submit_public_rsvp(uuid, text, text, text, text, boolean, jsonb, text, text, text[], text)
  to service_role;
