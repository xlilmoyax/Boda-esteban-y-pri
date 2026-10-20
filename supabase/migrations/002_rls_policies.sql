-- Migración 002: Políticas RLS para Tarjeta-de-Casamiento
-- Seguridad: lectura pública limitada, escritura controlada por admins.

-- Función helper para verificar si el usuario autenticado es admin
create or replace function public.is_admin(required_role text default 'editor')
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid()
      and active = true
      and (
        required_role = 'editor'
        or (required_role = 'owner' and role = 'owner')
      )
  );
$$;

-- =============================================
-- event_settings: lectura pública, escritura admin
-- =============================================
create policy "event_settings_public_select" on public.event_settings
  for select using (true);

create policy "event_settings_admin_all" on public.event_settings
  for all using (public.is_admin('editor')) with check (public.is_admin('editor'));

-- =============================================
-- guests: escritura pública (confirmación), lectura solo admin
-- =============================================
create policy "guests_public_insert_confirmation" on public.guests
  for insert with check (true);

create policy "guests_admin_all" on public.guests
  for all using (public.is_admin('editor')) with check (public.is_admin('editor'));

-- =============================================
-- attendees: escritura pública (confirmación), lectura solo admin
-- =============================================
create policy "attendees_public_insert_confirmation" on public.attendees
  for insert with check (true);

create policy "attendees_admin_all" on public.attendees
  for all using (public.is_admin('editor')) with check (public.is_admin('editor'));

-- =============================================
-- pricing_rules: lectura pública, escritura admin
-- =============================================
create policy "pricing_rules_public_select" on public.pricing_rules
  for select using (active = true);

create policy "pricing_rules_admin_all" on public.pricing_rules
  for all using (public.is_admin('editor')) with check (public.is_admin('editor'));

-- =============================================
-- payment_records: escritura pública (informar), lectura solo admin
-- =============================================
create policy "payment_records_public_insert" on public.payment_records
  for insert with check (true);

create policy "payment_records_admin_all" on public.payment_records
  for all using (public.is_admin('editor')) with check (public.is_admin('editor'));

-- =============================================
-- admin_profiles: lectura propia, escritura solo service_role (no por anon)
-- =============================================
create policy "admin_profiles_select_own" on public.admin_profiles
  for select using (auth.uid() = id);

-- =============================================
-- audit_logs: lectura y escritura solo admin (mediante sesión autenticada)
-- =============================================
create policy "audit_logs_admin_all" on public.audit_logs
  for all using (public.is_admin('editor')) with check (public.is_admin('editor'));

-- =============================================
-- gallery_images: lectura pública (activas), escritura admin
-- =============================================
create policy "gallery_images_public_select" on public.gallery_images
  for select using (active = true);

create policy "gallery_images_admin_all" on public.gallery_images
  for all using (public.is_admin('editor')) with check (public.is_admin('editor'));

-- =============================================
-- content_sections: lectura pública (visibles), escritura admin
-- =============================================
create policy "content_sections_public_select" on public.content_sections
  for select using (visible = true);

create policy "content_sections_admin_all" on public.content_sections
  for all using (public.is_admin('editor')) with check (public.is_admin('editor'));
