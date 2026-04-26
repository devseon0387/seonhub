import type { Roadmap } from '@/roadmap/types';

export const KRIT_ROADMAP: Roadmap = {
  project: '크릿 (Krit) — AI-native NLE',
  version: 1,
  updated: '2026-04-21',
  vision:
    '"Create + no Limit" — 프리미어/캡컷보다 쾌적한 편집 + 빠른 렌더, 초보부터 프로까지. C++20 코어 + Tauri UI + Metal/Vulkan GPU + FFmpeg 직링크 + AI tool calling. 3-피어(UI/CLI/AI) 인터페이스 · 이벤트 소싱 타임라인 · Tool Registry 중심.',
  currentPhaseId: 'p0-design',
  phases: [
    {
      id: 'p0-design',
      title: 'Phase 0 — 설계·검증 (Month 1-2)',
      status: 'in-progress',
      target: '2026-06-30',
      summary: '코드 작성 단계 아님. 문서·스키마·ADR 중심. shorts-editor v2.1 계승 기준 확정.',
      goal: 'v1.0 스코프 ADR 완결 + 스키마 고정 + 참고 프로토타입 검증 종료.',
      items: [
        { title: '제품 정의 · 페르소나 · 경쟁 분석 (docs/product/)', status: 'done' },
        { title: '아키텍처 ADR 8건 (docs/architecture/adr/)', status: 'done' },
        { title: '기술 리서치 (docs/research/)', status: 'done' },
        { title: 'Tool Registry JSON 스키마 (schemas/tools/)', status: 'in-progress' as const },
        { title: 'shorts-editor v2.1 계승 기준 확정 (ADR-0008)', status: 'done' },
        { title: 'v1.0 스코프 8항목 확정 · 제외 4항목 이월', status: 'done' },
      ],
    },
    {
      id: 'p1-mvp',
      title: 'Phase 1 — MVP 엔진 (Month 3-7)',
      status: 'planned',
      target: '2026-11-30',
      summary: 'C++ 코어 + Tool Registry + 이벤트 소싱 타임라인. v1.0 스코프 8항목 전부 UI/CLI/AI 3-피어 동작.',
      goal: 'v1.0 발매 가능한 수준의 NLE 기본기.',
      items: [
        { title: '미디어 불러오기 (영상·이미지·GIF·음악)', status: 'todo' },
        { title: '기본 컷편집 + 매그네틱 기본 ON', status: 'todo' },
        { title: 'Whisper 자동 말자막 + word-level timestamp + 1-클릭 프리셋', status: 'todo' },
        { title: 'word-level 강조 자막 (emphasizeWords · setAnimation)', status: 'todo' },
        { title: '효과음/BGM + 페이드 + 덕킹 (audio.fade · audio.duck)', status: 'todo' },
        { title: '인서트 + 트랜지션 (clip.addInsert · clip.addTransition)', status: 'todo' },
        { title: '무음 자동 컷 + 스토리보드 뷰 (audio.detectSilence · clip.autoCut)', status: 'todo' },
        { title: 'Premiere XML export (render.exportPremiereXML)', status: 'todo' },
      ],
    },
    {
      id: 'p2-extend',
      title: 'Phase 2 — 확장 기능',
      status: 'planned',
      target: '2027-03-31',
      summary: 'v1.0 제외됐던 고급 기능 재평가. HDR 출력, ProRes RAW, TTS 통합, shorts-editor 임포터.',
      goal: '프로 사용자 대응.',
      items: [
        { title: 'HDR 출력 (Rec.2020 PQ/HLG)', status: 'todo' },
        { title: 'ProRes RAW 입출력', status: 'todo' },
        { title: 'TTS 나레이션 생성 통합', status: 'todo' },
        { title: 'shorts-editor 프로젝트 임포터', status: 'todo' },
      ],
    },
  ],
  decisions: [
    {
      date: '2026-03-01',
      title: 'C++20 + Tauri v2 + React 선택',
      why: '코어 성능(C++20) + 개발 속도(React) + 플랫폼 이식(Tauri). 영상 뷰포트는 Metal/Vulkan 네이티브 임베드.',
      alt: 'Electron + Node 전면 — 기각. 네이티브 GPU 파이프라인 구축 어려움.',
    },
    {
      date: '2026-03-10',
      title: '이벤트 소싱 타임라인',
      why: '모든 편집이 Event. Undo = 되감기. 실험적 편집·분기 쉬움. AI가 Event stream 읽고 이해 가능.',
      alt: '상태 스냅샷 기반 — 기각. 대규모 타임라인에서 Undo 성능 저하.',
    },
    {
      date: '2026-03-20',
      title: 'Tool Registry 중심 3-피어',
      why: '기능 추가 = Tool 구현체 1개 = UI/CLI/AI 3 입구 자동 노출. 일관성 + 개발 속도.',
      alt: 'UI 중심 개발 → CLI/AI 나중에 추가 — 각 피어마다 중복 구현 위험.',
    },
    {
      date: '2026-03-25',
      title: 'shorts-editor v2.1을 엔진 재구성 후 계승 (ADR-0008)',
      why: '검증된 워크플로우를 그대로 쓰고 엔진만 C++ 코어로. 완전 재설계는 위험.',
      alt: '완전히 새 UX 설계 — 기각. 검증된 UX 버릴 이유 없음.',
    },
  ],
  openQuestions: [
    'wgpu-native vs Metal/D3D12/Vulkan 직접 — 성능 vs 유지보수 비용',
    '프로젝트 .vibe 번들 크기 — 대형 미디어 외부 링크 vs 번들 내장',
    'Anthropic SDK tool calling 비용 — 편집 1회 평균 호출 수 측정 필요',
  ],
  risks: [
    {
      title: 'C++ 코어 개발 일정 지연',
      mitigation: 'Month 1-2 설계 단계에서 스키마 고정. 병렬 Claude 실행 계획으로 생산성 보강.',
      severity: 'high',
    },
    {
      title: 'FFmpeg/OpenColorIO/OpenTimelineIO ABI 변경',
      mitigation: 'vcpkg로 버전 고정. CI에서 매일 빌드 검증.',
      severity: 'med',
    },
  ],
};
