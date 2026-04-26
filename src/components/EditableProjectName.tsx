'use client';

import { useEffect, useRef, useState } from 'react';
import { Pencil, RotateCcw } from 'lucide-react';
import { useProjectName } from '@/lib/dev/project-names';

interface Props {
  /** 프로젝트 디렉토리명 (id) */
  id: string;
  /** package.json의 name (기본 표시용) */
  fallback: string;
  /** 편집 모드에서 호스트 요소 클릭으로 네비게이션 발생 막기 위한 wrapper */
  stopPropagation?: boolean;
  className?: string;
  /** 커스텀 이름 표시 스타일. 기본은 bold sm */
  variant?: 'card' | 'row' | 'header';
}

export default function EditableProjectName({
  id,
  fallback,
  stopPropagation = true,
  className = '',
  variant = 'card',
}: Props) {
  const [name, setName, isCustom] = useProjectName(id, fallback);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(name);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, name]);

  const save = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === fallback) {
      setName(null);
    } else {
      setName(trimmed);
    }
    setEditing(false);
  };

  const cancel = () => {
    setEditing(false);
    setDraft(name);
  };

  const reset = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    setName(null);
  };

  const startEdit = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    setEditing(true);
  };

  const sizeClass =
    variant === 'header'
      ? 'text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight'
      : variant === 'row'
        ? 'font-semibold text-[13px] text-gray-900'
        : 'font-bold text-sm text-gray-900';

  if (editing) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`} onClick={(e) => stopPropagation && e.stopPropagation()}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
          }}
          onBlur={save}
          placeholder={fallback}
          className={`${sizeClass} bg-white border border-[#1e3a8a] rounded px-1.5 py-0 outline-none min-w-0`}
          style={{ width: `${Math.max(draft.length + 1, 6)}ch` }}
        />
      </span>
    );
  }

  return (
    <span className={`group/name inline-flex items-center gap-1.5 min-w-0 ${className}`}>
      <span className={`${sizeClass} truncate`}>{name}</span>
      <button
        onClick={startEdit}
        title="이름 수정"
        className="opacity-0 group-hover/name:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 shrink-0"
      >
        <Pencil size={11} />
      </button>
      {isCustom && (
        <button
          onClick={reset}
          title={`기본 이름 복원 (${fallback})`}
          className="opacity-0 group-hover/name:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 shrink-0"
        >
          <RotateCcw size={11} />
        </button>
      )}
    </span>
  );
}
