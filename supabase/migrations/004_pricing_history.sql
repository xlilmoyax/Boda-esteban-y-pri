-- Migración 004: Historial de precios y campos adicionales en invitados
-- Conserva snapshots de precios para no alterar importes históricos.

-- =============================================
-- TABLA: pricing_history (snapshots de cambios de precio)
-- =============================================
create table if not exists public.pricing_history (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.pricing_rules(id) on delete cascade,
  category text not null check (category in ('adulto', 'nino', 'bebe', 'post-almuerzo')),
  old_price numeric(12,2),
  new_price numeric(12,2) not null check (new_price >= 0),
  changed_by uuid references public.admin_profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

-- Índice para consultas rápidas por regla
create index if not exists idx_pricing_history_rule_id on public.pricing_history(rule_id);
create index if not exists idx_pricing_history_changed_at on public.pricing_history(changed_at desc);

-- Habilitar RLS
alter table public.pricing_history enable row level security;

-- =============================================
-- Campos adicionales en guests (del formulario de confirmación)
-- =============================================
alter table public.guests add column if not exists song_suggestion text;
alter table public.guests add column if not exists dietary_restrictions text;
alter table public.guests add column if not exists dietary_other text;

-- =============================================
-- RLS para pricing_history
-- =============================================
create policy "pricing_history_admin_all" on public.pricing_history
  for all using (public.is_admin('editor')) with check (public.is_admin('editor'));
