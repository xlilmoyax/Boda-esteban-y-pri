/**
 * Capa de acceso a datos — Arquitectura definitiva (Supabase).
 *
 * Todas las operaciones pasan por el cliente de Supabase
 * (src/lib/supabaseClient.ts) o, en el caso del RSVP público, por la Edge
 * Function `submit-rsvp` que protege la RPC `submit_public_rsvp` con
 * service_role.
 *
 * No hay llamadas a Google Apps Script. Las funciones mantienen los mismos
 * nombres e interfaces que consumen los componentes, pero el backend es
 * ahora el modelo definitivo:
 *   registrations, attendees, pricing_versions, pricing_rules,
 *   admin_profiles, audit_logs, event_public_config, event_private_config,
 *   invitation_revisions
 *
 * Las tablas legacy (guests, payment_records, pricing_history, event_settings)
 * y la función de confirmación del modelo legado NO se usan.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from './database.types';
import type {
  Attendee,
  Guest,
  PriceRule,
  PriceCategoryId,
  AdminProfile,
  AuditLog,
} from '../types';
import type { InvitationContent } from '../domain/invitation-content';
import { isInvitationContent } from '../domain/invitation-content';
import { calculateGroupTotal } from '../domain/pricing';
import type { PublicEventConfig } from '../domain/event-config';
import { resolvePublicEventConfig } from '../domain/event-config';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase no está configurado. Definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local.'
  );
}

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : null;

function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(message);
  }
  return value as Record<string, unknown>;
}

function mapPricingRules(value: unknown): PriceRule[] {
  const prices = requireRecord(value, 'La respuesta pública de tarifas no es válida.');
  const definitions: Array<{
    category: PriceCategoryId;
    label: string;
    min_age: number;
    max_age: number | null;
  }> = [
    { category: 'adulto', label: 'Adulto desde el comienzo', min_age: 11, max_age: null },
    { category: 'nino', label: 'Niño', min_age: 2, max_age: 10 },
    { category: 'bebe', label: 'Bebé', min_age: 0, max_age: 1 },
    { category: 'post-almuerzo', label: 'Adulto después del almuerzo', min_age: 11, max_age: null },
  ];
  return definitions.map((item) => {
    const price = prices[item.category];
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
      throw new Error(`Falta una tarifa válida para ${item.category}.`);
    }
    return {
      id: item.category,
      category: item.category,
      label: item.label,
      description: null,
      min_age: item.min_age,
      max_age: item.max_age,
      price,
      currency: 'ARS',
      applies_after_lunch: item.category === 'post-almuerzo',
      active: true,
      created_at: '',
      updated_at: '',
    };
  });
}

export interface PublicInvitationSnapshot {
  eventConfig: PublicEventConfig;
  pricingRules: PriceRule[];
  invitationContent: InvitationContent | null;
}

export interface RegistrationBalance {
  registration_id: string;
  contact_name: string;
  contact_surname: string;
  email: string;
  balance_due: number;
  included_attendees: number;
}

export interface AdminDashboardSummary {
  family_count: number;
  confirmed_family_count: number;
  attendee_count: number;
  balance_due: number;
}

function mapRegistrationRow(row: Database['public']['Tables']['registrations']['Row']): Guest {
  return {
    id: row.id,
    name: row.contact_name,
    surname: row.contact_surname,
    phone: row.phone ?? '',
    email: row.email,
    attending: row.rsvp_status === 'confirmed',
    song_suggestion: row.song_suggestion ?? null,
    dietary_restrictions: row.dietary_restrictions ?? [],
    dietary_details: row.dietary_details ?? null,
    observations: row.observations ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at ?? undefined,
  };
}

function mapAttendeeRow(
  row: Database['public']['Tables']['attendees']['Row']
): Attendee {
  return {
    id: row.id,
    guest_id: row.registration_id,
    name: row.name,
    surname: row.surname,
    birth_date: null,
    age_at_event: row.age_at_event,
    category: row.category as PriceCategoryId,
    price_applied: Number(row.price_applied),
    after_lunch: row.after_lunch,
    attending: row.attending,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at ?? undefined,
  };
}

export async function getPublicInvitation(): Promise<PublicInvitationSnapshot> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('get_public_invitation');
  if (error) throw new Error(error.message ?? 'No se pudo cargar la invitación pública.');
  const value = requireRecord(data, 'La respuesta pública no es válida.');
  const event = requireRecord(value.event, 'La configuración pública del evento no es válida.');
  const invitation = value.invitation;
  if (invitation !== null && invitation !== undefined && !isInvitationContent(invitation)) {
    throw new Error('El contenido público de la invitación no es válido.');
  }
  return {
    eventConfig: resolvePublicEventConfig(event),
    pricingRules: mapPricingRules(value.pricing),
    invitationContent: (invitation ?? null) as InvitationContent | null,
  };
}

export async function getPricingRules(): Promise<PriceRule[]> {
  return (await getPublicInvitation()).pricingRules;
}

export async function getAllPricingRules(): Promise<PriceRule[]> {
  return getPricingRules();
}

export async function getAdminEventConfig(): Promise<{
  config: PublicEventConfig;
  bankDetailsPublished: boolean;
  canManageBankDetails: boolean;
  bankFields: { alias: string; holder: string; bank: string };
}> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('admin_get_event_config');
  if (error) throw new Error(error.message ?? 'No se pudo cargar la configuración del evento.');
  const value = requireRecord(data, 'La configuración del evento no es válida.');
  const config = requireRecord(value.config, 'La configuración pública del evento no es válida.');
  const bankFields = requireRecord(value.bankFields, 'Los datos bancarios no son válidos.');
  return {
    config: resolvePublicEventConfig({
      ...config,
      bank_details: value.bankDetailsPublished
        ? { alias: bankFields.alias, holder: bankFields.holder, bank: bankFields.bank }
        : null,
    }),
    bankDetailsPublished: value.bankDetailsPublished === true,
    canManageBankDetails: value.canManageBankDetails === true,
    bankFields: {
      alias: typeof bankFields.alias === 'string' ? bankFields.alias : '',
      holder: typeof bankFields.holder === 'string' ? bankFields.holder : '',
      bank: typeof bankFields.bank === 'string' ? bankFields.bank : '',
    },
  };
}

export async function updateEventPublicConfig(patch: Record<string, unknown>): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('admin_update_event_public_config', {
    p_patch: patch as unknown as Json,
  });
  if (error) throw new Error(error.message ?? 'No se pudo actualizar la configuración pública.');
}

export async function ownerPublishPricingVersion(
  rules: Array<{ category: string; price: number }>,
  reason: string,
): Promise<number> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('owner_publish_pricing_version', {
    p_rules: rules as unknown as Json,
    p_reason: reason,
  });
  if (error) throw new Error(error.message ?? 'No se pudo publicar la versión tarifaria.');
  if (!Number.isInteger(data) || data < 1) {
    throw new Error('El servicio no confirmó una versión tarifaria.');
  }
  return data;
}

export async function getCurrentAdminProfile(): Promise<AdminProfile | null> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('get_current_admin_profile');
  if (error) throw new Error(error.message ?? 'No se pudo obtener el perfil de administrador.');
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) return null;
  const row = rows[0];
  if (
    typeof row.id !== 'string' ||
    typeof row.email !== 'string' ||
    (row.role !== 'owner' && row.role !== 'editor')
  ) {
    throw new Error('El perfil administrativo recibido no es válido.');
  }
  return { id: row.id, email: row.email, role: row.role };
}

export async function authenticateAdmin(email: string, password: string): Promise<AdminProfile> {
  if (!email || !email.includes('@')) {
    throw new Error('Ingresá un correo electrónico válido.');
  }
  if (!password) {
    throw new Error('Ingresá tu contraseña.');
  }
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(error.message ?? 'Credenciales inválidas.');
  const profile = await getCurrentAdminProfile();
  if (!profile) {
    await client.auth.signOut();
    throw new Error('Esta cuenta no está habilitada como administradora.');
  }
  return profile;
}

export async function signOutAdmin(): Promise<void> {
  const client = requireSupabase();
  await client.auth.signOut();
}

export async function getAdminProfiles(): Promise<AdminProfile[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('admin_profiles')
    .select('id, email, role, active, created_at, updated_at')
    .eq('active', true)
    .order('created_at');
  if (error) throw new Error(error.message ?? 'No se pudieron cargar los perfiles.');
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function setAdminRole(userId: string, role: 'owner' | 'editor'): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('owner_set_admin_role', {
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw new Error(error.message ?? 'No se pudo establecer el rol.');
}

export async function setAdminActive(userId: string, active: boolean): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('owner_set_admin_active', {
    p_user_id: userId,
    p_active: active,
  });
  if (error) throw new Error(error.message ?? 'No se pudo actualizar el estado del perfil.');
}

export async function getDashboardSummary(): Promise<AdminDashboardSummary> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('admin_get_dashboard_summary');
  if (error) throw new Error(error.message ?? 'No se pudo cargar el resumen del panel.');
  const value = requireRecord(data, 'El resumen del panel no es válido.');
  return {
    family_count: Number(value.family_count ?? 0),
    confirmed_family_count: Number(value.confirmed_family_count ?? 0),
    attendee_count: Number(value.attendee_count ?? 0),
    balance_due: Number(value.balance_due ?? 0),
  };
}

export async function getBalanceSummary(): Promise<RegistrationBalance[]> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('admin_get_balance_summary');
  if (error) throw new Error(error.message ?? 'No se pudo cargar el resumen de saldos.');
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => ({
    registration_id: row.registration_id,
    contact_name: row.contact_name,
    contact_surname: row.contact_surname,
    email: row.email,
    balance_due: Number(row.balance_due ?? 0),
    included_attendees: Number(row.included_attendees ?? 0),
  }));
}

export async function getAuditLogs(limit = 50): Promise<AuditLog[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message ?? 'No se pudieron cargar los registros de auditoría.');
  return (data ?? []).map((row) => ({
    id: row.id,
    actor_type: row.actor_type,
    actor_id: row.actor_id ?? null,
    action: row.action,
    entity_type: row.entity_type,
    record_id: row.record_id ?? null,
    entity_key: row.entity_key ?? null,
    request_id: row.request_id ?? null,
    source: row.source,
    old_data: row.old_data ?? null,
    new_data: row.new_data ?? null,
    created_at: row.created_at,
  }));
}

/* ------------------------------------------------------------------ */
/* Inscripciones (registrations) – reemplaza el modelo legacy guests   */
/* ------------------------------------------------------------------ */

