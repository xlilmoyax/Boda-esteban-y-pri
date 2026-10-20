/**
 * Módulo de dominio: reglas de precios del evento de casamiento.
 * Todas las funciones son puras, tipadas y testeables.
 * No depende del navegador ni de Supabase.
 */

import type { PriceRule, Attendee, CalculationResult, PriceCategoryId } from '../types';

/**
 * Categoría de edad aplicable a un asistente.
 * Reglas de negocio:
 * - bebé: 0 a 2 años (inclusive) → exento
 * - niño: 3 a 12 años (inclusive) → precio infantil
 * - adulto: 13 años en adelante → precio adulto
 * - post-almuerzo: se incorpora después del almuerzo → precio reducido (aplica sobre cualquier edad)
 *
 * NOTA: Los importes y rangos exactos deben extraerse de Canva y cargarse
 * en la tabla pricing_rules. Esta función usa las reglas vigentes pasadas
 * como parámetro para no acoplar precios hardcodeados.
 */
export function classifyAttendee(
  age: number,
  afterLunch: boolean,
  rules: PriceRule[]
): { categoryId: PriceCategoryId; rule: PriceRule | null } {
  const adultRule = rules.find((r) => r.category_id === 'adulto' && r.active);
  const childRule = rules.find((r) => r.category_id === 'nino' && r.active);
  const babyRule = rules.find((r) => r.category_id === 'bebe' && r.active);
  const postLunchRule = rules.find(
    (r) => r.category_id === 'post-almuerzo' && r.active
  );

  // Si es post-almuerzo y existe regla específica, priorizarla
  if (afterLunch && postLunchRule) {
    return { categoryId: 'post-almuerzo', rule: postLunchRule };
  }

  // Bebé: 0-2
  if (babyRule && age >= (babyRule.min_age ?? 0) && age <= (babyRule.max_age ?? 2)) {
    return { categoryId: 'bebe', rule: babyRule };
  }

  // Niño: 3-12
  if (childRule && age >= (childRule.min_age ?? 3) && age <= (childRule.max_age ?? 12)) {
    return { categoryId: 'nino', rule: childRule };
  }

  // Adulto: 13+
  if (adultRule && age >= (adultRule.min_age ?? 13)) {
    return { categoryId: 'adulto', rule: adultRule };
  }

  // Fallback: adulto si no hay regla específica
  return { categoryId: 'adulto', rule: adultRule ?? null };
}

/**
 * Calcula el importe individual de un asistente.
 */
export function calculateIndividualPrice(
  attendee: Attendee,
  rules: PriceRule[]
): { categoryId: PriceCategoryId; price: number; rule: PriceRule | null } {
  const age = attendee.age_at_event ?? 0;
  const { categoryId, rule } = classifyAttendee(age, Boolean(attendee.after_lunch), rules);
  const price = rule ? rule.price : 0;
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
      category: rule?.label ?? categoryId,
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
