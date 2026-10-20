/**
 * Módulo de dominio: reglas de precios del evento de casamiento.
 * Todas las funciones son puras, tipadas y testeables.
 * No depende del navegador ni de Supabase.
 *
 * Reglas de negocio confirmadas (fuente: tarjeta original de Canva / video):
 * - Niño de 2 a 10 años (inclusive): $50.000, independientemente del horario.
 * - Adulto que asiste desde el comienzo: $130.000.
 * - Adulto que se incorpora después del almuerzo: $70.000.
 *
 * Reglas pendientes de verificación en la tarjeta original:
 * - Menores de 2 años: categoría y precio no definidos.
 * - Límite inferior de "adulto": no especificado (configurable).
 *
 * Esta función usa las reglas vigentes pasadas como parámetro para no
 * acoplar precios hardcodeados. Los valores se cargan desde pricing_rules.
 */

import type { PriceRule, Attendee, CalculationResult, PriceCategoryId } from '../types';

/**
 * Determina la categoría de precio aplicable a un asistente.
 * Prioridad:
 * 1. Niño (2-10 años) → siempre $50.000, incluso después del almuerzo.
 * 2. Adulto después del almuerzo → $70.000.
 * 3. Adulto desde el comienzo → $130.000.
 * 4. Menor de 2 años → sin categoría definida (devuelve null).
 *
 * No se asignan dos categorías a una misma persona.
 */
export function classifyAttendee(
  age: number,
  afterLunch: boolean,
  rules: PriceRule[]
): { categoryId: PriceCategoryId | null; rule: PriceRule | null } {
  const childRule = rules.find((r) => r.category === 'nino' && r.active);
  const postLunchRule = rules.find(
    (r) => r.category === 'post-almuerzo' && r.active
  );
  const adultRule = rules.find((r) => r.category === 'adulto' && r.active);

  // 1. Niño de 2 a 10 años: prioridad absoluta, cualquiera sea el horario
  if (
    childRule &&
    age >= (childRule.min_age ?? 2) &&
    age <= (childRule.max_age ?? 10)
  ) {
    return { categoryId: 'nino', rule: childRule };
  }

  // 2. Adulto después del almuerzo (solo aplica a adultos, no a niños)
  if (afterLunch && postLunchRule) {
    return { categoryId: 'post-almuerzo', rule: postLunchRule };
  }

  // 3. Adulto desde el comienzo
  if (adultRule && age >= (adultRule.min_age ?? 11)) {
    return { categoryId: 'adulto', rule: adultRule };
  }

  // 4. Sin categoría definida (menor de 2 años o fuera de rango)
  return { categoryId: null, rule: null };
}

/**
 * Calcula el importe individual de un asistente.
 */
export function calculateIndividualPrice(
  attendee: Attendee,
  rules: PriceRule[]
): { categoryId: PriceCategoryId | null; price: number; rule: PriceRule | null } {
  const age = attendee.age_at_event ?? 0;
  const { categoryId, rule } = classifyAttendee(
    age,
    Boolean(attendee.after_lunch),
    rules
  );
  const price = rule ? Number(rule.price) : 0;
  return { categoryId, price, rule };
}

/**
 * Calcula el desglose completo para un grupo de asistentes.
 */
export function calculateGroupTotal(
  attendees: Attendee[],
  rules: PriceRule[]
): CalculationResult {
  const perPerson = attendees.map((a) => {
    const { categoryId, price, rule } = calculateIndividualPrice(a, rules);
    return {
      attendee_id: a.id,
      name: a.name,
      surname: a.surname,
      category: rule?.label ?? (categoryId ?? 'sin-definir'),
      price,
      after_lunch: Boolean(a.after_lunch),
    };
  });

  const totalsByCategory: Record<string, { count: number; total: number }> = {};
  let afterLunchTotal = 0;
  let totalAttendees = attendees.length;
  let payingAttendees = 0;
  let grandTotal = 0;

  for (const p of perPerson) {
    if (!totalsByCategory[p.category]) {
      totalsByCategory[p.category] = { count: 0, total: 0 };
    }
    totalsByCategory[p.category].count += 1;
    totalsByCategory[p.category].total += p.price;

    if (p.after_lunch) {
      afterLunchTotal += p.price;
    }

    if (p.price > 0) {
      payingAttendees += 1;
    }

    grandTotal += p.price;
  }

  return {
    perPerson,
    totalsByCategory,
    afterLunchTotal,
    totalAttendees,
    payingAttendees,
    grandTotal,
  };
}

/**
 * Valida que una edad sea razonable (0 a 120).
 */
export function isValidAge(age: number): boolean {
  return Number.isInteger(age) && age >= 0 && age <= 120;
}

/**
 * Calcula la edad a partir de la fecha de nacimiento y la fecha del evento.
 */
export function ageFromBirthDate(birthDate: string, eventDate: string): number {
  const birth = new Date(birthDate);
  const event = new Date(eventDate);
  let age = event.getFullYear() - birth.getFullYear();
  const m = event.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && event.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}
