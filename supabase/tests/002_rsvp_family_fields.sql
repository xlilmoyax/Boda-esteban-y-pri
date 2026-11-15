-- Ejecutar solo en una base Supabase local después de las migraciones 001-008.
begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '80000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'rsvp-editor-test@example.com', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now()
)
on conflict (id) do nothing;

insert into public.admin_profiles (id, email, role, active)
values (
  '80000000-0000-4000-8000-000000000001',
  'rsvp-editor-test@example.com',
  'editor',
  true
)
on conflict (id) do nothing;

do $$
declare
  v_request_id uuid := '80000000-0000-4000-8000-000000000002';
  v_declined_request_id uuid := '80000000-0000-4000-8000-000000000003';
  v_registration_id uuid;
  v_response jsonb;
  v_retry jsonb;
  v_saved_song text;
  v_saved_restrictions text[];
  v_saved_details text;
begin
  if to_regclass('public.payment_records') is not null then
    raise exception 'La ampliación RSVP no debe crear payment_records.';
  end if;
  if has_table_privilege('anon', 'public.registrations', 'select')
    or has_function_privilege(
      'anon',
      'public.submit_public_rsvp(uuid,text,text,text,text,boolean,jsonb,text,text,text[],text)',
      'execute'
    ) then
    raise exception 'Los datos privados RSVP o su RPC quedaron accesibles a anon.';
  end if;
  if not has_function_privilege(
    'service_role',
    'public.submit_public_rsvp(uuid,text,text,text,text,boolean,jsonb,text,text,text[],text)',
    'execute'
  ) then
    raise exception 'service_role no puede invocar el RPC RSVP.';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.admin_get_registration_balance(uuid)',
    'execute'
  ) or has_function_privilege(
    'anon',
    'public.admin_get_registration_balance(uuid)',
    'execute'
  ) then
    raise exception 'El RPC de saldo no respeta el acceso administrativo.';
  end if;

  v_response := public.submit_public_rsvp(
    v_request_id,
    '  Prueba  ',
    '  Familiar  ',
    ' RSVP-Family@example.com ',
    ' 3510000000 ',
    true,
    '[{"name":"Asistente","surname":"Prueba","age_at_event":11,"after_lunch":false}]'::jsonb,
    null,
    '  Canción de prueba  ',
    array['celiaquia', 'vegana']::text[],
    '  Evitar contaminación cruzada  '
  );
  v_registration_id := (
    select registration_id
    from public.rsvp_request_results
    where request_id = v_request_id
  );

  select song_suggestion, dietary_restrictions, dietary_details
    into v_saved_song, v_saved_restrictions, v_saved_details
    from public.registrations
    where id = v_registration_id;
  if v_saved_song <> 'Canción de prueba'
    or v_saved_restrictions <> array['celiaquia', 'vegana']::text[]
    or v_saved_details <> 'Evitar contaminación cruzada' then
    raise exception 'Los campos familiares no se normalizaron o persistieron correctamente.';
  end if;
  if v_response ? 'song_suggestion'
    or v_response ? 'dietary_restrictions'
    or v_response ? 'dietary_details' then
    raise exception 'La respuesta pública devolvió datos alimentarios o canción.';
  end if;

  v_retry := public.submit_public_rsvp(
    v_request_id,
    'Prueba',
    'Familiar',
    'rsvp-family@example.com',
    '3510000000',
    true,
    '[{"name":"Asistente","surname":"Prueba","age_at_event":11,"after_lunch":false}]'::jsonb,
    null,
    'Canción de prueba',
    array['celiaquia', 'vegana']::text[],
    'Evitar contaminación cruzada'
  );
  if v_retry <> v_response then
    raise exception 'El reintento idempotente no devolvió el resultado original.';
  end if;
  if (select count(*) from public.registrations where request_id = v_request_id) <> 1 then
    raise exception 'El reintento creó más de una inscripción.';
  end if;
  begin
    perform public.submit_public_rsvp(
      v_request_id,
      'Prueba',
      'Familiar',
      'rsvp-family@example.com',
      '3510000000',
      true,
      '[{"name":"Asistente","surname":"Prueba","age_at_event":11,"after_lunch":false}]'::jsonb,
      null,
      'Otra canción',
      array['celiaquia', 'vegana']::text[],
      'Evitar contaminación cruzada'
    );
    raise exception 'El mismo request_id aceptó un payload diferente.';
  exception when invalid_parameter_value then
    null;
  end;

  if exists (
    select 1
    from public.audit_logs
    where record_id = v_registration_id
      and action = 'create_registration'
      and (
        coalesce(old_data::text, '') like '%Canción de prueba%'
        or coalesce(new_data::text, '') like '%Canción de prueba%'
        or coalesce(old_data::text, '') like '%contaminación cruzada%'
        or coalesce(new_data::text, '') like '%contaminación cruzada%'
      )
  ) then
    raise exception 'La auditoría guardó texto de canción o información alimentaria.';
  end if;

  perform public.submit_public_rsvp(
    v_declined_request_id,
    'Sin', 'Restricciones', 'sin-restricciones@example.com', null,
    false, '[]'::jsonb, null, null, array[]::text[], null
  );
  if not exists (
    select 1 from public.registrations
    where request_id = v_declined_request_id
      and song_suggestion is null
      and dietary_restrictions = array[]::text[]
      and dietary_details is null
  ) then
    raise exception 'Los campos opcionales vacíos no quedaron normalizados.';
  end if;

  begin
    perform public.submit_public_rsvp(
      '80000000-0000-4000-8000-000000000004',
      'Prueba', 'Inválida', 'invalid-option@example.com', null, false, '[]'::jsonb,
      null, null, array['otra']::text[], null
    );
    raise exception 'Se aceptó una categoría alimentaria que el formulario no ofrece.';
  exception when invalid_parameter_value then
    null;
  end;
  begin
    perform public.submit_public_rsvp(
      '80000000-0000-4000-8000-000000000005',
      'Prueba', 'Límite', 'too-long-song@example.com', null, false, '[]'::jsonb,
      null, repeat('x', 201), array[]::text[], null
    );
    raise exception 'Se aceptó una sugerencia de canción mayor al límite.';
  exception when invalid_parameter_value then
    null;
  end;
  begin
    perform public.submit_public_rsvp(
      '80000000-0000-4000-8000-000000000006',
      'Prueba', 'Límite', 'too-long-details@example.com', null, false, '[]'::jsonb,
      null, null, array[]::text[], repeat('x', 501)
    );
    raise exception 'Se aceptó un detalle alimentario mayor al límite.';
  exception when invalid_parameter_value then
    null;
  end;
  begin
    perform public.submit_public_rsvp(
      '80000000-0000-4000-8000-000000000007',
      'Prueba', 'Duplicada', 'duplicate-option@example.com', null, false, '[]'::jsonb,
      null, null, array['vegana', 'vegana']::text[], null
    );
    raise exception 'Se aceptó una opción alimentaria duplicada.';
  exception when invalid_parameter_value then
    null;
  end;

  if (
    public.get_public_invitation()::text like '%dietary_restrictions%'
    or public.get_public_invitation()::text like '%dietary_details%'
    or public.get_public_invitation()::text like '%song_suggestion%'
  ) then
    raise exception 'La RPC pública de invitación contiene datos familiares RSVP.';
  end if;

  if not exists (
    select 1 from public.admin_profiles
    where id = '80000000-0000-4000-8000-000000000001'
      and role = 'editor'
      and active
  ) then
    raise exception 'No se preparó el perfil editor local para las pruebas administrativas.';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
