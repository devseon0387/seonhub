import { createClient } from '@/lib/supabase/server';

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
  const { data } = await supabase
    .from('strategy_groups')
    .insert({ id: group.id, name: group.name, emoji: group.emoji, created_at: now, updated_at: now })
    .select()
    .single();
  return toGroup(data!);
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
  const { data } = await supabase
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
  return toDoc(data!);
}

export async function dbUpdateDoc(id: string, updates: Partial<StrategyDoc>): Promise<StrategyDoc> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.emoji !== undefined) patch.emoji = updates.emoji;
  if (updates.blocks !== undefined) patch.blocks = updates.blocks;
  const { data } = await supabase
    .from('strategy_docs')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  return toDoc(data!);
}

export async function dbDeleteDoc(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from('strategy_docs').delete().eq('id', id);
}
