import "server-only";
import { VIBOX_ENV, assertViboxEnv } from "./env";
import {
  ViboxError,
  type ViboxDeleteResult,
  type ViboxFileEntry,
  type ViboxFileListing,
  type ViboxFileMetaJson,
  type ViboxImageUploadResult,
  type ViboxMoveResult,
  type ViboxShareCreateResult,
  type ViboxShareListResult,
  type ViboxShareMeta,
  type ViboxUploadResult,
} from "./types";

/**
 * Vibox /api/notes/* 클라이언트 — 단순 bearer token wrapper.
 *
 * 인증: VIBOX_API_TOKEN (vibox /admin/keys에서 발급한 vbx_ token).
 * 모든 호출 server-side. 클라이언트(브라우저)는 SEON Hub의 /api/notes/* proxy 통해 호출.
 *
 * 경로 변환:
 *   - SEON Hub UI: "/notes/<folder>/<slug>.md" 형태
 *   - Vibox 내부 ID: "<folder>/<slug>" (확장자 제외)
 *   변환 함수: pathToId(), idToPath()
 */

interface FetchOpts extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
}

async function viboxFetchRaw(input: string, opts: FetchOpts = {}): Promise<Response> {
  assertViboxEnv();
  const url = input.startsWith("http") ? input : `${VIBOX_ENV.apiUrl}${input}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${VIBOX_ENV.apiToken}`,
    ...(opts.headers ?? {}),
  };
  return fetch(url, { ...opts, headers });
}

async function viboxFetchJson<T>(input: string, opts: FetchOpts = {}): Promise<T> {
  const res = await viboxFetchRaw(input, opts);
  if (!res.ok) {
    let body: { error?: string; message?: string; details?: unknown } = {};
    try {
      body = await res.json();
    } catch {
      /* non-JSON */
    }
    throw new ViboxError(
      res.status,
      body.error ?? "unknown",
      body.message ?? res.statusText,
      body.details,
    );
  }
  return res.json() as Promise<T>;
}

// ─── 경로 변환 ─────────────────────────────────────────────────────────────

/**
 * SEON Hub path → Vibox ID
 *   "/notes/회의/2026-04-30.md" → "회의/2026-04-30"
 *   "/notes/_inbox/aaa.md"      → "_inbox/aaa"
 */
function pathToId(uiPath: string): string {
  return uiPath.replace(/^\/notes\/?/, "").replace(/\.md$/, "");
}

/**
 * Vibox ID → SEON Hub path
 *   "회의/2026-04-30" → "/notes/회의/2026-04-30.md"
 */
function idToPath(id: string): string {
  return `/notes/${id}.md`;
}

/**
 * Vibox NoteSummary → SEON Hub ViboxFileEntry
 */
interface ViboxNoteSummary {
  id: string;
  folder: string;
  title: string;
  excerpt: string;
  tags: string[];
  starred: boolean;
  updated: number;
  size: number;
}

function summaryToEntry(s: ViboxNoteSummary): ViboxFileEntry {
  const id = s.id;
  return {
    name: id.split("/").pop() + ".md",
    path: idToPath(id),
    isFolder: false,
    size: s.size,
    modifiedAt: s.updated,
    kind: "doc",
    frontmatter: {
      title: s.title,
      tags: s.tags,
      pinned: s.starred,
      updated: new Date(s.updated).toISOString(),
    },
  };
}

// ─── 5-1: 노트 .md 저장 (create or update) ────────────────────────────────

