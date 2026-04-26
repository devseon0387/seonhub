/**
 * 서버 prefetch 전용 bootstrap 헬퍼
 * RSC에서 `executeSpec`을 HTTP 왕복 없이 직접 호출해 초기 데이터를 한 번에 로드한다.
 */
import 'server-only';
import { executeSpec } from '@/lib/local-db/execute';
import { projectFromRow, type ProjectRow } from './projects';
import { partnerFromRow, type PartnerRow } from './partners';
import { clientFromRow, type ClientRow } from './clients';
import { episodeFromRow, type EpisodeRow } from './episodes';
import type { ChecklistRow } from './users';
import type { Project, Partner, Client, Episode } from '@/types';

export interface ManagementInitialData {
  projects: Project[];
  partners: Partner[];
  clients: Client[];
  episodes: (Episode & { projectId: string })[];
  checklists: ChecklistRow[];
}

async function selectAll<T>(table: string, orderCol = 'created_at', ascending = false): Promise<T[]> {
  const { data, error } = await executeSpec({
    table,
    action: 'select',
    columns: '*',
    filters: [],
    order: { col: orderCol, ascending },
  });
  if (error) {
    console.error(`[bootstrap] ${table}:`, error.message);
    return [];
  }
  return (data as T[]) ?? [];
}

export async function getManagementInitialData(): Promise<ManagementInitialData> {
  const [projectRows, partnerRows, clientRows, episodeRows, checklistRows] = await Promise.all([
    selectAll<ProjectRow>('projects'),
    selectAll<PartnerRow>('partners'),
    selectAll<ClientRow>('clients'),
    selectAll<EpisodeRow>('episodes'),
    selectAll<ChecklistRow>('checklists', 'created_at', true),
  ]);

  return {
    projects: projectRows.map(projectFromRow),
    partners: partnerRows.map(partnerFromRow),
    clients: clientRows.map(clientFromRow),
    episodes: episodeRows.map(episodeFromRow),
    checklists: checklistRows,
  };
}