export interface GuestFilters {
  search?: string;
  attending?: boolean | null;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export async function getGuests(filters: GuestFilters = {}): Promise<{
  guests: Guest[];
  count: number;
}> {
  const client = requireSupabase();
  let query = client
    .from('registrations')
    .select('*, attendees(*, deleted_at)', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (filters.includeDeleted !== true) {
    query = query.is('deleted_at', null);
  }
  if (filters.attending !== undefined) {
    query = query.eq('rsvp_status', filters.attending ? 'confirmed' : 'declined');
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `contact_name.ilike.${term},contact_surname.ilike.${term},email.ilike.${term}`
    );
  }
  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message ?? 'No se pudieron cargar las inscripciones.');
  const rows = (data ?? []) as Database['public']['Tables']['registrations']['Row'][];
  return {
    guests: rows.map(mapRegistrationRow),
    count: count ?? 0,
  };
}

export async function getAllGuests(filters: Omit<GuestFilters, 'limit' | 'offset'> = {}): Promise<Guest[]> {
  const guests: Guest[] = [];
  let offset = 0;
  let count = 0;
  const pageSize = 500;
  do {
    const page = await getGuests({ ...filters, limit: pageSize, offset });
    guests.push(...page.guests);
    count = page.count;
    offset += page.guests.length;
    if (page.guests.length === 0) break;
  } while (offset < count);
  return guests;
}

