// SEON Hub Notes 풀스크린 레이아웃.
//
// (dashboard) 그룹 밖이므로 SEON Hub 의 dashboard chrome (사이드바·헤더 등) 미적용.
// 자체 노트 사이드바만 노출. .notes-app scope CSS 로 A 시안 톤 분리.

import "./notes.css";
import NoteSidebar from "@/components/notes/NoteSidebar";

export default function NotesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="notes-app">
      <NoteSidebar />
      <main className="notes-main">{children}</main>
    </div>
  );
}
