'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FlaskConical, Plus, Search, FileText } from 'lucide-react';
import {
  listTheories, createTheory,
} from '@/lib/lab/storage';
import { templateBody } from '@/components/lab/TheoryBody';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import type { Theory, TheoryStatus, TheoryTemplate } from '@/types';
import { THEORY_STATUS_LABEL, THEORY_TEMPLATE_LABEL } from '@/types';

type FilterTab = 'all' | TheoryStatus;

const STATUS_COLOR: Record<TheoryStatus, { bg: string; fg: string }> = {
  hypothesis: { bg: '#fef3c7', fg: '#92400e' },
  testing:    { bg: '#dbeafe', fg: '#1e40af' },
  validated:  { bg: '#dcfce7', fg: '#166534' },
  refuted:    { bg: '#fee2e2', fg: '#991b1b' },
  archived:   { bg: '#f5f5f4', fg: '#78716c' },
};

const TEMPLATE_HINT: Record<TheoryTemplate, string> = {
  performance: '예: "숏폼 첫 1초 자막이 평균 조회수를 30% 높인다"',
  planning:    '예: "타깃 흐름 - 호기심 → 충돌 → 해결 구조가 완독률에 유리"',
  marketing:   '예: "브랜드 컬러 일관성이 재방문율에 미치는 영향"',
  empty:       '빈 문서로 시작',
};

