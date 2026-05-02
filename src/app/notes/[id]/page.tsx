// /notes/[id] — Editor placeholder.
// Phase 1-4 에서 Tiptap + 슬래시 + 위키링크 + 이미지 업로드 + auto-save 로 채움.

import { Pencil } from "lucide-react";

export default async function NoteEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="notes-empty">
      <div className="ne-inner">
        <Pencil size={36} strokeWidth={1.5} style={{ opacity: 0.3, marginBottom: 12 }} />
        <div className="ne-title">노트 에디터</div>
        <div className="ne-desc">
          노트 id: <code style={{ fontFamily: "var(--font-mono)" }}>{id}</code>
          <br />
          Phase 1-4 에서 Tiptap 에디터로 채워집니다.
        </div>
      </div>
    </div>
  );
}
