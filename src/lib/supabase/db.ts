/**
 * Supabase 데이터베이스 CRUD 레이어
 * 타입 매핑 (camelCase ↔ snake_case) 및 중첩 객체 직렬화 처리
 */
import { createClient } from './client';
import type {
  Project,
  Client,
  Partner,
  Episode,
  TrashItem,
  TrashItemType,
  WorkContentType,
  PortfolioItem,
} from '@/types';

// ─── Row Types (Supabase snake_case) ─────────────────────────

interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
  client: string | null;
  partner_id: string | null;
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
  created_at: string;
  updated_at: string;
}

interface ClientRow {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PartnerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  partner_type: string | null;
  role: string;
  status: string;
  generation: number | null;
  bank: string | null;
  bank_account: string | null;
  profile_image: string | null;
  created_at: string;
}

interface EpisodeRow {
  id: string;
  project_id: string;
  episode_number: number;
  title: string;
  description: string | null;
  client: string | null;
  work_content: string[] | null;
  work_items: unknown | null;
  status: string;
  assignee: string | null;
  manager: string | null;
  start_date: string | null;
  end_date: string | null;
  due_date: string | null;
  budget_total: number;
  budget_partner: number;
  budget_management: number;
  work_steps: unknown | null;
  work_budgets: unknown | null;
  created_at: string;
  updated_at: string;
}

interface TrashRow {
  id: string;
  type: string;
  data: unknown;
  original_project_id: string | null;
  deleted_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────

function projectFromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    client: row.client ?? '',
    partnerId: row.partner_id ?? '',
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function projectToInsert(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    title: project.title,
    description: project.description,
    client: project.client,
    partner_id: project.partnerId,
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
  };
}

function projectToUpdate(project: Partial<Project>) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (project.title !== undefined) row.title = project.title;
  if (project.description !== undefined) row.description = project.description;
  if (project.client !== undefined) row.client = project.client;
  if (project.partnerId !== undefined) row.partner_id = project.partnerId;
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
  return row;
}

function clientFromRow(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    company: row.company ?? undefined,
    address: row.address ?? undefined,
    status: row.status as Client['status'],
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function clientToInsert(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    name: client.name,
    contact_person: client.contactPerson ?? null,
    email: client.email ?? null,
    phone: client.phone ?? null,
    company: client.company ?? null,
    address: client.address ?? null,
    status: client.status,
    notes: client.notes ?? null,
  };
}

function clientToUpdate(client: Partial<Client>) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (client.name !== undefined) row.name = client.name;
  if (client.contactPerson !== undefined) row.contact_person = client.contactPerson;
  if (client.email !== undefined) row.email = client.email;
  if (client.phone !== undefined) row.phone = client.phone;
  if (client.company !== undefined) row.company = client.company;
  if (client.address !== undefined) row.address = client.address;
  if (client.status !== undefined) row.status = client.status;
  if (client.notes !== undefined) row.notes = client.notes;
  return row;
}

function partnerFromRow(row: PartnerRow): Partner {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    company: row.company ?? undefined,
    partnerType: row.partner_type as Partner['partnerType'],
    role: row.role as Partner['role'],
    status: row.status as Partner['status'],
    generation: row.generation ?? undefined,
    bank: row.bank ?? undefined,
    bankAccount: row.bank_account ?? undefined,
    profileImage: row.profile_image ?? undefined,
    createdAt: row.created_at,
  };
}

function partnerToInsert(partner: Omit<Partner, 'id' | 'createdAt'>) {
  return {
    name: partner.name,
    email: partner.email ?? null,
    phone: partner.phone ?? null,
    company: partner.company ?? null,
    partner_type: partner.partnerType ?? null,
    role: partner.role,
    status: partner.status,
    generation: partner.generation ?? null,
    bank: partner.bank ?? null,
    bank_account: partner.bankAccount ?? null,
    profile_image: partner.profileImage ?? null,
  };
}

function partnerToUpdate(partner: Partial<Partner>) {
  const row: Record<string, unknown> = {};
  if (partner.name !== undefined) row.name = partner.name;
  if (partner.email !== undefined) row.email = partner.email;
  if (partner.phone !== undefined) row.phone = partner.phone;
  if (partner.company !== undefined) row.company = partner.company;
  if (partner.partnerType !== undefined) row.partner_type = partner.partnerType;
  if (partner.role !== undefined) row.role = partner.role;
  if (partner.status !== undefined) row.status = partner.status;
  if (partner.generation !== undefined) row.generation = partner.generation;
  if (partner.bank !== undefined) row.bank = partner.bank;
  if (partner.bankAccount !== undefined) row.bank_account = partner.bankAccount;
  if (partner.profileImage !== undefined) row.profile_image = partner.profileImage;
  return row;
}

