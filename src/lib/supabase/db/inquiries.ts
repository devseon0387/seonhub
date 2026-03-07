/**
 * Inquiries CRUD
 */
import { createClient } from '../client';
import type { Inquiry, InquiryStatus } from '@/types';

// ─── Row Types (Supabase snake_case) ─────────────────────────

export interface InquiryRow {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  project_type: string;
  budget: string | null;
  message: string;
  references_links: string[] | null;
  portfolio_references: unknown;
  referral_source: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────

export function inquiryFromRow(row: InquiryRow): Inquiry {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone,
    projectType: row.project_type,
    budget: row.budget ?? undefined,
    message: row.message,
    referencesLinks: row.references_links ?? [],
    portfolioReferences: (row.portfolio_references as Inquiry['portfolioReferences']) ?? [],
    referralSource: row.referral_source ?? undefined,
    status: row.status as InquiryStatus,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── CRUD ────────────────────────────────────────────────────

export async function getInquiries(): Promise<Inquiry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('[DB] getInquiries:', error.message); return []; }
  if (!data) return [];
  return (data as InquiryRow[]).map(inquiryFromRow);
}

export async function updateInquiryStatus(id: string, status: InquiryStatus): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('inquiries')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

export async function updateInquiryNotes(id: string, notes: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('inquiries')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

export async function deleteInquiry(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('inquiries').delete().eq('id', id);
  return !error;
}
