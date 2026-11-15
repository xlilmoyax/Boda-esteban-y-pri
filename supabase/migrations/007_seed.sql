-- Valores iniciales idempotentes. No crea usuarios, perfiles ni publicaciones.

insert into public.event_public_config (singleton, event_date, bank_details_published)
values (true, date '2027-09-26', false)
on conflict (singleton) do nothing;

insert into public.event_private_config (singleton, settings)
values (true, '{}'::jsonb)
on conflict (singleton) do nothing;

insert into public.pricing_versions (
  version_number, status, reason, created_by
)
values (
  1, 'draft', 'Tarifas iniciales aprobadas para el evento', null
)
on conflict (version_number) do nothing;

insert into public.pricing_rules (pricing_version_id, category, price, currency)
select pv.id, seed.category, seed.price, 'ARS'
from public.pricing_versions pv
cross join (values
  ('bebe', 0::numeric),
  ('nino', 50000::numeric),
  ('adulto', 130000::numeric),
  ('post-almuerzo', 70000::numeric)
) as seed(category, price)
where pv.version_number = 1 and pv.status = 'draft'
on conflict (pricing_version_id, category) do nothing;

update public.pricing_versions
set status = 'active', activated_at = now()
where version_number = 1 and status = 'draft';

do $$
declare
  v_count integer;
  v_version_id uuid;
begin
  if not exists (
    select 1 from public.event_public_config
    where singleton and event_date = date '2027-09-26'
  ) then
    raise exception 'La configuración inicial debe mantener la fecha oficial del evento.';
  end if;
  select id into v_version_id
  from public.pricing_versions
  where version_number = 1;
  if v_version_id is null then
    raise exception 'Falta la versión tarifaria inicial.';
  end if;
  select count(*) into v_count
  from public.pricing_versions pv
  join public.pricing_rules pr on pr.pricing_version_id = pv.id
  where pv.version_number = 1
    and (
      (pr.category = 'bebe' and pr.price = 0)
      or (pr.category = 'nino' and pr.price = 50000)
      or (pr.category = 'adulto' and pr.price = 130000)
      or (pr.category = 'post-almuerzo' and pr.price = 70000)
    );
  if v_count <> 4 then
    raise exception 'La versión tarifaria inicial debe contener exactamente las cuatro tarifas oficiales.';
  end if;
  if not exists (
    select 1 from public.pricing_versions where status = 'active'
  ) then
    raise exception 'Debe existir una versión tarifaria activa.';
  end if;
  if not exists (
    select 1 from public.audit_logs
    where action = 'seed_initial_pricing'
      and entity_type = 'pricing_versions'
      and record_id = v_version_id
  ) then
    insert into public.audit_logs (
      actor_type, actor_id, action, entity_type, record_id,
      request_id, source, new_data
    )
    values (
      'system', null, 'seed_initial_pricing', 'pricing_versions', v_version_id,
      gen_random_uuid(), 'database', jsonb_build_object('version', 1, 'category_count', 4)
    );
  end if;
end;
$$;