function episodeFromRow(row: EpisodeRow): Episode & { projectId: string } {
  return {
    id: row.id,
    projectId: row.project_id,
    episodeNumber: row.episode_number,
    title: row.title,
    description: row.description ?? undefined,
    client: row.client ?? undefined,
    workContent: (row.work_content as WorkContentType[]) ?? [],
    workItems: row.work_items as Episode['workItems'],
    status: row.status as Episode['status'],
    assignee: row.assignee ?? '',
    manager: row.manager ?? '',
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? undefined,
    dueDate: row.due_date ?? undefined,
    budget: {
      totalAmount: row.budget_total,
      partnerPayment: row.budget_partner,
      managementFee: row.budget_management,
    },
    workSteps: row.work_steps as Episode['workSteps'],
    workBudgets: row.work_budgets as Episode['workBudgets'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function episodeToInsert(episode: Episode & { projectId: string }) {
  return {
    id: episode.id,
    project_id: episode.projectId,
    episode_number: episode.episodeNumber,
    title: episode.title,
    description: episode.description ?? null,
    client: episode.client ?? null,
    work_content: episode.workContent ?? [],
    work_items: episode.workItems ?? null,
    status: episode.status,
    assignee: episode.assignee ?? null,
    manager: episode.manager ?? null,
    start_date: episode.startDate ?? null,
    end_date: episode.endDate ?? null,
    due_date: episode.dueDate ?? null,
    budget_total: episode.budget?.totalAmount ?? 0,
    budget_partner: episode.budget?.partnerPayment ?? 0,
    budget_management: episode.budget?.managementFee ?? 0,
    work_steps: episode.workSteps ?? null,
    work_budgets: episode.workBudgets ?? null,
  };
}

function trashFromRow(row: TrashRow): TrashItem {
  return {
    id: row.id,
    type: row.type as TrashItemType,
    data: row.data as TrashItem['data'],
    deletedAt: row.deleted_at,
    originalProjectId: row.original_project_id ?? undefined,
  };
}

// ─── Projects CRUD ────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as ProjectRow[]).map(projectFromRow);
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
  if (error || !data) { console.error('insertProject error:', error); return null; }
  return projectFromRow(data as ProjectRow);
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('projects')
    .update(projectToUpdate(updates))
    .eq('id', id);
  if (error) console.error('updateProject error:', error);
  return !error;
}

export async function deleteProject(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) console.error('deleteProject error:', error);
  return !error;
}

// ─── Clients CRUD ─────────────────────────────────────────────

export async function getClients(): Promise<Client[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as ClientRow[]).map(clientFromRow);
}

export async function insertClient(
  client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Client | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('clients')
    .insert([clientToInsert(client)])
    .select()
    .single();
  if (error || !data) { console.error('insertClient error:', error); return null; }
  return clientFromRow(data as ClientRow);
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('clients')
    .update(clientToUpdate(updates))
    .eq('id', id);
  if (error) console.error('updateClient error:', error);
  return !error;
}

export async function deleteClient(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) console.error('deleteClient error:', error);
  return !error;
}

// ─── Partners CRUD ────────────────────────────────────────────

export async function getPartners(): Promise<Partner[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as PartnerRow[]).map(partnerFromRow);
}

export async function insertPartner(
  partner: Omit<Partner, 'id' | 'createdAt'>
): Promise<Partner | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('partners')
    .insert([partnerToInsert(partner)])
    .select()
    .single();
  if (error || !data) { console.error('insertPartner error:', error); return null; }
  return partnerFromRow(data as PartnerRow);
}

export async function updatePartner(id: string, updates: Partial<Partner>): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('partners')
    .update(partnerToUpdate(updates))
    .eq('id', id);
  if (error) console.error('updatePartner error:', error);
  return !error;
}

export async function deletePartner(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('partners').delete().eq('id', id);
  if (error) console.error('deletePartner error:', error);
  return !error;
}

// ─── Episodes CRUD ────────────────────────────────────────────

export async function getAllEpisodes(): Promise<(Episode & { projectId: string })[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as EpisodeRow[]).map(episodeFromRow);
}

export async function getProjectEpisodes(
  projectId: string
): Promise<(Episode & { projectId: string })[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('project_id', projectId)
    .order('episode_number', { ascending: true });
  if (error || !data) return [];
  return (data as EpisodeRow[]).map(episodeFromRow);
}

