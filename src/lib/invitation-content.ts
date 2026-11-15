import {
  isInvitationContent,
} from '../domain/invitation-content';
import type { InvitationContent } from '../domain/invitation-content';
import type { Json } from './database.types';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import type { InvitationRevisionRecord } from '../types';
import { getPublicInvitation } from './data-service';

export const INVITATION_ASSET_BUCKET = 'invitation-assets';

export type InvitationRevision = InvitationRevisionRecord;

function toJson(value: unknown): Json {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('El contenido de la invitación incluye un número inválido.');
    return value;
  }
  if (Array.isArray(value)) return value.map(toJson);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, toJson(item)])
    );
  }
  throw new Error('El contenido de la invitación no se puede serializar.');
}

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no está configurado.');
  }
  return supabase;
}

function parseRevision(value: unknown): InvitationRevision {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Supabase devolvió una versión de invitación inválida.');
  }
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== 'string' ||
    (row.version !== null && typeof row.version !== 'number') ||
    (row.status !== 'draft' && row.status !== 'published' && row.status !== 'archived') ||
    !isInvitationContent(row.content) ||
    (row.created_by !== null && typeof row.created_by !== 'string') ||
    typeof row.created_at !== 'string' ||
    typeof row.updated_at !== 'string' ||
    (row.published_at !== null && typeof row.published_at !== 'string')
  ) {
    throw new Error('Supabase devolvió una versión de invitación incompleta o inválida.');
  }
  return row as unknown as InvitationRevision;
}

export async function getPublishedInvitation(): Promise<InvitationContent> {
  const { invitationContent } = await getPublicInvitation();
  if (!invitationContent) throw new Error('Todavía no hay una versión publicada de la invitación en Supabase.');
  return invitationContent;
}

export async function getInvitationHistory(): Promise<InvitationRevision[]> {
  const { data, error } = await requireSupabase()
    .from('invitation_revisions')
    .select('id, version, status, content, created_by, created_at, updated_at, published_at')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`No se pudo cargar el historial de la invitación: ${error.message}`);
  return (data ?? []).map(parseRevision);
}

export async function saveInvitationDraft(
  content: InvitationContent,
  expectedUpdatedAt: string | null
): Promise<InvitationRevision> {
  if (!isInvitationContent(content)) {
    throw new Error('Revisá los textos y las imágenes antes de guardar el borrador.');
  }

  const { data, error } = await requireSupabase().rpc('save_invitation_draft', {
    p_content: toJson(content),
    p_expected_updated_at: expectedUpdatedAt,
  });
  if (error) throw new Error(`No se pudo guardar el borrador: ${error.message}`);
  return parseRevision(data);
}

export async function publishInvitationDraft(expectedUpdatedAt: string | null): Promise<number> {
  const { data, error } = await requireSupabase().rpc('publish_invitation_draft', {
    p_expected_updated_at: expectedUpdatedAt,
  });
  if (error) throw new Error(`No se pudo publicar la invitación: ${error.message}`);
  if (typeof data !== 'number' || !Number.isInteger(data) || data < 1) {
    throw new Error('Supabase no confirmó la versión publicada.');
  }
  return data;
}

export async function restoreInvitationRevision(
  revisionId: string,
  expectedUpdatedAt: string | null
): Promise<InvitationRevision> {
  const { data, error } = await requireSupabase().rpc('admin_restore_invitation_revision', {
    p_revision_id: revisionId,
    p_expected_updated_at: expectedUpdatedAt,
  });
  if (error) throw new Error(`No se pudo restaurar la revisión: ${error.message}`);
  return parseRevision(data);
}

export async function uploadInvitationImage(file: File): Promise<string> {
  const allowedTypes = new Map([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
  ]);
  const extension = allowedTypes.get(file.type);
  if (!extension) throw new Error('Usá una imagen JPG, PNG o WebP.');
  if (file.size === 0 || file.size > 8 * 1024 * 1024) {
    throw new Error('La imagen debe pesar menos de 8 MB.');
  }

  const path = `invitation/${crypto.randomUUID()}/${crypto.randomUUID()}`;
  const { error } = await requireSupabase()
    .storage
    .from(INVITATION_ASSET_BUCKET)
    .upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    });

  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
  return path;
}

export async function getInvitationImageSignedUrl(path: string): Promise<string> {
  if (!path.startsWith('invitation/')) return path;
  const { data, error } = await requireSupabase()
    .storage
    .from(INVITATION_ASSET_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) {
    throw new Error(`No se pudo generar una URL temporal para la imagen: ${error?.message ?? 'respuesta inválida'}`);
  }
  return data.signedUrl;
}
