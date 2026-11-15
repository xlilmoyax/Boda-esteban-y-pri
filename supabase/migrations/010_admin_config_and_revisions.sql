-- Migración 010: administración de configuración e invitation_revisions.
-- Estas funciones estaban definidas únicamente en la migración 009 (denegada);
-- aquí se reimplementan de forma propia y coherente con el modelo definitivo,
-- sin reproducir 009. No crea usuarios ni toca tablas legacy.

-- =============================================
-- Trigger: protect_invitation_revision
-- Las revisiones publicadas/archivadas son inmutables tras su creación.
-- =============================================
create or replace function public.protect_invitation_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'Las revisiones de invitación no se eliminan.';
  end if;
  if tg_op = 'UPDATE' then
    if old.id is distinct from new.id
       or old.created_by is distinct from new.created_by
       or old.created_at is distinct from new.created_at then
      raise exception using errcode = '55000', message = 'Los datos históricos de la revisión son inmutables.';
    end if;
    if old.status = 'draft' and new.status = 'draft'
       and new.version is null and new.published_at is null then
      return new;
    end if;
    if old.status = 'draft' and new.status = 'published'
       and new.version is not null and new.published_at is not null
       and old.content = new.content then
      return new;
    end if;
    if old.status = 'published' and new.status = 'archived'
       and old.version = new.version and old.content = new.content
       and old.published_at = new.published_at then
      return new;
    end if;
    raise exception using errcode = '55000', message = 'Transición de revisión no permitida.';
  end if;
  return new;
end;
$$;

alter function public.protect_invitation_revision() owner to postgres;
revoke all on function public.protect_invitation_revision() from public, anon, authenticated;

create trigger invitation_revisions_immutable
  before update or delete on public.invitation_revisions
  for each row execute function public.protect_invitation_revision();

-- =============================================
-- Funciones de validación de invitación y Storage
-- Diseñadas para el esquema real (001): no dependen de columnas que 009 agregaba.
-- No copian el SQL de 009.
-- =============================================

