import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/** 인증 + 역할 확인. 실패 시 NextResponse 에러를 반환 */
export async function requireAuth(): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: '인증 필요' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, approved')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.approved !== true)) {
    return { ok: false, response: NextResponse.json({ error: '권한 없음' }, { status: 403 }) };
  }
  return { ok: true };
}

export interface StrategyGroup {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyBlock {
  id: string;
  type: string;
  content: string;
  checked: boolean;
}

export interface StrategyDoc {
  id: string;
  groupId: string;
  title: string;
  emoji: string;
  blocks: StrategyBlock[];
  createdAt: string;
  updatedAt: string;
}

function toGroup(row: Record<string, string>): StrategyGroup {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDoc(row: Record<string, unknown>): StrategyDoc {
  return {
    id: row.id as string,
    groupId: row.group_id as string,
    title: row.title as string,
    emoji: row.emoji as string,
    blocks: (row.blocks as StrategyBlock[]) || [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function dbGetGroups(): Promise<StrategyGroup[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('strategy_groups')
    .select('*')
    .order('created_at');
  return (data || []).map(toGroup);
}

export async function dbGetGroup(id: string): Promise<StrategyGroup | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('strategy_groups')
    .select('*')
    .eq('id', id)
    .single();
  return data ? toGroup(data) : null;
}

export async function dbCreateGroup(group: { id: string; name: string; emoji: string }): Promise<StrategyGroup> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('strategy_groups')
    .insert({ id: group.id, name: group.name, emoji: group.emoji, created_at: now, updated_at: now })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Group 생성 실패');
  return toGroup(data);
}

export async function dbUpdateGroup(id: string, updates: { name?: string; emoji?: string }): Promise<StrategyGroup> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name  !== undefined) patch.name  = updates.name;
  if (updates.emoji !== undefined) patch.emoji = updates.emoji;
  const { data, error } = await supabase
    .from('strategy_groups')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Group 수정 실패');
  return toGroup(data);
}

export async function dbDeleteGroup(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from('strategy_groups').delete().eq('id', id);
}

export async function dbGetDocs(groupId?: string): Promise<StrategyDoc[]> {
  const supabase = await createClient();
  const query = supabase
    .from('strategy_docs')
    .select('*')
    .order('updated_at', { ascending: false });
  const { data } = groupId ? await query.eq('group_id', groupId) : await query;
  return (data || []).map(toDoc);
}

export async function dbGetDoc(id: string): Promise<StrategyDoc | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('strategy_docs')
    .select('*')
    .eq('id', id)
    .single();
  return data ? toDoc(data) : null;
}

export async function dbCreateDoc(doc: StrategyDoc): Promise<StrategyDoc> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('strategy_docs')
    .insert({
      id: doc.id,
      group_id: doc.groupId,
      title: doc.title,
      emoji: doc.emoji,
      blocks: doc.blocks,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Doc 생성 실패');
  return toDoc(data);
}

export async function dbUpdateDoc(id: string, updates: Partial<StrategyDoc>): Promise<StrategyDoc> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.emoji !== undefined) patch.emoji = updates.emoji;
  if (updates.blocks !== undefined) patch.blocks = updates.blocks;
  const { data, error } = await supabase
    .from('strategy_docs')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Doc 수정 실패');
  return toDoc(data);
}

export async function dbDeleteDoc(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from('strategy_docs').delete().eq('id', id);
}
