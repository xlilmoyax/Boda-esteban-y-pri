-- Estructura persistente para el editor. No siembra ni publica contenido y no
-- crea funciones de publicación ni operaciones de Storage en esta fase.

alter table public.invitation_revisions enable row level security;
revoke all on public.invitation_revisions from anon, authenticated;
grant select on public.invitation_revisions to authenticated;

create policy invitation_revisions_read_admin
  on public.invitation_revisions for select to authenticated
  using (public.is_admin('editor'));

-- Las revisiones se escriben solo mediante RPC futuras, que validarán el
-- contenido, comprobarán concurrencia y auditarán en la misma transacción.
