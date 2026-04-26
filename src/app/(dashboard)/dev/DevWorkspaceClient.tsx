'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ExternalLink, FolderOpen, LayoutGrid, List, Rows3, RefreshCw,
  Search, Pencil, Palette, Frame, Star, Network,
} from 'lucide-react';
import { PROJECT_BLUEPRINTS } from '@/projects/registry';
import EditableProjectName from '@/components/EditableProjectName';
import ProjectMetaEditor, { ProjectMetaBadges, ProjectNote } from '@/components/ProjectMetaEditor';
import GitLogPopover from '@/components/GitLogPopover';
import { useAllProjectMetadata, OWNER_OPTIONS, OWNER_LABEL, TYPE_OPTIONS, TYPE_LABEL } from '@/lib/dev/project-metadata';

import type { DevProject } from '@/lib/dev/scan-projects';
import { getProjectBlueprints } from '@/projects/registry';
import { mergeServices, type ProjectServices } from '@/projects/services';

type ViewMode = 'cards' | 'compact' | 'table';
type SortKey = 'recent' | 'name' | 'importance' | 'git';
type SectionKey = 'favorite' | 'running' | 'normal' | 'idle';
const VIEW_STORAGE_KEY = 'dev-view-mode';
const SORT_STORAGE_KEY = 'dev-sort-key';

const SORT_LABEL: Record<SortKey, string> = {
  recent: '최근 수정순',
  name: '이름순',
  importance: '중요도순',
  git: 'Git 작업량순',
};

const SECTION_CONFIG: Record<SectionKey, { label: string; order: number }> = {
  favorite: { label: '⭐ 즐겨찾기', order: 0 },
  running: { label: '🔥 실행 중', order: 1 },
  normal: { label: '📁 일반', order: 2 },
  idle: { label: '💤 유휴 (30일+)', order: 3 },
};

const IMPORTANCE_RANK: Record<string, number> = { high: 0, mid: 1, low: 2 };

/** 사용자 override + registry defaults 머지 */
function getMergedMeta(id: string, allMeta: Record<string, ProjectMetadata>): ProjectMetadata {
  const defaults = PROJECT_BLUEPRINTS[id]?.defaults ?? {};
  const override = allMeta[id] ?? {};
  return { ...defaults, ...override };
}

function getSection(p: DevProject, fav: boolean): SectionKey {
  if (fav) return 'favorite';
  if (p.isRunning) return 'running';
  if (isIdleProject(p)) return 'idle';
  return 'normal';
}
type FilterKind =
  | 'all'
  | 'running'
  | 'nextjs'
  | 'python'
  | 'cpp'
  | 'recent'
  | 'favorite'
  | `owner:${string}`
  | `type:${string}`;

interface InitialData {
  root: string;
  projects: DevProject[];
}

const POLL_INTERVAL_MS = 60_000;
const IDLE_THRESHOLD_MS = 30 * 86400_000; // 30일

function isIdleProject(p: DevProject): boolean {
  return Date.now() - p.lastModified > IDLE_THRESHOLD_MS;
}

const SERVICE_COLORS: Record<string, string> = {
  vercel: '#000000',
  cloudflare: '#f48120',
  netlify: '#00ad9f',
  railway: '#8b5cf6',
  fly: '#825cf0',
  self: '#57534e',
  local: '#a8a29e',
  supabase: '#3ecf8e',
  sqlite: '#003b57',
  postgres: '#336791',
  mysql: '#4479a1',
  planetscale: '#000000',
  firestore: '#f59e0b',
  mongodb: '#47a248',
  json: '#78716c',
  none: '#a8a29e',
  github: '#24292f',
  gitlab: '#fc6d26',
  bitbucket: '#2684ff',
};

const PLATFORM_ICON: Record<string, string> = {
  vercel: 'vercel.svg',
  cloudflare: 'cloudflare.svg',
  netlify: 'netlify.svg',
  railway: 'railway.svg',
  fly: 'flydotio.svg',
  supabase: 'supabase.svg',
  sqlite: 'sqlite.svg',
  postgres: 'postgresql.svg',
  mysql: 'mysql.svg',
  planetscale: 'planetscale.svg',
  firestore: 'firebase.svg',
  mongodb: 'mongodb.svg',
  github: 'github.svg',
  gitlab: 'gitlab.svg',
  bitbucket: 'bitbucket.svg',
};

const SERVICE_LABEL: Record<string, string> = {
  vercel: 'Vercel',
  cloudflare: 'Cloudflare',
  netlify: 'Netlify',
  railway: 'Railway',
  fly: 'Fly.io',
  self: '자체 호스팅',
  local: '로컬 전용',
  supabase: 'Supabase',
  sqlite: 'SQLite',
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  planetscale: 'PlanetScale',
  firestore: 'Firestore',
  mongodb: 'MongoDB',
  json: 'JSON 파일',
  none: '—',
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
};

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const day = 86400_000;
  if (diff < 60_000) return '방금';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < day) return `${Math.floor(diff / 3600_000)}시간 전`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}일 전`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}주 전`;
  return `${Math.floor(diff / (30 * day))}개월 전`;
}

