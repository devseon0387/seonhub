/**
 * Plick 와이어프레임 매니페스트
 *
 * Plick 루트의 `design-*.html` + `mockups/*.html` 파일을 iframe으로 서빙하기 위한 목록.
 * 파일 경로는 프로젝트 루트 기준.
 */
export interface ExternalWireframe {
  slug: string;          // URL-safe 식별자
  label: string;         // 화면에 표시
  category: string;      // 그룹핑 키
  file: string;          // 프로젝트 루트 기준 상대 경로
  note?: string;
}

export const PLICK_WIREFRAMES: ExternalWireframe[] = [
  // ── 랜딩 ──────────────────────────────────
  { slug: 'landing',        label: '랜딩 (메인)',        category: '랜딩',   file: 'design-landing.html' },
  { slug: 'landing-d',      label: '랜딩 D안',            category: '랜딩',   file: 'design-landing-D.html' },
  { slug: 'hero-motion-v1', label: '히어로 모션 v1',      category: '랜딩',   file: 'design-hero-motion.html' },
  { slug: 'hero-motion-v2', label: '히어로 모션 v2',      category: '랜딩',   file: 'design-hero-motion-v2.html' },
  { slug: 'hero-motion-v3', label: '히어로 모션 v3',      category: '랜딩',   file: 'design-hero-motion-v3.html' },
  { slug: 'liquid-glass',   label: '리퀴드 글래스',       category: '랜딩',   file: 'design-liquid-glass.html' },

  // ── 인증 ──────────────────────────────────
  { slug: 'signup',         label: '회원가입',            category: '인증',   file: 'design-signup.html' },

  // ── 에디터 ────────────────────────────────
  { slug: 'export-modal',   label: '내보내기 모달',       category: '에디터', file: 'design-export-modal.html' },

  // ── 목업 시리즈 (mockups/) ───────────────
  { slug: 'mk-04-layout',         label: '레이아웃 옵션',         category: '목업', file: 'mockups/04-layout-options.html' },
  { slug: 'mk-05-api-dashboard',  label: 'API 사용량 대시보드',   category: '목업', file: 'mockups/05-api-usage-dashboard.html' },
  { slug: 'mk-06-usage-v2',       label: '사용량 대시보드 v2',    category: '목업', file: 'mockups/06-usage-dashboard-v2.html' },
  { slug: 'mk-07-suno-library',   label: 'Suno 라이브러리',       category: '목업', file: 'mockups/07-suno-library-mockups.html' },
  { slug: 'mk-08-seed-screens',   label: 'Seed 화면들',           category: '목업', file: 'mockups/08-seed-screens.html' },
  { slug: 'mk-09-seed-calm',      label: 'Seed 캄',               category: '목업', file: 'mockups/09-seed-calm.html' },
  { slug: 'mk-10-seed-grids',     label: 'Seed 그리드',           category: '목업', file: 'mockups/10-seed-grids.html' },
  { slug: 'mk-11-seed-images',    label: 'Seed 이미지',           category: '목업', file: 'mockups/11-seed-c-images.html' },
  { slug: 'mk-12-seed-builder',   label: 'Seed 디테일 빌더',      category: '목업', file: 'mockups/12-seed-c-detail-builder.html' },
];

export const PLICK_DESIGN_SYSTEM_FILE = 'design-system.html';