-- Valida que una ruta de Storage tenga el formato esperado: invitation/<uuid>/<uuid>
create or replace function public.invitation_storage_path_is_valid(p_path text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_path is not null
    and p_path ~ '^invitation/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
$$;

alter function public.invitation_storage_path_is_valid(text) owner to postgres;
revoke all on function public.invitation_storage_path_is_valid(text) from public, anon, authenticated, service_role;

-- Valida recursivamente que todo objeto JSON de invitación tenga rutas de storage válidas.
-- No verifica existencia en Storage (eso se hace en invitation_storage_objects_exist).
create or replace function public.invitation_storage_paths_are_valid(p_content jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_key text;
  v_value jsonb;
  v_text text;
begin
  if p_content is null then
    return true;
  end if;
  if jsonb_typeof(p_content) = 'object' then
    for v_key, v_value in select key, value from jsonb_each(p_content)
    loop
      if v_key in ('storage_path', 'src') and jsonb_typeof(v_value) = 'string' then
        v_text := lower(v_value #>> '{}');
        if v_text like 'invitation/%'
           and not public.invitation_storage_path_is_valid(v_text) then
          return false;
        end if;
      end if;
      if not public.invitation_storage_paths_are_valid(v_value) then
        return false;
      end if;
    end loop;
  elsif jsonb_typeof(p_content) = 'array' then
    for v_value in select value from jsonb_array_elements(p_content)
    loop
      if not public.invitation_storage_paths_are_valid(v_value) then
        return false;
      end if;
    end loop;
  end if;
  return true;
end;
$$;

alter function public.invitation_storage_paths_are_valid(jsonb) owner to postgres;
revoke all on function public.invitation_storage_paths_are_valid(jsonb) from public, anon, authenticated, service_role;

-- Valida que los objetos de storage referenciados existan realmente en el bucket invitation-assets.
-- Requiere acceso a storage.objects (solo service_role/owner en remoto).
create or replace function public.invitation_storage_objects_exist(p_content jsonb)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_key text;
  v_value jsonb;
  v_text text;
begin
  if p_content is null then
    return true;
  end if;
  if jsonb_typeof(p_content) = 'object' then
    for v_key, v_value in select key, value from jsonb_each(p_content)
    loop
      if v_key in ('storage_path', 'src') and jsonb_typeof(v_value) = 'string' then
        v_text := lower(v_value #>> '{}');
        if v_text like 'invitation/%'
           and public.invitation_storage_path_is_valid(v_text)
           and not exists (
             select 1 from storage.objects o
             where o.bucket_id = 'invitation-assets' and o.name = v_text
           ) then
          return false;
        end if;
      end if;
      if not public.invitation_storage_objects_exist(v_value) then
        return false;
      end if;
    end loop;
  elsif jsonb_typeof(p_content) = 'array' then
    for v_value in select value from jsonb_array_elements(p_content)
    loop
      if not public.invitation_storage_objects_exist(v_value) then
        return false;
      end if;
    end loop;
  end if;
  return true;
end;
$$;

alter function public.invitation_storage_objects_exist(jsonb) owner to postgres;
revoke all on function public.invitation_storage_objects_exist(jsonb) from public, anon, authenticated, service_role;

-- =============================================
-- Función: save_invitation_draft
-- Guarda o actualiza el borrador único de invitación. Solo editor/owner.
-- Control de concurrencia mediante p_expected_updated_at.
-- Valida contenido, rutas de storage y existencia de objetos.
-- =============================================
create or replace function public.save_invitation_draft(
  p_content jsonb,
  p_expected_updated_at text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_row record;
  v_expected_updated_at timestamptz;
begin
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado para editar la invitación.';
  end if;
  if p_content is null or jsonb_typeof(p_content) is distinct from 'object'
     or p_content->>'schema_version' is distinct from '1'
     or octet_length(p_content::text) > 100000
     or not public.invitation_content_is_safe(p_content)
     or not public.invitation_storage_paths_are_valid(p_content)
     or not public.invitation_storage_objects_exist(p_content) then
    raise exception using errcode = '22023', message = 'El contenido de invitación no es válido.';
  end if;

  -- Parsear el timestamp esperado de concurrencia
  if p_expected_updated_at is not null then
    begin
      v_expected_updated_at := p_expected_updated_at::timestamptz;
    exception when others then
      raise exception using errcode = '22023', message = 'La marca de tiempo esperada no es válida.';
    end;
  end if;

  select id into v_id
    from public.invitation_revisions
    where status = 'draft'
    for update;
  if v_id is not null then
    if v_expected_updated_at is not null
       and (select updated_at from public.invitation_revisions where id = v_id) is distinct from v_expected_updated_at then
      raise exception using errcode = '40001', message = 'El borrador cambió desde que se cargó. Recargá el editor.';
    end if;
    update public.invitation_revisions
      set content = p_content, updated_at = now()
      where id = v_id
    returning * into v_row;
    perform public.write_audit(
      'admin', auth.uid(), 'update_invitation_draft', 'invitation_revisions', v_id, null,
      gen_random_uuid(), 'admin_ui', null,
      jsonb_build_object('schema_version', p_content->>'schema_version')
    );
  else
    if v_expected_updated_at is not null then
      raise exception using errcode = '40001', message = 'El borrador cambió desde que se cargó. Recargá el editor.';
    end if;
    insert into public.invitation_revisions (status, content, created_by)
    values ('draft', p_content, auth.uid())
    returning * into v_row;
    perform public.write_audit(
      'admin', auth.uid(), 'create_invitation_draft', 'invitation_revisions', v_row.id, null,
      gen_random_uuid(), 'admin_ui', null,
      jsonb_build_object('schema_version', p_content->>'schema_version')
    );
  end if;

  return jsonb_build_object(
    'id', v_row.id::text,
    'version', v_row.version,
    'status', v_row.status,
    'content', v_row.content,
    'created_by', v_row.created_by::text,
    'created_at', v_row.created_at::text,
    'updated_at', v_row.updated_at::text,
    'published_at', v_row.published_at
  );
end;
$$;

alter function public.save_invitation_draft(jsonb, text) owner to postgres;
revoke all on function public.save_invitation_draft(jsonb, text) from public, anon;
grant execute on function public.save_invitation_draft(jsonb, text) to authenticated;

-- =============================================
-- Función: publish_invitation_draft
-- Publica el borrador como la revisión publicada vigente. Solo owner.
-- Control de concurrencia real mediante p_expected_updated_at y advisory lock.
-- =============================================
create or replace function public.publish_invitation_draft(
  p_expected_updated_at text default null
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_draft_id uuid;
  v_expected_updated_at timestamptz;
  v_version integer;
  v_published_id uuid;
begin
  if not public.is_admin('owner') then
    raise exception using errcode = '42501', message = 'Solo el owner puede publicar la invitación.';
  end if;

  if p_expected_updated_at is not null then
    begin
      v_expected_updated_at := p_expected_updated_at::timestamptz;
    exception when others then
      raise exception using errcode = '22023', message = 'La marca de tiempo esperada no es válida.';
    end;
  end if;

  select id into v_draft_id
    from public.invitation_revisions
    where status = 'draft'
    for update;
  if v_draft_id is null then
    raise exception using errcode = 'P0002', message = 'No hay borrador de invitación para publicar.';
  end if;

  if v_expected_updated_at is not null
     and (select updated_at from public.invitation_revisions where id = v_draft_id) is distinct from v_expected_updated_at then
    raise exception using errcode = '40001', message = 'El borrador cambió desde que se cargó. Recargá el editor.';
  end if;

  perform pg_advisory_xact_lock(724622);
  select coalesce(max(version), 0) + 1 into v_version
    from public.invitation_revisions
    where status in ('published', 'archived');

  update public.invitation_revisions
     set status = 'archived'
   where status = 'published';

  update public.invitation_revisions
     set status = 'published',
         version = v_version,
         published_at = now(),
         updated_at = now()
   where id = v_draft_id
  returning id into v_published_id;

  perform public.write_audit(
    'admin', auth.uid(), 'publish_invitation', 'invitation_revisions', v_published_id, null,
    gen_random_uuid(), 'owner_operation', null,
    jsonb_build_object('version', v_version)
  );
  return v_version;
end;
$$;

alter function public.publish_invitation_draft(text) owner to postgres;
revoke all on function public.publish_invitation_draft(text) from public, anon;
grant execute on function public.publish_invitation_draft(text) to authenticated;

-- =============================================
-- Función: admin_restore_invitation_revision
-- Restaura una revisión archivada como borrador. Solo editor/owner.
-- No modifica contenido publicado directamente; pasa por borrador seguro.
-- Control de concurrencia mediante p_expected_updated_at.
-- =============================================
create or replace function public.admin_restore_invitation_revision(
  p_revision_id uuid,
  p_expected_updated_at text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_expected_updated_at timestamptz;
  v_status text;
  v_draft_exists boolean;
  v_row record;
begin
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado para restaurar revisiones.';
  end if;

  if p_expected_updated_at is not null then
    begin
      v_expected_updated_at := p_expected_updated_at::timestamptz;
    exception when others then
      raise exception using errcode = '22023', message = 'La marca de tiempo esperada no es válida.';
    end;
  end if;

  select status into v_status
    from public.invitation_revisions
    where id = p_revision_id
    for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Revisión de invitación no encontrada.';
  end if;
  if v_status <> 'archived' then
    raise exception using errcode = '22023', message = 'Solo se pueden restaurar revisiones archivadas.';
  end if;

  select exists (select 1 from public.invitation_revisions where status = 'draft')
    into v_draft_exists;
  if v_draft_exists then
    raise exception using errcode = '22023', message = 'Ya existe un borrador activo.';
  end if;

  if v_expected_updated_at is not null
     and (select updated_at from public.invitation_revisions where id = p_revision_id) is distinct from v_expected_updated_at then
    raise exception using errcode = '40001', message = 'La revisión cambió desde que se cargó. Recargá el editor.';
  end if;

  update public.invitation_revisions
     set status = 'draft',
         version = null,
         published_at = null,
         updated_at = now()
   where id = p_revision_id
  returning * into v_row;

  perform public.write_audit(
    'admin', auth.uid(), 'restore_invitation_revision', 'invitation_revisions', p_revision_id, null,
    gen_random_uuid(), 'admin_ui', null,
    jsonb_build_object('previous_status', 'archived')
  );

  return jsonb_build_object(
    'id', v_row.id::text,
    'version', v_row.version,
    'status', v_row.status,
    'content', v_row.content,
    'created_by', v_row.created_by::text,
    'created_at', v_row.created_at::text,
    'updated_at', v_row.updated_at::text,
    'published_at', v_row.published_at
  );
end;
$$;

alter function public.admin_restore_invitation_revision(uuid, text) owner to postgres;
revoke all on function public.admin_restore_invitation_revision(uuid, text) from public, anon;
grant execute on function public.admin_restore_invitation_revision(uuid, text) to authenticated;

-- =============================================
-- Función: get_public_invitation
-- Devuelve configuración pública + tarifas activas para el formulario RSVP.
-- Accesible por anon (público) sin autenticación.
-- =============================================
create or replace function public.get_public_invitation()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'event', jsonb_build_object(
      'event_date', c.event_date,
      'reception_time', c.reception_time,
      'ceremony_time', c.ceremony_time,
      'event_end_time', c.event_end_time,
      'venue_name', c.venue_name,
      'venue_address', c.venue_address,
      'rsvp_deadline', c.rsvp_deadline,
      'dress_code', c.dress_code,
      'content', c.public_content,
      'bank_details', case when c.bank_details_published then
        jsonb_build_object('alias', c.bank_alias, 'holder', c.bank_holder, 'bank', c.bank_name)
        else null end
    ),
    'pricing', coalesce((
      select jsonb_object_agg(pr.category, pr.price)
      from public.pricing_rules pr
      join public.pricing_versions pv on pv.id = pr.pricing_version_id
      where pv.status = 'active'
      group by pr.category
    ), '{}'::jsonb)
  )
  from public.event_public_config c
  where c.singleton;
$$;

alter function public.get_public_invitation() owner to postgres;
revoke all on function public.get_public_invitation() from public;
grant execute on function public.get_public_invitation() to anon, authenticated;

-- =============================================
-- Función: admin_update_public_config
-- Actualiza campos de configuración pública del evento. Editor (owner para
-- campos bancarios y publicación de datos bancarios).
-- =============================================
create or replace function public.admin_update_public_config(p_patch jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_allowed text[] := array[
    'reception_time', 'ceremony_time', 'event_end_time', 'venue_name',
    'venue_address', 'rsvp_deadline', 'dress_code', 'public_content',
    'bank_alias', 'bank_holder', 'bank_name', 'bank_details_published'
  ];
  v_changed jsonb;
begin
  if not public.is_admin('editor') then
    raise exception using errcode = '42501', message = 'No autorizado para actualizar la configuración pública.';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then
    raise exception using errcode = '22023', message = 'La actualización no es válida.';
  end if;

  for v_key in select jsonb_object_keys(p_patch)
  loop
    if not v_key = any(v_allowed) then
      raise exception using errcode = '22023', message = 'Campo no permitido en configuración pública.';
    end if;
    if v_key = 'public_content' and jsonb_typeof(p_patch->v_key) is distinct from 'object' then
      raise exception using errcode = '22023', message = 'public_content debe ser un objeto JSON.';
    end if;
    if v_key = 'bank_details_published' and jsonb_typeof(p_patch->v_key) is distinct from 'boolean' then
      raise exception using errcode = '22023', message = 'bank_details_published debe ser booleano.';
    end if;
    if v_key not in ('public_content', 'bank_details_published')
       and jsonb_typeof(p_patch->v_key) not in ('string', 'null') then
      raise exception using errcode = '22023', message = 'Los campos de configuración deben ser texto o nulos.';
    end if;
  end loop;

  if octet_length(p_patch::text) > 20000 then
    raise exception using errcode = '22023', message = 'La actualización excede el tamaño máximo.';
  end if;

  if (p_patch ?| array['bank_alias', 'bank_holder', 'bank_name', 'bank_details_published'])
     and not public.is_admin('owner') then
    raise exception using errcode = '42501', message = 'Solo el owner puede administrar datos bancarios.';
  end if;

  perform 1 from public.event_public_config where singleton for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Falta la configuración inicial del evento.';
  end if;

  update public.event_public_config
  set reception_time = case when p_patch ? 'reception_time' then p_patch->>'reception_time' else reception_time end,
      ceremony_time = case when p_patch ? 'ceremony_time' then p_patch->>'ceremony_time' else ceremony_time end,
      event_end_time = case when p_patch ? 'event_end_time' then p_patch->>'event_end_time' else event_end_time end,
      venue_name = case when p_patch ? 'venue_name' then p_patch->>'venue_name' else venue_name end,
      venue_address = case when p_patch ? 'venue_address' then p_patch->>'venue_address' else venue_address end,
      rsvp_deadline = case when p_patch ? 'rsvp_deadline' then nullif(p_patch->>'rsvp_deadline', '')::date else rsvp_deadline end,
      dress_code = case when p_patch ? 'dress_code' then p_patch->>'dress_code' else dress_code end,
      public_content = case when p_patch ? 'public_content' then p_patch->'public_content' else public_content end,
      bank_alias = case when p_patch ? 'bank_alias' then p_patch->>'bank_alias' else bank_alias end,
      bank_holder = case when p_patch ? 'bank_holder' then p_patch->>'bank_holder' else bank_holder end,
      bank_name = case when p_patch ? 'bank_name' then p_patch->>'bank_name' else bank_name end,
      bank_details_published = case when p_patch ? 'bank_details_published'
        then (p_patch->>'bank_details_published')::boolean else bank_details_published end,
      updated_at = now(),
      updated_by = auth.uid()
  where singleton;

  v_changed := p_patch;

  perform public.write_audit(
    'admin', auth.uid(), 'update_public_config', 'event_public_config', null, 'singleton',
    gen_random_uuid(), 'admin_ui', null,
    jsonb_build_object('changed_fields', v_changed)
  );
end;
$$;

alter function public.admin_update_public_config(jsonb) owner to postgres;
revoke all on function public.admin_update_public_config(jsonb) from public, anon;
grant execute on function public.admin_update_public_config(jsonb) to authenticated;

-- =============================================
-- Función: owner_update_private_config
-- Actualiza configuración privada del evento. Solo owner.
-- =============================================
create or replace function public.owner_update_private_config(p_settings jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin('owner') then
    raise exception using errcode = '42501', message = 'Solo el owner puede modificar la configuración privada.';
  end if;
  if p_settings is null or jsonb_typeof(p_settings) is distinct from 'object'
     or octet_length(p_settings::text) > 20000 then
    raise exception using errcode = '22023', message = 'La configuración privada no es válida.';
  end if;

  update public.event_private_config
     set settings = p_settings, updated_at = now(), updated_by = auth.uid()
   where singleton;
  if not found then
    raise exception using errcode = 'P0002', message = 'Falta la configuración privada inicial.';
  end if;

  perform public.write_audit(
    'admin', auth.uid(), 'update_private_config', 'event_private_config', null, 'singleton',
    gen_random_uuid(), 'owner_operation', null,
    jsonb_build_object('changed', true)
  );
end;
$$;

alter function public.owner_update_private_config(jsonb) owner to postgres;
revoke all on function public.owner_update_private_config(jsonb) from public, anon;
grant execute on function public.owner_update_private_config(jsonb) to authenticated;
