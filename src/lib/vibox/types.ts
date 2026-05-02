/**
 * Vibox /api/integration/* 응답 타입 (백엔드 spec §5 기반).
 */

export interface ViboxFrontmatter {
  id?: string;
  title?: string;
  created?: string;
  updated?: string;
  tags?: string[];
  pinned?: boolean;
  episode?: string;
  project?: string;
  partner?: string;
  [key: string]: unknown;
}

export interface ViboxFileEntry {
  name: string;
  path: string;
  isFolder: boolean;
  size: number;
  modifiedAt: number;
  kind: "doc" | "folder" | string;
  frontmatter?: ViboxFrontmatter;
}

export interface ViboxFileListing {
  path: string;
  entries: ViboxFileEntry[];
}

export interface ViboxFileMetaJson {
  ok: boolean;
  path: string;
  size: number;
  fingerprint: string;
  modifiedAt: number;
  content: string;
  frontmatter: ViboxFrontmatter;
}

export interface ViboxUploadResult {
  ok: boolean;
  path: string;
  size: number;
  fingerprint: string;
  uploadedAt: number;
  frontmatter?: ViboxFrontmatter;
}

export interface ViboxImageUploadResult {
  ok: boolean;
  path: string;
  size: number;
  url: string;
  markdown: string;
}

export interface ViboxDeleteResult {
  ok: boolean;
  movedToTrash: boolean;
  trashId?: string;
}

export interface ViboxMoveResult {
  ok: boolean;
  from: string;
  to: string;
}

export interface ViboxShare {
  token: string;
  url: string;
  path: string;
  mode: "preview" | "full";
  allowComments: boolean;
  allowDownload: boolean;
  expiresAt?: number | null;
  downloadCount?: number;
  createdAt: number;
}

export interface ViboxShareCreateResult {
  ok: boolean;
  token: string;
  url: string;
  path: string;
  mode: "preview" | "full";
  createdAt: number;
}

export interface ViboxShareListResult {
  shares: ViboxShare[];
}

export interface ViboxShareMetaFile {
  path: string;
  name: string;
  size: number;
  mime: string;
  content?: string;             // .md 가 1MB 이하일 때만 inline
  downloadUrl: string;
}

export interface ViboxShareMeta {
  ok: boolean;
  token: string;
  title: string;
  mode: "preview" | "full";
  allowComments: boolean;
  allowDownload: boolean;
  createdAt: number;
  expiresAt?: number | null;
  files: ViboxShareMetaFile[];
}

export class ViboxError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ViboxError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
