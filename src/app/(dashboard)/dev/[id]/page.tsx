'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Pencil, ExternalLink, FolderOpen, GitBranch,
  Clock, Palette, Frame, Map, Database,
} from 'lucide-react';
import type { DevProject } from '@/app/api/dev/projects/route';
import DesignSystemShowcase from '@/components/DesignSystemShowcase';
import WireframesGallery from '@/components/WireframesGallery';
import RoadmapView from '@/components/RoadmapView';
import ERDView from '@/components/ERDView';
import ExternalWireframesGallery from '@/components/ExternalWireframesGallery';
import ExternalDesignShowcase from '@/components/ExternalDesignShowcase';
import EditableProjectName from '@/components/EditableProjectName';
import BlueprintDoc from '@/components/BlueprintDoc';
import { WIREFRAMES } from '@/wireframes/registry';
import { ROADMAP } from '@/roadmap/roadmap';
import { ERD } from '@/erd/erd';
import { getProjectBlueprints } from '@/projects/registry';

type Tab = 'overview' | 'design' | 'wireframes' | 'roadmap' | 'erd';

const ICON_GRADIENTS: Array<[string, string]> = [
  ['#1e3a8a', '#3b82f6'], ['#7c3aed', '#a78bfa'], ['#0f172a', '#64748b'],
  ['#7c2d12', '#ea580c'], ['#166534', '#22c55e'], ['#9f1239', '#e11d48'],
];
function pickGradient(seed: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return ICON_GRADIENTS[Math.abs(hash) % ICON_GRADIENTS.length];
}
function initials(name: string): string {
  const trimmed = name.trim();
  if (/[\uAC00-\uD7AF]/.test(trimmed[0] ?? '')) return trimmed[0];
  const parts = trimmed.split(/[-_\s]+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}
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

const SELF_ID = 'hype5-erp';

export default function DevProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<DevProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/dev/projects', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        const p = (json.projects as DevProject[]).find((x) => x.id === id);
        setProject(p ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'unknown');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const isSelf = id === SELF_ID;
  const blueprints = useMemo(() => (isSelf ? null : getProjectBlueprints(id)), [isSelf, id]);
  const [c1, c2] = useMemo(() => pickGradient(id), [id]);

  if (loading) {
    return <div className="py-20 text-center text-sm text-gray-400">프로젝트 로딩 중...</div>;
  }
  if (error || !project) {
    return (
      <div className="space-y-4 py-10">
        <Link href="/dev" className="inline-flex items-center gap-1.5 text-caption text-ink-500 hover:text-ink-900 transition-colors">
          <ArrowLeft size={12} />
          <span>Dev Workspace</span>
        </Link>
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-900">
          {error ? `API 호출 실패: ${error}` : `프로젝트를 찾을 수 없어요: ${id}`}
        </div>
      </div>
    );
  }

  const onOpenEditor = () => {
    const a = document.createElement('a');
    a.href = `vscode://file${project.absPath}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  const onOpenBrowser = () => project.devPort && window.open(`http://localhost:${project.devPort}`, '_blank');
  const onOpenFinder = () => {
    const a = document.createElement('a');
    a.href = `file://${project.absPath}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType; show: boolean; count?: number }[] = [
    { key: 'overview', label: '개요', icon: Clock, show: true },
    {
      key: 'design', label: '디자인 시스템', icon: Palette,
      show: true,
    },
    {
      key: 'wireframes', label: '와이어프레임', icon: Frame,
      show: true,
      count: blueprints?.wireframes?.length ?? (isSelf ? WIREFRAMES.length : undefined),
    },
    {
      key: 'roadmap', label: '로드맵', icon: Map,
      show: true,
      count: blueprints?.roadmap?.phases.length ?? (isSelf ? ROADMAP.phases.length : undefined),
    },
    {
      key: 'erd', label: 'ERD', icon: Database,
      show: true,
      count: blueprints?.erd?.entities.length ?? (isSelf ? ERD.entities.length : undefined),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 네비 */}
      <Link href="/dev" className="inline-flex items-center gap-1.5 text-caption text-ink-500 hover:text-ink-900 transition-colors">
        <ArrowLeft size={12} />
        <span>Dev Workspace</span>
      </Link>

      {/* 프로젝트 헤더 */}
      <header className="flex items-start gap-4">
        <div
          className="rounded-[12px] flex items-center justify-center text-white font-bold shrink-0 overflow-hidden border border-ink-200"
          style={{
            width: 64, height: 64,
            background: project.faviconUrl ? '#ffffff' : `linear-gradient(135deg, ${c1}, ${c2})`,
            fontSize: 20, letterSpacing: '-0.02em',
          }}
        >
          {project.faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.faviconUrl} alt={project.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }} />
          ) : initials(project.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <EditableProjectName id={project.id} fallback={project.name} variant="header" stopPropagation={false} />
            {project.isRunning && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.05em] bg-emerald-50 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                running
              </span>
            )}
          </div>
          <div className="text-caption text-ink-500 font-mono mt-1 truncate">{project.path}</div>
          {project.description && (
            <p className="text-body text-ink-600 mt-2">{project.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {project.techStack.map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-ink-50 border border-ink-200 text-ink-600 font-mono">{t}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onOpenEditor} title="VS Code" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-ink-200 text-[13px] text-ink-700 hover:bg-ink-50">
            <Pencil size={13} /> VS Code
          </button>
          {project.isRunning && project.devPort && (
            <button onClick={onOpenBrowser} title="브라우저" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-ink-200 text-[13px] text-ink-700 hover:bg-ink-50">
              <ExternalLink size={13} /> :{project.devPort}
            </button>
          )}
          <button onClick={onOpenFinder} title="Finder" className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white border border-ink-200 text-ink-700 hover:bg-ink-50">
            <FolderOpen size={13} />
          </button>
        </div>
      </header>

      {/* 탭 */}
      <div className="inline-flex items-center border-b border-ink-200 w-full gap-0">
        {tabs.filter((t) => t.show).map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-medium transition-colors ${
                active ? 'text-ink-900' : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              <t.icon size={13} />
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span className="ml-1 text-[10px] bg-ink-100 text-ink-600 px-1.5 py-0.5 rounded-md font-semibold tabular-nums">{t.count}</span>
              )}
              {active && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-brand-600" />}
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      {tab === 'overview' && <OverviewPanel project={project} hasBlueprints={blueprints} />}
      {tab === 'design' && (
        isSelf ? (
          <DesignSystemShowcase showHeader={false} />
        ) : blueprints?.designSystemFile ? (
          <ExternalDesignShowcase projectId={id} file={blueprints.designSystemFile} label={`${project.name} 디자인 시스템`} />
        ) : (
          <BlueprintDoc projectId={id} kind="design" />
        )
      )}
      {tab === 'wireframes' && (
        isSelf ? (
          <WireframesGallery showHeader={false} linkPrefix="/wireframes" />
        ) : blueprints?.wireframes && blueprints.wireframes.length > 0 ? (
          <ExternalWireframesGallery projectId={id} wireframes={blueprints.wireframes} />
        ) : (
          <BlueprintDoc projectId={id} kind="wireframes" />
        )
      )}
      {tab === 'roadmap' && (
        isSelf ? (
          <RoadmapView roadmap={ROADMAP} showHeader={false} />
        ) : blueprints?.roadmap ? (
          <RoadmapView roadmap={blueprints.roadmap} showHeader={false} />
        ) : (
          <BlueprintDoc projectId={id} kind="roadmap" />
        )
      )}
      {tab === 'erd' && (
        isSelf ? (
          <ERDView erd={ERD} showHeader={false} />
        ) : blueprints?.erd ? (
          <ERDView erd={blueprints.erd} showHeader={false} />
        ) : (
          <BlueprintDoc projectId={id} kind="erd" />
        )
      )}
    </div>
  );
}

function OverviewPanel({
  project,
  hasBlueprints,
}: {
  project: DevProject;
  hasBlueprints: ReturnType<typeof getProjectBlueprints> | null;
}) {
  const badge = (folder: boolean, bp: boolean) => {
    if (folder) return <span className="text-emerald-700">있음</span>;
    if (bp) return <span className="text-emerald-700">있음 <span className="text-[10px] text-ink-500">(블루프린트)</span></span>;
    return <span className="text-ink-400">없음</span>;
  };
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: '경로', value: <span className="font-mono text-[12px]">{project.path}</span> },
    { label: '절대 경로', value: <span className="font-mono text-[12px] text-ink-500">{project.absPath}</span> },
    { label: 'Dev 포트', value: project.devPort ? <span className="font-mono text-brand-600 font-semibold">:{project.devPort}</span> : <span className="text-ink-400">—</span> },
    { label: '실행 상태', value: project.isRunning ? <span className="text-emerald-700">running</span> : <span className="text-ink-400">idle</span> },
    { label: 'Git 브랜치', value: project.gitBranch ? <span className="font-mono inline-flex items-center gap-1"><GitBranch size={11} />{project.gitBranch}</span> : <span className="text-ink-400">—</span> },
    { label: '최근 수정', value: <span>{formatRelative(project.lastModified)}</span> },
    { label: 'package.json', value: project.hasPackageJson ? '있음' : '없음' },
    { label: '디자인 시스템', value: badge(project.hasDesignSystem, !!hasBlueprints?.designSystemFile) },
    { label: '와이어프레임', value: badge(project.hasWireframes, (hasBlueprints?.wireframes?.length ?? 0) > 0) },
    { label: '로드맵', value: badge(project.hasRoadmap, !!hasBlueprints?.roadmap) },
    { label: 'ERD', value: badge(project.hasERD, !!hasBlueprints?.erd) },
  ];

  return (
    <div className="bg-white border border-ink-200 rounded-xl overflow-hidden">
      <div className="divide-y divide-ink-200">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-3 gap-4 px-4 py-3 text-[13px]">
            <div className="text-caption text-ink-500">{r.label}</div>
            <div className="col-span-2 text-ink-900">{r.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExternalOnlyPanel({ project, type }: { project: DevProject; type: 'design' | 'wireframes' | 'roadmap' | 'erd' }) {
  const labels = { design: '디자인 시스템', wireframes: '와이어프레임', roadmap: '로드맵', erd: 'ERD' };
  const routes = { design: '/design', wireframes: '/wireframes', roadmap: '/roadmap', erd: '/erd' };
  const label = labels[type];
  const route = routes[type];

  if (!project.isRunning || !project.devPort) {
    return (
      <div className="p-8 bg-ink-50 border border-ink-200 rounded-xl text-center">
        <p className="text-body text-ink-700">이 프로젝트의 {label}은 외부 앱에서 제공돼요.</p>
        <p className="text-caption text-ink-500 mt-1">
          dev 서버가 실행 중이 아니라 지금은 불러올 수 없어요. 먼저 <span className="font-mono">{project.path}</span>에서 dev 서버를 실행하세요.
        </p>
      </div>
    );
  }

  const url = `http://localhost:${project.devPort}${route}`;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-caption text-ink-500">
          이 프로젝트의 {label}은 <span className="font-mono text-ink-700">{url}</span> 에서 제공돼요.
        </p>
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-ink-200 text-[12px] text-ink-700 hover:bg-ink-50">
          <ExternalLink size={12} />새 탭으로 열기
        </a>
      </div>
      <div className="bg-white border border-ink-200 rounded-xl overflow-hidden" style={{ height: '75vh' }}>
        <iframe src={url} title={`${project.name} ${label}`} className="w-full h-full border-0" />
      </div>
    </div>
  );
}
