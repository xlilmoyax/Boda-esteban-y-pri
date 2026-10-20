-- Migración 003: Funciones SQL para validación y cálculo de precios
-- Funciones ejecutadas con privilegios del definidor (security definer) cuando sea necesario.

-- Función: validar y calcular importe de un grupo de asistentes
-- Recibe un JSON con los asistentes y devuelve el desglose calculado según las reglas vigentes.
create or replace function public.calculate_group_amount(
  p_attendees jsonb
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with attendees as (
    select
      (value->>'id') as attendee_id,
      (value->>'name') as name,
      (value->>'surname') as surname,
      (value->>'birth_date') as birth_date,
      (value->>'age_at_event')::integer as age_at_event,
      (value->>'category') as category,
      (value->>'after_lunch')::boolean as after_lunch
    from jsonb_array_elements(p_attendees) as value
  ),
  categorized as (
    select
      a.*,
      case
        -- Niño 2-10 años tiene prioridad absoluta sobre post-almuerzo
        when a.age_at_event is not null and a.age_at_event between 2 and 10 then 'nino'
        when a.after_lunch then 'post-almuerzo'
        when a.category is not null then a.category
        when a.age_at_event is not null and a.age_at_event <= 1 then 'bebe'
        when a.age_at_event is not null and a.age_at_event >= 11 then 'adulto'
        else null
      end as determined_category
    from attendees a
  ),
  priced as (
    select
      c.*,
      coalesce((
        select r.price
        from public.pricing_rules r
        where r.category = c.determined_category
          and r.active = true
        limit 1
      ), 0) as price_applied
    from categorized c
  )
  select jsonb_build_object(
    'per_person', (
      select jsonb_agg(
        jsonb_build_object(
          'attendee_id', p.attendee_id,
          'name', p.name,
          'surname', p.surname,
          'category', p.determined_category,
          'price', p.price_applied,
          'after_lunch', p.after_lunch
        )
        order by p.attendee_id
      )
      from priced p
    ),
    'total_attendees', (select count(*) from priced),
    'paying_attendees', (select count(*) from priced where price_applied > 0),
    'grand_total', (select coalesce(sum(price_applied), 0) from priced),
    'after_lunch_total', (select coalesce(sum(price_applied), 0) from priced where after_lunch)
  );
$$;

-- Función: registrar auditoría de operación administrativa
-- Requiere sesión autenticada con rol de admin (verificada por RLS en audit_logs)
create or replace function public.audit_log(
  p_action text,
  p_table_name text,
  p_record_id uuid,
  p_old_values jsonb,
  p_new_values jsonb
)
returns void
language sql
stable
set search_path = public
as $$
  insert into public.audit_logs (admin_id, action, table_name, record_id, old_values, new_values)
  values (auth.uid(), p_action, p_table_name, p_record_id, p_old_values, p_new_values);
$$;
