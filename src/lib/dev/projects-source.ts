import { scanDevProjects, type DevProject, type ScanResult } from './scan-projects';
import { getSupabase } from '@/lib/local-db/db';

const USE_CACHE = !!process.env.VERCEL;

interface DevProjectRow {
  id: string;
  name: string;
  path: string | null;
  abs_path: string | null;
  description: string | null;
  tech_stack: unknown;
  dev_port: number | null;
  is_running: number | null;
  last_modified: number | null;
  git_branch: string | null;
  has_git: number | null;
  has_package_json: number | null;
  has_design_system: number | null;
  has_wireframes: number | null;
  has_roadmap: number | null;
  has_erd: number | null;
  favicon_url: string | null;
  detected_services: unknown;
  git_dirty: number | null;
  git_ahead: number | null;
  git_behind: number | null;
  synced_at: string | null;
}

function rowToProject(r: DevProjectRow): DevProject {
  const parse = (v: unknown) => {
    if (typeof v === 'string') {
      try { return JSON.parse(v); } catch { return v; }
    }
    return v;
  };
  return {
    id: r.id,
    name: r.name,
    path: r.path ?? '',
    absPath: r.abs_path ?? '',
    description: r.description,
    techStack: (parse(r.tech_stack) as string[]) ?? [],
    devPort: r.dev_port,
    isRunning: !!r.is_running,
    lastModified: r.last_modified ?? 0,
    gitBranch: r.git_branch,
    hasGit: !!r.has_git,
    hasPackageJson: !!r.has_package_json,
    hasDesignSystem: !!r.has_design_system,
    hasWireframes: !!r.has_wireframes,
    hasRoadmap: !!r.has_roadmap,
    hasERD: !!r.has_erd,
    faviconUrl: r.favicon_url,
    detectedServices: (parse(r.detected_services) as DevProject['detectedServices']) ?? null,
    gitDirty: r.git_dirty,
    gitAhead: r.git_ahead,
    gitBehind: r.git_behind,
  };
}

export interface DevProjectsResult extends ScanResult {
  syncMeta?: {
    last_sync_at: string | null;
    last_sync_count: number | null;
    last_sync_host: string | null;
  } | null;
}

async function readFromCache(): Promise<DevProjectsResult> {
  const sb = getSupabase();
  const { data, error } = await sb.from('dev_projects').select('*').order('name');
  if (error) throw new Error(error.message);
  const projects = (data ?? []).map((r) => rowToProject(r as unknown as DevProjectRow));
  const { data: meta } = await sb.from('dev_sync_meta').select('last_sync_at, last_sync_count, last_sync_host').eq('id', 1).maybeSingle();
  return {
    root: '~/Desktop/Dev',
    count: projects.length,
    projects,
    syncMeta: (meta as DevProjectsResult['syncMeta']) ?? null,
  };
}

export async function getDevProjects(): Promise<DevProjectsResult> {
  return USE_CACHE ? readFromCache() : scanDevProjects();
}
