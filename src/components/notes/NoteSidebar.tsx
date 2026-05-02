"use client";

// 노트 사이드바 — A 시안 (NOTION-CLEAN) 톤.
// Phase 1-2: Vibox /api/integration/files 데이터로 트리 채움. 실패 시 안내 메시지.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Star,
  Clock,
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  Hash,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface ViboxEntry {
  name: string;
  path: string;
  isFolder: boolean;
  size: number;
  modifiedAt: number;
  kind: string;
  frontmatter?: { title?: string; tags?: string[]; pinned?: boolean };
}
interface ViboxListing {
  path: string;
  entries: ViboxEntry[];
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  modifiedAt: number;
  pinned?: boolean;
  title?: string;
}

/** /notes 아래 모든 entries (recursive) → 폴더 트리 변환 */
function buildTree(entries: ViboxEntry[], rootPath = "/notes"): TreeNode[] {
  const rootDepth = rootPath.split("/").filter(Boolean).length;
  const map = new Map<string, TreeNode>();
  // 모든 폴더 + 파일 노드 생성
  for (const e of entries) {
    map.set(e.path, {
      name: e.name,
      path: e.path,
      isFolder: e.isFolder,
      children: [],
      modifiedAt: e.modifiedAt,
      pinned: e.frontmatter?.pinned,
      title: e.frontmatter?.title ?? e.name.replace(/\.md$/, ""),
    });
  }
  // 부모-자식 연결
  const top: TreeNode[] = [];
  for (const node of map.values()) {
    const parts = node.path.split("/").filter(Boolean);
    if (parts.length <= rootDepth + 1) {
      top.push(node);
      continue;
    }
    const parentPath = "/" + parts.slice(0, -1).join("/");
    const parent = map.get(parentPath);
    if (parent) parent.children.push(node);
    else top.push(node);
  }
  // 정렬 (폴더 우선, 이름 오름차순)
  const sortFn = (a: TreeNode, b: TreeNode) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  };
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort(sortFn);
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(top);
  return top;
}

function activePathFromUrl(pathname: string | null): string | null {
  if (!pathname?.startsWith("/notes/")) return null;
  const id = pathname.slice("/notes/".length);
  return decodeURIComponent(id);
}

function TreeItem({
  node,
  depth,
  activeId,
}: {
  node: TreeNode;
  depth: number;
  activeId: string | null;
}) {
  const [open, setOpen] = useState(depth < 2);
  const indentClass = depth === 1 ? " sub" : depth >= 2 ? " sub2" : "";

  if (node.isFolder) {
    const Caret = open ? ChevronDown : ChevronRight;
    const FolderIco = open ? FolderOpen : Folder;
    return (
      <>
        <div className={"ns-item" + indentClass} onClick={() => setOpen((v) => !v)}>
          <Caret className="ns-item-ico" size={14} />
          <FolderIco className="ns-item-ico" size={14} />
          <span>{node.name}</span>
        </div>
        {open && node.children.map((c) => (
          <TreeItem key={c.path} node={c} depth={depth + 1} activeId={activeId} />
        ))}
      </>
    );
  }

  // 파일: /notes/[id] 라우팅. id = path 그대로 (URL encode).
  const href = `/notes/${encodeURIComponent(node.path)}`;
  const idForCompare = node.path;
  const isActive = activeId === idForCompare;
  return (
    <Link
      href={href}
      className={"ns-item" + indentClass + (isActive ? " active" : "")}
    >
      <FileText className="ns-item-ico" size={14} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {node.title ?? node.name}
      </span>
      {node.pinned && <Star className="ns-item-ico" size={12} style={{ marginLeft: "auto", color: "var(--pin)" }} />}
    </Link>
  );
}

export default function NoteSidebar() {
  const pathname = usePathname();
  const activeId = activePathFromUrl(pathname);

  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notes/files?path=/notes&recursive=true&includeMeta=true");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      const listing: ViboxListing = await res.json();
      setTree(buildTree(listing.entries, "/notes"));
    } catch (e) {
      setError((e as Error).message ?? "unknown");
      setTree(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pinned = (tree ?? []).flatMap(function flat(n: TreeNode): TreeNode[] {
    const here = !n.isFolder && n.pinned ? [n] : [];
    return [...here, ...n.children.flatMap(flat)];
  });

  return (
    <aside className="notes-sidebar">
      <div className="ns-ws">
        <div className="ns-ws-av">SH</div>
        <div className="ns-ws-name">SEON Notes</div>
      </div>

      <div className="ns-search" role="button" tabIndex={0}>
        <Search size={14} strokeWidth={2} />
        <span>검색</span>
        <span className="kbd">⌘K</span>
      </div>

      {pinned.length > 0 && (
        <>
          <div className="ns-section">즐겨찾기</div>
          {pinned.map((n) => (
            <Link
              key={n.path}
              href={`/notes/${encodeURIComponent(n.path)}`}
              className={"ns-item" + (activeId === n.path ? " active" : "")}
            >
              <Star className="ns-item-ico" size={14} style={{ color: "var(--pin)" }} />
              <span>{n.title ?? n.name}</span>
            </Link>
          ))}
        </>
      )}

      <div className="ns-section">노트</div>
      {loading && (
        <div className="ns-item" style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
          <RefreshCw className="ns-item-ico" size={14} /> 로딩…
        </div>
      )}
      {error && (
        <div style={{ padding: "8px 10px", color: "var(--text-muted)", fontSize: 12.5, lineHeight: 1.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#a04545", marginBottom: 4 }}>
            <AlertCircle size={14} /> 트리 로드 실패
          </div>
          <div style={{ marginBottom: 6 }}>{error}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            Vibox <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>/api/integration/files</code> endpoint
            가 아직 준비 안 됐을 수 있습니다.
          </div>
          <button
            onClick={() => void load()}
            style={{
              marginTop: 8,
              padding: "4px 10px",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)",
              background: "var(--bg)",
              fontSize: 11.5,
              color: "var(--text-sub)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <RefreshCw size={11} /> 재시도
          </button>
        </div>
      )}
      {!loading && !error && tree?.length === 0 && (
        <div className="ns-item" style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
          <FileText className="ns-item-ico" size={14} /> 노트 없음
        </div>
      )}
      {tree?.map((n) => (
        <TreeItem key={n.path} node={n} depth={0} activeId={activeId} />
      ))}

      <div className="ns-add">
        <Plus size={14} strokeWidth={2} />
        <span>새 노트</span>
      </div>

      <div className="ns-divider" />

      <div className="ns-section">최근</div>
      <div className="ns-item" style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
        <Clock className="ns-item-ico" size={14} /> Phase 1-3 에서 채움
      </div>

      <div className="ns-section">태그</div>
      <div className="ns-item" style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
        <Hash className="ns-item-ico" size={14} /> Phase 1-3 에서 채움
      </div>
    </aside>
  );
}