export async function upsertEpisodes(
  episodes: (Episode & { projectId: string })[]
): Promise<boolean> {
  if (episodes.length === 0) return true;
  const supabase = createClient();
  const { error } = await supabase
    .from('episodes')
    .upsert(episodes.map(episodeToInsert), { onConflict: 'id' });
  if (error) console.error('upsertEpisodes error:', error);
  return !error;
}

export async function upsertEpisode(
  episode: Episode & { projectId: string }
): Promise<boolean> {
  return upsertEpisodes([episode]);
}

export async function deleteEpisode(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('episodes').delete().eq('id', id);
  if (error) console.error('deleteEpisode error:', error);
  return !error;
}

export async function deleteProjectEpisodes(projectId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('episodes')
    .delete()
    .eq('project_id', projectId);
  if (error) console.error('deleteProjectEpisodes error:', error);
  return !error;
}

// ─── Trash CRUD ───────────────────────────────────────────────

export async function getTrash(): Promise<TrashItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('trash')
    .select('*')
    .order('deleted_at', { ascending: false });
  if (error || !data) return [];
  return (data as TrashRow[]).map(trashFromRow);
}

export async function insertTrash(
  type: TrashItemType,
  data: TrashItem['data'],
  originalProjectId?: string
): Promise<TrashItem | null> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from('trash')
    .insert([{
      type,
      data,
      original_project_id: originalProjectId ?? null,
    }])
    .select()
    .single();
  if (error || !row) { console.error('insertTrash error:', error); return null; }
  return trashFromRow(row as TrashRow);
}

export async function deleteTrashItem(id: string): Promise<TrashItem | null> {
  const supabase = createClient();
  const { data, error: fetchError } = await supabase
    .from('trash')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError || !data) return null;

  const { error: deleteError } = await supabase.from('trash').delete().eq('id', id);
  if (deleteError) { console.error('deleteTrashItem error:', deleteError); return null; }
  return trashFromRow(data as TrashRow);
}

export async function permanentDeleteTrash(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('trash').delete().eq('id', id);
  if (error) console.error('permanentDeleteTrash error:', error);
  return !error;
}

export async function emptyTrashAll(): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('trash').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) console.error('emptyTrashAll error:', error);
  return !error;
}

// ─── Restore helpers (재삽입 with original ID) ───────────────

export async function restoreProjectToTable(project: Project): Promise<boolean> {
  const supabase = createClient();
  const row = {
    id: project.id,
    ...projectToInsert(project as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>),
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
  const { error } = await supabase.from('projects').upsert([row], { onConflict: 'id' });
  if (error) console.error('restoreProject error:', error);
  return !error;
}

export async function restoreClientToTable(client: Client): Promise<boolean> {
  const supabase = createClient();
  const row = {
    id: client.id,
    ...clientToInsert(client as Omit<Client, 'id' | 'createdAt' | 'updatedAt'>),
    created_at: client.createdAt,
    updated_at: client.updatedAt,
  };
  const { error } = await supabase.from('clients').upsert([row], { onConflict: 'id' });
  if (error) console.error('restoreClient error:', error);
  return !error;
}

export async function restorePartnerToTable(partner: Partner): Promise<boolean> {
  const supabase = createClient();
  const row = {
    id: partner.id,
    ...partnerToInsert(partner as Omit<Partner, 'id' | 'createdAt'>),
    created_at: partner.createdAt,
  };
  const { error } = await supabase.from('partners').upsert([row], { onConflict: 'id' });
  if (error) console.error('restorePartner error:', error);
  return !error;
}

export async function restoreEpisodeToTable(episode: Episode & { projectId: string }): Promise<boolean> {
  return upsertEpisode(episode);
}

export async function cleanupExpiredTrashItems(days = 30): Promise<number> {
  const supabase = createClient();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - days);

  const { data: expired } = await supabase
    .from('trash')
    .select('id')
    .lt('deleted_at', expiryDate.toISOString());

  if (!expired || expired.length === 0) return 0;

  const { error } = await supabase
    .from('trash')
    .delete()
    .lt('deleted_at', expiryDate.toISOString());

  if (error) { console.error('cleanupExpiredTrash error:', error); return 0; }
  return expired.length;
}

// ─── User Profiles ───────────────────────────────────────────

export async function getMyProfile(): Promise<{ id: string; role: string; name: string | null } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) return null;
  return data;
}

export async function upsertMyProfile(role: string, name: string): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('user_profiles')
    .upsert({ id: user.id, role, name }, { onConflict: 'id' });

  return !error;
}

