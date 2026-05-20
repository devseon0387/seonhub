/**
 * Content Lab — Supabase 스토리지 (theories / theory_evidence / theory_queries)
 *
 * 이전 localStorage 프로토타입을 그대로 대체. 모든 함수가 async.
 */
'use client';

import { createClient } from '@/lib/supabase/client';
import type {
  Theory, TheoryStatus, TheoryTemplate,
  TheoryEvidence, EvidenceRole,
  TheoryQuery, TheoryQueryFilter,
} from '@/types';

// ─── Row Types ───────────────────────────────────────────────

interface TheoryRow {
  id: string;
  title: string;
  status: string;
  template: string | null;
  tags: string[] | null;
  author_id: string | null;
  abstract: string | null;
  hypothesis: string | null;
  background: string | null;
  method: string | null;
  analysis: string | null;
  conclusion: string | null;
  implications: string | null;
  references_text: string | null;
  body: string | null;
  canvas: string | null;
  created_at: string;
  updated_at: string;
}

interface EvidenceRow {
  id: string;
  theory_id: string;
  project_id: string;
  role: string;
  note: string | null;
  created_at: string;
}

interface QueryRow {
  id: string;
  theory_id: string;
  role: string;
  label: string | null;
  filter: TheoryQueryFilter;
  created_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────

function theoryFromRow(r: TheoryRow): Theory {
  return {
    id: r.id,
    title: r.title,
    status: r.status as TheoryStatus,
    template: (r.template as TheoryTemplate) ?? undefined,
    tags: r.tags ?? [],
    authorId: r.author_id ?? undefined,
    abstract: r.abstract ?? undefined,
    hypothesis: r.hypothesis ?? undefined,
    background: r.background ?? undefined,
    method: r.method ?? undefined,
    analysis: r.analysis ?? undefined,
    conclusion: r.conclusion ?? undefined,
    implications: r.implications ?? undefined,
    references: r.references_text ?? undefined,
    body: r.body ?? undefined,
    canvas: r.canvas ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function evidenceFromRow(r: EvidenceRow): TheoryEvidence {
  return {
    id: r.id,
    theoryId: r.theory_id,
    projectId: r.project_id,
    role: r.role as EvidenceRole,
    note: r.note ?? undefined,
    createdAt: r.created_at,
  };
}

function queryFromRow(r: QueryRow): TheoryQuery {
  return {
    id: r.id,
    theoryId: r.theory_id,
    role: r.role as EvidenceRole,
    label: r.label ?? undefined,
    filter: r.filter ?? {},
    createdAt: r.created_at,
  };
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Theories ────────────────────────────────────────────────

export async function listTheories(): Promise<Theory[]> {
  const sb = createClient();
  const { data, error } = await sb.from('theories').select('*').order('updated_at', { ascending: false });
  if (error) { console.error('[Lab] listTheories:', error.message); return []; }
  return (data as TheoryRow[] ?? []).map(theoryFromRow);
}

export async function getTheory(id: string): Promise<Theory | null> {
  const sb = createClient();
  const { data, error } = await sb.from('theories').select('*').eq('id', id).maybeSingle();
  if (error) { console.error('[Lab] getTheory:', error.message); return null; }
  return data ? theoryFromRow(data as TheoryRow) : null;
}

export async function createTheory(input: Partial<Theory> & { title: string }): Promise<Theory | null> {
  const sb = createClient();
  const { data, error } = await sb.from('theories').insert([{
    id: newId('th'),
    title: input.title,
    status: input.status ?? 'hypothesis',
    template: input.template ?? null,
    tags: input.tags ?? [],
    abstract: input.abstract ?? null,
    hypothesis: input.hypothesis ?? null,
    background: input.background ?? null,
    method: input.method ?? null,
    analysis: input.analysis ?? null,
    conclusion: input.conclusion ?? null,
    implications: input.implications ?? null,
    references_text: input.references ?? null,
    body: input.body ?? null,
    canvas: input.canvas ?? null,
  }]).select().single();
  if (error) { console.error('[Lab] createTheory:', error.message); return null; }
  return theoryFromRow(data as TheoryRow);
}

export async function updateTheory(id: string, fields: Partial<Theory>): Promise<boolean> {
  const sb = createClient();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.title !== undefined) row.title = fields.title;
  if (fields.status !== undefined) row.status = fields.status;
  if (fields.template !== undefined) row.template = fields.template ?? null;
  if (fields.tags !== undefined) row.tags = fields.tags;
  if (fields.abstract !== undefined) row.abstract = fields.abstract ?? null;
  if (fields.hypothesis !== undefined) row.hypothesis = fields.hypothesis ?? null;
  if (fields.background !== undefined) row.background = fields.background ?? null;
  if (fields.method !== undefined) row.method = fields.method ?? null;
  if (fields.analysis !== undefined) row.analysis = fields.analysis ?? null;
  if (fields.conclusion !== undefined) row.conclusion = fields.conclusion ?? null;
  if (fields.implications !== undefined) row.implications = fields.implications ?? null;
  if (fields.references !== undefined) row.references_text = fields.references ?? null;
  if (fields.body !== undefined) row.body = fields.body ?? null;
  if (fields.canvas !== undefined) row.canvas = fields.canvas ?? null;
  const { error } = await sb.from('theories').update(row).eq('id', id);
  if (error) console.error('[Lab] updateTheory:', error.message);
  return !error;
}

export async function deleteTheoryAndDeps(id: string): Promise<boolean> {
  const sb = createClient();
  // CASCADE FK가 있으니 theory만 지우면 evidence/queries 자동 삭제
  const { error } = await sb.from('theories').delete().eq('id', id);
  if (error) console.error('[Lab] deleteTheoryAndDeps:', error.message);
  return !error;
}

export async function statusCounts(): Promise<Record<TheoryStatus, number>> {
  const all = await listTheories();
  const result: Record<TheoryStatus, number> = {
    hypothesis: 0, testing: 0, validated: 0, refuted: 0, archived: 0,
  };
  for (const t of all) result[t.status] = (result[t.status] ?? 0) + 1;
  return result;
}

// ─── Evidence ────────────────────────────────────────────────

export async function listEvidenceFor(theoryId: string): Promise<TheoryEvidence[]> {
  const sb = createClient();
  const { data, error } = await sb.from('theory_evidence').select('*').eq('theory_id', theoryId);
  if (error) { console.error('[Lab] listEvidenceFor:', error.message); return []; }
  return (data as EvidenceRow[] ?? []).map(evidenceFromRow);
}

export async function addEvidence(
  theoryId: string, projectId: string, role: EvidenceRole = 'supports', note?: string
): Promise<TheoryEvidence | null> {
  const sb = createClient();
  const { data, error } = await sb.from('theory_evidence').insert([{
    id: newId('ev'),
    theory_id: theoryId,
    project_id: projectId,
    role,
    note: note ?? null,
  }]).select().single();
  if (error) {
    // 23505: unique violation (이미 같은 theory+project 존재)
    if (error.code !== '23505') console.error('[Lab] addEvidence:', error.message);
    return null;
  }
  return evidenceFromRow(data as EvidenceRow);
}

export async function updateEvidence(id: string, fields: Partial<TheoryEvidence>): Promise<boolean> {
  const sb = createClient();
  const row: Record<string, unknown> = {};
  if (fields.role !== undefined) row.role = fields.role;
  if (fields.note !== undefined) row.note = fields.note ?? null;
  const { error } = await sb.from('theory_evidence').update(row).eq('id', id);
  if (error) console.error('[Lab] updateEvidence:', error.message);
  return !error;
}

export async function removeEvidence(id: string): Promise<boolean> {
  const sb = createClient();
  const { error } = await sb.from('theory_evidence').delete().eq('id', id);
  if (error) console.error('[Lab] removeEvidence:', error.message);
  return !error;
}

// ─── Queries (조건 질의) ────────────────────────────────────

export async function listQueriesFor(theoryId: string): Promise<TheoryQuery[]> {
  const sb = createClient();
  const { data, error } = await sb.from('theory_queries').select('*').eq('theory_id', theoryId);
  if (error) { console.error('[Lab] listQueriesFor:', error.message); return []; }
  return (data as QueryRow[] ?? []).map(queryFromRow);
}

export async function addQuery(
  theoryId: string, filter: TheoryQueryFilter, role: EvidenceRole = 'supports', label?: string
): Promise<TheoryQuery | null> {
  const sb = createClient();
  const { data, error } = await sb.from('theory_queries').insert([{
    id: newId('qy'),
    theory_id: theoryId,
    role,
    label: label ?? null,
    filter,
  }]).select().single();
  if (error) { console.error('[Lab] addQuery:', error.message); return null; }
  return queryFromRow(data as QueryRow);
}

export async function removeQuery(id: string): Promise<boolean> {
  const sb = createClient();
  const { error } = await sb.from('theory_queries').delete().eq('id', id);
  if (error) console.error('[Lab] removeQuery:', error.message);
  return !error;
}
