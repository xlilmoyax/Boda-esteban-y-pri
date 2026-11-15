-- Esquema nuevo para Tarjeta de Casamiento.
-- No contiene datos de pago ni migra datos del esquema anterior.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.admin_profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  email text not null,
  role text not null check (role in ('owner', 'editor')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_profiles_email_normalized check (
    email = lower(btrim(email)) and email <> ''
  )
);
create unique index admin_profiles_email_unique on public.admin_profiles (email);

create table public.event_public_config (
  singleton boolean primary key default true check (singleton),
  event_date date not null default date '2027-09-26',
  reception_time text,
  ceremony_time text,
  event_end_time text,
  venue_name text,
  venue_address text,
  rsvp_deadline date,
  dress_code text,
  public_content jsonb not null default '{}'::jsonb
    check (jsonb_typeof(public_content) = 'object' and octet_length(public_content::text) <= 20000),
  bank_alias text,
  bank_holder text,
  bank_name text,
  bank_details_published boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles(id) on delete restrict,
  constraint event_bank_fields_not_blank check (
    (bank_alias is null or btrim(bank_alias) <> '')
    and (bank_holder is null or btrim(bank_holder) <> '')
    and (bank_name is null or btrim(bank_name) <> '')
    and (not bank_details_published or (
      bank_alias is not null and bank_holder is not null and bank_name is not null
    ))
  )
);

create table public.event_private_config (
  singleton boolean primary key default true check (singleton),
  settings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(settings) = 'object' and octet_length(settings::text) <= 20000),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_profiles(id) on delete restrict
);

