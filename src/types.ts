/**
 * Tipos compartidos del proyecto Tarjeta-de-Casamiento.
 * Modelo orientado al dominio de una sola tarjeta de casamiento.
 */

export type PriceCategoryId = 'adulto' | 'nino' | 'bebe' | 'post-almuerzo';

export interface PriceRule {
  id: string;
  category_id: PriceCategoryId;
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
  dietary_restrictions: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attendee {
  id: string;
  guest_id: string;
  name: string;
  surname: string;
  birth_date: string | null;
  age_at_event: number | null;
  category_id: PriceCategoryId | null;
  price_applied: number | null;
  after_lunch: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: string;
  guest_id: string;
  amount_informed: number;
  amount_verified: number | null;
  status: 'pending' | 'informed' | 'verified' | 'rejected';
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  informed_by: string | null;
  verified_by: string | null;
  informed_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventSetting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'owner' | 'editor';
  active: boolean;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface AuditLog {
  id: string;
  admin_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: string | null;
  new_values: string | null;
  created_at: string;
}

export interface GalleryImage {
  id: string;
  title: string;
  storage_path: string;
  public_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface ContentSection {
  key: string;
  title: string | null;
  body: string | null;
  visible: boolean;
  sort_order: number;
  updated_at: string;
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
