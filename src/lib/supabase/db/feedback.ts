/**
 * Feedback CRUD
 */
import { createClient } from '../client';
import type { Feedback, FeedbackStatus } from '@/types';

// ─── Row Types (Supabase snake_case) ─────────────────────────

export interface FeedbackRow {
  id: string;
  content: string;
  page_path: string | null;
  status: string;
  created_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────

export function feedbackFromRow(row: FeedbackRow): Feedback {
  return {
    id: row.id,
    content: row.content,
    pagePath: row.page_path ?? '',
    status: row.status as FeedbackStatus,
    createdAt: row.created_at,
  };
}

// ─── CRUD ────────────────────────────────────────────────────

export async function getFeedbacks(): Promise<Feedback[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('[DB] getFeedbacks:', error.message); return []; }
  if (!data) return [];
  return (data as FeedbackRow[]).map(feedbackFromRow);
}

export async function insertFeedback(content: string, pagePath: string): Promise<Feedback | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('feedback')
    .insert([{ content, page_path: pagePath }])
    .select()
    .single();
  if (error || !data) return null;
  return feedbackFromRow(data as FeedbackRow);
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('feedback')
    .update({ status })
    .eq('id', id);
  return !error;
}
