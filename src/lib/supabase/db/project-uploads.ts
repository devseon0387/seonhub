/**
 * ProjectUploads CRUD — Content Studio 다중 플랫폼 업로드 + 조회수
 */
import { createClient } from '../client';
import type { ProjectUpload, UploadPlatform } from '@/types';

interface ProjectUploadRow {
  id: string;
  project_id: string;
  platform: string;
  url: string | null;
  published_at: string | null;
  view_count: number;
  last_synced_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

function fromRow(row: ProjectUploadRow): ProjectUpload {
  return {
    id: row.id,
    projectId: row.project_id,
    platform: row.platform as UploadPlatform,
    url: row.url ?? undefined,
    publishedAt: row.published_at ?? undefined,
    viewCount: row.view_count ?? 0,
    lastSyncedAt: row.last_synced_at ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function newId() {
  return `up_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function getProjectUploads(projectId: string): Promise<ProjectUpload[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('project_uploads')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) { console.error('[DB] getProjectUploads:', error.message); return []; }
  return (data as ProjectUploadRow[] ?? []).map(fromRow);
}

export async function getProjectUploadsByIds(projectIds: string[]): Promise<ProjectUpload[]> {
  if (projectIds.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('project_uploads')
    .select('*')
    .in('project_id', projectIds);
  if (error) { console.error('[DB] getProjectUploadsByIds:', error.message); return []; }
  return (data as ProjectUploadRow[] ?? []).map(fromRow);
}

export async function upsertProjectUpload(
  projectId: string,
  platform: UploadPlatform,
  fields: Partial<Pick<ProjectUpload, 'url' | 'publishedAt' | 'viewCount' | 'note'>>
): Promise<ProjectUpload | null> {
  const supabase = createClient();
  const nowIso = new Date().toISOString();

  // 존재 확인
  const { data: existingRaw } = await supabase
    .from('project_uploads')
    .select('id')
    .eq('project_id', projectId)
    .eq('platform', platform)
    .maybeSingle();
  const existing = existingRaw as { id: string } | null;

  const payload: Record<string, unknown> = {
    updated_at: nowIso,
  };
  if (fields.url !== undefined) payload.url = fields.url || null;
  if (fields.publishedAt !== undefined) payload.published_at = fields.publishedAt || null;
  if (fields.viewCount !== undefined) {
    payload.view_count = fields.viewCount;
    payload.last_synced_at = nowIso;
  }
  if (fields.note !== undefined) payload.note = fields.note || null;

  if (existing?.id) {
    const { data, error } = await supabase
      .from('project_uploads')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) { console.error('[DB] upsertProjectUpload(update):', error.message); return null; }
    return fromRow(data as ProjectUploadRow);
  }

  const { data, error } = await supabase
    .from('project_uploads')
    .insert([{
      id: newId(),
      project_id: projectId,
      platform,
      ...payload,
    }])
    .select()
    .single();
  if (error) { console.error('[DB] upsertProjectUpload(insert):', error.message); return null; }
  return fromRow(data as ProjectUploadRow);
}

export async function deleteProjectUpload(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('project_uploads').delete().eq('id', id);
  if (error) console.error('[DB] deleteProjectUpload:', error.message);
  return !error;
}
