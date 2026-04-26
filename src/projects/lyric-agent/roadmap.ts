import type { Roadmap } from '@/roadmap/types';

export const LYRIC_AGENT_ROADMAP: Roadmap = {
  project: '리릭(Lyric) — 작사 에이전트',
  version: 1,
  updated: '2026-04-21',
  vision:
    '10년차 작사가처럼 쓰는 전문 작사 에이전트. 가사를 "생성"하지 않고 "깎아내는" 프로토콜. 3단 작성 프로세스(설계 → 작성 → 다듬기) + 5-Lock 프로토콜(Syllable·Syntactic·End-Morpheme·Rhyme·Stress)로 Verse 1-Verse 2 구조 일치 강제.',
  currentPhaseId: 'p2-polish',
  phases: [
    {
      id: 'p1-core-rules',
      title: '작성 프로토콜 확립',
      status: 'done',
      summary: '세 가지 원칙(진심·흐름·한 줄) + 3단 작성 프로세스 + 5-Lock 프로토콜 정의.',
      goal: '에이전트가 규칙만 따라도 A/B급 가사 산출.',
      items: [
        { title: '세 가지 원칙 정립 (Show Don\'t Tell · 감정 흐름 · 관통 한 줄)', status: 'done' },
        { title: 'Phase 1 설계 단계 (감정좌표 · 핵심 한 줄 · 인물 히스토리 · 7감각 · 구조)', status: 'done' },
        { title: 'Phase 2 작성 (초고 · 음절 템플릿 · 5-Lock Verse 2 · 기억 재작성 시뮬)', status: 'done' },
        { title: 'Phase 3 다듬기 (뺄셈 · 모음 매핑 · 5-Lock 재검증 · 자가 검수)', status: 'done' },
      ],
    },
    {
      id: 'p2-polish',
      title: '금지어·반복 어미 제거',
      status: 'in-progress',
      target: '2026-05-31',
      summary: '종결어미 단조로움, 특정 동사("번지다" 계열) 전면 금지 등 누적된 피드백 반영.',
      goal: '사용자 피드백에서 나온 반복 문제 0건 달성.',
      items: [
        { title: '종결어미 팔레트 확장 (~다/~지/~네/~더라/~잖아/...)', status: 'done' },
        { title: '"번지다/번져와/번지는" 전면 금지', status: 'done' },
        { title: '클리셰 리스트 누적 (첫 번째 떠오르는 비유 버림)', status: 'todo' },
        { title: '감정 단어 직접 표현 검출 → 장면·행동으로 치환', status: 'todo' },
      ],
    },
    {
      id: 'p3-collab',
      title: '아티스트 협업 모드',
      status: 'planned',
      target: '2026-08-31',
      summary: '특정 아티스트 톤/분위기 정의된 프리셋. 기존 작품 reference 입력하면 스타일 매칭.',
      goal: '의뢰자가 "○○ 스타일로" 하면 일관된 톤 산출.',
      items: [
        { title: '아티스트 프리셋 스키마', status: 'todo' },
        { title: 'reference 가사 스타일 추출 (음절/어미/이미지 팔레트)', status: 'todo' },
        { title: '프리셋 vs 원작 유사도 검증', status: 'todo' },
      ],
    },
  ],
  decisions: [
    {
      date: '2026-03-01',
      title: '5-Lock 프로토콜을 기본값으로',
      why: 'Verse 1-2 구조 일치 없으면 노래가 안 됨. 강제 락이 없으면 초고 생산성만 높고 편곡 단계에서 다 버려짐.',
      alt: '자유 작성 + 후처리 정렬 — 기각. 멜로디 매칭 까다로워짐.',
    },
  ],
  openQuestions: [
    '아티스트 프리셋의 저작권/라이선스 문제',
    '5-Lock이 오히려 창의성 제약할 때 — 어느 수준까지 완화?',
  ],
};
