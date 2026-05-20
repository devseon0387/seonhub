'use client';

import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { useEffect, useRef } from 'react';
import type { Block, PartialBlock } from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

interface Props {
  /** 직렬화된 BlockNote 문서 JSON (없으면 빈 문서) */
  initial?: string;
  /** 변경 후 debounce 저장 콜백 — 직렬화된 JSON 문자열 전달 */
  onChange: (json: string) => void;
  /** 디바운스 ms */
  debounceMs?: number;
}

function parseInitial(s?: string): PartialBlock[] | undefined {
  if (!s) return undefined;
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as PartialBlock[];
  } catch { /* fall through */ }
  return undefined;
}

export default function TheoryBody({ initial, onChange, debounceMs = 700 }: Props) {
  const initialContent = parseInitial(initial);
  const editor = useCreateBlockNote({
    initialContent,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef<string>(initial ?? '');

  useEffect(() => {
    if (!editor) return;
    const unsubscribe = editor.onChange(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const docs: Block[] = editor.document;
        const json = JSON.stringify(docs);
        if (json === lastSentRef.current) return;
        lastSentRef.current = json;
        onChange(json);
      }, debounceMs);
    });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [editor, debounceMs, onChange]);

  return (
    <div className="theory-body-editor" style={{ minHeight: 200 }}>
      <BlockNoteView editor={editor} theme="light" />
      <style>{`
        .theory-body-editor .bn-container { background: transparent; }
        .theory-body-editor .bn-editor { padding: 0 !important; }
        .theory-body-editor .ProseMirror { font-size: 15px; line-height: 1.65; color: #1c1917; min-height: 200px; }
      `}</style>
    </div>
  );
}

/** 템플릿별 기본 BlockNote 문서를 JSON 문자열로 반환 */
export function templateBody(template: 'performance' | 'planning' | 'marketing' | 'empty'): string {
  const make = (sections: { heading: string; placeholder?: string }[]): PartialBlock[] => {
    const blocks: PartialBlock[] = [];
    for (const s of sections) {
      blocks.push({ type: 'heading', props: { level: 2 }, content: s.heading });
      blocks.push({ type: 'paragraph', content: s.placeholder ?? '' });
    }
    return blocks;
  };

  switch (template) {
    case 'performance':
      return JSON.stringify(make([
        { heading: 'Abstract', placeholder: '이 이론을 한 문단으로 요약' },
        { heading: 'Hypothesis', placeholder: '구체적이고 측정 가능한 명제. 예) "숏폼 첫 1초 자막은 평균 조회수를 30% 이상 높인다"' },
        { heading: 'Background', placeholder: '왜 이 질문이 중요한가' },
        { heading: 'Method', placeholder: '대상 / 비교군 / KPI / 검증 기준' },
        { heading: 'Analysis', placeholder: '수치 비교, 패턴, 통계' },
        { heading: 'Conclusion', placeholder: '입증 / 부분 입증 / 반증' },
        { heading: 'Implications', placeholder: '앞으로 어떻게 적용할 것인가' },
        { heading: 'References', placeholder: '외부 자료, 관련 이론' },
      ]));
    case 'planning':
      return JSON.stringify(make([
        { heading: '관찰', placeholder: '어떤 기획 패턴을 발견했는가' },
        { heading: '가설', placeholder: '이 패턴이 어떤 결과를 낳을지 명제화' },
        { heading: '구조 분해', placeholder: '훅 / 본문 / 결말 / 클로징의 패턴' },
        { heading: '검증 방법', placeholder: '관찰 대상, 측정 기준' },
        { heading: '결론', placeholder: '' },
        { heading: '적용', placeholder: '다음 기획에 어떻게 반영할까' },
      ]));
    case 'marketing':
      return JSON.stringify(make([
        { heading: '현상', placeholder: '관찰된 마케팅 현상' },
        { heading: '해석', placeholder: '왜 이런 일이 일어나는가' },
        { heading: '데이터', placeholder: '근거가 되는 수치 / 사례' },
        { heading: '검증', placeholder: '어떻게 입증할 수 있을까' },
        { heading: '결론', placeholder: '' },
        { heading: '실행 시사점', placeholder: '캠페인 / 콘텐츠 / 채널에 어떻게 적용' },
      ]));
    case 'empty':
    default:
      return JSON.stringify([{ type: 'paragraph', content: '' }] as PartialBlock[]);
  }
}
