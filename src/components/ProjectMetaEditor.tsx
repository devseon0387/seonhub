'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Star } from 'lucide-react';
import {
  useProjectMetadata,
  IMPORTANCE_LABEL,
  IMPORTANCE_COLOR,
  OWNER_LABEL,
  OWNER_COLOR,
  OWNER_OPTIONS,
  TYPE_LABEL,
  TYPE_OPTIONS,
  type Importance,
  type ProjectType,
} from '@/lib/dev/project-metadata';

interface Props {
  id: string;
  stopPropagation?: boolean;
}

/**
 * 프로젝트 카드 우상단 "⋯" 메뉴 + 팝오버 편집 UI.
 * 동시에 ⭐ 즐겨찾기 토글을 별도 버튼으로 노출.
 */
export default function ProjectMetaEditor({ id, stopPropagation = true }: Props) {
  const [meta, setMeta] = useProjectMetadata(id);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const guard = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    guard(e);
    setMeta({ favorite: !meta.favorite });
  };

  return (
    <div ref={rootRef} className="inline-flex items-center gap-0.5 shrink-0">
      <button
        onClick={toggleFavorite}
        title={meta.favorite ? '즐겨찾기 해제' : '즐겨찾기'}
        className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
          meta.favorite
            ? 'text-amber-500 hover:text-amber-600'
            : 'text-gray-300 hover:text-amber-500'
        }`}
      >
        <Star size={13} fill={meta.favorite ? 'currentColor' : 'none'} />
      </button>

      <button
        onClick={(e) => {
          guard(e);
          setOpen((v) => !v);
        }}
        title="메타데이터 편집"
        className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-20 w-60 bg-white border border-gray-200 rounded-xl shadow-lg p-3 space-y-2.5"
          onClick={guard}
          style={{ position: 'absolute' }}
        >
          {/* 중요도 */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">중요도</label>
            <div className="mt-1 flex gap-1">
              {(['high', 'mid', 'low'] as Importance[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setMeta({ importance: meta.importance === v ? undefined : v })}
                  className={`flex-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                    meta.importance === v
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                  style={meta.importance === v ? { background: IMPORTANCE_COLOR[v], borderColor: IMPORTANCE_COLOR[v] } : undefined}
                >
                  {IMPORTANCE_LABEL[v]}
                </button>
              ))}
            </div>
          </div>

          {/* Owner */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">소속</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {OWNER_OPTIONS.map((v) => (
                <button
                  key={v}
                  onClick={() => setMeta({ owner: meta.owner === v ? undefined : v })}
                  className={`text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                    meta.owner === v
                      ? 'text-white'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                  style={
                    meta.owner === v
                      ? { background: OWNER_COLOR[v], borderColor: OWNER_COLOR[v] }
                      : undefined
                  }
                >
                  {OWNER_LABEL[v] ?? v}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">유형</label>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {TYPE_OPTIONS.map((v) => (
                <button
                  key={v}
                  onClick={() => setMeta({ type: meta.type === v ? undefined : (v as ProjectType) })}
                  className={`text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                    meta.type === v
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {TYPE_LABEL[v]}
                </button>
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">메모</label>
            <textarea
              value={meta.notes ?? ''}
              onChange={(e) => setMeta({ notes: e.target.value })}
              placeholder="짧은 메모 (예: GPU 렌더 이슈 중)"
              rows={2}
              className="mt-1 w-full text-[11.5px] bg-white border border-gray-200 rounded-md px-2 py-1.5 resize-none focus:outline-none focus:border-[#1e3a8a]"
            />
          </div>

          {/* 숨김 */}
          <label className="flex items-center gap-2 text-[11.5px] text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={!!meta.hidden}
              onChange={(e) => setMeta({ hidden: e.target.checked })}
              className="rounded border-gray-300 text-[#1e3a8a] focus:ring-0"
            />
            Dev Workspace 리스트에서 숨기기
          </label>

          {/* 초기화 */}
          {(meta.importance || meta.owner || meta.type || meta.favorite || meta.notes) && (
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={() =>
                  setMeta({
                    importance: undefined,
                    owner: undefined,
                    type: undefined,
                    favorite: false,
                    notes: undefined,
                  })
                }
                className="text-[11px] text-gray-500 hover:text-gray-900"
              >
                이 프로젝트 메타데이터 초기화
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 카드 하단에 메모를 노출 */
export function ProjectNote({ id }: { id: string }) {
  const [meta] = useProjectMetadata(id);
  if (!meta.notes) return null;
  return (
    <div className="flex items-start gap-1.5 text-[11px] italic text-gray-500 bg-amber-50/40 border-l-2 border-amber-200 pl-2 py-1 mb-2 rounded-r leading-snug">
      <span className="truncate">{meta.notes}</span>
    </div>
  );
}

/**
 * 카드/테이블에 표시할 읽기 전용 뱃지들 (importance · owner · type)
 */
export function ProjectMetaBadges({ id, compact = false }: { id: string; compact?: boolean }) {
  const [meta] = useProjectMetadata(id);
  const items: React.ReactNode[] = [];

  if (meta.importance) {
    const label = IMPORTANCE_LABEL[meta.importance];
    const color = IMPORTANCE_COLOR[meta.importance];
    items.push(
      <span
        key="imp"
        title={`중요도: ${label}`}
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
        style={{ background: `${color}1a`, color }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        {!compact && label}
      </span>,
    );
  }

  if (meta.owner) {
    const label = OWNER_LABEL[meta.owner] ?? meta.owner;
    const color = OWNER_COLOR[meta.owner] ?? '#78716c';
    items.push(
      <span
        key="own"
        title={`소속: ${label}`}
        className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
        style={{ background: color }}
      >
        {label}
      </span>,
    );
  }

  if (meta.type) {
    items.push(
      <span
        key="type"
        title={`유형: ${TYPE_LABEL[meta.type]}`}
        className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200"
      >
        {TYPE_LABEL[meta.type]}
      </span>,
    );
  }

  if (items.length === 0) return null;
  return <span className="inline-flex items-center gap-1 flex-wrap">{items}</span>;
}
