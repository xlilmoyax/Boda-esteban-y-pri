/**
 * Pruebas unitarias para src/domain/pricing.ts
 * Cubren: clasificación por edad, post-almuerzo, límites de rango,
 * cálculo individual, cálculo de grupo, edades inválidas.
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
    category_id: 'adulto',
    label: 'Adulto',
    description: null,
    min_age: 13,
    max_age: null,
    price: 10000,
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
    category_id: null,
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

// Reglas base para pruebas
const rules: PriceRule[] = [
  rule({ category_id: 'bebe', label: 'Bebé', min_age: 0, max_age: 2, price: 0, applies_after_lunch: false }),
  rule({ category_id: 'nino', label: 'Niño', min_age: 3, max_age: 12, price: 5000, applies_after_lunch: false }),
  rule({ category_id: 'adulto', label: 'Adulto', min_age: 13, max_age: null, price: 10000, applies_after_lunch: false }),
  rule({
    category_id: 'post-almuerzo',
    label: 'Incorporación después del almuerzo',
    min_age: null,
    max_age: null,
    price: 7000,
    applies_after_lunch: true,
  }),
];

// --- classifyAttendee ---
assert(
  classifyAttendee(1, false, rules).categoryId === 'bebe',
  'classifyAttendee: 1 año = bebé'
);
assert(
  classifyAttendee(2, false, rules).categoryId === 'bebe',
  'classifyAttendee: 2 años = bebé (límite superior)'
);
assert(
  classifyAttendee(3, false, rules).categoryId === 'nino',
  'classifyAttendee: 3 años = niño (límite inferior)'
);
assert(
  classifyAttendee(12, false, rules).categoryId === 'nino',
  'classifyAttendee: 12 años = niño (límite superior)'
);
assert(
  classifyAttendee(13, false, rules).categoryId === 'adulto',
  'classifyAttendee: 13 años = adulto (límite inferior)'
);
assert(
  classifyAttendee(30, false, rules).categoryId === 'adulto',
  'classifyAttendee: 30 años = adulto'
);

// Post-almuerzo tiene prioridad sobre edad
assert(
  classifyAttendee(30, true, rules).categoryId === 'post-almuerzo',
  'classifyAttendee: adulto post-almuerzo = post-almuerzo'
);
assert(
  classifyAttendee(8, true, rules).categoryId === 'post-almuerzo',
  'classifyAttendee: niño post-almuerzo = post-almuerzo'
);
assert(
  classifyAttendee(1, true, rules).categoryId === 'post-almuerzo',
  'classifyAttendee: bebé post-almuerzo = post-almuerzo'
);

// --- calculateIndividualPrice ---
const ind = calculateIndividualPrice(attendee({ age_at_event: 30 }), rules);
assert(ind.categoryId === 'adulto', 'calculateIndividualPrice: adulto');
assert(ind.price === 10000, 'calculateIndividualPrice: precio adulto 10000');

const indChild = calculateIndividualPrice(attendee({ age_at_event: 8 }), rules);
assert(indChild.categoryId === 'nino', 'calculateIndividualPrice: niño');
assert(indChild.price === 5000, 'calculateIndividualPrice: precio niño 5000');

const indBaby = calculateIndividualPrice(attendee({ age_at_event: 1 }), rules);
assert(indBaby.categoryId === 'bebe', 'calculateIndividualPrice: bebé');
assert(indBaby.price === 0, 'calculateIndividualPrice: precio bebé 0 (exento)');

const indPost = calculateIndividualPrice(
  attendee({ age_at_event: 30, after_lunch: true }),
  rules
);
assert(indPost.categoryId === 'post-almuerzo', 'calculateIndividualPrice: post-almuerzo');
assert(indPost.price === 7000, 'calculateIndividualPrice: precio post-almuerzo 7000');

// --- calculateGroupTotal ---
const group = [
  attendee({ id: '1', name: 'Ana', surname: 'García', age_at_event: 30 }),
  attendee({ id: '2', name: 'Luis', surname: 'García', age_at_event: 8 }),
  attendee({ id: '3', name: 'Sofía', surname: 'García', age_at_event: 1, after_lunch: true }),
];
const result = calculateGroupTotal(group, rules);
assert(result.totalAttendees === 3, 'calculateGroupTotal: 3 asistentes');
// Post-almuerzo tiene prioridad sobre bebé, así que pagan 3 (10000+5000+7000)
assert(result.payingAttendees === 3, 'calculateGroupTotal: 3 pagan (post-almuerzo sobre bebé)');
assert(result.grandTotal === 22000, 'calculateGroupTotal: 10000+5000+7000=22000');
assert(result.afterLunchTotal === 7000, 'calculateGroupTotal: post-almuerzo total 7000');
assert(result.perPerson[0].category === 'Adulto', 'calculateGroupTotal: primero adulto');
assert(result.perPerson[1].category === 'Niño', 'calculateGroupTotal: segundo niño');
assert(result.perPerson[2].category === 'Incorporación después del almuerzo', 'calculateGroupTotal: tercero post-almuerzo');

// --- isValidAge ---
assert(isValidAge(0) === true, 'isValidAge: 0 válido');
assert(isValidAge(120) === true, 'isValidAge: 120 válido');
assert(isValidAge(-1) === false, 'isValidAge: -1 inválido');
assert(isValidAge(121) === false, 'isValidAge: 121 inválido');
assert(isValidAge(25.5) === false, 'isValidAge: decimal inválido');

// --- ageFromBirthDate ---
assert(ageFromBirthDate('2000-01-01', '2026-12-20') === 26, 'ageFromBirthDate: 26 años');
assert(ageFromBirthDate('2020-06-01', '2026-12-20') === 6, 'ageFromBirthDate: 6 años (cumple después)');
assert(ageFromBirthDate('2020-12-20', '2026-12-20') === 6, 'ageFromBirthDate: 6 años (cumple ese día)');

console.log(`\nPruebas de precios: ${passed} pasadas, ${failed} fallidas`);
if (failed > 0) {
  console.error('Errores:', errors.join('\n'));
  // eslint-disable-next-line no-process-exit
  (() => { throw new Error('Pruebas fallidas'); })();
}
