export type Database = {
  public: {
    Tables: {
      guests: {
        Row: Guest;
        Insert: Guest;
        Update: Guest;
      };
      attendees: {
        Row: Attendee;
        Insert: Attendee;
        Update: Attendee;
      };
      payment_records: {
        Row: PaymentRecord;
        Insert: PaymentRecord;
        Update: PaymentRecord;
      };
      event_settings: {
        Row: EventSetting;
        Insert: EventSetting;
        Update: EventSetting;
      };
      admin_profiles: {
        Row: AdminProfile;
        Insert: AdminProfile;
        Update: AdminProfile;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: AuditLog;
        Update: AuditLog;
      };
      gallery_images: {
        Row: GalleryImage;
        Insert: GalleryImage;
        Update: GalleryImage;
      };
      content_sections: {
        Row: ContentSection;
        Insert: ContentSection;
        Update: ContentSection;
      };
      pricing_rules: {
        Row: PriceRule;
        Insert: PriceRule;
        Update: PriceRule;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};

import type {
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
