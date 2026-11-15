-- Bucket privado y límites de archivo. No crea políticas de lectura/escritura
-- ni funciones de upload/URL firmada; esas operaciones quedan para otra fase.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'invitation-assets',
  'invitation-assets',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'invitation-assets'
      and name = 'invitation-assets'
      and public = false
      and file_size_limit = 8388608
      and allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  ) then
    raise exception 'El bucket invitation-assets ya existe con una configuración incompatible; no se modificó.';
  end if;
end;
$$;
