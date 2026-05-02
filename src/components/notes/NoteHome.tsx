"use client";

// /notes Home — 검색(⌘K) + 핀 + 최근 + 카테고리.
// 데이터 source: GET /api/notes/files?path=/notes&recursive=true&includeMeta=true
// 한 번 fetch 후 client-side 에서 분류·검색.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Star,
  Clock,
  Folder,
  FileText,
  AlertCircle,
  RefreshCw,
  CornerDownLeft,
} from "lucide-react";

interface ViboxEntry {
  name: string;
  path: string;
  isFolder: boolean;
  size: number;
  modifiedAt: number;
  kind: string;
  frontmatter?: {
    title?: string;
    tags?: string[];
    pinned?: boolean;
    [k: string]: unknown;
  };
}
interface ViboxListing {
  path: string;
  entries: ViboxEntry[];
}

function fmtTime(epochMs: number): string {
  if (!epochMs) return "";
  const diff = Date.now() - epochMs;
  const min = Math.floor(diff / 60_000);
  const hr = Math.floor(diff / 3_600_000);
  const day = Math.floor(diff / 86_400_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  if (hr < 24) return `${hr}시간 전`;
  if (day < 7) return `${day}일 전`;
  const d = new Date(epochMs);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function fmtRelativePath(path: string): string {
  // /notes/projects/vibox/note.md → projects · vibox
  const parts = path.replace(/^\/notes\/?/, "").split("/").filter(Boolean);
  if (parts.length <= 1) return "/";
  return parts.slice(0, -1).join(" · ");
}

function noteHref(path: string): string {
  return `/notes/${encodeURIComponent(path)}`;
}

function titleOf(e: ViboxEntry): string {
  return e.frontmatter?.title?.trim() || e.name.replace(/\.md$/, "");
}

export default function NoteHome() {
  const [entries, setEntries] = useState<ViboxEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notes/files?path=/notes&recursive=true&includeMeta=true");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      const data: ViboxListing = await res.json();
      setEntries(data.entries);
    } catch (e) {
      setError((e as Error).message ?? "unknown");
      setEntries(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ⌘K 검색 모달 토글 + ESC 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
        setQuery("");
        setActiveIdx(0);
      } else if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  // 분류
  const pinned = useMemo(() => {
    if (!entries) return [];
    return entries
      .filter((e) => !e.isFolder && e.frontmatter?.pinned === true)
      .sort((a, b) => titleOf(a).localeCompare(titleOf(b)))
      .slice(0, 8);
  }, [entries]);

  const recent = useMemo(() => {
    if (!entries) return [];
    return entries
      .filter((e) => !e.isFolder)
      .sort((a, b) => b.modifiedAt - a.modifiedAt)
      .slice(0, 8);
  }, [entries]);

  const categories = useMemo(() => {
    if (!entries) return [];
    // top-level 폴더 = path = /notes/<one-segment>
    const top = entries.filter((e) => e.isFolder && e.path.split("/").filter(Boolean).length === 2);
    return top
      .map((f) => ({
        path: f.path,
        name: f.name,
        noteCount: entries.filter((e) => !e.isFolder && e.path.startsWith(f.path + "/")).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  // 검색 결과 (제목·태그·파일명)
  const searchResults = useMemo(() => {
    if (!entries || !query.trim()) return [];
    const q = query.toLowerCase();
    return entries
      .filter((e) => !e.isFolder)
      .filter((e) => {
        if (e.name.toLowerCase().includes(q)) return true;
        if (titleOf(e).toLowerCase().includes(q)) return true;
        if ((e.frontmatter?.tags ?? []).some((t) => t.toLowerCase().includes(q))) return true;
        return false;
      })
      .slice(0, 30);
  }, [entries, query]);

  // 검색 결과 키보드 ↑↓ Enter 네비게이션
  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, Math.max(0, searchResults.length - 1)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        const r = searchResults[activeIdx];
        if (r) {
          window.location.href = noteHref(r.path);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, searchResults, activeIdx]);

  return (
    <div className="home-page">
      <div className="home-top">
        <div className="home-title">SEON Notes</div>
        <div className="home-search" onClick={() => setSearchOpen(true)} role="button" tabIndex={0}>
          <Search size={14} strokeWidth={2} />
          <span>검색</span>
          <span className="kbd">⌘K</span>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 14,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "var(--r-md)",
            color: "#a04545",
            fontSize: 13,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <AlertCircle size={16} />
          <span style={{ flex: 1 }}>
            노트 데이터 로드 실패: {error}{" "}
            <span style={{ color: "var(--text-muted)" }}>
              (Vibox /api/integration/files endpoint 가 아직 준비 안 됐을 수 있습니다)
            </span>
          </span>
          <button
            onClick={() => void load()}
            style={{
              padding: "5px 12px",
              border: "1px solid #fecaca",
              borderRadius: 6,
              background: "white",
              color: "#a04545",
              fontSize: 12,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <RefreshCw size={12} /> 재시도
          </button>
        </div>
      )}

      {/* 핀 */}
      <div className="home-section">
        <div className="home-section-label">즐겨찾기</div>
        {loading && !entries ? (
          <div className="home-empty">로딩 중…</div>
        ) : pinned.length === 0 ? (
          <div className="home-empty">
            아직 즐겨찾기한 노트가 없습니다. 노트의 frontmatter 에 <code>pinned: true</code> 를 추가하면
            여기 노출됩니다.
          </div>
        ) : (
          <div className="pin-grid">
            {pinned.map((n) => (
              <Link key={n.path} href={noteHref(n.path)} className="pin-card">
                <Star size={16} strokeWidth={2} className="pin-mark" fill="currentColor" />
                <FileText size={18} strokeWidth={1.5} className="pin-ico" />
                <div className="pin-title">{titleOf(n)}</div>
                <div className="pin-meta">{fmtTime(n.modifiedAt)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 최근 */}
      <div className="home-section">
        <div className="home-section-label">최근 노트</div>
        {loading && !entries ? (
          <div className="home-empty">로딩 중…</div>
        ) : recent.length === 0 ? (
          <div className="home-empty">아직 노트가 없습니다.</div>
        ) : (
          <div className="recent-list">
            {recent.map((n) => (
              <Link key={n.path} href={noteHref(n.path)} className="recent-row">
                <span className="time">
                  <Clock size={11} style={{ display: "inline", marginRight: 4, opacity: 0.6 }} />
                  {fmtTime(n.modifiedAt)}
                </span>
                <span className="title">{titleOf(n)}</span>
                <span className="path">{fmtRelativePath(n.path)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 카테고리 */}
      <div className="home-section">
        <div className="home-section-label">카테고리</div>
        {loading && !entries ? (
          <div className="home-empty">로딩 중…</div>
        ) : categories.length === 0 ? (
          <div className="home-empty">아직 폴더가 없습니다.</div>
        ) : (
          <div className="cat-grid">
            {categories.map((c) => (
              <div key={c.path} className="cat-card">
                <Folder size={22} strokeWidth={1.5} className="cat-ico" />
                <div className="cat-name">{c.name}</div>
                <div className="cat-count">노트 {c.noteCount}개</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 검색 모달 */}
      {searchOpen && (
        <div className="search-overlay" onClick={() => setSearchOpen(false)}>
          <div className="search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="search-input-wrap">
              <Search size={16} strokeWidth={2} className="search-ico" />
              <input
                autoFocus
                className="search-input"
                placeholder="노트 제목 / 태그 / 파일명 검색"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIdx(0);
                }}
              />
            </div>
            <div className="search-results">
              {!query.trim() ? (
                <div className="search-empty">검색어 입력</div>
              ) : searchResults.length === 0 ? (
                <div className="search-empty">매칭 결과 없음</div>
              ) : (
                searchResults.map((r, i) => (
                  <Link
                    key={r.path}
                    href={noteHref(r.path)}
                    className={"search-result" + (i === activeIdx ? " active" : "")}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => setSearchOpen(false)}
                  >
                    <FileText size={14} strokeWidth={2} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {titleOf(r)}
                    </span>
                    <span className="sr-path">{fmtRelativePath(r.path)}</span>
                  </Link>
                ))
              )}
            </div>
            <div className="search-footer">
              <span><span className="kbd">↑↓</span> 이동</span>
              <span><span className="kbd"><CornerDownLeft size={10} style={{ display: "inline" }} /></span> 열기</span>
              <span><span className="kbd">esc</span> 닫기</span>
              <span style={{ marginLeft: "auto" }}>{searchResults.length} 건</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