export async function getGuestById(id: string): Promise<Guest | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('registrations')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (error) return null;
  return mapRegistrationRow(data as Database['public']['Tables']['registrations']['Row']);
}

export async function createGuest(
  data: Omit<Guest, 'id' | 'created_at' | 'updated_at'>
): Promise<Guest> {
  const client = requireSupabase();
  const { data: inserted, error } = await client.rpc('admin_create_registration', {
    p_contact_name: data.name,
    p_contact_surname: data.surname,
    p_email: data.email ?? '',
    p_phone: data.phone || null,
    p_rsvp_status: data.attending ? 'confirmed' : 'pending',
    p_attendees: (data.attendees ?? []).map((a) => ({
      name: a.name,
      surname: a.surname,
      age_at_event: a.age_at_event ?? 0,
      after_lunch: a.after_lunch ?? false,
      attending: a.attending ?? true,
    })),
    p_observations: data.observations || null,
  });
  if (error) throw new Error(error.message ?? 'No se pudo crear la inscripción.');
  const row = requireRecord(inserted, 'La respuesta de creación no es válida.');
  const registrationId = String(row.registration_id ?? '');
  if (!registrationId) {
    throw new Error('No se pudo crear la inscripción.');
  }
  const { data: reg, error: regError } = await client
    .from('registrations')
    .select('*')
    .eq('id', registrationId)
    .single();
  if (regError) throw new Error(regError.message ?? 'No se pudo leer la inscripción creada.');
  return mapRegistrationRow(reg as Database['public']['Tables']['registrations']['Row']);
}

