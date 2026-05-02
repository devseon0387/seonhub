// /share/[token] — 공개 공유 페이지 placeholder.
// Phase 1-5 에서 Vibox /api/s/[token]?format=meta 호출 → 자체 디자인으로 MD 렌더.
// (notes layout 안 거치므로 SEON Hub root 의 chrome 도 노출 X — 자체 layout 추가 필요 시 보강)

import { Share2 } from "lucide-react";
import "../../notes/notes.css";

export default async function ShareTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="notes-app" style={{ gridTemplateColumns: "1fr" }}>
      <main className="notes-main">
        <div className="notes-empty">
          <div className="ne-inner">
            <Share2 size={36} strokeWidth={1.5} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div className="ne-title">공유 노트</div>
            <div className="ne-desc">
              token: <code style={{ fontFamily: "var(--font-mono)" }}>{token}</code>
              <br />
              Phase 1-5 에서 Vibox 의 공유 메타 + MD 렌더로 채워집니다.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
