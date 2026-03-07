/**
 * Trash CRUD + Restore helpers
 */
import { createClient } from '../client';
import type { Project, Client, Partner, Episode, TrashItem, TrashItemType } from '@/types';
import { projectToInsert } from './projects';
import { clientToInsert } from './clients';
import { partnerToInsert } from './partners';
import { upsertEpisode } from './episodes';

// ─── Row Types (Supabase snake_case) ─────────────────────────

export interface TrashRow {
  id: string;
  type: string;
  data: unknown;
  original_project_id: string | null;
  deleted_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────

export function trashFromRow(row: TrashRow): TrashItem {
  return {
    id: row.id,
    type: row.type as TrashItemType,
    data: row.data as TrashItem['data'],
    deletedAt: row.deleted_at,
    originalProjectId: row.original_project_id ?? undefined,
  };
}

// ─── CRUD ────────────────────────────────────────────────────

export async function getTrash(): Promise<TrashItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('trash')
    .select('*')
    .order('deleted_at', { ascending: false });
  if (error) { console.error('[DB] getTrash:', error.message); return []; }
  if (!data) return [];
  return (data as TrashRow[]).map(trashFromRow);
}

export async function insertTrash(
  type: TrashItemType,
  data: TrashItem['data'],
  originalProjectId?: string
): Promise<TrashItem | null> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from('trash')
    .insert([{
      type,
      data,
      original_project_id: originalProjectId ?? null,
    }])
    .select()
    .single();
  if (error) { console.error('[DB] insertTrash:', error.message); return null; }
  if (!row) return null;
  return trashFromRow(row as TrashRow);
}

export async function deleteTrashItem(id: string): Promise<TrashItem | null> {
  const supabase = createClient();
  const { data, error: fetchError } = await supabase
    .from('trash')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError) { console.error('[DB] deleteTrashItem fetch:', fetchError.message); return null; }
  if (!data) return null;

  const { error: deleteError } = await supabase.from('trash').delete().eq('id', id);
  if (deleteError) { console.error('[DB] deleteTrashItem delete:', deleteError.message); return null; }
  return trashFromRow(data as TrashRow);
}

export async function permanentDeleteTrash(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('trash').delete().eq('id', id);
  return !error;
}

export async function emptyTrashAll(): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('trash').delete().gte('deleted_at', '1970-01-01');
  return !error;
}

// ─── Restore helpers (재삽입 with original ID) ───────────────

export async function restoreProjectToTable(project: Project): Promise<boolean> {
  const supabase = createClient();
  const row = {
    id: project.id,
    ...projectToInsert(project as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>),
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
  const { error } = await supabase.from('projects').upsert([row], { onConflict: 'id' });
  return !error;
}

export async function restoreClientToTable(client: Client): Promise<boolean> {
  const supabase = createClient();
  const row = {
    id: client.id,
    ...clientToInsert(client as Omit<Client, 'id' | 'createdAt' | 'updatedAt'>),
    created_at: client.createdAt,
    updated_at: client.updatedAt,
  };
  const { error } = await supabase.from('clients').upsert([row], { onConflict: 'id' });
  return !error;
}

export async function restorePartnerToTable(partner: Partner): Promise<boolean> {
  const supabase = createClient();
  const row = {
    id: partner.id,
    ...partnerToInsert(partner as Omit<Partner, 'id' | 'createdAt'>),
    created_at: partner.createdAt,
  };
  const { error } = await supabase.from('partners').upsert([row], { onConflict: 'id' });
  return !error;
}

export async function restoreEpisodeToTable(episode: Episode & { projectId: string }): Promise<boolean> {
  return upsertEpisode(episode);
}

export async function cleanupExpiredTrashItems(days = 30): Promise<number> {
  const supabase = createClient();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - days);

  const { data: expired } = await supabase
    .from('trash')
    .select('id')
    .lt('deleted_at', expiryDate.toISOString());

  if (!expired || expired.length === 0) return 0;

  const { error } = await supabase
    .from('trash')
    .delete()
    .lt('deleted_at', expiryDate.toISOString());

  if (error) { console.error('[DB] cleanupExpiredTrashItems:', error.message); return 0; }
  return expired.length;
}
