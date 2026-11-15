do $$
declare
  v_result text;
  v_definition text;
  v_bucket_public boolean;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'registrations'
      and column_name = 'song_suggestion'
      and data_type = 'text'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'registrations'
      and column_name = 'dietary_restrictions'
      and udt_name = '_text'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'registrations'
      and column_name = 'dietary_details'
      and data_type = 'text'
  ) then
    raise exception 'Los datos RSVP deben estar asociados a registrations con los tipos aprobados.';
  end if;

  if not public.dietary_restrictions_are_valid(
    array['celiaquia', 'vegetariana', 'vegana', 'diabetes']::text[]
  ) or public.dietary_restrictions_are_valid(array['otra_categoria']::text[]) then
    raise exception 'La validación de restricciones no coincide con las opciones del formulario.';
  end if;

  if has_table_privilege('anon', 'public.registrations', 'SELECT')
    or has_table_privilege('anon', 'public.attendees', 'SELECT') then
    raise exception 'El cliente anónimo no debe consultar registros ni asistentes directamente.';
  end if;
  if has_function_privilege('anon', 'public.admin_get_balance_summary()', 'EXECUTE')
    or has_function_privilege('anon', 'public.owner_set_admin_active(uuid,boolean)', 'EXECUTE') then
    raise exception 'Una RPC administrativa quedó expuesta al rol anon.';
  end if;
  if not has_function_privilege('authenticated', 'public.admin_get_balance_summary()', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.owner_set_admin_active(uuid,boolean)', 'EXECUTE') then
    raise exception 'Falta conceder a authenticated las RPC administrativas protegidas por rol.';
  end if;

  select pg_get_function_result('public.admin_get_balance_summary()'::regprocedure)
    into v_result;
  if v_result not like 'TABLE(registration_id uuid, contact_name text, contact_surname text, email text, balance_due numeric%, included_attendees bigint)' then
    raise exception 'La RPC de saldos no devuelve el contrato esperado: %', v_result;
  end if;

  select pg_get_functiondef('public.get_public_invitation()'::regprocedure)
    into v_definition;
  if position('song_suggestion' in lower(v_definition)) > 0
    or position('dietary_restrictions' in lower(v_definition)) > 0
    or position('dietary_details' in lower(v_definition)) > 0 then
    raise exception 'La RPC pública de invitación contiene datos RSVP privados.';
  end if;

  select public into v_bucket_public
  from storage.buckets
  where id = 'invitation-assets';
  if v_bucket_public is distinct from false then
    raise exception 'El bucket invitation-assets debe existir y permanecer privado.';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'invitation_assets_select_public_published'
  ) or has_function_privilege(
    'anon', 'public.invitation_asset_is_readable(text)', 'EXECUTE'
  ) then
    raise exception 'La lectura pública de objetos de invitación debe estar deshabilitada.';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'invitation_assets_select_admin'
      and cmd = 'SELECT'
      and 'authenticated'::name = any(roles)
      and qual ilike '%is_admin%'
      and qual not ilike '%invitation_asset_is_readable%'
  ) then
    raise exception 'Falta la política de lectura exclusiva para administradores en Storage.';
  end if;

  if to_regclass('public.payment_records') is not null then
    raise exception 'No debe existir payment_records.';
  end if;
end;
$$;