export async function uploadNote(opts: {
  path: string;
  content: string;
  contentType?: string;
  createIfMissing?: boolean;
  expectedVersion?: string;
}): Promise<ViboxUploadResult> {
  const id = pathToId(opts.path);
  const slashIdx = id.indexOf("/");
  if (slashIdx < 0) {
    throw new ViboxError(400, "invalid_path", `path 형식: /notes/<folder>/<slug>.md, got "${opts.path}"`);
  }
  const folder = id.slice(0, slashIdx);
  const slug = id.slice(slashIdx + 1);

  // frontmatter에서 title 추출 시도
  const titleMatch = opts.content.match(/^---[\s\S]*?\btitle:\s*["']?([^"'\n]+)/);
  const title = titleMatch?.[1]?.trim() || slug;

  // frontmatter 부분 제거한 본문만 추출 (이미 frontmatter 있으면 vibox saveNote가 다시 추가하지 않도록)
  const body = opts.content.replace(/^---\n[\s\S]*?\n---\n?/, "").trimStart();

  // 기존 노트인지 확인 — 있으면 PATCH(update), 없으면 POST(create)
  const existing = await viboxFetchRaw(`/api/notes/${encodeURIComponent(folder)}/${encodeURIComponent(slug)}`);

  if (existing.ok) {
    // 업데이트
    const updated = await viboxFetchJson<{ ok: boolean; id: string; path: string }>(
      `/api/notes/${encodeURIComponent(folder)}/${encodeURIComponent(slug)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: body }),
      },
    );
    return {
      ok: true,
      path: idToPath(updated.id),
      size: opts.content.length,
      fingerprint: "", // not provided by vibox
      uploadedAt: Date.now(),
    };
  }

  // 새로 생성
  if (opts.createIfMissing === false) {
    throw new ViboxError(404, "not_found", `노트 없음: ${opts.path}`);
  }
  const created = await viboxFetchJson<{ ok: boolean; id: string; path: string }>(
    "/api/notes/save",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folder,
        title,
        content: body,
        slug,
        overwrite: false,
      }),
    },
  );
  return {
    ok: true,
    path: idToPath(created.id),
    size: opts.content.length,
    fingerprint: "",
    uploadedAt: Date.now(),
  };
}

// ─── 5-2: 이미지/첨부 업로드 (multipart) ──────────────────────────────────

export async function uploadImage(opts: {
  notePath: string;
  file: Blob;
  filename?: string;
}): Promise<ViboxImageUploadResult> {
  const noteId = pathToId(opts.notePath);
  const filename = opts.filename ?? (opts.file as File).name ?? "upload";
  const fd = new FormData();
  fd.set("noteId", noteId);
  fd.set("file", opts.file, filename);
  fd.set("filename", filename);

  const res = await viboxFetchJson<{
    ok: boolean;
    path: string;
    url: string;
    size: number;
    mime: string;
  }>("/api/notes/attachment", {
    method: "POST",
    body: fd,
  });

  return {
    ok: true,
    path: res.path,
    size: res.size,
    url: res.url,
    markdown: `![${filename}](${res.url})`,
  };
}

// ─── 5-3: 파일 read ──────────────────────────────────────────────────────

export async function getFileMeta(uiPath: string): Promise<ViboxFileMetaJson> {
  const id = pathToId(uiPath);
  const slashIdx = id.indexOf("/");
  if (slashIdx < 0) throw new ViboxError(400, "invalid_path", `path 형식 오류: ${uiPath}`);
  const folder = id.slice(0, slashIdx);
  const slug = id.slice(slashIdx + 1);

  const note = await viboxFetchJson<{
    id: string;
    title: string;
    content: string;
    raw: string;
    path: string;
    tags: string[];
    starred: boolean;
    updated: number;
    size: number;
  }>(`/api/notes/${encodeURIComponent(folder)}/${encodeURIComponent(slug)}`);

  return {
    ok: true,
    path: idToPath(note.id),
    size: note.size,
    fingerprint: "",
    modifiedAt: note.updated,
    content: note.raw, // frontmatter 포함 raw 본문
    frontmatter: {
      title: note.title,
      tags: note.tags,
      pinned: note.starred,
      updated: new Date(note.updated).toISOString(),
    },
  };
}

export async function getFileRaw(uiPath: string): Promise<{
  bytes: ArrayBuffer;
  contentType: string;
  fingerprint: string;
  modifiedAt: number;
}> {
  const meta = await getFileMeta(uiPath);
  const bytes = new TextEncoder().encode(meta.content).buffer;
  return {
    bytes,
    contentType: "text/markdown; charset=utf-8",
    fingerprint: meta.fingerprint,
    modifiedAt: meta.modifiedAt,
  };
}

// ─── 5-4: 디렉토리 listing ────────────────────────────────────────────────

export async function listFiles(opts: {
  path: string;
  recursive?: boolean;
  includeMeta?: boolean;
}): Promise<ViboxFileListing> {
  // path가 "/notes" 또는 "/notes/" 면 전체 listing
  // path가 "/notes/<folder>" 면 해당 폴더만
  const sub = opts.path.replace(/^\/notes\/?/, "").replace(/\/$/, "");
  const qs = new URLSearchParams();
  if (sub) qs.set("folder", sub);
  qs.set("limit", "500");

  const data = await viboxFetchJson<{
    folders: { name: string; count: number }[];
    notes: ViboxNoteSummary[];
  }>(`/api/notes${qs.toString() ? `?${qs}` : ""}`);

  const entries: ViboxFileEntry[] = [];

  // 폴더 entries (sub 미지정 시만 = root listing)
  if (!sub) {
    for (const f of data.folders) {
      entries.push({
        name: f.name,
        path: `/notes/${f.name}`,
        isFolder: true,
        size: 0,
        modifiedAt: 0,
        kind: "folder",
      });
    }
  }

  // 노트 entries
  for (const n of data.notes) {
    entries.push(summaryToEntry(n));
  }

  return { path: opts.path, entries };
}

// ─── 5-5: 파일 삭제 ───────────────────────────────────────────────────────

export async function deleteFile(uiPath: string): Promise<ViboxDeleteResult> {
  const id = pathToId(uiPath);
  const slashIdx = id.indexOf("/");
  if (slashIdx < 0) throw new ViboxError(400, "invalid_path", `path 형식 오류: ${uiPath}`);
  const folder = id.slice(0, slashIdx);
  const slug = id.slice(slashIdx + 1);

  await viboxFetchJson<{ ok: boolean }>(
    `/api/notes/${encodeURIComponent(folder)}/${encodeURIComponent(slug)}`,
    { method: "DELETE" },
  );
  return { ok: true, movedToTrash: false };
}

// ─── 5-6: 파일/폴더 move/rename ───────────────────────────────────────────

export async function moveFile(opts: { from: string; to: string }): Promise<ViboxMoveResult> {
  const fromId = pathToId(opts.from);
  const toId = pathToId(opts.to);
  const fromSlash = fromId.indexOf("/");
  const toSlash = toId.indexOf("/");
  if (fromSlash < 0 || toSlash < 0) {
    throw new ViboxError(400, "invalid_path", `from/to 형식 오류`);
  }
  const fromFolder = fromId.slice(0, fromSlash);
  const fromSlug = fromId.slice(fromSlash + 1);
  const toFolder = toId.slice(0, toSlash);
  const toSlug = toId.slice(toSlash + 1);

  const move: { folder?: string; slug?: string } = {};
  if (toFolder !== fromFolder) move.folder = toFolder;
  if (toSlug !== fromSlug) move.slug = toSlug;

  const result = await viboxFetchJson<{ ok: boolean; id: string; path: string }>(
    `/api/notes/${encodeURIComponent(fromFolder)}/${encodeURIComponent(fromSlug)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ move }),
    },
  );
  return { ok: true, from: opts.from, to: idToPath(result.id) };
}

// ─── 5-7~9: 공유 링크 (v1 보류) ────────────────────────────────────────────
// vibox 측에 token-authed share 생성 endpoint 추가 시 활성. 지금은 throw.

export async function createShare(_opts: {
  path: string;
  content?: string;
  title?: string;
  mode?: "preview" | "full";
  allowComments?: boolean;
  allowDownload?: boolean;
  expiresAt?: number;
  password?: string;
}): Promise<ViboxShareCreateResult> {
  throw new ViboxError(
    501,
    "not_implemented",
    "공유 링크 생성은 v1에 미포함. vibox /shares 페이지에서 직접 생성",
  );
}

export async function listShares(_opts: { path?: string; token?: string }): Promise<ViboxShareListResult> {
  return { shares: [] };
}

export async function revokeShare(_token: string): Promise<{ ok: boolean; revoked: boolean }> {
  throw new ViboxError(501, "not_implemented", "v1 미포함");
}

// ─── 5-10: 공유 메타 (인증 불필요) ─────────────────────────────────────────

export async function getShareMeta(opts: { token: string; password?: string }): Promise<ViboxShareMeta> {
  const qs = new URLSearchParams({ format: "meta" });
  if (opts.password) qs.set("password", opts.password);
  // 인증 헤더 안 보냄 — 공유 페이지는 token 기반.
  const res = await fetch(`${VIBOX_ENV.apiUrl}/api/s/${encodeURIComponent(opts.token)}?${qs}`);
  if (!res.ok) {
    let body: { error?: string; message?: string } = {};
    try { body = await res.json(); } catch { /* ignore */ }
    throw new ViboxError(res.status, body.error ?? "fetch_failed", body.message ?? res.statusText);
  }
  return res.json() as Promise<ViboxShareMeta>;
}
