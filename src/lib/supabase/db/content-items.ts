/**
 * ContentItems CRUD (콘텐츠 제작 프로젝트용)
 */
import { createClient } from '../client';
import type { ContentItem } from '@/types';

// ─── Row Types (Supabase snake_case) ─────────────────────────

export interface ContentItemRow {
  id: string;
  project_id: string;
  item_number: number | null;
  title: string;
  description: string | null;
  status: string;
  platform: string;
  content_kind: string | null;
  publish_date: string | null;
  published_at: string | null;
  published_url: string | null;
  view_count: number;
  assignee_ids: string[] | null;
  budget_total: number;
  budget_partner: number;
  budget_management: number;
  created_at: string;
  updated_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────

export function contentItemFromRow(row: ContentItemRow): ContentItem {
  return {
    id: row.id,
    projectId: row.project_id,
    itemNumber: row.item_number ?? 0,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status as ContentItem['status'],
    platform: row.platform as ContentItem['platform'],
    contentKind: row.content_kind ?? undefined,
    publishDate: row.publish_date ?? undefined,
    publishedAt: row.published_at ?? undefined,
    publishedUrl: row.published_url ?? undefined,
    viewCount: row.view_count ?? 0,
    assigneeIds: row.assignee_ids ?? [],
    budget: {
      totalAmount: row.budget_total,
      partnerPayment: row.budget_partner,
      managementFee: row.budget_management,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function contentItemToInsert(item: ContentItem) {
  return {
    id: item.id,
    project_id: item.projectId,
    item_number: item.itemNumber,
    title: item.title,
    description: item.description ?? null,
    status: item.status,
    platform: item.platform,
    content_kind: item.contentKind ?? null,
    publish_date: item.publishDate ?? null,
    published_at: item.publishedAt ?? null,
    published_url: item.publishedUrl ?? null,
    view_count: item.viewCount ?? 0,
    assignee_ids: item.assigneeIds ?? [],
    budget_total: item.budget?.totalAmount ?? 0,
    budget_partner: item.budget?.partnerPayment ?? 0,
    budget_management: item.budget?.managementFee ?? 0,
  };
}

export function contentItemToUpdate(fields: Partial<ContentItem>) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.itemNumber !== undefined) row.item_number = fields.itemNumber;
  if (fields.title !== undefined) row.title = fields.title;
  if (fields.description !== undefined) row.description = fields.description ?? null;
  if (fields.status !== undefined) row.status = fields.status;
  if (fields.platform !== undefined) row.platform = fields.platform;
  if (fields.contentKind !== undefined) row.content_kind = fields.contentKind ?? null;
  if (fields.publishDate !== undefined) row.publish_date = fields.publishDate ?? null;
  if (fields.publishedAt !== undefined) row.published_at = fields.publishedAt ?? null;
  if (fields.publishedUrl !== undefined) row.published_url = fields.publishedUrl ?? null;
  if (fields.viewCount !== undefined) row.view_count = fields.viewCount;
  if (fields.assigneeIds !== undefined) row.assignee_ids = fields.assigneeIds ?? [];
  if (fields.budget !== undefined) {
    row.budget_total = fields.budget.totalAmount;
    row.budget_partner = fields.budget.partnerPayment;
    row.budget_management = fields.budget.managementFee;
  }
  return row;
}

// ─── CRUD ────────────────────────────────────────────────────

export async function getContentItemsByProjectId(projectId: string): Promise<ContentItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('project_id', projectId)
    .order('item_number', { ascending: false });
  if (error) { console.error('[DB] getContentItemsByProjectId:', error.message); return []; }
  if (!data) return [];
  return (data as ContentItemRow[]).map(contentItemFromRow);
}

export async function getAllContentItems(): Promise<ContentItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('[DB] getAllContentItems:', error.message); return []; }
  if (!data) return [];
  return (data as ContentItemRow[]).map(contentItemFromRow);
}

export async function insertContentItem(item: ContentItem): Promise<ContentItem | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('content_items')
    .insert([contentItemToInsert(item)])
    .select()
    .single();
  if (error) { console.error('[DB] insertContentItem:', error.message); return null; }
  if (!data) return null;
  return contentItemFromRow(data as ContentItemRow);
}

export async function upsertContentItems(items: ContentItem[]): Promise<boolean> {
  if (items.length === 0) return true;
  const supabase = createClient();
  const { error } = await supabase
    .from('content_items')
    .upsert(items.map(contentItemToInsert), { onConflict: 'id' });
  if (error) console.error('[DB] upsertContentItems:', error.message);
  return !error;
}

export async function updateContentItem(id: string, updates: Partial<ContentItem>): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('content_items')
    .update(contentItemToUpdate(updates))
    .eq('id', id);
  if (error) console.error('[DB] updateContentItem:', error.message);
  return !error;
}

export async function deleteContentItem(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('content_items').delete().eq('id', id);
  if (error) console.error('[DB] deleteContentItem:', error.message);
  return !error;
}
