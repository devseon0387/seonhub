/**
 * Sent Emails CRUD
 */
import { createClient } from '../client';
import type { SentEmail } from '@/types';

// ─── Row Types (Supabase snake_case) ─────────────────────────

export interface SentEmailRow {
  id: string;
  sender_id: string | null;
  sender_email: string;
  to: string[];
  cc: string[] | null;
  bcc: string[] | null;
  subject: string;
  content: string;
  status: string;
  created_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────

export function sentEmailFromRow(row: SentEmailRow): SentEmail {
  return {
    id: row.id,
    senderEmail: row.sender_email,
    to: row.to,
    cc: row.cc ?? undefined,
    bcc: row.bcc ?? undefined,
    subject: row.subject,
    content: row.content,
    status: row.status as SentEmail['status'],
    createdAt: row.created_at,
  };
}

export function sentEmailToInsert(email: {
  senderId?: string;
  senderEmail: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  content: string;
}) {
  return {
    sender_id: email.senderId ?? null,
    sender_email: email.senderEmail,
    to: email.to,
    cc: email.cc ?? null,
    bcc: email.bcc ?? null,
    subject: email.subject,
    content: email.content,
  };
}

// ─── CRUD ────────────────────────────────────────────────────

export async function getSentEmails(): Promise<SentEmail[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sent_emails')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) { console.error('[DB] getSentEmails:', error.message); return []; }
  if (!data) return [];
  return (data as SentEmailRow[]).map(sentEmailFromRow);
}

export async function getSentEmailById(id: string): Promise<SentEmail | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sent_emails')
    .select('*')
    .eq('id', id)
    .single();
  if (error) { console.error('[DB] getSentEmailById:', error.message); return null; }
  if (!data) return null;
  return sentEmailFromRow(data as SentEmailRow);
}

export async function insertSentEmail(email: {
  senderId?: string;
  senderEmail: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  content: string;
}): Promise<SentEmail | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sent_emails')
    .insert([sentEmailToInsert(email)])
    .select()
    .single();
  if (error) { console.error('[DB] insertSentEmail:', error.message); return null; }
  if (!data) return null;
  return sentEmailFromRow(data as SentEmailRow);
}

export async function deleteSentEmail(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('sent_emails').delete().eq('id', id);
  if (error) console.error('[DB] deleteSentEmail:', error.message);
  return !error;
}
