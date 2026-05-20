'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Trash2, Plus, X, Tag, Save, CheckCircle2,
  FlaskConical, Link2, BarChart3, ChevronDown, Palette, ChevronUp,
} from 'lucide-react';
import {
  getTheory, updateTheory, deleteTheoryAndDeps,
  listEvidenceFor, addEvidence, updateEvidence, removeEvidence,
} from '@/lib/lab/storage';
import { getProjects, getProjectUploadsByIds } from '@/lib/supabase/db';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { useToast } from '@/contexts/ToastContext';
import type {
  Theory, TheoryStatus, TheoryEvidence, EvidenceRole,
  Project, ProjectUpload,
} from '@/types';
import { THEORY_STATUS_LABEL, EVIDENCE_ROLE_LABEL } from '@/types';

// 클라이언트 전용 (SSR 비활성)
const TheoryBody = dynamic(() => import('@/components/lab/TheoryBody'), {
  ssr: false,
  loading: () => <div style={{ padding: 24, color: '#a8a29e', fontSize: 13 }}>에디터 로딩…</div>,
});
const TheoryCanvas = dynamic(() => import('@/components/lab/TheoryCanvas'), {
  ssr: false,
  loading: () => <div style={{ padding: 24, color: '#a8a29e', fontSize: 13 }}>캔버스 로딩…</div>,
});

const STATUSES: TheoryStatus[] = ['hypothesis', 'testing', 'validated', 'refuted', 'archived'];
const STATUS_COLOR: Record<TheoryStatus, { bg: string; fg: string }> = {
  hypothesis: { bg: '#fef3c7', fg: '#92400e' },
  testing:    { bg: '#dbeafe', fg: '#1e40af' },
  validated:  { bg: '#dcfce7', fg: '#166534' },
  refuted:    { bg: '#fee2e2', fg: '#991b1b' },
  archived:   { bg: '#f5f5f4', fg: '#78716c' },
};

