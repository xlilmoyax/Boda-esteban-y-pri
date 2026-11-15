-- Ejecutar solo contra una base Supabase local después de las migraciones 001-007:
-- psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/001_schema_invariants.sql
begin;

do $$
declare
  v_version uuid;
  v_registration uuid;
  v_next_version uuid;
  v_category text;
  v_price numeric(12,2);
  v_total numeric(12,2);
  v_count bigint;
  v_email text;
begin
  if not public.invitation_content_is_safe(
    '{"schema_version":"1","sections":[{"image":{"storage_path":"invitation/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222"}}]}'::jsonb
  ) then
    raise exception 'Se rechazó una ruta de Storage con UUID válida.';
  end if;
  if public.invitation_content_is_safe(
    '{"schema_version":"1","image":"https://demo.supabase.co/storage/v1/object/sign/invitation/image?token=temporary"}'::jsonb
  ) then
    raise exception 'Se permitió guardar una URL firmada de Storage en una revisión.';
  end if;
  if to_regclass('public.payment_records') is not null then
    raise exception 'No debe existir payment_records.';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'attendees' and column_name = 'birth_date'
  ) then
    raise exception 'No debe almacenarse birth_date.';
  end if;
  if to_regclass('public.guests') is not null
    or to_regclass('public.event_settings') is not null
    or to_regclass('public.gallery_images') is not null
    or to_regclass('public.content_sections') is not null then
    raise exception 'No deben recrearse tablas heredadas sin dependencia vigente.';
  end if;

  select id into v_version from public.pricing_versions
  where version_number = 1 and status = 'active';
  if v_version is null then
    raise exception 'Falta la versión inicial activa.';
  end if;

  select category, price into v_category, v_price
  from public.calculate_attendee_price(1, true);
  if v_category <> 'bebe' or v_price <> 0 then
    raise exception 'La tarifa de bebé debe ser ARS 0 independientemente del horario.';
  end if;
  select category, price into v_category, v_price
  from public.calculate_attendee_price(10, true);
  if v_category <> 'nino' or v_price <> 50000 then
    raise exception 'El niño de 10 años después del almuerzo debe pagar ARS 50000.';
  end if;
  select category, price into v_category, v_price
  from public.calculate_attendee_price(11, false);
  if v_category <> 'adulto' or v_price <> 130000 then
    raise exception 'El adulto desde el comienzo debe pagar ARS 130000.';
  end if;
  select category, price into v_category, v_price
  from public.calculate_attendee_price(11, true);
  if v_category <> 'post-almuerzo' or v_price <> 70000 then
    raise exception 'El adulto post-almuerzo debe pagar ARS 70000.';
  end if;

  insert into public.registrations (
    contact_name, contact_surname, email, rsvp_status, created_source
  ) values ('SQL', 'Prueba', '  Sql-Test@example.com  ', 'confirmed', 'admin_ui')
  returning id, email_normalized into v_registration, v_email;
  if v_email <> 'sql-test@example.com' then
    raise exception 'El email normalizado no coincide.';
  end if;

  begin
    insert into public.registrations (
      contact_name, contact_surname, email, rsvp_status, created_source
    ) values ('Otro', 'Registro', 'SQL-TEST@EXAMPLE.COM', 'pending', 'admin_ui');
    raise exception 'Se permitió un email duplicado normalizado.';
  exception when unique_violation then
    null;
  end;

  insert into public.attendees (
    registration_id, name, surname, age_at_event, after_lunch, attending,
    category, pricing_version_id, price_applied
  )
  select v_registration, sample.name, sample.surname, sample.age, sample.after_lunch,
    true, pr.category, pr.pricing_version_id, pr.price
  from (values
    ('Bebé', 'Prueba', 1, true),
    ('Niño', 'Prueba', 10, true),
    ('Adulto', 'Inicio', 11, false),
    ('Adulto', 'Tarde', 11, true)
  ) as sample(name, surname, age, after_lunch)
  cross join lateral public.calculate_attendee_price(sample.age, sample.after_lunch) pr;

  select balance_due, included_attendees into v_total, v_count
  from public.calculate_registration_balance(v_registration);
  if v_total <> 250000 or v_count <> 4 then
    raise exception 'Saldo familiar incorrecto: esperado 250000 y 4 asistentes, obtenido % y %.', v_total, v_count;
  end if;

  insert into public.pricing_versions (version_number, status, reason)
  values (2, 'draft', 'Prueba de conservación de snapshots')
  returning id into v_next_version;
  insert into public.pricing_rules (pricing_version_id, category, price)
  values
    (v_next_version, 'bebe', 0),
    (v_next_version, 'nino', 50000),
    (v_next_version, 'adulto', 150000),
    (v_next_version, 'post-almuerzo', 75000);
  update public.pricing_versions
  set status = 'archived'
  where id = v_version;
  update public.pricing_versions
  set status = 'active', activated_at = now()
  where id = v_next_version;
  select category, price into v_category, v_price
  from public.calculate_attendee_price(11, false);
  if v_price <> 150000 then
    raise exception 'La nueva versión no quedó activa.';
  end if;
  select balance_due, included_attendees into v_total, v_count
  from public.calculate_registration_balance(v_registration);
  if v_total <> 250000 or v_count <> 4 or exists (
    select 1 from public.attendees
    where registration_id = v_registration and pricing_version_id <> v_version
  ) then
    raise exception 'La activación de tarifas nuevas alteró snapshots o saldos anteriores.';
  end if;

  begin
    perform public.create_registration_core(
      'guest', null, 'Confirmación', 'Vacía', 'sin-asistentes@example.com',
      null, 'confirmed',
      '[{"name":"Invitado","surname":"Prueba","age_at_event":30,"after_lunch":false,"attending":false}]'::jsonb,
      null, null, array[]::text[], null
    );
    raise exception 'Se permitió confirmar una familia sin asistentes que concurran.';
  exception when invalid_parameter_value then
    null;
  end;

  update public.registrations set rsvp_status = 'declined' where id = v_registration;
  select balance_due, included_attendees into v_total, v_count
  from public.calculate_registration_balance(v_registration);
  if v_total <> 0 or v_count <> 0 then
    raise exception 'Una inscripción declinada no debe integrar el saldo.';
  end if;

  update public.registrations set rsvp_status = 'confirmed'
  where id = v_registration;
  begin
    update public.pricing_rules set price = 999999
    where pricing_version_id = v_version and category = 'adulto';
    raise exception 'Se permitió modificar una tarifa versionada.';
  exception when object_not_in_prerequisite_state then
    null;
  end;
  begin
    -- La restricción exige actor cuando se registra baja administrativa.
    update public.registrations set deleted_at = now() where id = v_registration;
    raise exception 'Se permitió baja sin deleted_by.';
  exception when check_violation then
    if sqlerrm not like '%registrations_delete_actor_consistency%' then
      raise;
    end if;
  end;
