'use client';

import { useEffect, useState } from 'react';
import { PROJECT_BLUEPRINTS } from '@/projects/registry';

export type Importance = 'high' | 'mid' | 'low';
export type Owner = 'personal' | 'hype5' | 'vimo' | string;
export type ProjectType =
  | 'agent'
  | 'website'
  | 'program'
  | 'app'
  | 'library'
  | 'tool'
  | 'other';

export interface ProjectMetadata {
  displayName?: string;
  importance?: Importance;
  owner?: Owner;
  favorite?: boolean;
  type?: ProjectType;
  notes?: string;
  /** true이면 Dev Workspace 리스트에서 숨김 */
  hidden?: boolean;
}

const STORAGE_KEY = 'dev-project-metadata';
const LEGACY_NAMES_KEY = 'dev-project-names';
const EVENT_NAME = 'dev-metadata-changed';

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  high: '높음',
  mid: '보통',
  low: '낮음',
};
export const IMPORTANCE_COLOR: Record<Importance, string> = {
  high: '#ef4444',
  mid: '#f59e0b',
  low: '#a8a29e',
};

export const OWNER_LABEL: Record<string, string> = {
  personal: '개인',
  hype5: 'HYPE5',
  vimo: 'VIMO',
};
export const OWNER_COLOR: Record<string, string> = {
  personal: '#78716c',
  hype5: '#7c3aed',
  vimo: '#1e3a8a',
};
export const OWNER_OPTIONS: Owner[] = ['personal', 'hype5', 'vimo'];

export const TYPE_LABEL: Record<ProjectType, string> = {
  agent: '에이전트',
  website: '웹사이트',
  program: '프로그램',
  app: '앱',
  library: '라이브러리',
  tool: '도구',
  other: '기타',
};
export const TYPE_OPTIONS: ProjectType[] = ['agent', 'website', 'program', 'app', 'library', 'tool', 'other'];

function readAll(): Record<string, ProjectMetadata> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let data = raw ? (JSON.parse(raw) as Record<string, ProjectMetadata>) : {};

    // 기존 `dev-project-names` 에 저장된 값 1회 마이그레이션
    const legacyRaw = localStorage.getItem(LEGACY_NAMES_KEY);
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw) as Record<string, string>;
        for (const [id, name] of Object.entries(legacy)) {
          if (!data[id]) data[id] = {};
          if (!data[id].displayName) data[id].displayName = name;
        }
        localStorage.removeItem(LEGACY_NAMES_KEY);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {}
    }
    return data;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, ProjectMetadata>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event(EVENT_NAME));
}

/** 하나의 프로젝트 메타데이터 훅 (registry defaults + user override 머지) */
export function useProjectMetadata(id: string): [
  ProjectMetadata,
  (patch: Partial<ProjectMetadata> | null) => void,
] {
  const [override, setOverride] = useState<ProjectMetadata>({});

  useEffect(() => {
    const sync = () => setOverride(readAll()[id] ?? {});
    sync();
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener('storage', sync);
    };
  }, [id]);

  const defaults = PROJECT_BLUEPRINTS[id]?.defaults ?? {};
  const meta: ProjectMetadata = { ...defaults, ...override };

  const update = (patch: Partial<ProjectMetadata> | null) => {
    const all = readAll();
    if (patch === null) {
      delete all[id];
    } else {
      const current = all[id] ?? {};
      const next: ProjectMetadata = { ...current, ...patch };
      // 빈 값이면 해당 필드 제거
      (Object.keys(patch) as (keyof ProjectMetadata)[]).forEach((k) => {
        const v = patch[k];
        if (v === undefined || v === null || v === '' || v === false) {
          if (k === 'favorite' && v === false) delete next.favorite;
          else if (k !== 'favorite' && (v === undefined || v === null || v === '')) delete next[k];
        }
      });
      if (Object.keys(next).length === 0) delete all[id];
      else all[id] = next;
    }
    writeAll(all);
  };

  return [meta, update];
}

/** 전체 메타데이터 맵 훅 (필터링용) */
export function useAllProjectMetadata(): Record<string, ProjectMetadata> {
  const [all, setAll] = useState<Record<string, ProjectMetadata>>({});
  useEffect(() => {
    const sync = () => setAll(readAll());
    sync();
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return all;
}
