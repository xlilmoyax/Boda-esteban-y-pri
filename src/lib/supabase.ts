/**
 * Servicio de Supabase con operaciones CRUD reales para el panel administrativo.
 * Todas las operaciones escriben en Supabase y respetan las políticas RLS.
 * No incluye service_role; solo usa el cliente anon con sesión de admin autenticada.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Guest, Attendee, PaymentRecord, EventSetting, PriceRule, AuditLog } from '../types';
import { calculateGroupTotal } from '../domain/pricing';

export class SupabaseError extends Error {
  constructor(message: string, public readonly original?: any) {
    super(message);
    this.name = 'SupabaseError';
  }
}

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new SupabaseError('Supabase no está configurado. Definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

/**
 * =============================================
 * GUESTS
 * =============================================
*/
export async function createGuest(data: Omit<Guest, 'id' | 'created_at' | 'updated_at'>): Promise<Guest> {
  const sb = requireSupabase();
  const { data: result, error } = await sb
    .from('guests')
    .insert([data])
    .select()
    .single();

  if (error || !result) throw new SupabaseError('Error al crear invitado', error);
  return result as Guest;
}

export async function getGuests({
  search,
  attending,
  category,
  paymentStatus,
  limit = 100,
  offset = 0,
}: {
  search?: string;
  attending?: boolean | null;
  category?: string;
  paymentStatus?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ guests: Guest[]; count: number }> {
  const sb = requireSupabase();
  let query = sb.from('guests').select('*, attendees(*)', { count: 'exact' });

  if (search) {
    query = query.or(`name.ilike.%${search}%,surname.ilike.%${search}%`);
  }
  if (attending !== undefined && attending !== null) {
    query = query.eq('attending', attending);
  }
  if (category) {
    query = query.eq('attendees.category', category);
  }
  if (paymentStatus) {
    query = query.eq('payment_records.status', paymentStatus);
  }

  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) throw new SupabaseError('Error al cargar invitados', error);

  return { guests: (data ?? []) as Guest[], count: count ?? 0 };
}

export async function getGuestById(id: string): Promise<Guest | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('guests')
    .select('*, attendees(*), payment_records(*)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new SupabaseError('Error al cargar invitado', error);
  }
  return data as Guest;
}

export async function updateGuest(id: string, updates: Partial<Guest>): Promise<Guest> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('guests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new SupabaseError('Error al actualizar invitado', error);
  return data as Guest;
}

export async function deleteGuest(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('guests').delete().eq('id', id);
  if (error) throw new SupabaseError('Error al eliminar invitado', error);
}

/**
 * =============================================
 * ATTENDEES
 * =============================================
*/
export async function createAttendee(data: Omit<Attendee, 'id' | 'created_at' | 'updated_at'>): Promise<Attendee> {
  const sb = requireSupabase();
  const { data: result, error } = await sb
    .from('attendees')
    .insert([data])
    .select()
    .single();

  if (error || !result) throw new SupabaseError('Error al crear asistente', error);
  return result as Attendee;
}

export async function getAttendeesByGuest(guestId: string): Promise<Attendee[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('attendees')
    .select('*')
    .eq('guest_id', guestId)
    .order('created_at', { ascending: true });

  if (error) throw new SupabaseError('Error al cargar asistentes', error);
  return (data ?? []) as Attendee[];
}

export async function updateAttendee(id: string, updates: Partial<Attendee>): Promise<Attendee> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('attendees')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new SupabaseError('Error al actualizar asistente', error);
  return data as Attendee;
}

export async function deleteAttendee(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('attendees').delete().eq('id', id);
  if (error) throw new SupabaseError('Error al eliminar asistente', error);
}

/**
 * =============================================
 * PAYMENT RECORDS
 * =============================================
*/
export async function createPaymentRecord(data: Omit<PaymentRecord, 'id' | 'created_at' | 'updated_at'>): Promise<PaymentRecord> {
  const sb = requireSupabase();
  const { data: result, error } = await sb
    .from('payment_records')
    .insert([{ ...data, status: 'informed', informed_at: new Date().toISOString() }])
    .select()
    .single();

  if (error || !result) throw new SupabaseError('Error al crear registro de pago', error);
  return result as PaymentRecord;
}