export async function updateGuest(id: string, updates: Partial<Guest>): Promise<Guest> {
  const client = requireSupabase();
  const { error } = await client.rpc('admin_update_registration_details', {
    p_id: id,
    p_contact_name: updates.name ?? '',
    p_contact_surname: updates.surname ?? '',
    p_email: updates.email ?? '',
    p_phone: updates.phone ?? null,
    p_observations: updates.observations ?? null,
    p_rsvp_status: updates.attending !== undefined ? (updates.attending ? 'confirmed' : 'declined') : 'pending',
    p_song_suggestion: updates.song_suggestion ?? null,
    p_dietary_restrictions: updates.dietary_restrictions ?? [],
    p_dietary_details: updates.dietary_details ?? null,
  });
  if (error) throw new Error(error.message ?? 'No se pudo actualizar la inscripción.');
  return getGuestById(id).then((g) => {
    if (!g) throw new Error('Inscripción no encontrada tras actualizar.');
    return g;
  });
}

export async function deleteGuest(id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('admin_soft_delete_registration', {
    p_id: id,
    p_reason: 'Eliminado desde el panel de administración.',
  });
  if (error) throw new Error(error.message ?? 'No se pudo eliminar la inscripción.');
}

export async function restoreGuest(id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('admin_restore_registration', { p_id: id });
  if (error) throw new Error(error.message ?? 'No se pudo restaurar la inscripción.');
}

/* ------------------------------------------------------------------ */
/* Asistentes (attendees)                                             */
/* ------------------------------------------------------------------ */

export async function getAttendeesByGuest(guestId: string, includeDeleted = false): Promise<Attendee[]> {
  const client = requireSupabase();
  let query = client
    .from('attendees')
    .select('*')
    .eq('registration_id', guestId);
  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }
  const { data, error } = await query.order('created_at');
  if (error) throw new Error(error.message ?? 'No se pudieron cargar los asistentes.');
  return (data ?? []).map(mapAttendeeRow);
}

export async function createAttendee(
  data: Omit<Attendee, 'id' | 'created_at' | 'updated_at'>
): Promise<Attendee> {
  const client = requireSupabase();
  const { data: inserted, error } = await client.rpc('admin_add_attendee', {
    p_registration_id: data.guest_id,
    p_name: data.name,
    p_surname: data.surname,
    p_age_at_event: data.age_at_event ?? 0,
    p_after_lunch: data.after_lunch ?? false,
    p_attending: data.attending ?? true,
  });
  if (error) throw new Error(error.message ?? 'No se pudo crear el asistente.');
  if (typeof inserted !== 'string' || !inserted) {
    throw new Error('No se pudo crear el asistente.');
  }
  const id = inserted;
  const { data: row, error: rowError } = await client
    .from('attendees')
    .select('*')
    .eq('id', id)
    .single();
  if (rowError) throw new Error(rowError.message ?? 'No se pudo leer el asistente creado.');
  return mapAttendeeRow(row as Database['public']['Tables']['attendees']['Row']);
}

export async function updateAttendee(id: string, updates: Partial<Attendee>): Promise<Attendee> {
  const client = requireSupabase();
  const { error } = await client.rpc('admin_update_attendee', {
    p_id: id,
    p_name: updates.name ?? '',
    p_surname: updates.surname ?? '',
    p_age_at_event: updates.age_at_event ?? 0,
    p_after_lunch: updates.after_lunch ?? false,
    p_attending: updates.attending ?? true,
  });
  if (error) throw new Error(error.message ?? 'No se pudo actualizar el asistente.');
  // Releer para devolver estado consistente
  const { data, error: rowError } = await client.from('attendees').select('*').eq('id', id).single();
  if (rowError) throw new Error(rowError.message ?? 'No se pudo leer el asistente actualizado.');
  return mapAttendeeRow(data as Database['public']['Tables']['attendees']['Row']);
}