create or replace function public.invitation_content_is_safe(p_content jsonb)
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
    return false;
  end if;
  if jsonb_typeof(p_content) = 'object' then
    for v_key, v_value in select key, value from jsonb_each(p_content)
    loop
      if v_key = 'storage_path' then
        if jsonb_typeof(v_value) is distinct from 'string' then
          return false;
        end if;
        v_text := lower(v_value #>> '{}');
        if v_text !~ '^invitation/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
          return false;
        end if;
      elsif not public.invitation_content_is_safe(v_value) then
        return false;
      end if;
    end loop;
  elsif jsonb_typeof(p_content) = 'array' then
    for v_value in select value from jsonb_array_elements(p_content)
    loop
      if not public.invitation_content_is_safe(v_value) then
        return false;
      end if;
    end loop;
  elsif jsonb_typeof(p_content) = 'string'
    and lower(p_content #>> '{}') ~ '/storage/v1/object/(sign|public)/' then
    return false;
  end if;
  return true;
end;
$$;
alter function public.invitation_content_is_safe(jsonb) owner to postgres;
revoke all on function public.invitation_content_is_safe(jsonb) from public, anon, authenticated, service_role;

create table public.pricing_versions (
  id uuid primary key default gen_random_uuid(),
  version_number integer not null unique check (version_number > 0),
  status text not null check (status in ('draft', 'active', 'archived')),
  reason text,
  created_by uuid references public.admin_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  activated_by uuid references public.admin_profiles(id) on delete restrict,
  activated_at timestamptz,
  constraint pricing_versions_activation_fields check (
    (status = 'draft' and activated_by is null and activated_at is null)
    or (status in ('active', 'archived') and activated_at is not null)
  )
);
create unique index pricing_versions_single_active
  on public.pricing_versions ((status)) where status = 'active';

create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  pricing_version_id uuid not null references public.pricing_versions(id) on delete restrict,
  category text not null check (category in ('bebe', 'nino', 'adulto', 'post-almuerzo')),
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'ARS' check (currency = 'ARS'),
  created_at timestamptz not null default now(),
  constraint pricing_rules_version_category_unique unique (pricing_version_id, category),
  constraint pricing_rules_snapshot_key unique (pricing_version_id, category, price),
  constraint pricing_rules_baby_child_price check (
    (category <> 'bebe' or price = 0)
    and (category <> 'nino' or price = 50000)
  )
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  contact_name text not null check (btrim(contact_name) <> '' and length(contact_name) <= 120),
  contact_surname text not null check (btrim(contact_surname) <> '' and length(contact_surname) <= 120),
  email text not null check (btrim(email) <> '' and length(email) <= 254),
  email_normalized text generated always as (lower(btrim(email))) stored,
  phone text check (phone is null or length(phone) <= 50),
  rsvp_status text not null check (rsvp_status in ('pending', 'confirmed', 'declined', 'cancelled')),
  observations text check (observations is null or length(observations) <= 2000),
  created_by uuid references public.admin_profiles(id) on delete restrict,
  created_source text not null check (created_source in ('admin_ui', 'public_rsvp')),
  request_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.admin_profiles(id) on delete restrict,
  deletion_reason text check (deletion_reason is null or length(deletion_reason) <= 500),
  constraint registrations_delete_actor_consistency check (
    (deleted_at is null and deleted_by is null)
    or (deleted_at is not null and deleted_by is not null)
  ),
  constraint registrations_email_format check (
    email_normalized ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  )
);
create unique index registrations_email_normalized_unique
  on public.registrations (email_normalized);
create unique index registrations_request_id_unique
  on public.registrations (request_id) where request_id is not null;
create index registrations_created_at_idx on public.registrations (created_at desc);
create index registrations_active_rsvp_idx
  on public.registrations (rsvp_status) where deleted_at is null;

create table public.attendees (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  surname text not null check (btrim(surname) <> ''),
  age_at_event integer not null check (age_at_event between 0 and 120),
  after_lunch boolean not null default false,
  attending boolean not null default true,
  category text not null check (category in ('bebe', 'nino', 'adulto', 'post-almuerzo')),
  pricing_version_id uuid not null,
  price_applied numeric(12,2) not null check (price_applied >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.admin_profiles(id) on delete restrict,
  deletion_reason text check (deletion_reason is null or length(deletion_reason) <= 500),
  constraint attendees_category_matches_age_and_time check (
    (age_at_event between 0 and 1 and category = 'bebe')
    or (age_at_event between 2 and 10 and category = 'nino')
    or (age_at_event >= 11 and after_lunch and category = 'post-almuerzo')
    or (age_at_event >= 11 and not after_lunch and category = 'adulto')
  ),
  constraint attendees_delete_actor_consistency check (
    (deleted_at is null and deleted_by is null)
    or (deleted_at is not null and deleted_by is not null)
  ),
  constraint attendees_pricing_snapshot_fk foreign key
    (pricing_version_id, category, price_applied)
    references public.pricing_rules (pricing_version_id, category, price)
    on delete restrict
);
create index attendees_registration_id_idx on public.attendees (registration_id);
create index attendees_active_registration_idx
  on public.attendees (registration_id) where deleted_at is null and attending;

create table public.rsvp_request_results (
  request_id uuid primary key,
  payload_hash bytea not null check (octet_length(payload_hash) = 32),
  registration_id uuid not null references public.registrations(id) on delete restrict,
  response jsonb not null check (jsonb_typeof(response) = 'object'),
  created_at timestamptz not null default now()
);

create table public.rsvp_rate_limits (
  ip_hash bytea not null check (octet_length(ip_hash) = 32),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  expires_at timestamptz not null,
  primary key (ip_hash, window_started_at),
  constraint rsvp_rate_limit_expiry check (expires_at > window_started_at)
);
create index rsvp_rate_limits_expiry_idx on public.rsvp_rate_limits (expires_at);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('admin', 'guest', 'system')),
  actor_id uuid,
  action text not null check (btrim(action) <> ''),
  entity_type text not null check (btrim(entity_type) <> ''),
  record_id uuid,
  entity_key text,
  request_id uuid,
  source text not null check (source in (
    'admin_ui', 'public_rsvp', 'edge_function', 'scheduled_job',
    'owner_operation', 'database'
  )),
  created_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb,
  constraint audit_logs_entity_reference check (
    (record_id is not null and entity_key is null)
    or (record_id is null and entity_key is not null and btrim(entity_key) <> '')
  ),
  constraint audit_logs_actor_consistency check (
    (actor_type in ('admin', 'guest') and actor_id is not null)
    or (actor_type = 'system' and actor_id is null)
  ),
  constraint audit_logs_payload_size check (
    coalesce(octet_length(old_data::text), 0) <= 10000
    and coalesce(octet_length(new_data::text), 0) <= 10000
  )
);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_record_idx on public.audit_logs (entity_type, record_id)
  where record_id is not null;
create index audit_logs_request_id_idx on public.audit_logs (request_id)
  where request_id is not null;

create table public.invitation_revisions (
  id uuid primary key default gen_random_uuid(),
  version integer unique,
  status text not null check (status in ('draft', 'published', 'archived')),
  content jsonb not null check (
    jsonb_typeof(content) = 'object'
    and content->>'schema_version' = '1'
    and octet_length(content::text) <= 100000
    and public.invitation_content_is_safe(content)
  ),
  created_by uuid references public.admin_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint invitation_revisions_version_status check (
    (status = 'draft' and version is null and published_at is null)
    or (status in ('published', 'archived') and version is not null and published_at is not null)
  )
);
create unique index invitation_revisions_one_draft
  on public.invitation_revisions (status) where status = 'draft';
create unique index invitation_revisions_one_published
  on public.invitation_revisions (status) where status = 'published';
create index invitation_revisions_created_at_idx
  on public.invitation_revisions (created_at desc);
