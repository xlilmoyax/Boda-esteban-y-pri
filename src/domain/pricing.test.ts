/**
 * Pruebas unitarias para src/domain/pricing.ts
 * Reglas confirmadas del evento Esteban y Priscila:
 * - Adulto desde el comienzo: $130.000
 * - Niño 2 a 10 años, cualquier horario: $50.000
 * - Adulto después del almuerzo: $70.000
 * - Menor de 2 años: sin categoría definida
 */

import {
  classifyAttendee,
  calculateIndividualPrice,
  calculateGroupTotal,
  isValidAge,
  ageFromBirthDate,
} from './pricing';
import type { PriceRule, Attendee } from '../types';

function rule(overrides: Partial<PriceRule> = {}): PriceRule {
  return {
    id: 'r1',
    category: 'adulto',
    label: 'Adulto',
    description: null,
    min_age: 11,
    max_age: null,
    price: 130000,
    currency: 'ARS',
    applies_after_lunch: false,
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function attendee(overrides: Partial<Attendee> = {}): Attendee {
  return {
    id: 'a1',
    guest_id: 'g1',
    name: 'Juan',
    surname: 'Pérez',
    birth_date: null,
    age_at_event: null,
    category: null,
    price_applied: 0,
    after_lunch: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    passed += 1;
  } else {
    failed += 1;
    errors.push(message);
    console.error('FAIL:', message);
  }
}

// Reglas base confirmadas del evento
const rules: PriceRule[] = [
  rule({ category: 'nino', label: 'Niño', min_age: 2, max_age: 10, price: 50000, applies_after_lunch: false }),
  rule({ category: 'adulto', label: 'Adulto', min_age: 11, max_age: null, price: 130000, applies_after_lunch: false }),
  rule({
    category: 'post-almuerzo',
    label: 'Adulto después del almuerzo',
    min_age: 11,
    max_age: null,
    price: 70000,
    applies_after_lunch: true,
  }),
];

// --- classifyAttendee ---
assert(
  classifyAttendee(1, false, rules).categoryId === null,
  'classifyAttendee: 1 año = sin categoría (menor de 2)'
);
assert(
  classifyAttendee(2, false, rules).categoryId === 'nino',
  'classifyAttendee: 2 años = niño (límite inferior)'
);
assert(
  classifyAttendee(10, false, rules).categoryId === 'nino',
  'classifyAttendee: 10 años = niño (límite superior)'
);
assert(
  classifyAttendee(11, false, rules).categoryId === 'adulto',
  'classifyAttendee: 11 años = adulto (límite inferior)'
);
assert(
  classifyAttendee(30, false, rules).categoryId === 'adulto',
  'classifyAttendee: 30 años = adulto'
);

// Niño 2-10 paga $50.000 incluso después del almuerzo (prioridad absoluta)
assert(
  classifyAttendee(5, true, rules).categoryId === 'nino',
  'classifyAttendee: niño 5 años post-almuerzo = niño (no post-almuerzo)'
);
assert(
  classifyAttendee(10, true, rules).categoryId === 'nino',
  'classifyAttendee: niño 10 años post-almuerzo = niño'
);

// Adulto post-almuerzo
assert(
  classifyAttendee(30, true, rules).categoryId === 'post-almuerzo',
  'classifyAttendee: adulto post-almuerzo = post-almuerzo'
);

// --- calculateIndividualPrice ---
const ind = calculateIndividualPrice(attendee({ age_at_event: 30 }), rules);
assert(ind.categoryId === 'adulto', 'calculateIndividualPrice: adulto');
assert(ind.price === 130000, 'calculateIndividualPrice: precio adulto 130000');

const indChild = calculateIndividualPrice(attendee({ age_at_event: 8 }), rules);
assert(indChild.categoryId === 'nino', 'calculateIndividualPrice: niño');
assert(indChild.price === 50000, 'calculateIndividualPrice: precio niño 50000');

const indBaby = calculateIndividualPrice(attendee({ age_at_event: 1 }), rules);
assert(indBaby.categoryId === null, 'calculateIndividualPrice: bebé sin categoría');
assert(indBaby.price === 0, 'calculateIndividualPrice: precio bebé 0 (sin categoría)');

const indChildPost = calculateIndividualPrice(
  attendee({ age_at_event: 8, after_lunch: true }),
  rules
);
assert(indChildPost.categoryId === 'nino', 'calculateIndividualPrice: niño post-almuerzo = niño');
assert(indChildPost.price === 50000, 'calculateIndividualPrice: niño post-almuerzo $50.000');

const indPost = calculateIndividualPrice(
  attendee({ age_at_event: 30, after_lunch: true }),
  rules
);
assert(indPost.categoryId === 'post-almuerzo', 'calculateIndividualPrice: adulto post-almuerzo');
assert(indPost.price === 70000, 'calculateIndividualPrice: precio adulto post-almuerzo 70000');

// --- calculateGroupTotal ---
// Grupo mixto: adulto desde comienzo, niño, adulto post-almuerzo
const group = [
  attendee({ id: '1', name: 'Ana', surname: 'García', age_at_event: 30 }),
  attendee({ id: '2', name: 'Luis', surname: 'García', age_at_event: 8 }),
  attendee({ id: '3', name: 'Sofía', surname: 'García', age_at_event: 35, after_lunch: true }),
  attendee({ id: '4', name: 'Martín', surname: 'García', age_at_event: 10, after_lunch: true }), // niño paga $50k aunque post-almuerzo
];
const result = calculateGroupTotal(group, rules);
assert(result.totalAttendees === 4, 'calculateGroupTotal: 4 asistentes');
assert(result.payingAttendees === 4, 'calculateGroupTotal: 4 pagan (ningún bebé exento)');
assert(result.grandTotal === 300000, 'calculateGroupTotal: 130000+50000+70000+50000=300000');
assert(result.afterLunchTotal === 120000, 'calculateGroupTotal: post-almuerzo total 70000+50000=120000');
assert(result.perPerson[0].category === 'Adulto', 'calculateGroupTotal: primero adulto');
assert(result.perPerson[1].category === 'Niño', 'calculateGroupTotal: segundo niño');
assert(result.perPerson[2].category === 'Adulto después del almuerzo', 'calculateGroupTotal: tercero adulto post-almuerzo');
assert(result.perPerson[3].category === 'Niño', 'calculateGroupTotal: cuarto niño aunque post-almuerzo');

// Grupo con bebé (menor de 2 años, no paga)
const groupWithBaby = [
  attendee({ id: '1', name: 'Ana', surname: 'García', age_at_event: 30 }),
  attendee({ id: '2', name: 'Leo', surname: 'García', age_at_event: 1 }), // bebé
];
const resultBaby = calculateGroupTotal(groupWithBaby, rules);
assert(resultBaby.totalAttendees === 2, 'calculateGroupTotal: 2 asistentes con bebé');
assert(resultBaby.payingAttendees === 1, 'calculateGroupTotal: solo 1 paga (bebé exento)');
assert(resultBaby.grandTotal === 130000, 'calculateGroupTotal: solo adulto paga 130000');

// --- isValidAge ---
assert(isValidAge(0) === true, 'isValidAge: 0 válido');
assert(isValidAge(120) === true, 'isValidAge: 120 válido');
assert(isValidAge(-1) === false, 'isValidAge: -1 inválido');
assert(isValidAge(121) === false, 'isValidAge: 121 inválido');
assert(isValidAge(25.5) === false, 'isValidAge: decimal inválido');

// --- ageFromBirthDate ---
assert(ageFromBirthDate('2000-01-01', '2027-09-26') === 27, 'ageFromBirthDate: 27 años en 2027');
assert(ageFromBirthDate('2020-06-01', '2027-09-26') === 7, 'ageFromBirthDate: 7 años');
assert(ageFromBirthDate('2025-01-01', '2027-09-26') === 2, 'ageFromBirthDate: 2 años');

console.log(`\nPruebas de precios: ${passed} pasadas, ${failed} fallidas`);
if (failed > 0) {
  console.error('Errores:', errors.join('\n'));
  (() => { throw new Error('Pruebas fallidas'); })();
}