export async function deleteAttendee(id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('admin_soft_delete_attendee', {
    p_id: id,
    p_reason: 'Eliminado desde el panel de administración.',
  });
  if (error) throw new Error(error.message ?? 'No se pudo eliminar el asistente.');
}

export async function restoreAttendee(id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc('admin_restore_attendee', { p_id: id });
  if (error) throw new Error(error.message ?? 'No se pudo restaurar el asistente.');
}

export async function getRegistrationBalance(
  guestId: string,
): Promise<{ balanceDue: number; includedAttendees: number }> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('admin_get_registration_balance', {
    p_registration_id: guestId,
  });
  if (error) throw new Error(error.message ?? 'No se pudo calcular el saldo.');
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) return { balanceDue: 0, includedAttendees: 0 };
  const row = rows[0];
  return {
    balanceDue: Number(row.balance_due ?? 0),
    includedAttendees: Number(row.included_attendees ?? 0),
  };
}

/* ------------------------------------------------------------------ */
/* RSVP público – Edge Function submit-rsvp                           */
/* ------------------------------------------------------------------ */

export interface RegistrarConfirmacionInput {
  requestId: string;
  guestName: string;
  guestSurname: string;
  guestPhone: string | null;
  guestEmail: string | null;
  guestAttending: boolean;
  guestSongSuggestion: string | null;
  guestDietaryRestrictions: string[];
  guestDietaryDetails: string | null;
  guestObservations: string | null;
  attendees: Array<{
    name: string;
    surname: string;
    ageAtEvent: number | null;
    afterLunch: boolean;
  }>;
}

export interface RegistrarConfirmacionResult {
  success: boolean;
  message?: string;
  error?: string;
  balanceDue?: number;
  includedAttendees?: number;
}

export async function registrarConfirmacion(
  data: RegistrarConfirmacionInput,
): Promise<RegistrarConfirmacionResult> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) {
    return {
      success: false,
      error: 'Supabase no está configurado. No se puede enviar la confirmación.',
    };
  }

  const functionUrl = `${url.replace(/\/$/, '')}/functions/v1/submit-rsvp`;
  const body = {
    request_id: data.requestId,
    contact_name: data.guestName,
    contact_surname: data.guestSurname,
    phone: data.guestPhone,
    email: data.guestEmail,
    attending: data.guestAttending,
    song_suggestion: data.guestSongSuggestion,
    dietary_restrictions: data.guestDietaryRestrictions,
    dietary_details: data.guestDietaryDetails,
    observations: data.guestObservations,
    attendees: data.attendees.map((a) => ({
      name: a.name,
      surname: a.surname,
      age_at_event: a.ageAtEvent,
      after_lunch: a.afterLunch,
    })),
  };

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      return {
        success: false,
        error: (result.error as string) ?? 'No se pudo registrar la confirmación.',
      };
    }
    if (result.success !== true) {
      return {
        success: false,
        error: (result.error as string) ?? 'El servicio no confirmó el registro.',
      };
    }
    return {
      success: true,
      message: 'Confirmación registrada correctamente.',
      balanceDue: typeof result.balance_due === 'number' ? result.balance_due : undefined,
      includedAttendees:
        typeof result.included_attendees === 'number' ? result.included_attendees : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo registrar la confirmación.',
    };
  }
}

export function calculateGroupAmount(attendees: Attendee[], rules: PriceRule[]) {
  return calculateGroupTotal(attendees, rules);
}

/* ------------------------------------------------------------------ */
/* Mantención de la sesión de Google (legacy, no se usa en Supabase)   */
/* ------------------------------------------------------------------ */

export function setGoogleAdminCredential(idToken: string): void {
  // Mantenido por compatibilidad; la sesión de Supabase se gestiona con authenticateAdmin.
  void idToken;
}

export function clearAdminIdToken(): void {
  // No-op en arquitectura Supabase.
}

export function hasAdminIdToken(): boolean {
  return false;
}

export function isAppsScriptConfigured(): boolean {
  return false;
}

export function isAppsScriptEndpointConfigured(): boolean {
  return false;
}

export function getGoogleClientId(): string {
  return import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ?? '';
}