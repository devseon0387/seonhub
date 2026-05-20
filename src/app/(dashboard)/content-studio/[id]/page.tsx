'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Eye, ExternalLink, Loader2, Plus, Trash2, RefreshCw, Calendar, Save,
} from 'lucide-react';
import {
  getProjectById,
  getProjectUploads,
  upsertProjectUpload,
  deleteProjectUpload,
  updateProject,
} from '@/lib/supabase/db';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { useToast } from '@/contexts/ToastContext';
import type {
  Project,
  ProjectUpload,
  UploadPlatform,
  ProjectFormat,
} from '@/types';
import { UPLOAD_PLATFORM_LABEL } from '@/types';

const ALL_PLATFORMS: UploadPlatform[] = ['youtube', 'instagram', 'tiktok', 'naver_clip', 'daangn_story'];

export default function ContentStudioDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [uploads, setUploads] = useState<ProjectUpload[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    const [p, u] = await Promise.all([
      getProjectById(projectId),
      getProjectUploads(projectId),
    ]);
    setProject(p);
    setUploads(u);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);
  useSupabaseRealtime(['projects', 'project_uploads'], load);

  const totalViews = useMemo(() => uploads.reduce((s, u) => s + u.viewCount, 0), [uploads]);
  const usedPlatforms = useMemo(() => new Set(uploads.map(u => u.platform)), [uploads]);
  const availablePlatforms = ALL_PLATFORMS.filter(p => !usedPlatforms.has(p));

  const handleAddPlatform = async (platform: UploadPlatform) => {
    await upsertProjectUpload(projectId, platform, { viewCount: 0 });
    toast.success(`${UPLOAD_PLATFORM_LABEL[platform]} 추가`);
    load();
  };

  const handleUpdateUpload = async (
    platform: UploadPlatform,
    fields: Partial<Pick<ProjectUpload, 'url' | 'publishedAt' | 'viewCount' | 'note'>>
  ) => {
    await upsertProjectUpload(projectId, platform, fields);
    load();
  };

  const handleDelete = async (uploadId: string, platform: UploadPlatform) => {
    if (!confirm(`${UPLOAD_PLATFORM_LABEL[platform]} 업로드 정보를 삭제할까요?`)) return;
    await deleteProjectUpload(uploadId);
    toast.success('삭제됨');
    load();
  };

  const handleFormatChange = async (format: ProjectFormat) => {
    if (!project) return;
    await updateProject(project.id, { format });
    toast.success('포맷 변경');
    load();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80, color: '#a8a29e' }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }
  if (!project) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#a8a29e' }}>
        프로젝트를 찾을 수 없습니다.
        <div style={{ marginTop: 12 }}>
          <button onClick={() => router.push('/content-studio')} style={backBtn}>목록으로</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 36px', maxWidth: 1080, margin: '0 auto' }}>
      {/* back */}
      <button
        onClick={() => router.push('/content-studio')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', marginBottom: 16, marginLeft: -10,
          background: 'none', border: 'none', color: '#78716c',
          fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 6,
        }}
      >
        <ArrowLeft size={14} /> Content Studio
      </button>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {(['longform', 'shortform'] as ProjectFormat[]).map(f => (
              <button
                key={f}
                onClick={() => handleFormatChange(f)}
                style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                  padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                  border: project.format === f ? '1.5px solid transparent' : '1.5px solid #e7e5e4',
                  background: project.format === f
                    ? (f === 'longform' ? '#3730a3' : '#9a3412')
                    : '#fff',
                  color: project.format === f ? '#fff' : '#a8a29e',
                }}
              >{f === 'longform' ? '롱폼' : '숏폼'}</button>
            ))}
            {project.client && (
              <span style={{ fontSize: 12, color: '#a8a29e', marginLeft: 4 }}>· {project.client}</span>
            )}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1c1917', margin: 0, letterSpacing: '-0.01em' }}>
            {project.title}
          </h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#a8a29e', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            <Eye size={12} /> 총 조회수
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#1e3a8a', letterSpacing: '-0.02em' }}>
            {totalViews.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 업로드 슬롯 추가 (남은 플랫폼이 있을 때) */}
      {availablePlatforms.length > 0 && (
        <div style={{
          padding: 14, borderRadius: 10, background: '#fafaf9',
          border: '1px dashed #d6d3d1', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, color: '#78716c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={13} /> 업로드 추가
          </span>
          {availablePlatforms.map(p => (
            <button
              key={p}
              onClick={() => handleAddPlatform(p)}
              style={{
                padding: '6px 12px', borderRadius: 999,
                border: '1.5px solid #e7e5e4', background: '#fff',
                color: '#57534e', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >{UPLOAD_PLATFORM_LABEL[p]}</button>
          ))}
        </div>
      )}

      {/* 업로드 카드 */}
      {uploads.length === 0 ? (
        <div style={{
          padding: 60, textAlign: 'center',
          border: '1px dashed #d6d3d1', borderRadius: 12,
          color: '#a8a29e', fontSize: 13,
        }}>
          업로드된 플랫폼이 없습니다.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {uploads.map(u => (
            <UploadCard
              key={u.id}
              upload={u}
              onUpdate={(fields) => handleUpdateUpload(u.platform, fields)}
              onDelete={() => handleDelete(u.id, u.platform)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UploadCard({ upload, onUpdate, onDelete }: {
  upload: ProjectUpload;
  onUpdate: (fields: Partial<Pick<ProjectUpload, 'url' | 'publishedAt' | 'viewCount' | 'note'>>) => Promise<void>;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState(upload.url ?? '');
  const [publishedAt, setPublishedAt] = useState(upload.publishedAt ? upload.publishedAt.slice(0, 10) : '');
  const [viewsInput, setViewsInput] = useState(String(upload.viewCount ?? 0));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUrl(upload.url ?? '');
    setPublishedAt(upload.publishedAt ? upload.publishedAt.slice(0, 10) : '');
    setViewsInput(String(upload.viewCount ?? 0));
  }, [upload.url, upload.publishedAt, upload.viewCount]);

  const dirty = (url || '') !== (upload.url ?? '')
    || (publishedAt || '') !== ((upload.publishedAt ?? '').slice(0, 10))
    || Number(viewsInput || 0) !== upload.viewCount;

  const handleSave = async () => {
    setSaving(true);
    await onUpdate({
      url: url.trim(),
      publishedAt: publishedAt || undefined,
      viewCount: Math.max(0, parseInt(viewsInput || '0', 10) || 0),
    });
    setSaving(false);
  };

  return (
    <div style={{
      padding: 16, borderRadius: 12,
      background: '#fff', border: '1px solid #e7e5e4',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            padding: '5px 12px', borderRadius: 8,
            background: '#1e3a8a', color: '#fff',
            fontSize: 12, fontWeight: 700,
          }}>{UPLOAD_PLATFORM_LABEL[upload.platform]}</span>
          {upload.lastSyncedAt && (
            <span style={{ fontSize: 11, color: '#a8a29e', display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw size={11} /> {timeAgo(upload.lastSyncedAt)}
            </span>
          )}
        </div>
        <button
          onClick={onDelete}
          title="삭제"
          style={{
            padding: 6, borderRadius: 6,
            background: 'none', border: 'none', cursor: 'pointer', color: '#a8a29e',
          }}
        ><Trash2 size={14} /></button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 140px', gap: 10, alignItems: 'end' }}>
        <FieldS label="URL">
          <div style={{ position: 'relative' }}>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              style={{ ...miniInput, paddingRight: url ? 32 : 12 }}
            />
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer"
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#78716c' }}
              ><ExternalLink size={13} /></a>
            )}
          </div>
        </FieldS>

        <FieldS label="발행일">
          <div style={{ position: 'relative' }}>
            <Calendar size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a8a29e', pointerEvents: 'none' }} />
            <input
              type="date"
              value={publishedAt}
              onChange={e => setPublishedAt(e.target.value)}
              style={{ ...miniInput, paddingLeft: 28 }}
            />
          </div>
        </FieldS>

        <FieldS label="조회수">
          <input
            type="number"
            min={0}
            value={viewsInput}
            onChange={e => setViewsInput(e.target.value)}
            style={{ ...miniInput, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
          />
        </FieldS>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 8, border: 'none',
            background: dirty ? '#1e3a8a' : '#e7e5e4',
            color: dirty ? '#fff' : '#a8a29e',
            fontSize: 12, fontWeight: 600,
            cursor: dirty ? 'pointer' : 'default',
          }}
        >
          <Save size={12} />
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  );
}

function FieldS({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#a8a29e', marginBottom: 4, letterSpacing: '0.05em' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const miniInput: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  border: '1.5px solid #e7e5e4', borderRadius: 8,
  fontSize: 13, color: '#1c1917',
  outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', background: '#fff',
};

const backBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8,
  border: '1px solid #e7e5e4', background: '#fff',
  color: '#78716c', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return '방금';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  const days = Math.floor(diff / 86_400_000);
  if (days < 30) return `${days}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}
