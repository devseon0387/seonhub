/**
 * 외부 프로젝트 블루프린트 레지스트리
 *
 * SEON Hub 자체(`hype5-erp`)가 아닌 다른 Dev Workspace 프로젝트에 대해
 * ERD/로드맵 등 블루프린트 데이터를 여기에 등록합니다.
 *
 * key = `DevProject.id` (Dev 스캐너의 디렉토리명)
 */
import type { ERD } from '@/erd/types';
import type { Roadmap } from '@/roadmap/types';
import type { ExternalWireframe } from './plick/wireframes';
import type { ProjectServices, DeployPlatform, DbPlatform, VcsPlatform } from './services';
import type { ProjectMetadata } from '@/lib/dev/project-metadata';

export type { ProjectServices, DeployPlatform, DbPlatform, VcsPlatform };

import { PLICK_ERD } from './plick/erd';
import { PLICK_ROADMAP } from './plick/roadmap';
import { PLICK_WIREFRAMES, PLICK_DESIGN_SYSTEM_FILE } from './plick/wireframes';

import { MENU_PROMPT_ERD } from './menu-prompt/erd';
import { MENU_PROMPT_ROADMAP } from './menu-prompt/roadmap';
import { MENU_PROMPT_WIREFRAMES, MENU_PROMPT_DESIGN_SYSTEM_FILE } from './menu-prompt/wireframes';

import { TD_ERD } from './td-v1.1.0/erd';
import { TD_ROADMAP } from './td-v1.1.0/roadmap';
import { TD_WIREFRAMES, TD_DESIGN_SYSTEM_FILE } from './td-v1.1.0/wireframes';

import { ARC_V2_ROADMAP } from './arc-v2/roadmap';
import { ARC_V2_ERD } from './arc-v2/erd';
import { DOHWA_V2_ROADMAP } from './dohwa-v2/roadmap';
import { HEYSQUID_ROADMAP } from './heysquid/roadmap';
import { ILJU_MBTI_ROADMAP } from './ilju-mbti-project/roadmap';
import { KRIT_ROADMAP } from './krit/roadmap';
import { LYRIC_AGENT_ROADMAP } from './lyric-agent/roadmap';
import { MARKETING_ROADMAP } from './marketing-project/roadmap';
import { YT_GRAPHIC_ROADMAP } from './yt-graphic-agent/roadmap';

// SEON Hub 자체 데이터 — /dev/hype5-erp 드릴인에도 반영하기 위해 registry에 등록
import { ROADMAP as SEON_HUB_ROADMAP } from '@/roadmap/roadmap';
import { ERD as SEON_HUB_ERD } from '@/erd/erd';

export interface ProjectBlueprints {
  erd?: ERD;
  roadmap?: Roadmap;
  wireframes?: ExternalWireframe[];
  /** 프로젝트 루트 기준 상대 경로의 HTML 파일 (디자인 시스템 쇼케이스용) */
  designSystemFile?: string;
  /** 배포·DB·VCS 메타데이터 (카드/테이블에 노출) */
  services?: ProjectServices;
  /** 메타데이터 기본값. 사용자 localStorage override가 있으면 그걸 우선. */
  defaults?: Partial<ProjectMetadata>;
}