export default function TheoryEditor() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const theoryId = params.id;

  const [theory, setTheory] = useState<Theory | null>(null);
  const [evidence, setEvidence] = useState<TheoryEvidence[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [uploads, setUploads] = useState<ProjectUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const debouncedSave = useRef<NodeJS.Timeout | null>(null);

  const reload = useCallback(async () => {
    if (!theoryId) return;
    const [t, ev] = await Promise.all([getTheory(theoryId), listEvidenceFor(theoryId)]);
    setTheory(t);
    setEvidence(ev);
    setLoading(false);
    // 캔버스에 내용이 있으면 자동 펼침
    if (t?.canvas && !canvasOpen) setCanvasOpen(true);
  }, [theoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { reload(); }, [reload]);
  useSupabaseRealtime(['theories', 'theory_evidence'], reload);

  // Content Studio 프로젝트 로드 (Evidence 패널용)
  useEffect(() => {
    (async () => {
      const all = await getProjects();
      const studio = all.filter(p => p.format === 'longform' || p.format === 'shortform');
      setProjects(studio);
      const ups = await getProjectUploadsByIds(studio.map(p => p.id));
      setUploads(ups);
    })();
  }, []);

  // 메타(title, status, tags) 자동 저장 — debounced
  const handleMetaChange = (fields: Partial<Theory>) => {
    if (!theory) return;
    const next = { ...theory, ...fields };
    setTheory(next);
    setDirty(true);
    if (debouncedSave.current) clearTimeout(debouncedSave.current);
    debouncedSave.current = setTimeout(async () => {
      await updateTheory(next.id, fields);
      setDirty(false);
      setSavedAt(Date.now());
    }, 500);
  };

  // Body(BlockNote) 자동 저장 — TheoryBody 안에서 이미 debounce 처리됨
  const handleBodyChange = useCallback(async (json: string) => {
    if (!theoryId) return;
    setDirty(true);
    await updateTheory(theoryId, { body: json });
    setDirty(false);
    setSavedAt(Date.now());
  }, [theoryId]);

  const handleCanvasChange = useCallback(async (json: string) => {
    if (!theoryId) return;
    setDirty(true);
    await updateTheory(theoryId, { canvas: json });
    setDirty(false);
    setSavedAt(Date.now());
  }, [theoryId]);

  const handleDelete = async () => {
    if (!theory) return;
    if (!confirm(`"${theory.title}" 이론을 삭제할까요? 연결된 증거도 함께 삭제됩니다.`)) return;
    await deleteTheoryAndDeps(theory.id);
    toast.success('삭제됨');
    router.push('/lab');
  };

  // Evidence 집계
  const viewsByProject = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of uploads) m.set(u.projectId, (m.get(u.projectId) ?? 0) + u.viewCount);
    return m;
  }, [uploads]);

  const groupedEvidence = useMemo(() => {
    const g: Record<EvidenceRole, TheoryEvidence[]> = { supports: [], refutes: [], neutral: [] };
    for (const e of evidence) g[e.role].push(e);
    return g;
  }, [evidence]);

  const stats = useMemo(() => {
    const calc = (items: TheoryEvidence[]) => {
      const views = items.map(e => viewsByProject.get(e.projectId) ?? 0);
      if (views.length === 0) return { count: 0, avg: 0 };
      const sum = views.reduce((s, v) => s + v, 0);
      return { count: views.length, avg: Math.round(sum / views.length) };
    };
    return {
      supports: calc(groupedEvidence.supports),
      refutes:  calc(groupedEvidence.refutes),
      neutral:  calc(groupedEvidence.neutral),
    };
  }, [groupedEvidence, viewsByProject]);

  if (loading) {
    return <div style={{ padding: 80, textAlign: 'center', color: '#a8a29e' }}>로딩 중…</div>;
  }
  if (!theory) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#a8a29e' }}>
        이론을 찾을 수 없습니다.
        <div style={{ marginTop: 12 }}>
          <button onClick={() => router.push('/lab')} style={btnSecondary}>목록으로</button>
        </div>
      </div>
    );
  }

  const sc = STATUS_COLOR[theory.status];

  return (
    <div style={{ padding: '24px 36px', maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'flex-start' }}>
      {/* 메인 컬럼 */}
      <div style={{ minWidth: 0 }}>
        <button onClick={() => router.push('/lab')} style={backBtn}>
          <ArrowLeft size={14} /> Content Lab
        </button>

        {/* 제목 */}
        <input
          value={theory.title}
          onChange={e => handleMetaChange({ title: e.target.value })}
          placeholder="제목 없음"
          style={{
            width: '100%', padding: '6px 0', marginBottom: 12, marginTop: 8,
            fontSize: 30, fontWeight: 800, letterSpacing: '-0.015em', color: '#1c1917',
            border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit',
          }}
        />

        {/* 메타 바 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <select
              value={theory.status}
              onChange={e => handleMetaChange({ status: e.target.value as TheoryStatus })}
              style={{
                appearance: 'none', WebkitAppearance: 'none',
                padding: '5px 26px 5px 10px', borderRadius: 6, border: 'none',
                background: sc.bg, color: sc.fg,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.03em', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {STATUSES.map(s => <option key={s} value={s}>{THEORY_STATUS_LABEL[s]}</option>)}
            </select>
            <ChevronDown size={11} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: sc.fg, pointerEvents: 'none' }} />
          </div>

          <TagsField
            tags={theory.tags ?? []}
            onChange={tags => handleMetaChange({ tags })}
          />

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: '#a8a29e', display: 'flex', alignItems: 'center', gap: 4 }}>
              {dirty ? <Save size={11} /> : <CheckCircle2 size={11} />}
              {dirty ? '저장 중…' : (savedAt ? '저장됨' : '준비됨')}
            </span>
            <button onClick={handleDelete} title="이론 삭제" style={{ padding: 6, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#a8a29e' }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* 본문 — BlockNote */}
        <div style={{ marginBottom: 20 }}>
          <TheoryBody
            key={theory.id}
            initial={theory.body}
            onChange={handleBodyChange}
          />
        </div>

        {/* 캔버스 — Excalidraw */}
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => setCanvasOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 8,
              background: canvasOpen ? '#eef2ff' : '#fff',
              border: `1px solid ${canvasOpen ? '#c7d2fe' : '#e7e5e4'}`,
              cursor: 'pointer', color: '#1e3a8a',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            <Palette size={13} />
            다이어그램 캔버스
            {canvasOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <span style={{ marginLeft: 4, fontSize: 10, color: '#a8a29e', fontWeight: 500 }}>
              벤다이어그램 · 플로우차트 · 마인드맵
            </span>
          </button>
          {canvasOpen && (
            <div style={{ marginTop: 10 }}>
              <TheoryCanvas
                key={theory.id}
                initial={theory.canvas}
                onChange={handleCanvasChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* 사이드 패널: EVIDENCE */}
      <aside style={{
        position: 'sticky', top: 24,
        padding: 16, borderRadius: 12,
        background: '#fafaf9', border: '1px solid #e7e5e4',
        maxHeight: 'calc(100vh - 48px)', overflow: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: '#1e3a8a' }}>
          <FlaskConical size={14} />
          <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', margin: 0, textTransform: 'uppercase' }}>
            Evidence
          </h3>
        </div>
        <p style={{ fontSize: 11, color: '#a8a29e', margin: '0 0 14px' }}>
          Content Studio 프로젝트를 증거로 연결. 조회수 평균을 자동 비교.
        </p>

        {evidence.length > 0 && (
          <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: '#fff', border: '1px solid #e7e5e4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#78716c', marginBottom: 8 }}>
              <BarChart3 size={11} /> 조회수 평균
            </div>
            {(['supports', 'refutes', 'neutral'] as EvidenceRole[]).map(role => {
              const s = stats[role];
              if (s.count === 0) return null;
              return (
                <div key={role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', fontSize: 12 }}>
                  <span style={{ color: '#78716c' }}>
                    {EVIDENCE_ROLE_LABEL[role]} <span style={{ color: '#d6d3d1', fontSize: 11 }}>({s.count})</span>
                  </span>
                  <span style={{ fontWeight: 700, color: '#1c1917', fontVariantNumeric: 'tabular-nums' }}>
                    {s.avg.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <ProjectPicker
          projects={projects}
          evidence={evidence}
          viewsByProject={viewsByProject}
          onAdd={async (pid, role) => {
            const r = await addEvidence(theoryId, pid, role);
            if (r) toast.success('증거 추가'); else toast.error('이미 추가됨');
            reload();
          }}
          onChangeRole={async (eid, role) => { await updateEvidence(eid, { role }); reload(); }}
          onRemove={async (eid) => { await removeEvidence(eid); reload(); }}
        />
      </aside>
    </div>
  );
}

function TagsField({ tags, onChange }: { tags: string[]; onChange: (next: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (tags.includes(v)) { setInput(''); return; }
    onChange([...tags, v]);
    setInput('');
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {tags.map(t => (
        <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: '#eef2ff', color: '#3730a3' }}>
          {t}
          <button onClick={() => onChange(tags.filter(x => x !== t))} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#3730a3', display: 'flex' }}>
            <X size={10} />
          </button>
        </span>
      ))}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Tag size={11} style={{ position: 'absolute', left: 6, color: '#a8a29e' }} />
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
          placeholder="태그 추가"
          style={{ padding: '3px 6px 3px 20px', border: '1px dashed #d6d3d1', borderRadius: 6, fontSize: 11, color: '#1c1917', outline: 'none', width: 90, background: 'transparent', fontFamily: 'inherit' }}
        />
      </div>
    </div>
  );
}

function ProjectPicker({ projects, evidence, viewsByProject, onAdd, onChangeRole, onRemove }: {
  projects: Project[];
  evidence: TheoryEvidence[];
  viewsByProject: Map<string, number>;
  onAdd: (projectId: string, role: EvidenceRole) => void;
  onChangeRole: (evidenceId: string, role: EvidenceRole) => void;
  onRemove: (evidenceId: string) => void;
}) {
  const [q, setQ] = useState('');
  const evMap = useMemo(() => {
    const m = new Map<string, TheoryEvidence>();
    for (const e of evidence) m.set(e.projectId, e);
    return m;
  }, [evidence]);

  const filtered = useMemo(() => {
    const lc = q.trim().toLowerCase();
    return projects.filter(p =>
      !lc || p.title.toLowerCase().includes(lc) || (p.client ?? '').toLowerCase().includes(lc)
    );
  }, [projects, q]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aE = evMap.has(a.id) ? 0 : 1;
      const bE = evMap.has(b.id) ? 0 : 1;
      if (aE !== bE) return aE - bE;
      return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
    });
  }, [filtered, evMap]);

  return (
    <div>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="프로젝트 검색"
        style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #e7e5e4', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 8, background: '#fff', fontFamily: 'inherit' }}
      />

      {projects.length === 0 ? (
        <div style={{ padding: 24, fontSize: 12, color: '#a8a29e', textAlign: 'center', border: '1px dashed #d6d3d1', borderRadius: 8 }}>
          Content Studio에 영상이 없습니다.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 4, maxHeight: 460, overflow: 'auto' }}>
          {sorted.map(p => {
            const ev = evMap.get(p.id);
            const views = viewsByProject.get(p.id) ?? 0;
            return (
              <div
                key={p.id}
                style={{
                  padding: 8, borderRadius: 8,
                  background: ev ? '#fff' : 'transparent',
                  border: ev ? '1px solid #c7d2fe' : '1px solid transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: ev ? 6 : 0 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1c1917', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: 10, color: '#a8a29e', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{p.format === 'longform' ? '롱폼' : '숏폼'}</span>
                      <span>·</span>
                      <span>{views.toLocaleString()} views</span>
                    </div>
                  </div>
                  {!ev ? (
                    <button onClick={() => onAdd(p.id, 'supports')} title="증거로 추가" style={iconBtn}>
                      <Plus size={13} />
                    </button>
                  ) : (
                    <button onClick={() => onRemove(ev.id)} title="제거" style={iconBtn}>
                      <X size={13} />
                    </button>
                  )}
                </div>
                {ev && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['supports', 'refutes', 'neutral'] as EvidenceRole[]).map(role => (
                      <button
                        key={role}
                        onClick={() => onChangeRole(ev.id, role)}
                        style={{
                          flex: 1, padding: '4px 6px', borderRadius: 5,
                          fontSize: 10, fontWeight: 600, cursor: 'pointer',
                          border: 'none',
                          background: ev.role === role
                            ? (role === 'supports' ? '#dcfce7' : role === 'refutes' ? '#fee2e2' : '#f5f5f4')
                            : '#fff',
                          color: ev.role === role
                            ? (role === 'supports' ? '#166534' : role === 'refutes' ? '#991b1b' : '#57534e')
                            : '#a8a29e',
                          outline: ev.role === role ? 'none' : '1px solid #e7e5e4',
                        }}
                      >{EVIDENCE_ROLE_LABEL[role]}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {projects.length > 0 && (
        <Link href="/content-studio" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 11, color: '#1e3a8a', textDecoration: 'none', fontWeight: 600 }}>
          <Link2 size={11} /> Content Studio 열기
        </Link>
      )}
    </div>
  );
}

const backBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '6px 10px', marginLeft: -10,
  background: 'none', border: 'none', color: '#78716c',
  fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 6,
};

const btnSecondary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8,
  border: '1px solid #e7e5e4', background: '#fff',
  color: '#78716c', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

const iconBtn: React.CSSProperties = {
  padding: 5, borderRadius: 5,
  background: '#fff', border: '1px solid #e7e5e4',
  cursor: 'pointer', color: '#57534e',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
