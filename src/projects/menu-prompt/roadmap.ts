import type { Roadmap } from '@/roadmap/types';

export const MENU_PROMPT_ROADMAP: Roadmap = {
  project: '메뉴한컷 (menu-prompt)',
  version: 1,
  updated: '2026-04-21',
  vision:
    '소상공인이 음식 사진용 AI 이미지 프롬프트를 손쉽게 복사해 쓰는 갤러리. DB 없이 JSON 파일 하나로 운영. "카드 클릭 → 프롬프트 복사 → AI 툴 붙여넣기" 2단계로 끝.',
  currentPhaseId: 'p3-user-contribution',
  phases: [
    {
      id: 'p1-mvp-gallery',
      title: 'MVP 갤러리',
      status: 'done',
      start: '2026-02-01',
      end: '2026-03-15',
      summary: 'prompts.json + 카드 그리드 + 상세 페이지 + 한 번에 복사 버튼.',
      goal: 'JSON 1개로 카드 갤러리 + 상세 페이지 완결.',
      items: [
        { title: 'Next.js 16 App Router 셋업 (Tailwind v4)', status: 'done' },
        { title: 'content/prompts.json 스키마 확정', status: 'done' },
        { title: 'Gallery · PromptCard · CopyButton', status: 'done' },
        { title: '/prompts/[slug] 상세 페이지', status: 'done' },
        { title: 'Toast UI (복사 완료 알림)', status: 'done' },
      ],
    },
    {
      id: 'p2-before-after',
      title: 'Before / After 비교',
      status: 'done',
      start: '2026-03-16',
      end: '2026-04-05',
      summary: '프롬프트별 Before(원본)-After(AI 생성) 이미지 슬라이더. 업로드도 가능.',
      goal: '카드에서 효과를 즉시 체감할 수 있도록.',
      items: [
        { title: 'BeforeAfterSlider (드래그 비교)', status: 'done' },
        { title: 'BeforeAfterWithUpload (사용자 원본 업로드)', status: 'done' },
        { title: 'my-befores.json 저장 구조', status: 'done' },
      ],
    },
    {
      id: 'p3-user-contribution',
      title: '유저 프롬프트 추가',
      status: 'in-progress',
      start: '2026-04-06',
      target: '2026-05-10',
      summary: '사용자가 자기 프롬프트를 추가·저장·공유. 현재 localStorage 기반.',
      goal: '로그인 없이도 본인 프롬프트 만들고 쓰게.',
      items: [
        { title: 'AddPromptModal (폼 + 카테고리 선택)', status: 'done' },
        { title: 'UserPromptModal (상세·복사)', status: 'done' },
        { title: 'localStorage 저장/불러오기', status: 'todo' },
        { title: '유저 프롬프트 전용 그리드 섹션', status: 'todo' },
        { title: '프롬프트 JSON 내보내기/가져오기 (백업)', status: 'todo' },
      ],
    },
    {
      id: 'p4-filter-search',
      title: '필터 + 검색',
      status: 'planned',
      target: '2026-06-15',
      summary: '카테고리 10개 토글 + 키워드 검색 + 정렬 옵션.',
      goal: '프롬프트 수가 100개 넘어도 원하는 걸 5초 안에 찾게.',
      items: [
        { title: '카테고리 탭 UI (이모지 + 이름)', status: 'todo' },
        { title: '검색 입력 + 실시간 필터', status: 'todo' },
        { title: '정렬 (최신·인기·카테고리별)', status: 'todo' },
      ],
    },
    {
      id: 'p5-share',
      title: '공유 + 소셜 카드',
      status: 'planned',
      target: '2026-07-15',
      summary: 'OG 이미지 자동 생성 + 소셜 공유 최적화. 링크 한 번으로 프롬프트 공유.',
      goal: '인스타·카톡에 붙여넣으면 깔끔한 프리뷰.',
      items: [
        { title: '/prompts/[slug] OG 이미지 동적 생성', status: 'todo' },
        { title: '복사 버튼 옆 공유 버튼 추가', status: 'todo' },
      ],
    },
    {
      id: 'p6-commerce',
      title: '프리미엄 / 수익화',
      status: 'planned',
      target: '2026-10-31',
      summary: '유료 프롬프트 팩 또는 구독. 소상공인 타겟 마케팅.',
      goal: '프리 프롬프트 30개 + 유료 팩(업종별 100+)으로 확장.',
      items: [
        { title: '프롬프트 팩 개념 도입 (무료 / 유료)', status: 'todo' },
        { title: '결제 연동 (toss / stripe)', status: 'todo' },
        { title: '소상공인 DB 연동 또는 쿠폰', status: 'todo' },
      ],
    },
  ],
  decisions: [
    {
      date: '2026-02-10',
      title: 'DB 없이 JSON으로 시작',
      why: 'MVP 단계에서 DB는 과잉. prompts.json 하나로 뷰·편집 모두 가능. 추후 100개 넘으면 재검토.',
      alt: 'Supabase · PlanetScale — 보류.',
    },
    {
      date: '2026-04-06',
      title: '유저 프롬프트는 localStorage 우선',
      why: '로그인 장벽 없이 바로 쓸 수 있게. 클라이언트 only로 시작해 사용률 보고 서버 저장 판단.',
      alt: '즉시 계정 도입 — 포기. 사용자 이탈 위험.',
    },
  ],
  openQuestions: [
    '프리미엄 팩을 "업종별"로 묶을지, "스타일별"로 묶을지?',
    '이미지 호스팅 — 계속 Unsplash 쓸지, 자체 업로드 도입할지?',
    'OG 이미지 동적 생성에 Satori를 쓸지, 정적 프리렌더로 갈지?',
  ],
  risks: [
    {
      title: 'prompts.json이 100개 넘으면 로딩 속도 하락',
      mitigation: '카테고리별 분할 로딩 또는 pagination 도입. 현재는 100개 한참 남음.',
      severity: 'low',
    },
    {
      title: 'localStorage 데이터 유실',
      mitigation: 'JSON 내보내기/가져오기 기능 우선. 추후 서버 저장 옵션 제공.',
      severity: 'med',
    },
  ],
};
