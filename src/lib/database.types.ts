import type { Attendee, Guest, PriceCategoryId } from '../types';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>, Relationships extends unknown[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

type AttendeeRow = Omit<
  Attendee,
  | 'guest_id'
  | 'birth_date'
  | 'attending'
  | 'age_at_event'
  | 'category'
  | 'price_applied'
  | 'deleted_at'
> & {
  registration_id: string;
  age_at_event: number;
  category: PriceCategoryId;
  price_applied: number;
  attending: boolean;
  deleted_at: string | null;
  pricing_version_id: string;
  deletion_reason: string | null;
};

type RegistrationRow = Omit<Guest, 'attendees' | 'deleted_at' | 'email'> & {
  email: string;
  contact_name: string;
  contact_surname: string;
  email_normalized: string;
  rsvp_status: 'pending' | 'confirmed' | 'declined' | 'cancelled';
  created_source: 'admin_ui' | 'public_rsvp';
  request_id: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  deletion_reason: string | null;
};

type PricingRuleRow = {
  id: string;
  pricing_version_id: string;
  category: PriceCategoryId;
  price: number;
  currency: 'ARS';
  created_at: string;
};

type PricingVersionRow = {
  id: string;
  version_number: number;
  status: 'draft' | 'active' | 'archived';
  reason: string | null;
  created_by: string | null;
  created_at: string;
  activated_by: string | null;
  activated_at: string | null;
};

type EventPublicConfigRow = {
  singleton: boolean;
  event_date: string;
  reception_time: string | null;
  reception_name: string | null;
  reception_address: string | null;
  ceremony_time: string | null;
  ceremony_name: string | null;
  ceremony_address: string | null;
  event_end_time: string | null;
  venue_name: string | null;
  venue_address: string | null;
  directions_url: string | null;
  rsvp_deadline: string | null;
  dress_code: string | null;
  public_content: Json;
  bank_alias: string | null;
  bank_holder: string | null;
  bank_name: string | null;
  bank_details_published: boolean;
  updated_at: string;
  updated_by: string | null;
};

type EventPrivateConfigRow = {
  singleton: boolean;
  settings: Json;
  updated_at: string;
  updated_by: string | null;
};

type BalanceRow = {
  registration_id: string;
  contact_name: string;
  contact_surname: string;
  email: string;
  balance_due: number;
  included_attendees: number;
};

type AdminProfileRow = {
  id: string;
  email: string;
  role: 'owner' | 'editor';
  active: boolean;
  created_at: string;
  updated_at: string;
};

type CurrentAdminProfileRow = Pick<AdminProfileRow, 'id' | 'email' | 'role'>;

type AuditLogRow = {
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
};

type InvitationRevisionRow = {
  id: string;
  version: number | null;
  status: 'draft' | 'published' | 'archived';
  content: Json;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      registrations: Table<
        RegistrationRow,
        Partial<RegistrationRow>,
        Partial<RegistrationRow>,
        []
      >;
      attendees: Table<
        AttendeeRow,
        Partial<AttendeeRow>,
        Partial<AttendeeRow>,
        [{
          foreignKeyName: 'attendees_registration_id_fkey';
          columns: ['registration_id'];
          isOneToOne: false;
          referencedRelation: 'registrations';
          referencedColumns: ['id'];
        }]
      >;
      admin_profiles: Table<AdminProfileRow>;
      audit_logs: Table<AuditLogRow>;
      pricing_versions: Table<PricingVersionRow>;
      pricing_rules: Table<PricingRuleRow>;
      event_public_config: Table<EventPublicConfigRow>;
      event_private_config: Table<EventPrivateConfigRow>;
      invitation_revisions: Table<InvitationRevisionRow>;
    };
    Views: Record<string, never>;
    Functions: {
      get_current_admin_profile: {
        Args: Record<PropertyKey, never>;
        Returns: CurrentAdminProfileRow[];
      };
      get_public_invitation: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      admin_get_event_config: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      admin_update_event_public_config: {
        Args: { p_patch: Json };
        Returns: undefined;
      };
      admin_create_registration: {
        Args: {
          p_contact_name: string;
          p_contact_surname: string;
          p_email: string;
          p_phone: string | null;
          p_rsvp_status: string;
          p_attendees: Json;
          p_observations?: string | null;
        };
        Returns: Json;
      };
      admin_update_registration_details: {
        Args: {
          p_id: string;
          p_contact_name: string;
          p_contact_surname: string;
          p_email: string;
          p_phone: string | null;
          p_observations: string | null;
          p_rsvp_status: string;
          p_song_suggestion: string | null;
          p_dietary_restrictions: string[];
          p_dietary_details: string | null;
        };
        Returns: undefined;
      };
      admin_update_registration_rsvp_details: {
        Args: {
          p_id: string;
          p_song_suggestion: string | null;
          p_dietary_restrictions: string[];
          p_dietary_details: string | null;
        };
        Returns: undefined;
      };
      admin_set_registration_status: {
        Args: { p_registration_id: string; p_status: string };
        Returns: undefined;
      };
      admin_soft_delete_registration: {
        Args: { p_id: string; p_reason?: string | null };
        Returns: undefined;
      };
      admin_restore_registration: {
        Args: { p_id: string };
        Returns: undefined;
      };
      admin_add_attendee: {
        Args: {
          p_registration_id: string;
          p_name: string;
          p_surname: string;
          p_age_at_event: number;
          p_after_lunch: boolean;
          p_attending?: boolean;
        };
        Returns: string;
      };
      admin_update_attendee: {
        Args: {
          p_id: string;
          p_name: string;
          p_surname: string;
          p_age_at_event: number;
          p_after_lunch: boolean;
          p_attending: boolean;
        };
        Returns: undefined;
      };
      admin_soft_delete_attendee: {
        Args: { p_id: string; p_reason?: string | null };
        Returns: undefined;
      };
      admin_restore_attendee: {
        Args: { p_id: string };
        Returns: undefined;
      };
      admin_get_registration_balance: {
        Args: { p_registration_id: string };
        Returns: { balance_due: number; included_attendees: number }[];
      };
      admin_get_balance_summary: {
        Args: Record<PropertyKey, never>;
        Returns: BalanceRow[];
      };
      admin_get_dashboard_summary: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      owner_publish_pricing_version: {
        Args: { p_rules: Json; p_reason: string };
        Returns: number;
      };
      owner_set_admin_role: {
        Args: { p_user_id: string; p_role: 'owner' | 'editor' };
        Returns: undefined;
      };
      owner_set_admin_active: {
        Args: { p_user_id: string; p_active: boolean };
        Returns: undefined;
      };
      submit_public_rsvp: {
        Args: {
          p_request_id: string;
          p_contact_name: string;
          p_contact_surname: string;
          p_email: string;
          p_phone: string | null;
          p_attending: boolean;
          p_attendees: Json;
          p_observations: string | null;
          p_song_suggestion: string | null;
          p_dietary_restrictions: string[];
          p_dietary_details: string | null;
        };
        Returns: Json;
      };
      save_invitation_draft: {
        Args: { p_content: Json; p_expected_updated_at?: string | null };
        Returns: InvitationRevisionRow;
      };
      publish_invitation_draft: {
        Args: { p_expected_updated_at?: string | null };
        Returns: number;
      };
      admin_restore_invitation_revision: {
        Args: { p_revision_id: string; p_expected_updated_at?: string | null };
        Returns: InvitationRevisionRow;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