export default function LabPage() {
  const router = useRouter();
  const [theories, setTheories] = useState<Theory[]>([]);
  const [tab, setTab] = useState<FilterTab>('all');
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const reload = useCallback(async () => {
    const ts = await listTheories();
    setTheories(ts);
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useSupabaseRealtime(['theories'], reload);

  const filtered = useMemo(() => {
    const lc = q.trim().toLowerCase();
    return theories
      .filter(t => tab === 'all' || t.status === tab)
      .filter(t => !lc || t.title.toLowerCase().includes(lc)
        || (t.abstract ?? '').toLowerCase().includes(lc)
        || (t.hypothesis ?? '').toLowerCase().includes(lc)
        || (t.tags ?? []).some(tg => tg.toLowerCase().includes(lc))
      );
  }, [theories, tab, q]);

  const counts = useMemo(() => {
    const r: Record<TheoryStatus, number> = { hypothesis: 0, testing: 0, validated: 0, refuted: 0, archived: 0 };
    for (const t of theories) r[t.status] = (r[t.status] ?? 0) + 1;
    return r;
  }, [theories]);

  const handleCreate = async (template: TheoryTemplate) => {
    const defaults: Record<TheoryTemplate, Partial<Theory> & { title: string }> = {
      performance: { title: '제목 없음', template: 'performance', body: templateBody('performance') },
      planning:    { title: '제목 없음', template: 'planning',    body: templateBody('planning') },
      marketing:   { title: '제목 없음', template: 'marketing',   body: templateBody('marketing') },
      empty:       { title: '제목 없음', template: 'empty',       body: templateBody('empty') },
    };
    const created = await createTheory(defaults[template]);
    setShowCreate(false);
    if (created) router.push(`/lab/${created.id}`);
  };

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1200, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <FlaskConical size={22} style={{ color: '#1e3a8a' }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1c1917', margin: 0, letterSpacing: '-0.01em' }}>
              Content Lab
            </h1>
          </div>
          <p style={{ fontSize: 13, color: '#78716c', margin: 0 }}>
            콘텐츠/기획/마케팅 통찰을 논문 형식으로. 가설 → 검증 → 입증/반증.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, background: '#1e3a8a', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        ><Plus size={15} /> 새 이론</button>
      </div>

      {/* 검색 */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a8a29e' }} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="제목 / 초록 / 가설 / 태그 검색"
          style={{ width: '100%', padding: '11px 12px 11px 36px', borderRadius: 10, border: '1px solid #e7e5e4', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit' }}
        />
      </div>

      {/* 상태 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e7e5e4', overflowX: 'auto' }}>
        {(['all', 'hypothesis', 'testing', 'validated', 'refuted', 'archived'] as FilterTab[]).map(t => {
          const label = t === 'all' ? '전체' : THEORY_STATUS_LABEL[t];
          const cnt = t === 'all' ? theories.length : counts[t];
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 14px', border: 'none', background: 'none', whiteSpace: 'nowrap',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                color: tab === t ? '#1e3a8a' : '#a8a29e',
                borderBottom: tab === t ? '2px solid #1e3a8a' : '2px solid transparent',
                marginBottom: -1,
              }}
            >{label} <span style={{ marginLeft: 4, fontSize: 11, color: '#d6d3d1' }}>{cnt}</span></button>
          );
        })}
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} hasAny={theories.length > 0} />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map(t => <TheoryRow key={t.id} theory={t} />)}
        </div>
      )}

      {showCreate && (
        <TemplateModal onClose={() => setShowCreate(false)} onPick={handleCreate} />
      )}
    </div>
  );
}

function TheoryRow({ theory }: { theory: Theory }) {
  const c = STATUS_COLOR[theory.status];
  return (
    <Link href={`/lab/${theory.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        padding: '14px 16px', borderRadius: 10, background: '#fff',
        border: '1px solid #e7e5e4', cursor: 'pointer',
        display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: 14, alignItems: 'center',
        transition: 'border-color 0.15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#1e3a8a'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e7e5e4'; }}
      >
        <span style={{
          textAlign: 'center', fontSize: 11, fontWeight: 700,
          padding: '4px 8px', borderRadius: 6,
          background: c.bg, color: c.fg, letterSpacing: '0.03em',
        }}>{THEORY_STATUS_LABEL[theory.status]}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1c1917', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {theory.title}
          </div>
          <div style={{ fontSize: 12, color: '#78716c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {theory.hypothesis || theory.abstract || '내용 없음'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {(theory.tags ?? []).slice(0, 3).map(tg => (
            <span key={tg} style={{ fontSize: 10, fontWeight: 600, padding: '3px 7px', borderRadius: 6, background: '#f5f5f4', color: '#57534e' }}>{tg}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ onCreate, hasAny }: { onCreate: () => void; hasAny: boolean }) {
  return (
    <div style={{ padding: 60, textAlign: 'center', border: '1px dashed #d6d3d1', borderRadius: 12, color: '#a8a29e' }}>
      <FileText size={32} style={{ margin: '0 auto 12px', display: 'block', color: '#d6d3d1' }} />
      <div style={{ fontSize: 14, marginBottom: 14 }}>
        {hasAny ? '조건에 맞는 이론이 없습니다.' : '아직 등록된 이론이 없습니다.'}
      </div>
      {!hasAny && (
        <button onClick={onCreate} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #1e3a8a', background: '#fff', color: '#1e3a8a', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          첫 이론 시작
        </button>
      )}
    </div>
  );
}

function TemplateModal({ onClose, onPick }: { onClose: () => void; onPick: (t: TheoryTemplate) => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 520, background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1c1917', margin: '0 0 6px' }}>템플릿 선택</h2>
        <p style={{ fontSize: 12, color: '#78716c', margin: '0 0 18px' }}>각 템플릿은 가설/방법 섹션에 초기 가이드를 채워둡니다.</p>

        <div style={{ display: 'grid', gap: 8 }}>
          {(['performance', 'planning', 'marketing', 'empty'] as TheoryTemplate[]).map(t => (
            <button
              key={t}
              onClick={() => onPick(t)}
              style={{
                textAlign: 'left', padding: '14px 16px', borderRadius: 10,
                border: '1.5px solid #e7e5e4', background: '#fff', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#1e3a8a'; e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e7e5e4'; e.currentTarget.style.background = '#fff'; }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1c1917', marginBottom: 4 }}>{THEORY_TEMPLATE_LABEL[t]}</div>
              <div style={{ fontSize: 12, color: '#78716c' }}>{TEMPLATE_HINT[t]}</div>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e7e5e4', background: '#fff', color: '#78716c', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>닫기</button>
        </div>
      </div>
    </div>
  );
}
