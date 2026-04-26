import type { Roadmap } from '@/roadmap/types';

export const YT_GRAPHIC_ROADMAP: Roadmap = {
  project: 'YouTube 그래픽/인서트 자동 생성',
  version: 1,
  updated: '2026-04-21',
  vision:
    'Flask UI + Playwright 렌더링 + FFmpeg 인코딩으로 유튜브용 그래픽/인서트 영상을 자동 생성. Claude API로 스크립트 파싱 + Fabric.js 에디터 + Pillow 이미지 처리. 단일 CLI(insert_maker.py)로 이미지 폴더 → 영상 변환.',
  currentPhaseId: 'p2-animation',
  phases: [
    {
      id: 'p1-core',
      title: '코어 파이프라인',
      status: 'done',
      summary: 'Flask UI + Playwright 정적/애니메이션 렌더러 + FFmpeg 인코딩. insert_maker.py CLI.',
      goal: '폴더 던지면 인서트 영상 자동 생성.',
      items: [
        { title: 'Flask UI (ui.py) + Fabric.js 에디터', status: 'done' },
        { title: 'Claude 클라이언트 (core/claude_client.py)', status: 'done' },
        { title: '정적 그래픽 렌더러 (core/renderer.py)', status: 'done' },
        { title: 'Playwright 애니메이션 렌더러 (core/video_renderer.py)', status: 'done' },
        { title: '이미지 인서트 렌더러 (core/insert_renderer.py, Pillow+FFmpeg)', status: 'done' },
        { title: 'insert_maker.py CLI (folder → video)', status: 'done' },
        { title: 'NotoSansKR 한글 폰트 번들', status: 'done' },
      ],
    },
    {
      id: 'p2-animation',
      title: '애니메이션 프리셋 확장',
      status: 'in-progress',
      target: '2026-06-30',
      summary: '기본 페이드/슬라이드 외 더 다양한 인서트 전환 효과.',
      goal: '영상 타입별 적절한 애니메이션 선택지 10+.',
      items: [
        { title: 'ui_static/animations JS 모듈 확장', status: 'in-progress' as const },
        { title: '프리셋 config JSON 스키마 확정', status: 'todo' },
        { title: '미리보기 → 선택 → 렌더 플로우', status: 'todo' },
      ],
    },
    {
      id: 'p3-script-parser',
      title: '스크립트 파서 고도화',
      status: 'planned',
      target: '2026-08-31',
      summary: 'core/script_parser.py에 구조화된 대본 파싱(섹션/타이밍/강조) 추가. Claude로 파싱 보조.',
      goal: '대본 붙여넣으면 자동으로 인서트 위치·타이밍 추정.',
      items: [
        { title: '섹션 감지 + 타임코드 추출', status: 'todo' },
        { title: '강조 지점 마커', status: 'todo' },
      ],
    },
    {
      id: 'p4-batch',
      title: '배치 + 프로젝트 저장',
      status: 'planned',
      target: '2026-10-31',
      summary: '여러 영상을 한 번에 생성. 편집 상태 저장/불러오기.',
      goal: '채널 단위 대량 생산.',
      items: [
        { title: '프로젝트 state 저장 (JSON)', status: 'todo' },
        { title: '배치 실행 queue', status: 'todo' },
      ],
    },
  ],
  decisions: [
    {
      date: '2026-03-01',
      title: '웹 UI(Flask) + 로컬 렌더(Playwright/FFmpeg)',
      why: '영상 파일 처리는 로컬이 빠름. UI만 웹으로 빼면 원격 접근·관리 쉬움.',
      alt: '전부 Electron — 기각. 렌더 파이프라인 설치 복잡.',
    },
  ],
  openQuestions: [
    'FFmpeg 경로 호환성 (Apple Silicon `/opt/homebrew/bin/ffmpeg` 하드코딩 → 동적 탐지 필요?)',
    'Playwright 렌더 속도 — Puppeteer 교체 고려?',
  ],
};