export async function getPaymentRecords({ guestId, status }: { guestId?: string; status?: string } = {}): Promise<PaymentRecord[]> {
  const sb = requireSupabase();
  let query = sb.from('payment_records').select('*, guests(name, surname)').order('created_at', { ascending: false });

  if (guestId) query = query.eq('guest_id', guestId);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new SupabaseError('Error al cargar pagos', error);
  return (data ?? []) as PaymentRecord[];
}

export async function verifyPayment(id: string, adminId: string): Promise<PaymentRecord> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('payment_records')
    .update({
      status: 'verified',
      verified_by: adminId,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new SupabaseError('Error al verificar pago', error);
  return data as PaymentRecord;
}

export async function rejectPayment(id: string, adminId: string): Promise<PaymentRecord> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('payment_records')
    .update({
      status: 'rejected',
      verified_by: adminId,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new SupabaseError('Error al rechazar pago', error);
  return data as PaymentRecord;
}

/**
 * =============================================
 * PRICING RULES
 * =============================================
*/
export async function getPricingRules(): Promise<PriceRule[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('pricing_rules')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (error) throw new SupabaseError('Error al cargar reglas de precios', error);
  return (data ?? []) as PriceRule[];
}

export async function getAllPricingRules(): Promise<PriceRule[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from('pricing_rules').select('*').order('category', { ascending: true });
  if (error) throw new SupabaseError('Error al cargar todas las reglas de precios', error);
  return (data ?? []) as PriceRule[];
}

export async function updatePricingRule(id: string, updates: Partial<PriceRule>, adminId: string): Promise<PriceRule> {
  const sb = requireSupabase();

  // Obtener valor anterior para historial
  const { data: current } = await sb.from('pricing_rules').select('*').eq('id', id).single();
  const oldValues = current ? { price: current.price, category: current.category } : null;

  const { data, error } = await sb
    .from('pricing_rules')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new SupabaseError('Error al actualizar regla de precio', error);

  // Registrar en historial de precios
  await createPricingHistory({
    rule_id: id,
    category: data.category,
    old_price: oldValues?.price ?? null,
    new_price: data.price,
    changed_by: adminId,
    changed_at: new Date().toISOString(),
  });

  return data as PriceRule;
}

/**
 * =============================================
 * PRICING HISTORY (snapshots)
 * =============================================
*/
export interface PricingHistory {
  id: string;
  rule_id: string;
  category: string;
  old_price: number | null;
  new_price: number;
  changed_by: string;
  changed_at: string;
}

export async function createPricingHistory(data: Omit<PricingHistory, 'id'>): Promise<PricingHistory> {
  const sb = requireSupabase();
  const { data: result, error } = await sb.from('pricing_history').insert([data]).select().single();
  if (error || !result) throw new SupabaseError('Error al registrar historial de precios', error);
  return result as PricingHistory;
}

export async function getPricingHistory(ruleId?: string): Promise<PricingHistory[]> {
  const sb = requireSupabase();
  let query = sb.from('pricing_history').select('*').order('changed_at', { ascending: false });
  if (ruleId) query = query.eq('rule_id', ruleId);
  const { data, error } = await query;
  if (error) throw new SupabaseError('Error al cargar historial de precios', error);
  return (data ?? []) as PricingHistory[];
}

/**
 * =============================================
 * EVENT SETTINGS
 * =============================================
*/
export async function getEventSettings(): Promise<EventSetting[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from('event_settings').select('*').order('key', { ascending: true });
  if (error) throw new SupabaseError('Error al cargar configuración', error);
  return (data ?? []) as EventSetting[];
}

export async function updateEventSetting(key: string, value: string, _adminId: string): Promise<EventSetting> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('event_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error || !data) throw new SupabaseError('Error al actualizar configuración', error);
  return data as EventSetting;
}

/**
 * =============================================
 * AUDIT LOGS
 * =============================================
*/
export async function createAuditLog(data: Omit<AuditLog, 'id' | 'created_at'>): Promise<AuditLog> {
  const sb = requireSupabase();
  const { data: result, error } = await sb.from('audit_logs').insert([data]).select().single();
  if (error || !result) throw new SupabaseError('Error al registrar auditoría', error);
  return result as AuditLog;
}

export async function getAuditLogs(limit = 50): Promise<AuditLog[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new SupabaseError('Error al cargar auditoría', error);
  return (data ?? []) as AuditLog[];
}

/**
 * =============================================
 * CÁLCULO DE PRECIOS (validación backend)
 * =============================================
 */
export function calculateGroupAmount(attendees: Attendee[], rules: PriceRule[]) {
  return calculateGroupTotal(attendees, rules);
}