end;
$$;

do $$
begin
  if has_table_privilege('anon', 'public.registrations', 'select')
    or has_table_privilege('anon', 'public.audit_logs', 'select')
    or has_table_privilege('anon', 'public.event_private_config', 'select') then
    raise exception 'anon obtuvo acceso directo a datos privados.';
  end if;
  if has_table_privilege('authenticated', 'public.registrations', 'insert')
    or has_table_privilege('authenticated', 'public.attendees', 'update')
    or has_table_privilege('authenticated', 'public.audit_logs', 'delete') then
    raise exception 'Un rol de navegador obtuvo escritura directa.';
  end if;
  if has_function_privilege(
    'anon',
    'public.submit_public_rsvp(uuid,text,text,text,text,boolean,jsonb,text,text,text[],text)',
    'execute'
  ) then
    raise exception 'anon puede llamar directamente el RPC RSVP.';
  end if;
  if not has_function_privilege(
    'service_role',
    'public.submit_public_rsvp(uuid,text,text,text,text,boolean,jsonb,text,text,text[],text)',
    'execute'
  ) then
    raise exception 'La Edge Function no puede invocar el RPC RSVP restringido.';
  end if;
  if has_function_privilege('authenticated', 'public.bootstrap_initial_owner(uuid)', 'execute') then
    raise exception 'El bootstrap inicial está expuesto a usuarios autenticados.';
  end if;
  if has_table_privilege('authenticated', 'public.event_private_config', 'select') then
    raise exception 'Un usuario autenticado obtuvo lectura directa de configuración privada.';
  end if;
  if not has_function_privilege('anon', 'public.get_public_invitation()', 'execute') then
    raise exception 'Falta el lector público allow-list.';
  end if;
  if public.get_public_invitation() is null
    or (public.get_public_invitation() - array['event', 'pricing', 'invitation']) <> '{}'::jsonb then
    raise exception 'El lector público devolvió un objeto nulo o campos fuera de la lista permitida.';
  end if;
  if not exists (
    select 1 from storage.buckets
    where id = 'invitation-assets'
      and public = false
      and file_size_limit = 8388608
      and allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  ) then
    raise exception 'La configuración del bucket privado no coincide con los límites aprobados.';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$
begin
  begin
    perform public.owner_publish_pricing_version(
      '[{"category":"bebe","price":0},{"category":"nino","price":50000},{"category":"adulto","price":130000},{"category":"post-almuerzo","price":70000}]'::jsonb,
      'permission test'
    );
    raise exception 'Un usuario sin perfil pudo activar tarifas.';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.owner_set_admin_role(
      '00000000-0000-0000-0000-000000000002'::uuid, 'owner'
    );
    raise exception 'Un usuario sin perfil pudo asignar roles.';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

rollback;
