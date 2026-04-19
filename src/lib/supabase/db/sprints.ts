/**
 * Sprints CRUD (개발 프로젝트용)
 */
import { createClient } from '../client';
import type { Sprint } from '@/types';

// ─── Row Types (Supabase snake_case) ─────────────────────────

export interface SprintRow {
  id: string;
  project_id: string;
  sprint_number: number | null;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  goal: string | null;
  issue_count: number;
  completed_issue_count: number;
  assignee_ids: string[] | null;
  budget_total: number;
  budget_partner: number;
  budget_management: number;
  created_at: string;
  updated_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────

export function sprintFromRow(row: SprintRow): Sprint {
  return {
    id: row.id,
    projectId: row.project_id,
    sprintNumber: row.sprint_number ?? 0,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status as Sprint['status'],
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? undefined,
    goal: row.goal ?? undefined,
    issueCount: row.issue_count ?? 0,
    completedIssueCount: row.completed_issue_count ?? 0,
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

export function sprintToInsert(sprint: Sprint) {
  return {
    id: sprint.id,
    project_id: sprint.projectId,
    sprint_number: sprint.sprintNumber,
    title: sprint.title,
    description: sprint.description ?? null,
    status: sprint.status,
    start_date: sprint.startDate ?? null,
    end_date: sprint.endDate ?? null,
    goal: sprint.goal ?? null,
    issue_count: sprint.issueCount ?? 0,
    completed_issue_count: sprint.completedIssueCount ?? 0,
    assignee_ids: sprint.assigneeIds ?? [],
    budget_total: sprint.budget?.totalAmount ?? 0,
    budget_partner: sprint.budget?.partnerPayment ?? 0,
    budget_management: sprint.budget?.managementFee ?? 0,
  };
}

export function sprintToUpdate(fields: Partial<Sprint>) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.sprintNumber !== undefined) row.sprint_number = fields.sprintNumber;
  if (fields.title !== undefined) row.title = fields.title;
  if (fields.description !== undefined) row.description = fields.description ?? null;
  if (fields.status !== undefined) row.status = fields.status;
  if (fields.startDate !== undefined) row.start_date = fields.startDate ?? null;
  if (fields.endDate !== undefined) row.end_date = fields.endDate ?? null;
  if (fields.goal !== undefined) row.goal = fields.goal ?? null;
  if (fields.issueCount !== undefined) row.issue_count = fields.issueCount;
  if (fields.completedIssueCount !== undefined) row.completed_issue_count = fields.completedIssueCount;
  if (fields.assigneeIds !== undefined) row.assignee_ids = fields.assigneeIds ?? [];
  if (fields.budget !== undefined) {
    row.budget_total = fields.budget.totalAmount;
    row.budget_partner = fields.budget.partnerPayment;
    row.budget_management = fields.budget.managementFee;
  }
  return row;
}

// ─── CRUD ────────────────────────────────────────────────────

export async function getSprintsByProjectId(projectId: string): Promise<Sprint[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .eq('project_id', projectId)
    .order('sprint_number', { ascending: false });
  if (error) { console.error('[DB] getSprintsByProjectId:', error.message); return []; }
  if (!data) return [];
  return (data as SprintRow[]).map(sprintFromRow);
}

export async function getAllSprints(): Promise<Sprint[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('[DB] getAllSprints:', error.message); return []; }
  if (!data) return [];
  return (data as SprintRow[]).map(sprintFromRow);
}

export async function insertSprint(sprint: Sprint): Promise<Sprint | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sprints')
    .insert([sprintToInsert(sprint)])
    .select()
    .single();
  if (error) { console.error('[DB] insertSprint:', error.message); return null; }
  if (!data) return null;
  return sprintFromRow(data as SprintRow);
}

export async function upsertSprints(sprints: Sprint[]): Promise<boolean> {
  if (sprints.length === 0) return true;
  const supabase = createClient();
  const { error } = await supabase
    .from('sprints')
    .upsert(sprints.map(sprintToInsert), { onConflict: 'id' });
  if (error) console.error('[DB] upsertSprints:', error.message);
  return !error;
}

export async function updateSprint(id: string, updates: Partial<Sprint>): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('sprints')
    .update(sprintToUpdate(updates))
    .eq('id', id);
  if (error) console.error('[DB] updateSprint:', error.message);
  return !error;
}

export async function deleteSprint(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('sprints').delete().eq('id', id);
  if (error) console.error('[DB] deleteSprint:', error.message);
  return !error;
}