export async function getAllUserProfiles(): Promise<{ id: string; role: string; name: string | null; email?: string }[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return [];
  return data || [];
}

export async function updateUserRole(userId: string, role: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('user_profiles')
    .update({ role })
    .eq('id', userId);

  return !error;
}

export async function deleteUserProfile(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', userId);

  return !error;
}

// ─── Custom Roles ─────────────────────────────────────────────

export async function getCustomRoles(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('custom_roles')
    .select('name')
    .order('created_at', { ascending: true });
  return (data ?? []).map((r: { name: string }) => r.name);
}

export async function addCustomRole(name: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('custom_roles').insert({ name });
  return !error;
}

export async function deleteCustomRole(name: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('custom_roles').delete().eq('name', name);
  return !error;
}

// ─── Portfolio CRUD ───────────────────────────────────────

interface PortfolioItemRow {
  id: string;
  title: string;
  description: string | null;
  client: string | null;
  partner_id: string | null;
  completed_at: string | null;
  tags: string[] | null;
  youtube_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

function portfolioItemFromRow(row: PortfolioItemRow): PortfolioItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    client: row.client ?? '',
    partnerId: row.partner_id ?? undefined,
    completedAt: row.completed_at ?? '',
    tags: row.tags ?? [],
    youtubeUrl: row.youtube_url ?? '',
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function portfolioItemToInsert(item: Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    title: item.title,
    description: item.description,
    client: item.client,
    partner_id: item.partnerId ?? null,
    completed_at: item.completedAt || null,
    tags: item.tags ?? [],
    youtube_url: item.youtubeUrl,
    is_published: item.isPublished,
  };
}

function portfolioItemToUpdate(item: Partial<PortfolioItem>) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (item.title !== undefined) row.title = item.title;
  if (item.description !== undefined) row.description = item.description;
  if (item.client !== undefined) row.client = item.client;
  if (item.partnerId !== undefined) row.partner_id = item.partnerId;
  if (item.completedAt !== undefined) row.completed_at = item.completedAt;
  if (item.tags !== undefined) row.tags = item.tags;
  if (item.youtubeUrl !== undefined) row.youtube_url = item.youtubeUrl;
  if (item.isPublished !== undefined) row.is_published = item.isPublished;
  return row;
}

export async function getPortfolioItems(publishedOnly?: boolean): Promise<PortfolioItem[]> {
  const supabase = createClient();
  let query = supabase.from('portfolio_items').select('*').order('created_at', { ascending: false });
  if (publishedOnly) query = query.eq('is_published', true);
  const { data, error } = await query;
  if (error || !data) return [];
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
  if (error || !data) { console.error('insertPortfolioItem error:', error); return null; }
  return portfolioItemFromRow(data as PortfolioItemRow);
}

export async function updatePortfolioItem(id: string, updates: Partial<PortfolioItem>): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('portfolio_items')
    .update(portfolioItemToUpdate(updates))
    .eq('id', id);
  if (error) console.error('updatePortfolioItem error:', error);
  return !error;
}

export async function deletePortfolioItem(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('portfolio_items').delete().eq('id', id);
  if (error) console.error('deletePortfolioItem error:', error);
  return !error;
}

export async function togglePortfolioPublished(id: string, isPublished: boolean): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('portfolio_items')
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('togglePortfolioPublished error:', error);
  return !error;
}

// ─── Checklists ───────────────────────────────────────────────

export interface ChecklistRow {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  reminder_time: string | null;
  notified: boolean;
  repeat_type: string | null;
  repeat_days: number[] | null;
  linked_episode_id: string | null;
  linked_episode_title: string | null;
  linked_episode_number: number | null;
  linked_project_id: string | null;
  linked_project_title: string | null;
  linked_client_name: string | null;
  linked_partner_id: string | null;
  linked_partner_name: string | null;
  created_at: string;
}

export async function getMyChecklists(): Promise<ChecklistRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('checklists')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return [];
  return data || [];
}

export async function insertChecklist(item: Omit<ChecklistRow, 'id' | 'user_id' | 'created_at'>): Promise<ChecklistRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('checklists')
    .insert({ ...item, user_id: 'local' })
    .select()
    .single();
  if (error) return null;
  return data;
}

export async function updateChecklist(id: string, updates: Partial<ChecklistRow>): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('checklists')
    .update(updates)
    .eq('id', id);
  return !error;
}

export async function deleteChecklist(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('checklists')
    .delete()
    .eq('id', id);
  return !error;
}

export async function clearCompletedChecklists(): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('checklists')
    .delete()
    .eq('completed', true);
  return !error;
}
