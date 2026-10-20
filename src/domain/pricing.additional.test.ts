/**
 * Pruebas adicionales para funciones de utilidad del dominio.
 * Cubren: cálculo de importe por categoría, validación de snapshots,
 * conservación de importes históricos.
 */

import {
  calculateIndividualPrice,
  calculateGroupTotal,
  classifyAttendee,
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

// Reglas confirmadas del evento
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

// --- Prueba: adulto desde el comienzo = $130.000 ---
const adultStart = calculateIndividualPrice(attendee({ age_at_event: 30, after_lunch: false }), rules);
assert(adultStart.categoryId === 'adulto', 'adulto desde comienzo: categoría adulto');
assert(adultStart.price === 130000, 'adulto desde comienzo: $130.000');

// --- Prueba: niño 2 a 10 años = $50.000 cualquier horario ---
const childStart = calculateIndividualPrice(attendee({ age_at_event: 5, after_lunch: false }), rules);
assert(childStart.categoryId === 'nino', 'niño desde comienzo: categoría niño');
assert(childStart.price === 50000, 'niño desde comienzo: $50.000');

const childPost = calculateIndividualPrice(attendee({ age_at_event: 7, after_lunch: true }), rules);
assert(childPost.categoryId === 'nino', 'niño post-almuerzo: categoría niño (no post-almuerzo)');
assert(childPost.price === 50000, 'niño post-almuerzo: $50.000 (mismo precio)');

// --- Prueba: adulto después del almuerzo = $70.000 ---
const adultPost = calculateIndividualPrice(attendee({ age_at_event: 35, after_lunch: true }), rules);
assert(adultPost.categoryId === 'post-almuerzo', 'adulto post-almuerzo: categoría post-almuerzo');
assert(adultPost.price === 70000, 'adulto post-almuerzo: $70.000');

// --- Prueba: grupo mixto suma correcta ---
const mixedGroup = [
  attendee({ id: '1', name: 'Ana', surname: 'García', age_at_event: 30 }),
  attendee({ id: '2', name: 'Luis', surname: 'García', age_at_event: 8 }),
  attendee({ id: '3', name: 'Sofía', surname: 'García', age_at_event: 35, after_lunch: true }),
  attendee({ id: '4', name: 'Martín', surname: 'García', age_at_event: 10, after_lunch: true }),
];
const mixedResult = calculateGroupTotal(mixedGroup, rules);
assert(mixedResult.totalAttendees === 4, 'grupo mixto: 4 asistentes');
assert(mixedResult.payingAttendees === 4, 'grupo mixto: 4 pagan');
assert(mixedResult.grandTotal === 300000, 'grupo mixto: 130000+50000+70000+50000=300000');
assert(mixedResult.afterLunchTotal === 120000, 'grupo mixto: post-almuerzo total 120000');

// --- Prueba: menor de 2 años sin categoría, precio 0 ---
const baby = calculateIndividualPrice(attendee({ age_at_event: 1 }), rules);
assert(baby.categoryId === null, 'menor de 2: sin categoría definida');
assert(baby.price === 0, 'menor de 2: precio 0');

// --- Prueba: límite de edad niño (2 y 10) ---
assert(classifyAttendee(2, false, rules).categoryId === 'nino', 'límite niño inferior: 2 = niño');
assert(classifyAttendee(10, false, rules).categoryId === 'nino', 'límite niño superior: 10 = niño');
assert(classifyAttendee(11, false, rules).categoryId === 'adulto', 'límite adulto inferior: 11 = adulto');
assert(classifyAttendee(8, true, rules).categoryId === 'nino', 'niño post-almuerzo: solo una categoría (niño)');

// --- Prueba: límite adulto (11) ---
assert(classifyAttendee(11, false, rules).categoryId === 'adulto', 'límite adulto inferior: 11 = adulto');

// --- Prueba: conservación de precio aplicado (snapshot) ---
// El precio aplicado en attendees se guarda al crear y no cambia al modificar reglas
const snapshotAttendee = attendee({
  id: 'snap1',
  age_at_event: 30,
  price_applied: 130000,
  category: 'adulto',
});
assert(snapshotAttendee.price_applied === 130000, 'snapshot: precio aplicado conservado en attendee');

// --- Prueba: clasificación no asigna dos categorías ---
const single = classifyAttendee(8, true, rules);
assert(single.categoryId === 'nino', 'niño post-almuerzo: solo una categoría (niño)');

console.log(`\nPruebas adicionales: ${passed} pasadas, ${failed} fallidas`);
if (failed > 0) {
  console.error('Errores:', errors.join('\n'));
  (() => { throw new Error('Pruebas fallidas'); })();
}
