'use client';

import { useEffect, useState } from 'react';
import { Pencil, Save, X, FileText, Frame, Map, Database } from 'lucide-react';
import { useProjectDoc, type DocKind } from '@/lib/dev/project-docs';

const KIND_LABEL: Record<DocKind, string> = {
  design: '디자인 시스템',
  wireframes: '와이어프레임',
  roadmap: '로드맵',
  erd: '데이터 모델 (ERD)',
};

const KIND_ICON: Record<DocKind, React.ComponentType<{ size?: number; className?: string }>> = {
  design: FileText,
  wireframes: Frame,
  roadmap: Map,
  erd: Database,
};

const KIND_PLACEHOLDER: Record<DocKind, string> = {
  design: `# 디자인 시스템

## 컬러
- primary: #...
- accent: #...

## 타이포
- 제목: ...
- 본문: ...

## 컴포넌트
- Button (variants)
- Card
- Input`,
  wireframes: `# 와이어프레임

## 페이지 구조
- /: 랜딩
- /app: 메인 화면
- /settings: 설정

## 주요 플로우
1. 랜딩 → 로그인 → 메인
2. 메인 → 상세 → 편집`,
  roadmap: `# 로드맵

## Phase 1 — MVP (done/in-progress)
- [ ] 기본 레이아웃
- [ ] 핵심 기능 A
- [ ] 핵심 기능 B

## Phase 2 — 확장
- [ ] 기능 C
- [ ] 기능 D

## 결정 사항
- YYYY-MM-DD: ... (이유)

## 오픈 질문
- ...`,
  erd: `# 데이터 모델

## 엔티티

### users
- id: uuid (pk)
- email: text (unique)
- created_at: timestamp

### projects
- id: uuid (pk)
- user_id: uuid (fk → users)
- name: text

## 관계
- users 1:N projects (has)`,
};

export default function BlueprintDoc({
  projectId,
  kind,
}: {
  projectId: string;
  kind: DocKind;
}) {
  const [doc, setDoc] = useProjectDoc(projectId, kind);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(doc);

  // 외부 동기화: doc 변경 시 draft 맞춤 (편집 중이 아닐 때만)
  useEffect(() => {
    if (!editing) setDraft(doc);
  }, [doc, editing]);

  const startEdit = () => {
    setDraft(doc);
    setEditing(true);
  };

  const save = () => {
    setDoc(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(doc);
    setEditing(false);
  };

  const Icon = KIND_ICON[kind];

  if (editing) {
    return (
      <div className="bg-white border border-ink-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon size={14} className="text-ink-600" />
            <h3 className="text-[13px] font-bold text-ink-900">{KIND_LABEL[kind]} 편집</h3>
          </div>
          <div className="flex gap-1">
            <button
              onClick={cancel}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md text-ink-600 hover:bg-ink-50"
            >
              <X size={11} /> 취소
            </button>
            <button
              onClick={save}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-[#1e3a8a] text-white hover:bg-[#1e40af]"
            >
              <Save size={11} /> 저장
            </button>
          </div>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={KIND_PLACEHOLDER[kind]}
          spellCheck={false}
          className="w-full font-mono text-[12.5px] leading-[1.65] p-3 bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:border-[#1e3a8a]"
          style={{ height: 'clamp(520px, 70vh, 900px)', resize: 'vertical' }}
        />
        <div className="text-[10px] text-ink-400 mt-2 font-mono">
          localStorage에 저장됩니다 · 구조화된 블루프린트(ERD/로드맵 뷰) 없을 때의 임시 노트
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="bg-white border border-ink-200 border-dashed rounded-xl py-20 text-center">
        <Icon size={28} className="mx-auto text-ink-300 mb-3" />
        <p className="text-[13px] text-ink-500 mb-1">
          {KIND_LABEL[kind]}가 아직 비어있어요
        </p>
        <p className="text-[11px] text-ink-400 mb-5">
          자유 서식 메모로 시작 · 나중에 구조화된 블루프린트로 승격 가능
        </p>
        <button
          onClick={startEdit}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold rounded-lg bg-[#1e3a8a] text-white hover:bg-[#1e40af]"
        >
          <Pencil size={12} /> 편집 시작
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-ink-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-ink-600" />
          <h3 className="text-[13px] font-bold text-ink-900">{KIND_LABEL[kind]}</h3>
          <span className="text-[10px] text-ink-400">· 메모</span>
        </div>
        <button
          onClick={startEdit}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-ink-500 hover:text-ink-900 rounded hover:bg-ink-50"
          title="편집"
        >
          <Pencil size={11} /> 편집
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink-800 font-sans">
        {doc}
      </pre>
    </div>
  );
}
