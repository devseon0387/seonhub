const uid = () => Math.random().toString(36).slice(2, 10);

export interface StrategyGroup {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyDoc {
  id: string;
  groupId: string;
  title: string;
  emoji: string;
  blocks: unknown[];
  createdAt: string;
  updatedAt: string;
}

export const strategyApi = {
  async getGroups(): Promise<StrategyGroup[]> {
    const r = await fetch('/api/strategy/groups');
    return r.json();
  },

  async getGroup(id: string): Promise<StrategyGroup | null> {
    const r = await fetch(`/api/strategy/groups/${id}`);
    if (!r.ok) return null;
    return r.json();
  },

  async createGroup(name: string, emoji: string): Promise<StrategyGroup> {
    const r = await fetch('/api/strategy/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: uid(), name, emoji }),
    });
    return r.json();
  },

  async deleteGroup(id: string): Promise<void> {
    await fetch(`/api/strategy/groups/${id}`, { method: 'DELETE' });
  },

  async getDocs(groupId: string): Promise<StrategyDoc[]> {
    const r = await fetch(`/api/strategy/docs?groupId=${groupId}`);
    return r.json();
  },

  async getDoc(id: string): Promise<StrategyDoc | null> {
    const r = await fetch(`/api/strategy/docs/${id}`);
    if (!r.ok) return null;
    return r.json();
  },

  async createDoc(groupId: string, title = '새 페이지', emoji = '📝'): Promise<StrategyDoc> {
    const r = await fetch('/api/strategy/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: uid(),
        groupId,
        title,
        emoji,
        blocks: [{ id: uid(), type: 'paragraph', content: '', checked: false }],
      }),
    });
    return r.json();
  },

  async updateDoc(id: string, updates: Partial<StrategyDoc>): Promise<StrategyDoc> {
    const r = await fetch(`/api/strategy/docs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return r.json();
  },

  async deleteDoc(id: string): Promise<void> {
    await fetch(`/api/strategy/docs/${id}`, { method: 'DELETE' });
  },

  getDocCount(groupId: string, allDocs: StrategyDoc[]): number {
    return allDocs.filter(d => d.groupId === groupId).length;
  },
};