do $$
declare
  v_registration_id uuid;
  v_song text;
  v_restrictions text[];
  v_details text;
  v_balance numeric(12,2);
  v_included_attendees bigint;
begin
  select id into v_registration_id
  from public.registrations
  where request_id = '80000000-0000-4000-8000-000000000002';

  select balance_due, included_attendees
    into v_balance, v_included_attendees
    from public.admin_get_registration_balance(v_registration_id);
  if v_balance <> 130000 or v_included_attendees <> 1 then
    raise exception 'El RPC administrativo no devolvió el saldo calculado en el servidor.';
  end if;

  perform public.admin_update_registration_rsvp_details(
    v_registration_id, '  Nueva canción  ', array['diabetes']::text[], '  Nueva aclaración  '
  );
  perform public.admin_soft_delete_registration(v_registration_id, 'Prueba restaurable');
  perform public.admin_restore_registration(v_registration_id);

  select song_suggestion, dietary_restrictions, dietary_details
    into v_song, v_restrictions, v_details
    from public.registrations
    where id = v_registration_id;
  if v_song <> 'Nueva canción'
    or v_restrictions <> array['diabetes']::text[]
    or v_details <> 'Nueva aclaración' then
    raise exception 'La edición o restauración alteró los datos familiares RSVP.';
  end if;
  select balance_due, included_attendees
    into v_balance, v_included_attendees
    from public.admin_get_registration_balance(v_registration_id);
  if v_balance <> 130000 or v_included_attendees <> 1 then
    raise exception 'La restauración alteró el precio histórico o el saldo calculado.';
  end if;

  if not exists (
    select 1 from public.audit_logs
    where record_id = v_registration_id
      and action = 'update_registration_rsvp_details'
      and coalesce(old_data::text, '') not like '%Nueva canción%'
      and coalesce(new_data::text, '') not like '%Nueva canción%'
      and coalesce(old_data::text, '') not like '%Nueva aclaración%'
      and coalesce(new_data::text, '') not like '%Nueva aclaración%'
  ) then
    raise exception 'La modificación administrativa no se auditó sin copiar los datos sensibles.';
  end if;
end;
$$;
reset role;

rollback;
