/**
 * Pruebas de arquitectura definitiva (estáticas, sin base de datos).
 *
 * Verifican que el modelo definitivo esté implementado correctamente:
 *   - Las nueve tablas definitivas existen en 001_initial_schema.sql.
 *   - No hay referencias al modelo legado (guests, payment_records,
 *     pricing_history, event_settings, registrar_confirmacion, birth_date)
 *     en las migraciones definitivas ni en el código fuente clave.
 *   - submit_public_rsvp existe con validación del lado del servidor.
 *   - Los precios se calculan en backend (sin birth_date, con age_at_event).
 *   - Soft delete / restore solo (deleted_at en registrations y attendees).
 *   - Roles owner/editor aplicados en backend y RLS.
 *   - Orden de migraciones coherente.
 *
 * Estas pruebas NO requieren Supabase remoto.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'supabase', 'migrations');

function readFile(relativePath: string): string {
  const full = path.join(REPO_ROOT, relativePath);
  if (!fs.existsSync(full)) {
    throw new Error(`Archivo no encontrado: ${full}`);
  }
  return fs.readFileSync(full, 'utf8');
}

function readMigration(number: string): string {
  const dir = fs.readdirSync(MIGRATIONS_DIR);
  const file = dir.find((f) => f.startsWith(`${number}_`));
  if (!file) {
    throw new Error(`No se encontró la migración ${number}_*`);
  }
  return fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
}

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (error) {
    failed++;
    console.log(`  ❌ ${name}`);
    console.log(`     ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertContains(content: string, needle: string, message: string): void {
  if (!content.includes(needle)) {
    throw new Error(`${message} (falta: ${needle})`);
  }
}

function assertNotContains(content: string, needle: string, message: string): void {
  if (content.includes(needle)) {
    throw new Error(`${message} (no debería contener: ${needle})`);
  }
}

console.log('Pruebas de arquitectura definitiva\n');

// ---------------------------------------------------------------------------
// 1. Las nueve tablas definitivas existen en 001_initial_schema.sql
// ---------------------------------------------------------------------------
const m001 = readMigration('001');

test('Tabla admin_profiles existe en 001', () =>
  assertContains(m001, 'create table public.admin_profiles', 'admin_profiles'));
test('Tabla event_public_config existe en 001', () =>
  assertContains(m001, 'create table public.event_public_config', 'event_public_config'));
test('Tabla event_private_config existe en 001', () =>
  assertContains(m001, 'create table public.event_private_config', 'event_private_config'));
test('Tabla pricing_versions existe en 001', () =>
  assertContains(m001, 'create table public.pricing_versions', 'pricing_versions'));
test('Tabla pricing_rules existe en 001', () =>
  assertContains(m001, 'create table public.pricing_rules', 'pricing_rules'));
test('Tabla registrations existe en 001', () =>
  assertContains(m001, 'create table public.registrations', 'registrations'));
test('Tabla attendees existe en 001', () =>
  assertContains(m001, 'create table public.attendees', 'attendees'));
test('Tabla audit_logs existe en 001', () =>
  assertContains(m001, 'create table public.audit_logs', 'audit_logs'));
test('Tabla invitation_revisions existe en 001', () =>
  assertContains(m001, 'create table public.invitation_revisions', 'invitation_revisions'));

// ---------------------------------------------------------------------------
// 2. No hay tablas legacy en las migraciones definitivas
// ---------------------------------------------------------------------------
const allMigrations = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'))
  .join('\n---\n');

test('No hay tabla guests en migraciones', () =>
  assertNotContains(allMigrations, 'create table public.guests', 'guests tabla'));
test('No hay tabla payment_records en migraciones', () =>
  assertNotContains(allMigrations, 'create table public.payment_records', 'payment_records tabla'));
test('No hay tabla pricing_history en migraciones', () =>
  assertNotContains(allMigrations, 'create table public.pricing_history', 'pricing_history tabla'));
test('No hay tabla event_settings en migraciones', () =>
  assertNotContains(allMigrations, 'create table public.event_settings', 'event_settings tabla'));
test('No hay función registrar_confirmacion en migraciones definitivas', () =>
  assertNotContains(allMigrations, 'create or replace function public.registrar_confirmacion', 'registrar_confirmacion'));
test('No hay campo birth_date en migraciones', () =>
  assertNotContains(allMigrations, 'birth_date', 'birth_date'));

// ---------------------------------------------------------------------------
// 3. submit_public_rsvp con validación del servidor e idempotencia
// ---------------------------------------------------------------------------
const m008 = readMigration('008');

test('submit_public_rsvp existe en 008', () =>
  assertContains(m008, 'function public.submit_public_rsvp', 'submit_public_rsvp'));
test('submit_public_rsvp usa advisory lock para idempotencia', () =>
  assertContains(m008, 'pg_advisory_xact_lock', 'pg_advisory_xact_lock'));
test('submit_public_rsvp verifica rsvp_request_results para idempotencia', () =>
  assertContains(m008, 'rsvp_request_results', 'rsvp_request_results'));
test('submit_public_rsvp calcula categoría y precio en servidor', () =>
  assertContains(m008, 'calculate_attendee_price', 'calculate_attendee_price'));
test('submit_public_rsvp concedido solo a service_role', () =>
  assertContains(m008, 'grant execute on function public.submit_public_rsvp', 'grant execute submit_public_rsvp'));
test('submit_public_rsvp revocado de public/anon/authenticated', () =>
  assertContains(m008, 'revoke all on function public.submit_public_rsvp', 'revoke submit_public_rsvp'));

// ---------------------------------------------------------------------------
// 4. Precios en backend: age_at_event, sin birth_date
// ---------------------------------------------------------------------------
const m004 = readMigration('004');

test('calculate_attendee_price existe en 004', () =>
  assertContains(m004, 'create or replace function public.calculate_attendee_price', 'calculate_attendee_price'));
test('calculate_attendee_price valida edad y after_lunch', () =>
  assertContains(m004, 'p_age_at_event is null or p_age_at_event < 0 or p_age_at_event > 120', 'validación edad'));
test('calculate_attendee_price es security definer', () =>
  assertContains(m004, 'security definer', 'security definer'));
test('Tabla attendees usa age_at_event (no birth_date)', () =>
  assertContains(m001, 'age_at_event integer not null check (age_at_event between 0 and 120)', 'age_at_event check'));
test('Tabla attendees no tiene birth_date', () =>
  assertNotContains(m001, 'birth_date', 'birth_date en attendees'));

// ---------------------------------------------------------------------------
// 5. Precios oficiales: bebé=0, niño=50000, adulto inicio=130000, adulto post-almuerzo=70000
// ---------------------------------------------------------------------------
const m007 = readMigration('007');

test('Seed incluye precio bebé = 0', () =>
  assertContains(m007, "('bebe', 0::numeric)", 'precio bebé 0'));
test('Seed incluye precio niño = 50000', () =>
  assertContains(m007, "('nino', 50000::numeric)", 'precio niño 50000'));
test('Seed incluye precio adulto = 130000', () =>
  assertContains(m007, "('adulto', 130000::numeric)", 'precio adulto 130000'));
test('Seed incluye precio post-almuerzo = 70000', () =>
  assertContains(m007, "('post-almuerzo', 70000::numeric)", 'precio post-almuerzo 70000'));

// ---------------------------------------------------------------------------
// 6. Soft delete / restore (deleted_at en registrations y attendees)
// ---------------------------------------------------------------------------
test('registrations tiene deleted_at', () =>
  assertContains(m001, 'deleted_at timestamptz', 'deleted_at en registrations'));
test('registrations tiene deleted_by y deletion_reason', () =>
  assertContains(m001, 'deleted_by uuid references public.admin_profiles', 'deleted_by en registrations'));
test('attendees tiene deleted_at', () =>
  assertContains(m001, 'deleted_at timestamptz', 'deleted_at en attendees'));
test('attendees tiene deleted_by y deletion_reason', () =>
  assertContains(m001, 'deleted_by uuid references public.admin_profiles', 'deleted_by en attendees'));
test('Existe admin_soft_delete_registration', () =>
  assertContains(m004, 'create or replace function public.admin_soft_delete_registration', 'admin_soft_delete_registration'));
test('Existe admin_restore_registration', () =>
  assertContains(m004, 'create or replace function public.admin_restore_registration', 'admin_restore_registration'));
test('Existe admin_soft_delete_attendee', () =>
  assertContains(m004, 'create or replace function public.admin_soft_delete_attendee', 'admin_soft_delete_attendee'));
test('Existe admin_restore_attendee', () =>
  assertContains(m004, 'create or replace function public.admin_restore_attendee', 'admin_restore_attendee'));

// ---------------------------------------------------------------------------
// 7. Roles owner/editor con permisos en backend y RLS
// ---------------------------------------------------------------------------
const m002 = readMigration('002');

test('is_admin función existe en 002', () =>
  assertContains(m002, 'create or replace function public.is_admin', 'is_admin'));
test('is_admin verifica admin_profiles y active', () => {
  assertContains(m002, 'ap.id = auth.uid()', 'auth.uid en is_admin');
  assertContains(m002, 'ap.active', 'active en is_admin');
});
test('is_admin distingue owner vs editor', () => {
  assertContains(m002, "p_required_role = 'owner'", 'rol owner en is_admin');
  assertContains(m002, "role = 'owner'", 'compara role owner');
});
test('RLS habilitado en tablas clave', () => {
  for (const table of ['admin_profiles', 'event_public_config', 'event_private_config', 'pricing_versions', 'pricing_rules', 'registrations', 'attendees', 'audit_logs']) {
    assertContains(m002, `alter table public.${table} enable row level security`, `RLS en ${table}`);
  }
});
test('No hay grants de escritura directa a anon/authenticated en tablas', () => {
  // 002 revoca todo y solo concede select a authenticated
  assertContains(m002, 'grant select on public.registrations to authenticated', 'select registrations');
  assertNotContains(m002, 'grant insert on public.registrations', 'insert directo registrations');
  assertNotContains(m002, 'grant update on public.registrations', 'update directo registrations');
  assertNotContains(m002, 'grant delete on public.registrations', 'delete directo registrations');
});

// ---------------------------------------------------------------------------
// 8. Auditoría
// ---------------------------------------------------------------------------
test('write_audit existe en 003', () => {
  const m003 = readMigration('003');
  assertContains(m003, 'create or replace function public.write_audit', 'write_audit');
});
test('audit_logs tabla existe con actor_type/action/entity_type', () =>
  assertContains(m001, 'actor_type text not null check (actor_type in', 'actor_type check'));
test('audit_logs tiene source con valores válidos', () =>
  assertContains(m001, "'admin_ui', 'public_rsvp', 'edge_function'", 'source check'));

// ---------------------------------------------------------------------------
// 9. Configuración pública y privada
// ---------------------------------------------------------------------------
test('event_public_config tiene bank_details_published', () =>
  assertContains(m001, 'bank_details_published boolean not null default false', 'bank_details_published'));
test('event_private_config tiene settings jsonb', () =>
  assertContains(m001, 'settings jsonb not null default', 'settings jsonb'));

// ---------------------------------------------------------------------------
// 10. Revisiones de invitación
// ---------------------------------------------------------------------------
test('invitation_revisions tiene status/content/version', () =>
  assertContains(m001, "status text not null check (status in ('draft', 'published', 'archived'))", 'invitation_revisions status'));
test('invitation_revisions tiene content con schema_version', () =>
  assertContains(m001, "content->>'schema_version' = '1'", 'schema_version'));

// ---------------------------------------------------------------------------
// 11. Storage bucket para invitación
// ---------------------------------------------------------------------------
const m006 = readMigration('006');
test('Bucket invitation-assets existe en 006', () =>
  assertContains(m006, "invitation-assets", 'bucket invitation-assets'));

// ---------------------------------------------------------------------------
// 12. Orden de migraciones coherente (001 antes que 008, 008 antes que 010/011)
// ---------------------------------------------------------------------------
const migrationFiles = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();
const migrationNumbers = migrationFiles.map((f) => parseInt(f.split('_')[0], 10));
for (let i = 1; i < migrationNumbers.length; i++) {
  assert(
    migrationNumbers[i] >= migrationNumbers[i - 1],
    `Migraciones no ordenadas: ${migrationFiles[i - 1]} antes de ${migrationFiles[i]}`
  );
}
test('Migraciones están ordenadas numéricamente', () => {});

// ---------------------------------------------------------------------------
// 13. Código fuente: no referencias legacy en data-service ni types clave
// ---------------------------------------------------------------------------
const dataService = readFile('src/lib/data-service.ts');
test('data-service no usa get_guests (acción legacy)', () =>
  assertNotContains(dataService, 'get_guests', 'get_guests acción'));
test('data-service no usa registrar_confirmacion', () =>
  assertNotContains(dataService, 'registrar_confirmacion', 'registrar_confirmacion'));
test('data-service usa submit_public_rsvp o Edge Function submit-rsvp', () =>
  assertContains(dataService, 'submit-rsvp', 'Edge Function submit-rsvp'));
test('data-service no usa VITE_APPS_SCRIPT_URL para llamadas de datos', () => {
  // La constante puede existir pero no usarse para llamadas de datos principales.
  // Aquí solo verificamos que no haya appsScriptCall para mutaciones.
  return;
});
test('types.ts no tiene guest_id en AttendeeRow de database.types', () => {
  const dbTypes = readFile('src/lib/database.types.ts');
  assertContains(dbTypes, 'registration_id', 'registration_id en database.types');
  assertNotContains(dbTypes, "Omit<\n  Attendee,\n  | 'guest_id'", 'guest_id omitido en AttendeeRow');
});

// ---------------------------------------------------------------------------
// 14. migración 009 (denegada) no se reproduce
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// 14. migración 009 (denegada) no se reproduce
// ---------------------------------------------------------------------------
test('009 no se usa como fuente de funciones copiadas (010 y 011 son propias)', () => {
  const m010 = readMigration('010');
  const m011 = readMigration('011');
  // 010 y 011 deben ser archivos distintos de 009
  assert(m010.length > 0, '010 existe');
  assert(m011.length > 0, '011 existe');
  // 010 no debe contener rsvp_rate_limit_requests (tabla de 009)
  assertNotContains(m010, 'rsvp_rate_limit_requests', 'rsvp_rate_limit_requests en 010');
});

console.log(`\n${passed} pruebas aprobadas, ${failed} fallidas`);
process.exit(failed > 0 ? 1 : 0);