const ICON_GRADIENTS: Array<[string, string]> = [
  ['#1e3a8a', '#3b82f6'], ['#7c3aed', '#a78bfa'], ['#0f172a', '#64748b'],
  ['#7c2d12', '#ea580c'], ['#166534', '#22c55e'], ['#9f1239', '#e11d48'],
  ['#a16207', '#eab308'], ['#365314', '#65a30d'], ['#4c1d95', '#8b5cf6'],
  ['#0f766e', '#14b8a6'], ['#7f1d1d', '#dc2626'], ['#312e81', '#4f46e5'],
  ['#0c4a6e', '#0ea5e9'], ['#6b21a8', '#d946ef'], ['#713f12', '#a16207'],
];

function pickGradient(seed: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return ICON_GRADIENTS[Math.abs(hash) % ICON_GRADIENTS.length];
}

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  // 한글 첫 글자
  if (/[\uAC00-\uD7AF]/.test(trimmed[0])) return trimmed[0];
  // 하이픈/언더스코어로 분리된 경우 각 파트 첫 글자
  const parts = trimmed.split(/[-_\s]+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

export default function DevWorkspaceClient({ initialData }: { initialData: InitialData }) {
  const [projects, setProjects] = useState<DevProject[]>(initialData.projects);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [root, setRoot] = useState(initialData.root);
  const [view, setViewState] = useState<ViewMode>('cards');
  const [sort, setSortState] = useState<SortKey>('recent');

  useEffect(() => {
    const vStored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (vStored === 'cards' || vStored === 'compact' || vStored === 'table') {
      setViewState(vStored);
    }
    const sStored = localStorage.getItem(SORT_STORAGE_KEY);
    if (sStored === 'recent' || sStored === 'name' || sStored === 'importance' || sStored === 'git') {
      setSortState(sStored);
    }
  }, []);

  const setView = (v: ViewMode | ((prev: ViewMode) => ViewMode)) => {
    setViewState((prev) => {
      const next = typeof v === 'function' ? v(prev) : v;
      localStorage.setItem(VIEW_STORAGE_KEY, next);
      return next;
    });
  };
  const setSort = (s: SortKey) => {
    setSortState(s);
    localStorage.setItem(SORT_STORAGE_KEY, s);
  };
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKind>('all');
  const [showHidden, setShowHidden] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dev/projects', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setProjects(json.projects || []);
      setRoot(json.root || '~/Desktop/Dev');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 초기 데이터는 서버에서 prefetch됨. 탭이 보일 때만 60초 폴링.
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(fetchProjects, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer) { clearInterval(timer); timer = null; }
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else { fetchProjects(); start(); }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, []);

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const router = useRouter();

  const stats = useMemo(() => {
    const techCounts: Record<string, number> = {};
    let running = 0;
    let recent = 0;
    let dirty = 0;
    let ahead = 0;
    let behind = 0;
    const weekAgo = Date.now() - 7 * 86400_000;
    for (const p of projects) {
      if (p.isRunning) running++;
      if (p.lastModified >= weekAgo) recent++;
      if ((p.gitDirty ?? 0) > 0) dirty++;
      if ((p.gitAhead ?? 0) > 0) ahead++;
      if ((p.gitBehind ?? 0) > 0) behind++;
      for (const t of p.techStack) techCounts[t] = (techCounts[t] ?? 0) + 1;
    }
    const topTech = Object.entries(techCounts).sort((a, b) => b[1] - a[1])[0];
    const nextCount = Object.entries(techCounts)
      .filter(([k]) => k.startsWith('Next.js'))
      .reduce((sum, [, v]) => sum + v, 0);
    const pyCount = techCounts['Python'] ?? 0;
    const cppCount = techCounts['C++'] ?? 0;
    return {
      total: projects.length,
      running,
      recent,
      dirty,
      ahead,
      behind,
      topTech: topTech ? `${topTech[0]} ${topTech[1]}` : '—',
      nextCount,
      pyCount,
      cppCount,
    };
  }, [projects]);

  const allMeta = useAllProjectMetadata();

  const filtered = useMemo(() => {
    // 검색 쿼리 파싱: `tech:next owner:hype5 키워드` 형식
    const tokens = search.trim().split(/\s+/).filter(Boolean);
    const fieldFilters: { key: string; value: string }[] = [];
    const freeTextTerms: string[] = [];
    for (const tok of tokens) {
      const m = tok.match(/^([a-z]+):(.+)$/i);
      if (m) fieldFilters.push({ key: m[1].toLowerCase(), value: m[2].toLowerCase() });
      else freeTextTerms.push(tok.toLowerCase());
    }

    const weekAgo = Date.now() - 7 * 86400_000;

    return projects.filter((p) => {
      const meta = getMergedMeta(p.id, allMeta);
      if (meta.hidden && !showHidden) return false;
      const services = mergeServices(
        getProjectBlueprints(p.id)?.services,
        p.detectedServices ?? undefined,
      );

      // 자유 텍스트 — 모든 단어가 하나라도 매칭 되면 통과 (AND)
      if (freeTextTerms.length > 0) {
        const hay = [
          p.name,
          p.path,
          p.description ?? '',
          p.techStack.join(' '),
          meta?.displayName ?? '',
          meta?.notes ?? '',
        ]
          .join(' ')
          .toLowerCase();
        for (const term of freeTextTerms) {
          if (!hay.includes(term)) return false;
        }
      }

      // 필드 필터 — 모두 AND
      for (const { key, value } of fieldFilters) {
        switch (key) {
          case 'tech':
            if (!p.techStack.some((t) => t.toLowerCase().includes(value))) return false;
            break;
          case 'owner':
            if ((meta?.owner ?? '').toLowerCase() !== value) return false;
            break;
          case 'type':
            if ((meta?.type ?? '').toLowerCase() !== value) return false;
            break;
          case 'importance':
          case 'imp':
            if ((meta?.importance ?? '').toLowerCase() !== value) return false;
            break;
          case 'deploy':
            if ((services?.deploy?.platform ?? '').toLowerCase() !== value) return false;
            break;
          case 'db':
            if ((services?.db?.platform ?? '').toLowerCase() !== value) return false;
            break;
          case 'vcs':
            if ((services?.vcs?.platform ?? '').toLowerCase() !== value) return false;
            break;
          case 'fav':
          case 'favorite':
            if (!!meta?.favorite !== (value === 'true' || value === '1' || value === 'y')) return false;
            break;
          case 'running':
            if (p.isRunning !== (value === 'true' || value === '1' || value === 'y')) return false;
            break;
          case 'dirty':
            if (((p.gitDirty ?? 0) > 0) !== (value === 'true' || value === '1' || value === 'y')) return false;
            break;
          case 'branch':
            if (!(p.gitBranch ?? '').toLowerCase().includes(value)) return false;
            break;
          default:
            // unknown key → ignore gracefully
            break;
        }
      }

      // 필터 칩
      if (filter === 'all') return true;
      if (filter === 'running') return p.isRunning;
      if (filter === 'recent') return p.lastModified >= weekAgo;
      if (filter === 'nextjs') return p.techStack.some((t) => t.startsWith('Next.js'));
      if (filter === 'python') return p.techStack.includes('Python');
      if (filter === 'cpp') return p.techStack.includes('C++');
      if (filter === 'favorite') return meta?.favorite === true;
      if (filter.startsWith('owner:')) return meta?.owner === filter.slice('owner:'.length);
      if (filter.startsWith('type:')) return meta?.type === filter.slice('type:'.length);
      return true;
    });
  }, [projects, search, filter, allMeta, showHidden]);

  // 정렬 (sort 기준)
  const sorted = useMemo(() => {
    const cmp = (a: DevProject, b: DevProject) => {
      if (sort === 'name') {
        const an = getMergedMeta(a.id, allMeta).displayName ?? a.name;
        const bn = getMergedMeta(b.id, allMeta).displayName ?? b.name;
        return an.localeCompare(bn, 'ko');
      }
      if (sort === 'importance') {
        const ar = IMPORTANCE_RANK[getMergedMeta(a.id, allMeta).importance ?? ''] ?? 3;
        const br = IMPORTANCE_RANK[getMergedMeta(b.id, allMeta).importance ?? ''] ?? 3;
        if (ar !== br) return ar - br;
        return b.lastModified - a.lastModified;
      }
      if (sort === 'git') {
        const av = (a.gitDirty ?? 0) + (a.gitAhead ?? 0) + (a.gitBehind ?? 0);
        const bv = (b.gitDirty ?? 0) + (b.gitAhead ?? 0) + (b.gitBehind ?? 0);
        if (av !== bv) return bv - av;
        return b.lastModified - a.lastModified;
      }
      return b.lastModified - a.lastModified;
    };
    return [...filtered].sort(cmp);
  }, [filtered, allMeta, sort]);

  // 섹션으로 그룹핑
  const sections = useMemo(() => {
    const buckets: Record<SectionKey, DevProject[]> = { favorite: [], running: [], normal: [], idle: [] };
    for (const p of sorted) {
      const key = getSection(p, !!getMergedMeta(p.id, allMeta).favorite);
      buckets[key].push(p);
    }
    return (Object.keys(buckets) as SectionKey[])
      .map((key) => ({ key, label: SECTION_CONFIG[key].label, items: buckets[key] }))
      .filter((s) => s.items.length > 0)
      .sort((a, b) => SECTION_CONFIG[a.key].order - SECTION_CONFIG[b.key].order);
  }, [sorted, allMeta]);

  // 단축키: ⌘K 검색, ⌘/ 뷰 토글, ↑↓ 이동, Enter 드릴인, F 즐겨찾기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      const typing = tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        (document.getElementById('dev-search') as HTMLInputElement | null)?.focus();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setView((v) => (v === 'cards' ? 'compact' : v === 'compact' ? 'table' : 'cards'));
        return;
      }

      if (typing) return;

      const flat = sections.flatMap((s) => s.items);
      if (flat.length === 0) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const curIdx = focusedId ? flat.findIndex((p) => p.id === focusedId) : -1;
        const nextIdx =
          e.key === 'ArrowDown'
            ? Math.min(flat.length - 1, curIdx < 0 ? 0 : curIdx + 1)
            : Math.max(0, curIdx < 0 ? 0 : curIdx - 1);
        setFocusedId(flat[nextIdx]?.id ?? null);
        return;
      }
      if (e.key === 'Enter' && focusedId) {
        e.preventDefault();
        router.push(`/dev/${encodeURIComponent(focusedId)}`);
        return;
      }
      if ((e.key === 'f' || e.key === 'F') && focusedId) {
        e.preventDefault();
        try {
          const raw = localStorage.getItem('dev-project-metadata');
          const all = raw ? JSON.parse(raw) : {};
          const cur = all[focusedId] ?? {};
          const next = { ...cur, favorite: !cur.favorite };
          if (!next.favorite) delete next.favorite;
          if (Object.keys(next).length === 0) delete all[focusedId];
          else all[focusedId] = next;
          localStorage.setItem('dev-project-metadata', JSON.stringify(all));
          window.dispatchEvent(new Event('dev-metadata-changed'));
        } catch {}
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId, sections, router]);

  // 필터 카운트
  const metaCounts = useMemo(() => {
    let fav = 0;
    const byOwner: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const p of projects) {
      const m = getMergedMeta(p.id, allMeta);
      if (m.favorite) fav++;
      if (m.owner) byOwner[m.owner] = (byOwner[m.owner] ?? 0) + 1;
      if (m.type) byType[m.type] = (byType[m.type] ?? 0) + 1;
    }
    return { fav, byOwner, byType };
  }, [projects, allMeta]);

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dev Workspace</h1>
          <p className="text-gray-500 mt-1 text-sm">
            <span className="font-mono text-xs text-gray-400">{root}</span>
            <span className="mx-2">·</span>
            내 개발 프로젝트 한눈에 보기
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              id="dev-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="검색 · tech:next owner:hype5 deploy:vercel dirty:true (⌘K)"
              className="w-60 pl-8 pr-3 py-2 text-sm bg-white border border-[#ede9e6] rounded-lg focus:outline-none focus:border-[#1e3a8a]"
            />
          </div>

          {/* 숨김 프로젝트 토글 */}
          <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="rounded border-gray-300 text-[#1e3a8a] focus:ring-0"
            />
            숨김 표시
          </label>

          {/* 정렬 드롭다운 */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="text-xs font-medium bg-white border border-[#ede9e6] rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-[#1e3a8a]"
            title="정렬 기준"
          >
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
              <option key={k} value={k}>{SORT_LABEL[k]}</option>
            ))}
          </select>

          {/* 뷰 토글 */}
          <div className="inline-flex gap-0 bg-[#f5f5f4] border border-[#ede9e6] rounded-lg p-0.5">
            <button
              onClick={() => setView('cards')}
              title="카드 뷰"
              className={[
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
                view === 'cards'
                  ? 'bg-white text-[#1e3a8a] shadow-sm font-semibold'
                  : 'text-gray-500 hover:text-gray-900',
              ].join(' ')}
            >
              <LayoutGrid size={13} />
              카드
            </button>
            <button
              onClick={() => setView('compact')}
              title="컴팩트 리스트 뷰"
              className={[
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
                view === 'compact'
                  ? 'bg-white text-[#1e3a8a] shadow-sm font-semibold'
                  : 'text-gray-500 hover:text-gray-900',
              ].join(' ')}
            >
              <Rows3 size={13} />
              컴팩트
            </button>
            <button
              onClick={() => setView('table')}
              title="테이블 뷰"
              className={[
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
                view === 'table'
                  ? 'bg-white text-[#1e3a8a] shadow-sm font-semibold'
                  : 'text-gray-500 hover:text-gray-900',
              ].join(' ')}
            >
              <List size={13} />
              표
            </button>
          </div>

          <Link
            href="/dev/relations"
            title="프로젝트 관계도 (.env 의존성 + 공유 리소스)"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-[#ede9e6] text-[12px] font-medium text-gray-700 hover:bg-[#fafaf9] hover:text-gray-900"
          >
            <Network size={13} />
            관계도
          </Link>

          <button
            onClick={fetchProjects}
            disabled={loading}
            title="새로고침 (⌘R)"
            className="p-2 rounded-lg bg-white border border-[#ede9e6] hover:bg-[#fafaf9] disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 통계 스트립 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Total" value={String(stats.total)} hint={root} />
        <Stat
          label="Running"
          value={String(stats.running)}
          hint={
            projects.filter((p) => p.isRunning).map((p) => `:${p.devPort}`).join(' ') || 'none'
          }
          tone="green"
        />
        <Stat label="This Week" value={String(stats.recent)} hint="updated" tone="navy" />
        <Stat
          label="Git 작업"
          value={String(stats.dirty + stats.ahead + stats.behind)}
          hint={`커밋 ${stats.dirty} · 푸시 ${stats.ahead} · 풀 ${stats.behind}`}
          tone={stats.dirty + stats.ahead > 0 ? 'amber' : undefined}
        />
        <Stat
          label="Stack"
          value={`Next.js ${stats.nextCount}`}
          hint={`${stats.pyCount} Python · ${stats.cppCount} C++`}
        />
        <Stat
          label="Filter"
          value={String(filtered.length)}
          hint={`of ${stats.total}`}
          tone="amber"
        />
      </div>

      {/* 필터 칩 */}
      <div className="flex flex-wrap gap-1.5">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
          전체 · {stats.total}
        </Chip>
        <Chip active={filter === 'running'} onClick={() => setFilter('running')}>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
          실행 중 · {stats.running}
        </Chip>
        <Chip active={filter === 'recent'} onClick={() => setFilter('recent')}>
          7일 이내 · {stats.recent}
        </Chip>
        <Chip active={filter === 'nextjs'} onClick={() => setFilter('nextjs')}>
          Next.js · {stats.nextCount}
        </Chip>
        {stats.pyCount > 0 && (
          <Chip active={filter === 'python'} onClick={() => setFilter('python')}>
            Python · {stats.pyCount}
          </Chip>
        )}
        {stats.cppCount > 0 && (
          <Chip active={filter === 'cpp'} onClick={() => setFilter('cpp')}>
            C++ · {stats.cppCount}
          </Chip>
        )}
        {metaCounts.fav > 0 && (
          <Chip active={filter === 'favorite'} onClick={() => setFilter('favorite')}>
            <Star size={11} className="inline-block mr-1 -mt-0.5" fill="currentColor" />
            즐겨찾기 · {metaCounts.fav}
          </Chip>
        )}
        {OWNER_OPTIONS.map((o) =>
          metaCounts.byOwner[o] ? (
            <Chip
              key={o}
              active={filter === `owner:${o}`}
              onClick={() => setFilter(`owner:${o}`)}
            >
              {OWNER_LABEL[o] ?? o} · {metaCounts.byOwner[o]}
            </Chip>
          ) : null,
        )}
        {TYPE_OPTIONS.map((t) =>
          metaCounts.byType[t] ? (
            <Chip
              key={t}
              active={filter === `type:${t}`}
              onClick={() => setFilter(`type:${t}`)}
            >
              {TYPE_LABEL[t]} · {metaCounts.byType[t]}
            </Chip>
          ) : null,
        )}
      </div>

      {/* 컨텐츠 */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-900">
          API 호출 실패: {error}
        </div>
      )}

      {loading && projects.length === 0 && (
        <div className="py-20 text-center text-sm text-gray-400">프로젝트 스캔 중...</div>
      )}

      {!loading && sections.length === 0 && projects.length > 0 && (
        <div className="py-20 text-center text-sm text-gray-400">
          조건에 맞는 프로젝트가 없어요
        </div>
      )}

      {view === 'cards' && sections.length > 0 && (
        <div className="space-y-6">
          {sections.map((s) => (
            <section key={s.key}>
              <SectionHeader label={s.label} count={s.items.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {s.items.map((p) => (
                  <ProjectCard key={p.id} project={p} focused={focusedId === p.id} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {view === 'compact' && sections.length > 0 && (
        <div className="space-y-4">
          {sections.map((s) => (
            <section key={s.key}>
              <SectionHeader label={s.label} count={s.items.length} />
              <div className="bg-white border border-[#ede9e6] rounded-xl overflow-hidden">
                {s.items.map((p) => (
                  <ProjectCompactRow key={p.id} project={p} focused={focusedId === p.id} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {view === 'table' && sections.length > 0 && (
        <div className="bg-white border border-[#ede9e6] rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#fafaf9] border-b border-[#ede9e6]">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-500">
                  Project
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-500">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-500">
                  Tech
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-500">
                  Services
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-500">
                  Port
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-500">
                  Branch
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-500">
                  Modified
                </th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <Fragment key={s.key}>
                  <tr className="bg-[#fafaf9] border-y border-[#ede9e6]">
                    <td colSpan={7} className="px-4 py-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-500">
                      {s.label} <span className="text-gray-400 ml-1">· {s.items.length}</span>
                    </td>
                  </tr>
                  {s.items.map((p) => (
                    <ProjectRow key={p.id} project={p} focused={focusedId === p.id} />
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-gray-400 pt-2">
        💡 <kbd className="px-1.5 py-0.5 border border-[#d6d3d1] rounded bg-white font-mono text-[10px]">⌘K</kbd> 검색 ·{' '}
        <kbd className="px-1.5 py-0.5 border border-[#d6d3d1] rounded bg-white font-mono text-[10px]">⌘/</kbd> 뷰 전환 · 30초마다 자동 갱신
      </div>
    </div>
  );
}

/* ─── 하위 컴포넌트 ─── */

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'navy' | 'green' | 'amber';
}) {
  const toneColor =
    tone === 'navy'
      ? 'text-[#1e3a8a]'
      : tone === 'green'
        ? 'text-emerald-600'
        : tone === 'amber'
          ? 'text-amber-700'
          : 'text-gray-900';
  return (
    <div className="p-3.5 bg-white border border-[#ede9e6] rounded-xl">
      <div className="text-[10px] text-gray-400 uppercase tracking-[0.12em] font-semibold">
        {label}
      </div>
      <div className={`text-xl font-bold tracking-tight mt-1 ${toneColor}`}>{value}</div>
      {hint && <div className="text-[11px] text-gray-500 mt-0.5 truncate">{hint}</div>}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors',
        active
          ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
          : 'bg-white text-gray-500 border-[#ede9e6] hover:text-gray-900 hover:bg-[#fafaf9]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <h3 className="text-[12px] font-bold text-gray-700 tracking-wide">{label}</h3>
      <span className="text-[11px] text-gray-400 font-mono">· {count}</span>
    </div>
  );
}

function ProjectIcon({ project, size = 40 }: { project: DevProject; size?: number }) {
  const [c1, c2] = pickGradient(project.id);
  const [imgFailed, setImgFailed] = useState(false);
  const fontSize = size <= 28 ? 11 : size <= 32 ? 12 : 15;
  const showImage = project.faviconUrl && !imgFailed;

  return (
    <div
      className="rounded-[10px] flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        background: showImage
          ? '#ffffff'
          : `linear-gradient(135deg, ${c1}, ${c2})`,
        fontFamily: 'var(--font-geist-sans), sans-serif',
        fontSize,
        letterSpacing: '-0.02em',
        border: showImage ? '1px solid #ede9e6' : 'none',
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.faviconUrl!}
          alt={project.name}
          onError={() => setImgFailed(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            padding: size <= 32 ? '2px' : '4px',
          }}
        />
      ) : (
        initials(project.name)
      )}
    </div>
  );
}

function StatusBadge({ project }: { project: DevProject }) {
  if (project.isRunning) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.05em] bg-emerald-50 text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        running
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.05em] bg-gray-100 text-gray-500">
      idle
    </span>
  );
}

function TechBadge({ tech }: { tech: string }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 border border-[#ede9e6] text-gray-600 font-mono">
      {tech}
    </span>
  );
}

function QuickActions({ project }: { project: DevProject }) {
  const triggerUrl = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  const onOpenEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerUrl(`vscode://file${project.absPath}`);
  };
  const onOpenBrowser = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (project.devPort) {
      window.open(`http://localhost:${project.devPort}`, '_blank');
    }
  };
  const onOpenDesign = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (project.devPort) {
      window.open(`http://localhost:${project.devPort}/design`, '_blank');
    }
  };
  const onOpenWireframes = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (project.devPort) {
      window.open(`http://localhost:${project.devPort}/wireframes`, '_blank');
    }
  };
  const onOpenFinder = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerUrl(`file://${project.absPath}`);
  };

  return (
    <div className="flex gap-0.5">
      <button
        onClick={onOpenEditor}
        title="VS Code로 열기"
        className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:bg-[#eff6ff] hover:text-[#1e3a8a]"
      >
        <Pencil size={13} />
      </button>
      {project.isRunning && project.devPort && (
        <button
          onClick={onOpenBrowser}
          title={`브라우저 열기 :${project.devPort}`}
          className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:bg-[#eff6ff] hover:text-[#1e3a8a]"
        >
          <ExternalLink size={13} />
        </button>
      )}
      {project.hasDesignSystem && project.isRunning && project.devPort && (
        <button
          onClick={onOpenDesign}
          title={`디자인 시스템 열기 :${project.devPort}/design`}
          className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:bg-[#eff6ff] hover:text-[#1e3a8a]"
        >
          <Palette size={13} />
        </button>
      )}
      {project.hasWireframes && project.isRunning && project.devPort && (
        <button
          onClick={onOpenWireframes}
          title={`와이어프레임 열기 :${project.devPort}/wireframes`}
          className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:bg-[#eff6ff] hover:text-[#1e3a8a]"
        >
          <Frame size={13} />
        </button>
      )}
      <button
        onClick={onOpenFinder}
        title="Finder로 열기"
        className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:bg-[#eff6ff] hover:text-[#1e3a8a]"
      >
        <FolderOpen size={13} />
      </button>
    </div>
  );
}

/** 카드 푸터에 Deploy/DB/VCS를 3개 미니 아이콘으로 압축 */
function MiniServicesCluster({ services }: { services: ProjectServices | undefined }) {
  if (!services) return null;

  const tiles: Array<{
    key: 'deploy' | 'db' | 'vcs';
    platform: string;
    live: boolean;
    tooltip: string;
    url?: string;
  }> = [];

  if (services.deploy?.platform) {
    const p = services.deploy.platform;
    const platLabel = SERVICE_LABEL[p] ?? p;
    tiles.push({
      key: 'deploy',
      platform: p,
      live: services.deploy.status === 'live',
      tooltip: `배포: ${platLabel}${services.deploy.url ? ` · ${services.deploy.url}` : ''}${services.deploy.note ? ` (${services.deploy.note})` : ''}`,
      url: services.deploy.url,
    });
  }
  if (services.db?.platform) {
    const p = services.db.platform;
    tiles.push({
      key: 'db',
      platform: p,
      live: false,
      tooltip: `DB: ${SERVICE_LABEL[p] ?? p}${services.db.note ? ` · ${services.db.note}` : ''}`,
    });
  }
  if (services.vcs?.platform) {
    const p = services.vcs.platform;
    tiles.push({
      key: 'vcs',
      platform: p,
      live: false,
      tooltip: `VCS: ${SERVICE_LABEL[p] ?? p}${services.vcs.url ? ` · ${services.vcs.url}` : ''}`,
      url: services.vcs.url,
    });
  }

  if (tiles.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      {tiles.map((t) => {
        const color = SERVICE_COLORS[t.platform] ?? '#a8a29e';
        const isMuted = t.platform === 'none' || t.platform === 'local';
        const iconFile = PLATFORM_ICON[t.platform];
        const iconColor = isMuted
          ? '#78716c'
          : color === '#3ecf8e' // supabase mint: 흰 아이콘은 대비 부족 → 어두운 색
            ? '#0b2f1a'
            : 'white';
        const letter = (SERVICE_LABEL[t.platform] ?? t.platform).charAt(0).toUpperCase();
        const tile = (
          <span
            className="relative w-4 h-4 rounded-[3px] flex items-center justify-center font-mono font-bold text-[8.5px]"
            style={{
              background: isMuted ? '#d6d3d1' : color,
              color: iconColor,
            }}
          >
            {iconFile && !isMuted ? (
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  display: 'inline-block',
                  WebkitMaskImage: `url(/brand-icons/${iconFile})`,
                  maskImage: `url(/brand-icons/${iconFile})`,
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                  backgroundColor: iconColor,
                }}
              />
            ) : isMuted ? (
              '—'
            ) : (
              letter
            )}
            {t.live && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500"
                style={{ border: '1.5px solid white' }}
              />
            )}
          </span>
        );
        if (t.url) {
          return (
            <a
              key={t.key}
              href={t.url.startsWith('http') ? t.url : `https://${t.url}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={t.tooltip}
              className="hover:opacity-80"
            >
              {tile}
            </a>
          );
        }
        return (
          <span key={t.key} title={t.tooltip}>
            {tile}
          </span>
        );
      })}
    </span>
  );
}

function ProjectCard({ project, focused = false }: { project: DevProject; focused?: boolean }) {
  const router = useRouter();
  const services = mergeServices(
    getProjectBlueprints(project.id)?.services,
    project.detectedServices ?? undefined,
  );
  const idle = isIdleProject(project);
  return (
    <div
      onClick={() => router.push(`/dev/${encodeURIComponent(project.id)}`)}
      className={`relative bg-white border rounded-2xl p-4 hover:border-[#d6d3d1] hover:shadow-sm transition-all cursor-pointer ${
        focused
          ? 'border-[#1e3a8a] ring-2 ring-[#1e3a8a]/20'
          : 'border-[#ede9e6]'
      } ${idle ? 'opacity-60 hover:opacity-100' : ''}`}
      title={idle ? '30일 이상 수정 안 된 유휴 프로젝트' : undefined}
    >
      <div className="flex items-center gap-3 mb-2">
        <ProjectIcon project={project} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <EditableProjectName id={project.id} fallback={project.name} variant="card" />
            <StatusBadge project={project} />
          </div>
          <div className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">
            {project.path}
          </div>
        </div>
        <div className="shrink-0 relative">
          <ProjectMetaEditor id={project.id} />
        </div>
      </div>

      <div className="mb-3">
        <ProjectMetaBadges id={project.id} />
      </div>

      <ProjectNote id={project.id} />

      {project.description && (
        <div className="text-xs text-gray-600 leading-[1.55] mb-3 line-clamp-2 min-h-[2.5em]">
          {project.description}
        </div>
      )}

      {project.techStack.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {project.techStack.slice(0, 5).map((t) => (
            <TechBadge key={t} tech={t} />
          ))}
        </div>
      )}

      <div className="flex justify-between items-center pt-3 border-t border-[#f5f5f4] text-[11px] text-gray-400 gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <MiniServicesCluster services={services} />
          {services && <span>·</span>}
          <span>{formatRelative(project.lastModified)}</span>
          {project.devPort && (
            <>
              <span>·</span>
              <span className="text-[#1e3a8a] font-semibold font-mono">
                :{project.devPort}
              </span>
            </>
          )}
          {project.gitBranch && (
            <>
              <span>·</span>
              <GitLogPopover projectId={project.id} branch={project.gitBranch} />
              <GitStatusBadges project={project} />
            </>
          )}
        </div>
        <QuickActions project={project} />
      </div>
    </div>
  );
}

function GitStatusBadges({ project }: { project: DevProject }) {
  const { gitDirty, gitAhead, gitBehind } = project;
  const hasAny = (gitDirty && gitDirty > 0) || (gitAhead && gitAhead > 0) || (gitBehind && gitBehind > 0);
  if (!hasAny) return null;
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] shrink-0">
      {gitDirty ? (
        <span
          title={`커밋 안 한 파일 ${gitDirty}개`}
          className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-semibold"
        >
          ● {gitDirty}
        </span>
      ) : null}
      {gitAhead ? (
        <span
          title={`원격보다 ${gitAhead} 커밋 앞섬 (push 필요)`}
          className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold"
        >
          ↑{gitAhead}
        </span>
      ) : null}
      {gitBehind ? (
        <span
          title={`원격보다 ${gitBehind} 커밋 뒤쳐짐 (pull 필요)`}
          className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-semibold"
        >
          ↓{gitBehind}
        </span>
      ) : null}
    </span>
  );
}

function ProjectCompactRow({ project, focused = false }: { project: DevProject; focused?: boolean }) {
  const router = useRouter();
  const services = mergeServices(
    getProjectBlueprints(project.id)?.services,
    project.detectedServices ?? undefined,
  );
  const idle = isIdleProject(project);
  return (
    <div
      onClick={() => router.push(`/dev/${encodeURIComponent(project.id)}`)}
      className={`relative flex items-center gap-3 px-3 py-2.5 border-b border-[#f5f5f4] last:border-b-0 hover:bg-[#fafaf9] cursor-pointer ${
        focused ? 'bg-[#eff6ff] ring-1 ring-inset ring-[#1e3a8a]/30' : ''
      } ${idle ? 'opacity-60 hover:opacity-100' : ''}`}
      title={idle ? '30일 이상 수정 안 된 유휴 프로젝트' : undefined}
    >
      <ProjectIcon project={project} size={28} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <EditableProjectName id={project.id} fallback={project.name} variant="row" />
          {project.isRunning ? (
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
              style={{ animation: 'pulse 1.6s infinite' }}
              title="running"
            />
          ) : null}
          <ProjectMetaBadges id={project.id} compact />
        </div>
        <div className="text-[10.5px] text-gray-400 font-mono truncate">
          {project.path}
          {` · ${formatRelative(project.lastModified)}`}
          {project.gitBranch ? ` · ${project.gitBranch}` : ''}
        </div>
      </div>
      <MiniServicesCluster services={services} />
      <GitStatusBadges project={project} />
      {project.devPort ? (
        <span className="font-mono text-[11px] text-[#1e3a8a] font-semibold shrink-0">
          :{project.devPort}
        </span>
      ) : null}
      <div className="shrink-0 relative">
        <ProjectMetaEditor id={project.id} />
      </div>
    </div>
  );
}

function ServiceCell({ platform, url }: { platform?: string; url?: string }) {
  if (!platform) return <span className="text-gray-300 text-xs">—</span>;
  const label = SERVICE_LABEL[platform] ?? platform;
  const color = SERVICE_COLORS[platform] ?? '#a8a29e';
  const isMuted = platform === 'none' || platform === 'local';
  const content = (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] font-semibold px-1.5 py-0.5 rounded">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      <span className={isMuted ? 'text-gray-400' : 'text-gray-800'}>{label}</span>
    </span>
  );
  if (url) {
    return (
      <a
        href={url.startsWith('http') ? url : `https://${url}`}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="hover:opacity-75"
      >
        {content}
      </a>
    );
  }
  return content;
}

function ProjectRow({ project, focused = false }: { project: DevProject; focused?: boolean }) {
  const router = useRouter();
  const services = mergeServices(
    getProjectBlueprints(project.id)?.services,
    project.detectedServices ?? undefined,
  );
  const idle = isIdleProject(project);
  return (
    <tr
      onClick={() => router.push(`/dev/${encodeURIComponent(project.id)}`)}
      className={`border-b border-[#f5f5f4] last:border-b-0 hover:bg-[#fafaf9] group cursor-pointer ${
        focused ? 'bg-[#eff6ff]' : ''
      } ${idle ? 'opacity-60 hover:opacity-100' : ''}`}
      title={idle ? '30일 이상 수정 안 된 유휴 프로젝트' : undefined}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <ProjectIcon project={project} size={28} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <EditableProjectName id={project.id} fallback={project.name} variant="row" />
              <ProjectMetaBadges id={project.id} compact />
            </div>
            <div className="text-[11px] text-gray-400 font-mono truncate">
              {project.path}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge project={project} />
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {project.techStack.slice(0, 3).map((t) => (
            <TechBadge key={t} tech={t} />
          ))}
          {project.techStack.length > 3 && (
            <span className="text-[10px] text-gray-400">
              +{project.techStack.length - 3}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <MiniServicesCluster services={services} />
      </td>
      <td className="px-4 py-3 font-mono text-xs text-gray-600">
        {project.devPort ? `:${project.devPort}` : '—'}
      </td>
      <td className="px-4 py-3">
        {project.gitBranch ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <GitLogPopover projectId={project.id} branch={project.gitBranch} />
            <GitStatusBadges project={project} />
          </div>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-gray-500">
        {formatRelative(project.lastModified)}
      </td>
      <td className="px-4 py-3">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <QuickActions project={project} />
        </div>
      </td>
    </tr>
  );
}
