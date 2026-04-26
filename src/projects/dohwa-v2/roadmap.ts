import type { Roadmap } from '@/roadmap/types';

export const DOHWA_V2_ROADMAP: Roadmap = {
  project: '도화 V2 (Dohwa V2)',
  version: 1,
  updated: '2026-04-21',
  vision:
    '사주×MBTI 전문 콘텐츠 작가 에이전트. V1은 3세대 기승/전결 단일 구조였으나 V2는 대주제마다 다른 글 구조를 가지는 "멀티 테마" 시스템. `themes/{대주제}/blueprint.md`에 각 대주제 규칙을 정의.',
  currentPhaseId: 'p2-themes',
  phases: [
    {
      id: 'p1-migration',
      title: 'V1 → V2 마이그레이션',
      status: 'done',
      summary: '단일 구조에서 멀티 테마 블루프린트 구조로 전환. _common 공통 규칙 추출.',
      goal: '3세대 시나리오를 V2 블루프린트 구조로 이식 + V1 결과와 품질 동일.',
      items: [
        { title: 'themes/_common/identity.md (도화 페르소나)', status: 'done' },
        { title: 'themes/_common/rules.md (공통 글쓰기 규칙 + 검수 항목)', status: 'done' },
        { title: 'themes/3세대-시나리오/blueprint.md', status: 'done' },
        { title: 'V1 테스트 케이스 V2 동일 품질 재현', status: 'done' },
      ],
    },
    {
      id: 'p2-themes',
      title: '새 대주제 추가',
      status: 'in-progress',
      target: '2026-06-30',
      summary: '연애운·일주론 등 새 대주제 블루프린트 작성. 각 대주제마다 고유 글 구조/규칙.',
      goal: '대주제 3-5개 확보해 사용자 요청에 따라 멀티 테마 작성.',
      items: [
        { title: 'themes/연애운-시리즈/blueprint.md', status: 'todo' },
        { title: 'themes/일주론/blueprint.md', status: 'todo' },
        { title: '대주제 파악 안 될 때 사용자에게 묻는 플로우', status: 'done' },
      ],
    },
    {
      id: 'p3-self-review',
      title: '자가 검수 자동화',
      status: 'planned',
      target: '2026-08-31',
      summary: '작성 → 자체 검수 → 위반 수정 → 저장 파이프라인. 공통 + 대주제 규칙 동시 적용.',
      goal: '사용자 확인 없이도 규칙 위반 글은 출력 자체가 안 됨.',
      items: [
        { title: '공통 rules.md 규칙 파서', status: 'todo' },
        { title: '블루프린트 검수 항목 자동 검증', status: 'todo' },
      ],
    },
  ],
  decisions: [
    {
      date: '2026-03-01',
      title: 'V1을 버리지 않고 병존',
      why: '기존 3세대 시나리오 품질 보장. V2는 멀티 테마 실험장. 성숙하면 V1 이관.',
      alt: 'V1 즉시 폐기 — 기각. 검증된 자산 손실 위험.',
    },
  ],
  openQuestions: [
    '블루프린트 간 공통 부분이 많아지면 _common에 승격할 기준?',
    '레퍼런스 파일(예: 갑자×INTJ 4.5점)의 버전 관리 방법',
  ],
};
