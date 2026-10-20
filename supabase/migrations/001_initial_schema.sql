-- Migración 001: Esquema inicial del proyecto Tarjeta-de-Casamiento
-- Proyecto independiente de casamiento: Esteban y Priscila
-- Esta migración crea únicamente las tablas necesarias para esta aplicación.

-- Extensión para UUIDs
create extension if not exists "uuid-ossp";

-- =============================================
-- TABLAS PRINCIPALES
-- =============================================

-- Configuración general del evento (clave-valor)
create table if not exists public.event_settings (
  key text primary key,
  value text not null default '',
  description text,
  updated_at timestamptz not null default now()
);

-- Grupos familiares / registros de invitados
create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  surname text not null,
  phone text,
  email text,
  attending boolean,
  dietary_restrictions text,
  observations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Asistentes individuales dentro de un grupo
create table if not exists public.attendees (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  name text not null,
  surname text not null,
  birth_date date,
  age_at_event integer,
  category text check (category in ('adulto', 'nino', 'bebe', 'post-almuerzo')),
  price_applied numeric(12,2) not null default 0 check (price_applied >= 0),
  after_lunch boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reglas de precios por edad y condiciones
create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('adulto', 'nino', 'bebe', 'post-almuerzo')),
  label text not null,
  description text,
  min_age integer,
  max_age integer,
  price numeric(12,2) not null default 0 check (price >= 0),
  currency text not null default 'ARS',
  applies_after_lunch boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Registros de pagos (informados y verificados)
create table if not exists public.payment_records (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  amount_informed numeric(12,2) not null default 0 check (amount_informed >= 0),
  amount_verified numeric(12,2),
  status text not null default 'pending' check (status in ('pending', 'informed', 'verified', 'rejected')),
  payment_method text,
  reference text,
  notes text,
  informed_by text,
  verified_by text,
  informed_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Perfiles de administradores autorizados
create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

-- Historial de operaciones administrativas (auditoría)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admin_profiles(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

-- Imágenes de galería administrables
create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_path text not null,
  public_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Secciones de contenido editables de la tarjeta
create table if not exists public.content_sections (
  key text primary key,
  title text,
  body text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Datos iniciales: reglas de precios del evento (confirmados de Canva)
-- Adulto desde el comienzo: $130.000
-- Niño 2 a 10 años: $50.000 (cualquier horario)
-- Adulto después del almuerzo: $70.000
insert into public.pricing_rules (category, label, description, min_age, max_age, price, currency, applies_after_lunch, active)
values
  ('adulto', 'Adulto desde el comienzo', 'Adulto que asiste desde el comienzo del evento', 11, null, 130000.00, 'ARS', false, true),
  ('nino', 'Niño', 'Niño de 2 a 10 años, cualquier horario', 2, 10, 50000.00, 'ARS', false, true),
  ('post-almuerzo', 'Adulto después del almuerzo', 'Adulto que se incorpora después del almuerzo', 11, null, 70000.00, 'ARS', true, true)
on conflict do nothing;

-- =============================================
-- ÍNDICES
-- =============================================

create index if not exists idx_attendees_guest_id on public.attendees(guest_id);
create index if not exists idx_attendees_category on public.attendees(category);
create index if not exists idx_attendees_after_lunch on public.attendees(after_lunch);
create index if not exists idx_payment_records_guest_id on public.payment_records(guest_id);
create index if not exists idx_payment_records_status on public.payment_records(status);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_gallery_images_sort_order on public.gallery_images(sort_order);
create index if not exists idx_content_sections_sort_order on public.content_sections(sort_order);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

alter table public.event_settings enable row level security;
alter table public.guests enable row level security;
alter table public.attendees enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.payment_records enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.gallery_images enable row level security;
alter table public.content_sections enable row level security;
