-- Acceso mínimo: RLS permite lecturas administrativas, mutaciones solo por RPC.

create or replace function public.is_admin(p_required_role text default 'editor')
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_profiles as ap
    where ap.id = auth.uid()
      and ap.active
      and (
        (p_required_role = 'editor' and ap.role in ('editor', 'owner'))
        or (p_required_role = 'owner' and ap.role = 'owner')
      )
  );
$$;
alter function public.is_admin(text) owner to postgres;
revoke all on function public.is_admin(text) from public, anon;
grant execute on function public.is_admin(text) to authenticated;

grant usage on schema public to anon, authenticated, service_role;

alter table public.admin_profiles enable row level security;
alter table public.event_public_config enable row level security;
alter table public.event_private_config enable row level security;
alter table public.pricing_versions enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.registrations enable row level security;
alter table public.attendees enable row level security;
alter table public.rsvp_request_results enable row level security;
alter table public.rsvp_rate_limits enable row level security;
alter table public.audit_logs enable row level security;

revoke all on table
  public.admin_profiles,
  public.event_public_config,
  public.event_private_config,
  public.pricing_versions,
  public.pricing_rules,
  public.registrations,
  public.attendees,
  public.rsvp_request_results,
  public.rsvp_rate_limits,
  public.audit_logs,
  public.invitation_revisions
from anon, authenticated, service_role;

grant select on public.admin_profiles to authenticated;
grant select on public.event_public_config to authenticated;
grant select on public.event_private_config to authenticated;
grant select on public.pricing_versions to authenticated;
grant select on public.pricing_rules to authenticated;
grant select on public.registrations to authenticated;
grant select on public.attendees to authenticated;
grant select on public.audit_logs to authenticated;

create policy admin_profiles_read_self_or_admin
  on public.admin_profiles for select to authenticated
  using (id = auth.uid() or public.is_admin('editor'));

create policy event_public_config_read_admin
  on public.event_public_config for select to authenticated
  using (public.is_admin('editor'));

create policy event_private_config_read_owner
  on public.event_private_config for select to authenticated
  using (public.is_admin('owner'));

create policy pricing_versions_read_admin
  on public.pricing_versions for select to authenticated
  using (public.is_admin('editor'));

create policy pricing_rules_read_admin
  on public.pricing_rules for select to authenticated
  using (public.is_admin('editor'));

create policy registrations_read_admin
  on public.registrations for select to authenticated
  using (public.is_admin('editor'));

create policy attendees_read_admin
  on public.attendees for select to authenticated
  using (public.is_admin('editor'));

create policy audit_logs_read_admin
  on public.audit_logs for select to authenticated
  using (public.is_admin('editor'));

-- No hay políticas ni grants de navegador para escrituras, RSVP idempotente
-- revisiones de invitación o contadores de rate limit. Las mutaciones se harán
-- por funciones acotadas. El acceso a revisiones se configura en 005.
