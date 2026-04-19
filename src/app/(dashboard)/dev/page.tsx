'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ExternalLink, FolderOpen, LayoutGrid, List, RefreshCw,
  Search, Pencil, Palette, Frame,
} from 'lucide-react';

import type { DevProject } from '@/app/api/dev/projects/route';

type ViewMode = 'cards' | 'table';
type FilterKind = 'all' | 'running' | 'nextjs' | 'python' | 'cpp' | 'recent';

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

export default function DevWorkspacePage() {
  const [projects, setProjects] = useState<DevProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [root, setRoot] = useState('~/Desktop/Dev');
  const [view, setView] = useState<ViewMode>('cards');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKind>('all');

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
    fetchProjects();
    // 30초마다 running 상태 갱신
    const timer = setInterval(fetchProjects, 30_000);
    return () => clearInterval(timer);
  }, []);

  // 단축키: ⌘K 검색, ⌘/ 뷰 토글
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        (document.getElementById('dev-search') as HTMLInputElement | null)?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setView((v) => (v === 'cards' ? 'table' : 'cards'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const stats = useMemo(() => {
    const techCounts: Record<string, number> = {};
    let running = 0;
    let recent = 0;
    const weekAgo = Date.now() - 7 * 86400_000;
    for (const p of projects) {
      if (p.isRunning) running++;
      if (p.lastModified >= weekAgo) recent++;
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
      topTech: topTech ? `${topTech[0]} ${topTech[1]}` : '—',
      nextCount,
      pyCount,
      cppCount,
    };
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const weekAgo = Date.now() - 7 * 86400_000;
    return projects.filter((p) => {
      if (q) {
        const hay = [p.name, p.path, p.description ?? '', p.techStack.join(' ')]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === 'all') return true;
      if (filter === 'running') return p.isRunning;
      if (filter === 'recent') return p.lastModified >= weekAgo;
      if (filter === 'nextjs') return p.techStack.some((t) => t.startsWith('Next.js'));
      if (filter === 'python') return p.techStack.includes('Python');
      if (filter === 'cpp') return p.techStack.includes('C++');
      return true;
    });
  }, [projects, search, filter]);

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
              placeholder="검색 (⌘K)"
              className="w-60 pl-8 pr-3 py-2 text-sm bg-white border border-[#ede9e6] rounded-lg focus:outline-none focus:border-[#1e3a8a]"
            />
          </div>

          {/* 뷰 토글 */}
          <div className="inline-flex gap-0 bg-[#f5f5f4] border border-[#ede9e6] rounded-lg p-0.5">
            <button
              onClick={() => setView('cards')}
              title="카드 뷰 (⌘/)"
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
              onClick={() => setView('table')}
              title="테이블 뷰 (⌘/)"
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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

      {!loading && filtered.length === 0 && projects.length > 0 && (
        <div className="py-20 text-center text-sm text-gray-400">
          조건에 맞는 프로젝트가 없어요
        </div>
      )}

      {view === 'cards' && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {view === 'table' && filtered.length > 0 && (
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
              {filtered.map((p) => (
                <ProjectRow key={p.id} project={p} />
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

function ProjectCard({ project }: { project: DevProject }) {
  const router = useRouter();
  return (
    <div
      onClick={() => router.push(`/dev/${encodeURIComponent(project.id)}`)}
      className="bg-white border border-[#ede9e6] rounded-2xl p-4 hover:border-[#d6d3d1] hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex items-center gap-3 mb-3">
        <ProjectIcon project={project} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <strong className="font-bold text-sm text-gray-900 truncate">
              {project.name}
            </strong>
            <StatusBadge project={project} />
          </div>
          <div className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">
            {project.path}
          </div>
        </div>
      </div>

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

      <div className="flex justify-between items-center pt-3 border-t border-[#f5f5f4] text-[11px] text-gray-400">
        <div className="flex items-center gap-2">
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
              <span className="font-mono">{project.gitBranch}</span>
            </>
          )}
        </div>
        <QuickActions project={project} />
      </div>
    </div>
  );
}

function ProjectRow({ project }: { project: DevProject }) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(`/dev/${encodeURIComponent(project.id)}`)}
      className="border-b border-[#f5f5f4] last:border-b-0 hover:bg-[#fafaf9] group cursor-pointer"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <ProjectIcon project={project} size={28} />
          <div className="min-w-0">
            <div className="font-semibold text-[13px] truncate">{project.name}</div>
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
      <td className="px-4 py-3 font-mono text-xs text-gray-600">
        {project.devPort ? `:${project.devPort}` : '—'}
      </td>
      <td className="px-4 py-3">
        {project.gitBranch ? (
          <span className="inline-block font-mono text-[11px] px-1.5 py-0.5 bg-gray-50 border border-[#ede9e6] rounded text-gray-700">
            {project.gitBranch}
          </span>
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
