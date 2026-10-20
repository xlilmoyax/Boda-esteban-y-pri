import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Guest,
  Attendee,
  PaymentRecord,
  EventSetting,
  AdminProfile,
  AuditLog,
  GalleryImage,
  ContentSection,
  PriceRule,
} from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase no está configurado. Definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local.'
  );
}

export const supabase: SupabaseClient<any> | null = isSupabaseConfigured
  ? createClient<any>(supabaseUrl!, supabaseAnonKey!)
  : null;

export type { Guest, Attendee, PaymentRecord, EventSetting, AdminProfile, AuditLog, GalleryImage, ContentSection, PriceRule };