export const PROJECT_BLUEPRINTS: Record<string, ProjectBlueprints> = {
  // ── 블루프린트 있는 주요 프로젝트 ─────────────────────
  Plick: {
    erd: PLICK_ERD,
    roadmap: PLICK_ROADMAP,
    wireframes: PLICK_WIREFRAMES,
    designSystemFile: PLICK_DESIGN_SYSTEM_FILE,
    services: {
      deploy: { platform: 'local', status: 'idle' },
      db: { platform: 'none', note: '브라우저 메모리 only (계정 도입 시 Supabase 예정)' },
      vcs: { platform: 'github' },
    },
    defaults: { type: 'website', owner: 'personal', displayName: 'Plick' },
  },
  'menu-prompt': {
    erd: MENU_PROMPT_ERD,
    roadmap: MENU_PROMPT_ROADMAP,
    wireframes: MENU_PROMPT_WIREFRAMES,
    designSystemFile: MENU_PROMPT_DESIGN_SYSTEM_FILE,
    services: {
      deploy: { platform: 'local', status: 'idle' },
      db: { platform: 'json', note: 'content/prompts.json + my-befores.json' },
      vcs: { platform: 'github' },
    },
    defaults: { type: 'website', owner: 'hype5', displayName: '메뉴한컷' },
  },
  'hype5-erp': {
    erd: SEON_HUB_ERD,
    roadmap: SEON_HUB_ROADMAP,
    services: {
      deploy: { platform: 'local', status: 'idle', note: '로컬 전용 (의도)' },
      db: { platform: 'sqlite', note: 'hype5.db (SEON Hub 내부)' },
      vcs: { platform: 'github' },
    },
    defaults: { type: 'program', owner: 'personal', displayName: 'SEON Hub', importance: 'high' },
  },

  // ── 앱 (Electron·데스크톱·Adobe 패널) ────────────────
  'td-v1.1.0': {
    erd: TD_ERD,
    roadmap: TD_ROADMAP,
    wireframes: TD_WIREFRAMES,
    designSystemFile: TD_DESIGN_SYSTEM_FILE,
    services: {
      deploy: { platform: 'local', status: 'idle', note: 'Electron 데스크톱 앱' },
      db: { platform: 'none', note: 'electron-store / localStorage' },
      vcs: { platform: 'github' },
    },
    defaults: { type: 'app', owner: 'personal', displayName: '터미널 대시보드', importance: 'high', favorite: true },
  },
  td: {
    defaults: { hidden: true, displayName: '터미널 대시보드 (구버전)' },
  },
  krit: {
    roadmap: KRIT_ROADMAP,
    defaults: { type: 'app', owner: 'personal', displayName: '크릿 (Krit)', importance: 'high' },
  },
  'claude-cep-panel': {
    defaults: { type: 'app', owner: 'personal', displayName: 'Claude CEP 패널' },
  },

  // ── 에이전트 ──────────────────────────────────────
  'ilju-mbti-project': {
    roadmap: ILJU_MBTI_ROADMAP,
    defaults: { type: 'agent', owner: 'personal', displayName: '도화 (일주×MBTI)' },
  },
  'dohwa-v2': {
    roadmap: DOHWA_V2_ROADMAP,
    defaults: { type: 'agent', owner: 'personal', displayName: '도화 V2' },
  },
  'dohwa-studio': {
    defaults: { type: 'agent', owner: 'personal', displayName: '도화 스튜디오' },
  },
  'lyric-agent': {
    roadmap: LYRIC_AGENT_ROADMAP,
    defaults: { type: 'agent', owner: 'personal', displayName: '작사 에이전트' },
  },
  'maple-bot': {
    defaults: { type: 'agent', owner: 'personal', displayName: '메이플 봇' },
  },
  'yt-graphic-agent': {
    roadmap: YT_GRAPHIC_ROADMAP,
    defaults: { type: 'agent', owner: 'personal', displayName: '유튜브 그래픽 에이전트' },
  },
  heysquid: {
    roadmap: HEYSQUID_ROADMAP,
    defaults: { type: 'agent', owner: 'personal', displayName: 'heysquid' },
  },
  'arc-framework': {
    defaults: { type: 'library', owner: 'personal', displayName: 'ARC 프레임워크' },
  },
  'app-architect': {
    defaults: { type: 'agent', owner: 'personal', displayName: 'App Architect' },
  },

  // ── 웹사이트 ─────────────────────────────────────
  ailik: {
    defaults: { type: 'website', owner: 'personal', displayName: 'Ailik' },
  },
  'arc-v2': {
    erd: ARC_V2_ERD,
    roadmap: ARC_V2_ROADMAP,
    defaults: { type: 'website', owner: 'personal', displayName: 'NextCamp (arc-v2)' },
  },
  'hype-kit': {
    defaults: { type: 'website', owner: 'hype5', displayName: 'Hype Kit' },
  },
  'hype5-invoice': {
    defaults: { type: 'website', owner: 'hype5', displayName: 'HYPE5 Invoice' },
  },
  'video-moment': {
    defaults: { type: 'website', owner: 'vimo', displayName: '비모 ERP', importance: 'high' },
  },
  videomoment: {
    defaults: { type: 'website', owner: 'vimo', displayName: '비모 홈페이지' },
  },
  vibox: {
    defaults: { type: 'website', owner: 'hype5', displayName: 'Vibox' },
  },
  sourcesweet: {
    defaults: { type: 'website', owner: 'hype5', displayName: '소스스윗' },
  },
  'planhigh-website': {
    defaults: { type: 'website', owner: 'personal', displayName: 'PlanHigh 웹사이트' },
  },
  'plick-toon': {
    defaults: { type: 'website', owner: 'personal', displayName: 'Plick Toon' },
  },
  'yt-title-thumb': {
    defaults: { type: 'website', owner: 'personal', displayName: '유튜브 타이틀/썸네일' },
  },

  // ── 도구 ──────────────────────────────────────────
  'yt-downloader': {
    defaults: { type: 'tool', owner: 'personal', displayName: '유튜브 다운로더' },
  },
  's26-ppt-video': {
    defaults: { type: 'tool', owner: 'personal', displayName: 'S26 PPT 영상' },
  },
  'shorts-editor': {
    defaults: { type: 'tool', owner: 'personal', displayName: '세로 영상 자동 편집기' },
  },
  'webtoon-scraper': {
    defaults: { type: 'tool', owner: 'personal', displayName: '웹툰 스크래퍼' },
  },
  'thezet-recovery': {
    defaults: { type: 'tool', owner: 'personal', displayName: 'ZET 복구 프로젝트' },
  },
  'cutback-recovery': {
    defaults: { type: 'tool', owner: 'personal', displayName: 'Cutback 복구' },
  },
  'melody-editor': {
    defaults: { type: 'tool', owner: 'personal', displayName: '멜로디 에디터' },
  },
  'music-assist': {
    defaults: { type: 'tool', owner: 'personal', displayName: 'Music Assist' },
  },
  hypeback: {
    defaults: { type: 'library', owner: 'hype5', displayName: 'HypeBack' },
  },

  // ── 라이브러리 · 디자인 자료 ──────────────────────
  'marketing-forge-design': {
    defaults: { type: 'library', owner: 'hype5', displayName: 'Marketing Forge 디자인' },
  },
  'marketing-project': {
    roadmap: MARKETING_ROADMAP,
    defaults: { type: 'other', owner: 'personal', displayName: '도깨비스쿼드 콘텐츠 기획' },
  },

  // ── 숨김 (백업·venv·중복) ────────────────────────
  'ilju-mbti-project-backup-20260224': {
    defaults: { hidden: true, displayName: '도화 백업 (2026-02-24)' },
  },
  'melody-editor-venv': {
    defaults: { hidden: true, displayName: '멜로디 에디터 venv' },
  },
  'playlist-editor': {
    defaults: { hidden: true, displayName: '플레이리스트 에디터 (빈 디렉토리)' },
  },
};

export function getProjectBlueprints(id: string): ProjectBlueprints | null {
  return PROJECT_BLUEPRINTS[id] ?? null;
}
