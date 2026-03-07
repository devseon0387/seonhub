/**
 * Portfolio CRUD
 */
import { createClient } from '../client';
import type { PortfolioItem } from '@/types';

// ─── Row Types (Supabase snake_case) ─────────────────────────

export interface PortfolioItemRow {
  id: string;
  title: string;
  description: string | null;
  client: string | null;
  partner_id: string | null;
  category: string | null;
  display_order: number | null;
  completed_at: string | null;
  tags: string[] | null;
  youtube_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────

export function portfolioItemFromRow(row: PortfolioItemRow): PortfolioItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    client: row.client ?? '',
    partnerId: row.partner_id ?? undefined,
    category: row.category ?? '기타',
    displayOrder: row.display_order ?? 0,
    completedAt: row.completed_at ?? '',
    tags: row.tags ?? [],
    youtubeUrl: row.youtube_url ?? '',
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function portfolioItemToInsert(item: Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    title: item.title,
    description: item.description,
    client: item.client,
    partner_id: item.partnerId ?? null,
    category: item.category ?? '기타',
    display_order: item.displayOrder ?? 0,
    completed_at: item.completedAt || null,
    tags: item.tags ?? [],
    youtube_url: item.youtubeUrl,
    is_published: item.isPublished,
  };
}

export function portfolioItemToUpdate(item: Partial<PortfolioItem>) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (item.title !== undefined) row.title = item.title;
  if (item.description !== undefined) row.description = item.description;
  if (item.client !== undefined) row.client = item.client;
  if (item.partnerId !== undefined) row.partner_id = item.partnerId;
  if (item.category !== undefined) row.category = item.category;
  if (item.displayOrder !== undefined) row.display_order = item.displayOrder;
  if (item.completedAt !== undefined) row.completed_at = item.completedAt;
  if (item.tags !== undefined) row.tags = item.tags;
  if (item.youtubeUrl !== undefined) row.youtube_url = item.youtubeUrl;
  if (item.isPublished !== undefined) row.is_published = item.isPublished;
  return row;
}

// ─── CRUD ────────────────────────────────────────────────────

export async function getPortfolioItems(publishedOnly?: boolean): Promise<PortfolioItem[]> {
  const supabase = createClient();
  let query = supabase.from('portfolio_items').select('*').order('created_at', { ascending: false });
  if (publishedOnly) query = query.eq('is_published', true);
  const { data, error } = await query;
  if (error) { console.error('[DB] getPortfolioItems:', error.message); return []; }
  if (!data) return [];
  return (data as PortfolioItemRow[]).map(portfolioItemFromRow);
}

export async function insertPortfolioItem(
  item: Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PortfolioItem | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('portfolio_items')
    .insert([portfolioItemToInsert(item)])
    .select()
    .single();
  if (error) { console.error('[DB] insertPortfolioItem:', error.message); return null; }
  if (!data) return null;
  return portfolioItemFromRow(data as PortfolioItemRow);
}

export async function updatePortfolioItem(id: string, updates: Partial<PortfolioItem>): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('portfolio_items')
    .update(portfolioItemToUpdate(updates))
    .eq('id', id);
  return !error;
}

export async function deletePortfolioItem(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('portfolio_items').delete().eq('id', id);
  return !error;
}

export async function togglePortfolioPublished(id: string, isPublished: boolean): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('portfolio_items')
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}
