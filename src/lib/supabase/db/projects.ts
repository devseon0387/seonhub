/**
 * Projects CRUD
 */
import { createClient } from '../client';
import type { Project, ProjectMeta, ProjectType, WorkContentType } from '@/types';

// ─── Row Types (Supabase snake_case) ─────────────────────────

export interface ProjectRow {
  id: string;
  title: string;
  type: string | null;
  description: string | null;
  client: string | null;
  client_id: string | null;
  partner_id: string | null;
  partner_ids: string[] | null;
  manager_ids: string[] | null;
  category: string | null;
  channels: string[] | null;
  status: string;
  total_amount: number;
  partner_payment: number;
  management_fee: number;
  margin_rate: number;
  work_content: string[] | null;
  tags: string[] | null;
  thumbnail_url: string | null;
  video_url: string | null;
  completed_at: string | null;
  work_type_costs: Record<string, unknown> | null;
  meta: ProjectMeta | string | null;
  created_at: string;
  updated_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────

export function projectFromRow(row: ProjectRow): Project {
  const partnerIds = row.partner_ids ?? (row.partner_id ? [row.partner_id] : []);
  let meta: ProjectMeta | undefined;
  if (row.meta != null) {
    if (typeof row.meta === 'string') {
      try { meta = JSON.parse(row.meta) as ProjectMeta; } catch { meta = undefined; }
    } else {
      meta = row.meta as ProjectMeta;
    }
  }
  return {
    id: row.id,
    title: row.title,
    type: (row.type as ProjectType) ?? 'video',
    description: row.description ?? '',
    client: row.client ?? '',
    clientId: row.client_id ?? undefined,
    partnerId: row.partner_id ?? partnerIds[0] ?? '',
    partnerIds,
    managerIds: row.manager_ids ?? [],
    category: row.category ?? undefined,
    channels: row.channels ?? undefined,
    status: row.status as Project['status'],
    budget: {
      totalAmount: row.total_amount,
      partnerPayment: row.partner_payment,
      managementFee: row.management_fee,
      marginRate: row.margin_rate,
    },
    workContent: (row.work_content as WorkContentType[]) ?? [],
    tags: row.tags ?? [],
    thumbnailUrl: row.thumbnail_url ?? undefined,
    videoUrl: row.video_url ?? undefined,
    completedAt: row.completed_at ?? undefined,
    workTypeCosts: row.work_type_costs as Project['workTypeCosts'],
    meta,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function projectToInsert(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) {
  const partnerIds = project.partnerIds ?? (project.partnerId ? [project.partnerId] : []);
  return {
    title: project.title,
    type: project.type ?? 'video',
    description: project.description,
    client: project.client,
    partner_id: partnerIds[0] ?? project.partnerId ?? null,
    partner_ids: partnerIds,
    manager_ids: project.managerIds ?? [],
    category: project.category ?? null,
    status: project.status,
    total_amount: project.budget?.totalAmount ?? 0,
    partner_payment: project.budget?.partnerPayment ?? 0,
    management_fee: project.budget?.managementFee ?? 0,
    margin_rate: project.budget?.marginRate ?? 0,
    work_content: project.workContent ?? [],
    tags: project.tags ?? [],
    thumbnail_url: project.thumbnailUrl ?? null,
    video_url: project.videoUrl ?? null,
    completed_at: project.completedAt ?? null,
    work_type_costs: project.workTypeCosts ?? null,
    meta: project.meta ?? null,
  };
}

export function projectToUpdate(project: Partial<Project>) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (project.title !== undefined) row.title = project.title;
  if (project.type !== undefined) row.type = project.type;
  if (project.description !== undefined) row.description = project.description;
  if (project.client !== undefined) row.client = project.client;
  if (project.partnerIds !== undefined) {
    row.partner_ids = project.partnerIds;
    row.partner_id = project.partnerIds[0] ?? null;
  } else if (project.partnerId !== undefined) {
    row.partner_id = project.partnerId;
  }
  if (project.managerIds !== undefined) row.manager_ids = project.managerIds;
  if (project.category !== undefined) row.category = project.category;
  if (project.status !== undefined) row.status = project.status;
  if (project.budget) {
    row.total_amount = project.budget.totalAmount;
    row.partner_payment = project.budget.partnerPayment;
    row.management_fee = project.budget.managementFee;
    row.margin_rate = project.budget.marginRate;
  }
  if (project.workContent !== undefined) row.work_content = project.workContent;
  if (project.tags !== undefined) row.tags = project.tags;
  if (project.thumbnailUrl !== undefined) row.thumbnail_url = project.thumbnailUrl;
  if (project.videoUrl !== undefined) row.video_url = project.videoUrl;
  if (project.completedAt !== undefined) row.completed_at = project.completedAt;
  if (project.workTypeCosts !== undefined) row.work_type_costs = project.workTypeCosts;
  if (project.meta !== undefined) row.meta = project.meta ?? null;
  return row;
}

// ─── CRUD ────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('[DB] getProjects:', error.message); return []; }
  if (!data) return [];
  return (data as ProjectRow[]).map(projectFromRow);
}

export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  if (error) { console.error('[DB] getProjectById:', error.message); return null; }
  if (!data) return null;
  return projectFromRow(data as ProjectRow);
}

export async function insertProject(
  project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Project | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .insert([projectToInsert(project)])
    .select()
    .single();
  if (error) { console.error('[DB] insertProject:', error.message, error.details, error.hint, error.code); return null; }
  if (!data) return null;
  return projectFromRow(data as ProjectRow);
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('projects')
    .update(projectToUpdate(updates))
    .eq('id', id);
  if (error) console.error('[DB] updateProject:', error.message);
  return !error;
}

export async function deleteProject(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) console.error('[DB] deleteProject:', error.message);
  return !error;
}
