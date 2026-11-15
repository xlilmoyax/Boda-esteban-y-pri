-- Migración 012: Corrección de get_public_invitation para incluir campo 'invitation'
-- Proyecto: unmsegdzihupqcihejut
-- Fecha: 2026-11-15
--
-- Problema: La función get_public_invitation() no retornaba el campo 'invitation',
--           por lo que el frontend no podía leer el contenido publicado de la invitación.
--           También se corrigió la referencia a columna 'active' inexistente en pricing_rules.
--
-- Esta migración es idempotente: usa CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.get_public_invitation()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
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
      'bank_details', CASE WHEN c.bank_details_published THEN
        jsonb_build_object('alias', c.bank_alias, 'holder', c.bank_holder, 'bank', c.bank_name)
        ELSE NULL END
    ),
    'pricing', COALESCE((
      SELECT jsonb_object_agg(pr.category, pr.price)
      FROM public.pricing_rules pr
      JOIN public.pricing_versions pv ON pv.id = pr.pricing_version_id
      WHERE pv.status = 'active'
      GROUP BY pr.category
    ), '{}'::jsonb),
    'invitation', (
      SELECT ir.content
      FROM public.invitation_revisions ir
      WHERE ir.status = 'published'
      ORDER BY ir.version DESC
      LIMIT 1
    )
  )
  FROM public.event_public_config c
  WHERE c.singleton;
$$;

ALTER FUNCTION public.get_public_invitation() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_invitation() FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_invitation() TO anon, authenticated;
