/**
 * Tipos compartidos del proyecto Tarjeta-de-Casamiento.
 * Modelo orientado al dominio de una sola tarjeta de casamiento.
 */

import type { InvitationContent } from './domain/invitation-content';

export type PriceCategoryId = 'adulto' | 'nino' | 'bebe' | 'post-almuerzo';

export interface PriceRule {
  id: string;
  category: PriceCategoryId;
  label: string;
  description: string | null;
  min_age: number | null;
  max_age: number | null;
  price: number;
  currency: string;
  applies_after_lunch: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Guest {
  id: string;
  name: string;
  surname: string;
  phone: string | null;
  email: string | null;
  attending: boolean | null;
  song_suggestion: string | null;
  dietary_restrictions: string[];
  dietary_details: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
  attendees?: Attendee[];
  deleted_at?: string | null;
}

export interface Attendee {
  id: string;
  guest_id: string;
  name: string;
  surname: string;
  birth_date: string | null;
  age_at_event: number | null;
  category: PriceCategoryId | null;
  price_applied: number | null;
  after_lunch: boolean;
  attending?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface AdminProfile {
  id: string;
  email: string;
  role: 'owner' | 'editor';
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  actor_type: 'admin' | 'guest' | 'system';
  actor_id: string | null;
  action: string;
  entity_type: string;
  record_id: string | null;
  entity_key: string | null;
  request_id: string | null;
  source: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export interface InvitationRevisionRecord {
  id: string;
  version: number | null;
  status: 'draft' | 'published' | 'archived';
  content: InvitationContent;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface CalculationResult {
  perPerson: Array<{
    attendee_id: string;
    name: string;
    surname: string;
    category: string;
    price: number;
    after_lunch: boolean;
  }>;
  totalsByCategory: Record<string, { count: number; total: number }>;
  afterLunchTotal: number;
  totalAttendees: number;
  payingAttendees: number;
  grandTotal: number;
}
