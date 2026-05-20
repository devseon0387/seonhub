'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clapperboard, Film, Plus, Eye, ExternalLink, Loader2 } from 'lucide-react';
import {
  getProjects,
  insertProject,
  getProjectUploadsByIds,
} from '@/lib/supabase/db';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { useToast } from '@/contexts/ToastContext';
import type {
  Project,
  ProjectFormat,
  ProjectUpload,
  UploadPlatform,
} from '@/types';
import { UPLOAD_PLATFORM_LABEL } from '@/types';

type FilterTab = 'all' | 'longform' | 'shortform';

const FORMAT_LABEL: Record<ProjectFormat, string> = {
  longform: '롱폼',
  shortform: '숏폼',
};

export default function ContentStudioPage() {
  const router = useRouter();
  const toast = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [uploads, setUploads] = useState<ProjectUpload[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<FilterTab>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // form
  const [fTitle, setFTitle] = useState('');
  const [fFormat, setFFormat] = useState<ProjectFormat>('shortform');
  const [fClient, setFClient] = useState('');
  const [fPlatforms, setFPlatforms] = useState<UploadPlatform[]>([]);

  const load = useCallback(async () => {
    const all = await getProjects();
    const studio = all.filter(p => p.format === 'longform' || p.format === 'shortform');
    setProjects(studio);
    const ups = await getProjectUploadsByIds(studio.map(p => p.id));
    setUploads(ups);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useSupabaseRealtime(['projects', 'project_uploads'], load);

  const filtered = useMemo(
    () => tab === 'all' ? projects : projects.filter(p => p.format === tab),
    [projects, tab]
  );

  const viewsByProject = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of uploads) m.set(u.projectId, (m.get(u.projectId) ?? 0) + u.viewCount);
    return m;
  }, [uploads]);

  const platformsByProject = useMemo(() => {
    const m = new Map<string, UploadPlatform[]>();
    for (const u of uploads) {
      const arr = m.get(u.projectId) ?? [];
      arr.push(u.platform);
      m.set(u.projectId, arr);
    }
    return m;
  }, [uploads]);

  const totals = useMemo(() => {
    const longform = projects.filter(p => p.format === 'longform').length;
    const shortform = projects.filter(p => p.format === 'shortform').length;
    const totalViews = uploads.reduce((s, u) => s + u.viewCount, 0);
    return { longform, shortform, totalViews };
  }, [projects, uploads]);

  const handleCreate = async () => {
    if (!fTitle.trim()) { toast.error('제목을 입력하세요'); return; }
    setCreating(true);
    try {
      const created = await insertProject({
        title: fTitle.trim(),
        type: 'video',
        format: fFormat,
        description: '',
        client: fClient.trim(),
        partnerId: '',
        partnerIds: [],
        managerIds: [],
        status: 'planning',
        budget: { totalAmount: 0, partnerPayment: 0, managementFee: 0, marginRate: 0 },
        tags: [],
      });
      if (!created) { toast.error('생성 실패'); setCreating(false); return; }

      // 선택된 플랫폼들 미리 빈 업로드 카드로 생성 (옵션)
      if (fFormat === 'shortform' && fPlatforms.length > 0) {
        const { upsertProjectUpload } = await import('@/lib/supabase/db');
        await Promise.all(fPlatforms.map(p =>
          upsertProjectUpload(created.id, p, { viewCount: 0 })
        ));
      }

      toast.success('생성됨');
      setShowCreate(false);
      setFTitle(''); setFClient(''); setFPlatforms([]); setFFormat('shortform');
      router.push(`/content-studio/${created.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1280, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Clapperboard size={22} style={{ color: '#1e3a8a' }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1c1917', margin: 0, letterSpacing: '-0.01em' }}>
              Content Studio
            </h1>
          </div>
          <p style={{ fontSize: 13, color: '#78716c', margin: 0 }}>
            영상 제작물 — 롱폼/숏폼 · 다중 플랫폼 업로드 · 조회수 추적
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', borderRadius: 10,
            background: '#1e3a8a', color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={15} /> 새 영상
        </button>
      </div>

      {/* 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <SummaryCard label="롱폼" value={totals.longform} icon={<Film size={16} />} />
        <SummaryCard label="숏폼" value={totals.shortform} icon={<Clapperboard size={16} />} />
        <SummaryCard label="총 조회수" value={totals.totalViews.toLocaleString()} icon={<Eye size={16} />} accent />
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e7e5e4' }}>
        {(['all', 'longform', 'shortform'] as FilterTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 16px', border: 'none', background: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: tab === t ? '#1e3a8a' : '#a8a29e',
              borderBottom: tab === t ? '2px solid #1e3a8a' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t === 'all' ? '전체' : FORMAT_LABEL[t]}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80, color: '#a8a29e' }}>
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              totalViews={viewsByProject.get(p.id) ?? 0}
              platforms={platformsByProject.get(p.id) ?? []}
            />
          ))}
        </div>
      )}

      {/* 생성 모달 */}
      {showCreate && (
        <CreateModal
          fTitle={fTitle} setFTitle={setFTitle}
          fFormat={fFormat} setFFormat={setFFormat}
          fClient={fClient} setFClient={setFClient}
          fPlatforms={fPlatforms} setFPlatforms={setFPlatforms}
          creating={creating}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, accent }: { label: string; value: number | string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      padding: '16px 18px', borderRadius: 12,
      background: accent ? '#1e3a8a' : '#fff',
      border: accent ? 'none' : '1px solid #e7e5e4',
      color: accent ? '#fff' : '#1c1917',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, opacity: accent ? 0.85 : 0.7, marginBottom: 6 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{value}</div>
    </div>
  );
}

function ProjectCard({ project, totalViews, platforms }: { project: Project; totalViews: number; platforms: UploadPlatform[] }) {
  return (
    <Link href={`/content-studio/${project.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        padding: 16, borderRadius: 12, background: '#fff',
        border: '1px solid #e7e5e4', cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#1e3a8a'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
            padding: '3px 8px', borderRadius: 999,
            background: project.format === 'longform' ? '#eef2ff' : '#fff7ed',
            color: project.format === 'longform' ? '#3730a3' : '#9a3412',
          }}>
            {project.format === 'longform' ? '롱폼' : '숏폼'}
          </span>
          {project.client && (
            <span style={{ fontSize: 11, color: '#a8a29e' }}>{project.client}</span>
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1917', marginBottom: 10, lineHeight: 1.35 }}>
          {project.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {platforms.length === 0 ? (
            <span style={{ fontSize: 11, color: '#d6d3d1' }}>업로드 없음</span>
          ) : platforms.map(p => (
            <span key={p} style={{
              fontSize: 10, fontWeight: 600,
              padding: '3px 7px', borderRadius: 6,
              background: '#f5f5f4', color: '#57534e',
            }}>{UPLOAD_PLATFORM_LABEL[p]}</span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #f5f5f4' }}>
          <span style={{ fontSize: 12, color: '#78716c' }}>총 조회수</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1e3a8a' }}>
            {totalViews.toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div style={{
      padding: 60, textAlign: 'center',
      border: '1px dashed #d6d3d1', borderRadius: 12,
      color: '#a8a29e',
    }}>
      <Clapperboard size={32} style={{ margin: '0 auto 12px', display: 'block', color: '#d6d3d1' }} />
      <div style={{ fontSize: 14, marginBottom: 14 }}>아직 등록된 영상이 없습니다.</div>
      <button
        onClick={onCreate}
        style={{
          padding: '8px 16px', borderRadius: 8, border: '1px solid #1e3a8a',
          background: '#fff', color: '#1e3a8a', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >첫 영상 등록</button>
    </div>
  );
}

function CreateModal(props: {
  fTitle: string; setFTitle: (s: string) => void;
  fFormat: ProjectFormat; setFFormat: (f: ProjectFormat) => void;
  fClient: string; setFClient: (s: string) => void;
  fPlatforms: UploadPlatform[]; setFPlatforms: (p: UploadPlatform[]) => void;
  creating: boolean;
  onClose: () => void;
  onCreate: () => void;
}) {
  const { fTitle, setFTitle, fFormat, setFFormat, fClient, setFClient, fPlatforms, setFPlatforms, creating, onClose, onCreate } = props;
  const togglePlatform = (p: UploadPlatform) => {
    setFPlatforms(fPlatforms.includes(p) ? fPlatforms.filter(x => x !== p) : [...fPlatforms, p]);
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 480, background: '#fff', borderRadius: 16,
          padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1c1917', margin: '0 0 20px' }}>새 영상 등록</h2>

        <Field label="제목">
          <input
            value={fTitle}
            onChange={e => setFTitle(e.target.value)}
            placeholder="영상 제목"
            style={inputStyle}
            autoFocus
          />
        </Field>

        <Field label="포맷">
          <div style={{ display: 'flex', gap: 8 }}>
            {(['longform', 'shortform'] as ProjectFormat[]).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFFormat(f)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  border: fFormat === f ? '1.5px solid #1e3a8a' : '1.5px solid #e7e5e4',
                  background: fFormat === f ? '#eef2ff' : '#fff',
                  color: fFormat === f ? '#1e3a8a' : '#78716c',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >{FORMAT_LABEL[f]}</button>
            ))}
          </div>
        </Field>

        <Field label="클라이언트 (선택)">
          <input
            value={fClient}
            onChange={e => setFClient(e.target.value)}
            placeholder="브랜드/채널명"
            style={inputStyle}
          />
        </Field>

        {fFormat === 'shortform' && (
          <Field label="업로드 플랫폼 (중복 선택)">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(Object.keys(UPLOAD_PLATFORM_LABEL) as UploadPlatform[]).map(p => {
                const on = fPlatforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    style={{
                      padding: '7px 12px', borderRadius: 999,
                      border: on ? '1.5px solid #1e3a8a' : '1.5px solid #e7e5e4',
                      background: on ? '#1e3a8a' : '#fff',
                      color: on ? '#fff' : '#57534e',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >{UPLOAD_PLATFORM_LABEL[p]}</button>
                );
              })}
            </div>
          </Field>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #e7e5e4', background: '#fff', color: '#78716c', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >취소</button>
          <button
            onClick={onCreate}
            disabled={creating}
            style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#1e3a8a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: creating ? 0.6 : 1 }}
          >{creating ? '생성 중…' : '생성'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#78716c', marginBottom: 6, letterSpacing: '0.04em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  borderRadius: 8, border: '1.5px solid #e7e5e4',
  fontSize: 14, color: '#1c1917',
  outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
};

// avoid unused import warning when we lazy import upsertProjectUpload
void ExternalLink;
