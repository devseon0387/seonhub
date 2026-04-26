import { createClient, type SupabaseClient } from '@supabase/supabase-js';

declare global {
  var __hype5_supabase: SupabaseClient | undefined;
}

export function getSupabase(): SupabaseClient {
  if (global.__hype5_supabase) return global.__hype5_supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
  });
  global.__hype5_supabase = client;
  return client;
}

const JSON_COLUMNS: Record<string, Set<string>> = {
  projects: new Set(['partner_ids', 'manager_ids', 'channels', 'work_content', 'tags', 'work_type_costs', 'meta']),
  episodes: new Set(['work_content', 'work_items', 'work_steps', 'work_budgets']),
  sprints: new Set(['assignee_ids']),
  content_items: new Set(['assignee_ids']),
  portfolio_items: new Set(['tags']),
  inquiries: new Set(['references_links', 'portfolio_references']),
  trash: new Set(['data']),
  sent_emails: new Set(['to', 'cc', 'bcc']),
  user_profiles: new Set(['tutorial_done']),
  checklists: new Set(['repeat_days']),
  app_updates: new Set(['tags']),
};

const BOOL_COLUMNS: Record<string, Set<string>> = {
  user_profiles: new Set(['approved', 'needs_password_change']),
  checklists: new Set(['completed', 'notified']),
  portfolio_items: new Set(['is_published']),
  strategy_docs: new Set(['pinned']),
};

export function encodeRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const jsonCols = JSON_COLUMNS[table] ?? new Set();
  const boolCols = BOOL_COLUMNS[table] ?? new Set();
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined) continue;
    if (jsonCols.has(k)) {
      out[k] = v === null ? null : JSON.stringify(v);
    } else if (boolCols.has(k)) {
      out[k] = v === null ? null : (v ? 1 : 0);
    } else if (v instanceof Date) {
      out[k] = v.toISOString();
    } else if (typeof v === 'object' && v !== null) {
      out[k] = JSON.stringify(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function decodeRow(table: string, row: Record<string, unknown> | undefined | null): Record<string, unknown> | null {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  const jsonCols = JSON_COLUMNS[table] ?? new Set();
  const boolCols = BOOL_COLUMNS[table] ?? new Set();
  for (const [k, v] of Object.entries(row)) {
    if (jsonCols.has(k) && typeof v === 'string') {
      try { out[k] = JSON.parse(v); } catch { out[k] = v; }
    } else if (boolCols.has(k)) {
      out[k] = v === 1 || v === true;
    } else {
      out[k] = v;
    }
  }
  return out;
}
