/**
 * Pruebas de validación de bloqueos (Etapa B del PROMPT MAESTRO 2).
 *
 * Verifican estáticamente las correcciones aplicadas a las migraciones 010 y 011,
 * así como las nuevas funciones de validación de invitación y Storage.
 *
 * Estas pruebas NO requieren PostgreSQL remoto. Verifican contenido de archivos SQL.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'supabase', 'migrations');

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

// Normalizar saltos de línea para búsquedas robustas
function normalize(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

console.log('Pruebas de validación de bloqueos (Etapa B)\n');

// ============================================================================
// 011: owner_set_admin_active - estado real anterior y nuevo
// ============================================================================
const m011 = normalize(readMigration('011'));

test('011: owner_set_admin_active registra estado anterior (previous_active)', () =>
  assertContains(m011, 'previous_active', 'previous_active en auditoría de owner_set_admin_active'));
test('011: owner_set_admin_active registra estado nuevo (active)', () =>
  assertContains(m011, "jsonb_build_object('active', p_active", 'active nuevo en auditoría'));
test('011: owner_set_admin_active bloquea desactivar último owner', () =>
  assertContains(m011, 'No se puede desactivar el último owner', 'bloqueo último owner'));
test('011: owner_set_admin_active requiere rol owner', () =>
  assertContains(m011, "Solo el owner puede activar/desactivar perfiles", 'requiere owner'));
test('011: owner_set_admin_active usa for update en admin_profiles', () =>
  assertContains(m011, 'from public.admin_profiles\n    where id = p_user_id\n    for update', 'for update en admin_profiles'));

// ============================================================================
// 011: admin_update_registration_details
// ============================================================================
test('011: admin_update_registration_details valida email duplicado', () =>
  assertContains(m011, 'Ya existe una inscripción con ese correo electrónico', 'validación email duplicado'));
test('011: admin_update_registration_details verifica asistentes activos al confirmar', () =>
  assertContains(m011, 'Una confirmación requiere al menos un asistente activo', 'verificación asistentes activos'));
test('011: admin_update_registration_details registra changed_fields', () =>
  assertContains(m011, 'changed_fields', 'registro de changed_fields'));
test('011: admin_update_registration_details usa for update', () =>
  assertContains(m011, 'from public.registrations\n   where id = p_id and deleted_at is null\n   for update', 'for update en registrations'));
test('011: admin_update_registration_details valida song_suggestion ≤ 200', () =>
  assertContains(m011, "length(btrim(p_song_suggestion)) > 200", 'validación longitud canción'));
test('011: admin_update_registration_details valida dietary_details ≤ 500', () =>
  assertContains(m011, "length(btrim(p_dietary_details)) > 500", 'validación longitud dietary_details'));
test('011: admin_update_registration_details valida dietary_restrictions', () =>
  assertContains(m011, 'public.dietary_restrictions_are_valid(p_dietary_restrictions)', 'validación restricciones alimentarias'));

// ============================================================================
// 011: admin_get_balance_summary - alineado con database.types.ts
// ============================================================================
test('011: admin_get_balance_summary incluye contact_name', () =>
  assertContains(m011, 'contact_name text,', 'campo contact_name'));
test('011: admin_get_balance_summary incluye contact_surname', () =>
  assertContains(m011, 'contact_surname text,', 'campo contact_surname'));
test('011: admin_get_balance_summary incluye email', () =>
  assertContains(m011, 'email text,', 'campo email'));
test('011: admin_get_balance_summary incluye balance_due', () =>
  assertContains(m011, 'balance_due numeric(12,2)', 'campo balance_due'));
test('011: admin_get_balance_summary incluye included_attendees', () =>
  assertContains(m011, 'included_attendees bigint', 'campo included_attendees'));
test('011: admin_get_balance_summary usa calculate_registration_balance', () =>
  assertContains(m011, 'public.calculate_registration_balance(r.id)', 'usa calculate_registration_balance'));
test('011: admin_get_balance_summary filtra deleted_at is null', () =>
  assertContains(m011, "where r.deleted_at is null and r.rsvp_status = 'confirmed'", 'filtro deleted_at y confirmed'));

// ============================================================================
// 011: admin_get_dashboard_summary - cálculo correcto de balances
// ============================================================================
test('011: admin_get_dashboard_summary usa calculate_registration_balance', () =>
  assertContains(m011, 'public.calculate_registration_balance(r.id)', 'usa calculate_registration_balance en dashboard'));
test('011: admin_get_dashboard_summary filtra rsvp_status confirmed', () =>
  assertContains(m011, "r.rsvp_status = 'confirmed'", 'filtro confirmed en dashboard'));
test('011: admin_get_dashboard_summary attendee_count con join registrations', () =>
  assertContains(m011, 'join public.registrations r on r.id = a.registration_id', 'join en attendee_count'));
test('011: admin_get_dashboard_summary balance_due suma por registro confirmado', () =>
  assertContains(m011, "where r.deleted_at is null and r.rsvp_status = 'confirmed'", 'balance por registro confirmado'));

// ============================================================================
// 010: save_invitation_draft - control de concurrencia y validación
// ============================================================================
const m010 = normalize(readMigration('010'));

test('010: save_invitation_draft tiene p_expected_updated_at', () =>
  assertContains(m010, 'p_expected_updated_at text default null', 'parámetro p_expected_updated_at'));
test('010: save_invitation_draft valida concurrencia (40001)', () =>
  assertContains(m010, "message = 'El borrador cambió desde que se cargó. Recargá el editor.'", 'control de concurrencia'));
test('010: save_invitation_draft valida invitation_content_is_safe', () =>
  assertContains(m010, 'public.invitation_content_is_safe(p_content)', 'valida contenido seguro'));
test('010: save_invitation_draft valida storage paths', () =>
  assertContains(m010, 'public.invitation_storage_paths_are_valid(p_content)', 'valida rutas de storage'));
test('010: save_invitation_draft valida objetos de storage existen', () =>
  assertContains(m010, 'public.invitation_storage_objects_exist(p_content)', 'valida existencia de objetos'));
test('010: save_invitation_draft usa for update en borrador', () =>
  assertContains(m010, 'where status = \'draft\'\n    for update', 'for update en borrador'));

// ============================================================================
// 010: publish_invitation_draft - control de concurrencia real
// ============================================================================
test('010: publish_invitation_draft tiene p_expected_updated_at', () =>
  assertContains(m010, 'p_expected_updated_at text default null', 'parámetro p_expected_updated_at en publish'));
test('010: publish_invitation_draft valida concurrencia (40001)', () =>
  assertContains(m010, "message = 'El borrador cambió desde que se cargó. Recargá el editor.'", 'concurrencia en publish'));
test('010: publish_invitation_draft usa advisory lock', () =>
  assertContains(m010, 'pg_advisory_xact_lock(724622)', 'advisory lock en publish'));
test('010: publish_invitation_draft requiere rol owner', () =>
  assertContains(m010, "Solo el owner puede publicar la invitación", 'requiere owner en publish'));

// ============================================================================
// 010: admin_restore_invitation_revision - control de concurrencia
// ============================================================================
test('010: admin_restore_invitation_revision tiene p_expected_updated_at', () =>
  assertContains(m010, 'p_expected_updated_at text default null', 'parámetro p_expected_updated_at en restore'));
test('010: admin_restore_invitation_revision solo archivadas', () =>
  assertContains(m010, "if v_status <> 'archived' then", 'solo archivadas'));
test('010: admin_restore_invitation_revision no borrador duplicado', () =>
  assertContains(m010, 'Ya existe un borrador activo', 'no borrador duplicado'));
test('010: admin_restore_invitation_revision valida concurrencia (40001)', () =>
  assertContains(m010, "message = 'La revisión cambió desde que se cargó. Recargá el editor.'", 'concurrencia en restore'));

// ============================================================================
// Nuevas funciones de validación de Storage e invitación
// ============================================================================
test('Nueva: invitation_storage_path_is_valid existe', () =>
  assertContains(m010, 'create or replace function public.invitation_storage_path_is_valid', 'función invitation_storage_path_is_valid'));
test('Nueva: invitation_storage_paths_are_valid existe', () =>
  assertContains(m010, 'create or replace function public.invitation_storage_paths_are_valid', 'función invitation_storage_paths_are_valid'));
test('Nueva: invitation_storage_objects_exist existe', () =>
  assertContains(m010, 'create or replace function public.invitation_storage_objects_exist', 'función invitation_storage_objects_exist'));
test('Nueva: invitation_storage_objects_exist consulta storage.objects', () =>
  assertContains(m010, "from storage.objects o\n             where o.bucket_id = 'invitation-assets'", 'consulta storage.objects'));

// ============================================================================
// No reproducir 009
// ============================================================================

test('Ninguna migración nueva (010, 011) reproduce funciones exclusivas de 009', () => {
  const m010Content = normalize(readMigration('010'));
  const m011Content = normalize(readMigration('011'));
  const funciones009Exclusivas = [
    'create or replace function public.invitation_asset_is_readable',
    'create or replace function public.invitation_content_objects_exist',
    'create or replace function public.invitation_content_references_path',
    'create table public.rsvp_rate_limit_requests',
    'add column reception_name',
    'add column ceremony_name',
  ];
  for (const fn of funciones009Exclusivas) {
    assertNotContains(m010Content, fn, `010 no reproduce: ${fn}`);
    assertNotContains(m011Content, fn, `011 no reproduce: ${fn}`);
  }
});

console.log(`\n${passed} pruebas aprobadas, ${failed} fallidas`);
process.exit(failed > 0 ? 1 : 0);
