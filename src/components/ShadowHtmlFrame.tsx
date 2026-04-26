'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  src: string;
  className?: string;
}

/**
 * iframe 대신 Shadow DOM에 HTML을 주입해 외부 페이지를 렌더.
 * 서버(`/api/dev/static/...`)가 상대 경로·CSS 선택자(:root → :host)를 전처리해 보낸다고 가정.
 */
export default function ShadowHtmlFrame({ src, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(src, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        if (cancelled) return;

        const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
        // 기존 컨텐츠 비우기 + 새로 주입
        shadow.innerHTML = html;

        // 디자인 목업용이라 <script>는 실행하지 않음.
        // (스크립트가 `document.getElementById`로 shadow root 내부 요소를 찾으면 null로 터짐)
        // 필요한 목업이 생기면 per-project 화이트리스트로 예외 처리 예정.
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '렌더 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div className={`relative w-full h-full bg-white ${className ?? ''}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-[12px] text-ink-400 pointer-events-none">
          로딩 중...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-[12px] text-red-500">
          에러: {error}
        </div>
      )}
      <div ref={hostRef} className="w-full h-full overflow-auto" />
    </div>
  );
}
