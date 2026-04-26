import type { Roadmap } from '@/roadmap/types';

export const ILJU_MBTI_ROADMAP: Roadmap = {
  project: '일주×MBTI (도화스튜디오)',
  version: 1,
  updated: '2026-04-21',
  vision:
    '일주(60간지) × MBTI(16유형) = 960개 성격 시나리오 자동 생성 파이프라인 + Next.js 대시보드(포트 7777). Claude CLI 배치 호출 + 전결 검수 + ARC 연동. 힉스필드(이미지 생성) 자동화도 포함.',
  currentPhaseId: 'p3-jeongyeol',
  phases: [
    {
      id: 'p1-infra',
      title: '인프라 + 기승 파이프라인',
      status: 'done',
      summary: 'claude CLI 배치 실행 + ARC 에이전트 등록/검수 규칙 로드. 기승(起承) 시나리오 53개 파이프라인.',
      goal: '스크립트 하나로 N개 일주×MBTI 조합을 배치 생성.',
      items: [
        { title: 'claude CLI 호출 + env.pop(CLAUDECODE) 중첩 방지', status: 'done' },
        { title: 'f-string 플레이스홀더 우회 (concatenation)', status: 'done' },
        { title: 'ARC 에이전트 dohwa-studio 등록 + 도메인 규칙 로드', status: 'done' },
        { title: '검수 규칙 위반 시 즉시 수정 플로우', status: 'done' },
        { title: '기승 파이프라인 (_pipeline_giseung.py all 3)', status: 'done' },
        { title: 'LAST_SESSION.md 자동 갱신', status: 'done' },
      ],
    },
    {
      id: 'p2-references',
      title: '레퍼런스 확정 + 검수 규칙 누적',
      status: 'done',
      summary: '고품질 레퍼런스 확보 (갑자×INTJ 4.5점, 신묘×ENTJ 100점). 검수 규칙 옵시디언에 누적.',
      goal: '모든 신규 시나리오가 레퍼런스 수준 품질 달성.',
      items: [
        { title: '갑자×INTJ 4.50점 레퍼런스 확정', status: 'done' },
        { title: '신묘×ENTJ 전결 100점 레퍼런스', status: 'done' },
        { title: '을축×ISTJ 전결 통과', status: 'done' },
        { title: '검수 규칙 옵시디언 누적 (검수_규칙.md)', status: 'done' },
      ],
    },
    {
      id: 'p3-jeongyeol',
      title: '전결(轉結) 파이프라인',
      status: 'in-progress',
      target: '2026-05-31',
      summary: '기승 이후 전결 부분 100점 목표 재작성. 병진×ENFP, 정유×ENTJ, 을축×INTJ, 기축×ESTP.',
      goal: '전결 파이프라인 4개 조합 100점 달성 후 나머지 일괄.',
      items: [
        { title: '_pipeline_jeongyeol.py all 4 실행 중', status: 'in-progress' as const },
        { title: '병진×ENFP 100점', status: 'todo' },
        { title: '정유×ENTJ 100점', status: 'todo' },
        { title: '을축×INTJ 100점', status: 'todo' },
        { title: '기축×ESTP 100점', status: 'todo' },
        { title: '_report_pipeline.py로 완료 리포트 자동 생성', status: 'done' },
      ],
    },
    {
      id: 'p4-batch-all',
      title: '전체 960개 배치 생성',
      status: 'planned',
      target: '2026-09-30',
      summary: '전결 레퍼런스 확정 후 960개 조합 배치 생성. 병렬 Claude + 재시도 + 체크포인트.',
      goal: '전체 시나리오 생성 완료 (품질 평균 90점+).',
      items: [
        { title: '병렬 Claude 실행 스크립트', status: 'todo' },
        { title: '중단 시 체크포인트 복구', status: 'todo' },
        { title: '배치 완료 후 품질 분포 리포트', status: 'todo' },
      ],
    },
    {
      id: 'p5-hicksfield',
      title: '힉스필드 이미지 자동화 통합',
      status: 'planned',
      target: '2026-11-30',
      summary: '각 조합마다 힉스필드로 이미지 생성 → 시나리오와 묶음 패키지.',
      goal: '시나리오 + 이미지 동시 출력.',
      items: [
        { title: '힉스필드 API 연동', status: 'todo' },
        { title: '조합별 프롬프트 템플릿', status: 'todo' },
        { title: '시나리오+이미지 묶음 저장 구조', status: 'todo' },
      ],
    },
  ],
  decisions: [
    {
      date: '2026-02-10',
      title: '시나리오 작성 요청 시 플랜모드 금지',
      why: '메뉴얼(ilju_mbti_user_manual.md) 있고, 반복 작업이라 플래닝 오버헤드만 있음.',
      alt: '매번 플래닝 — 비효율.',
    },
    {
      date: '2026-02-23',
      title: '전결 파이프라인 별도 분리',
      why: '기승과 전결 품질 기준/패턴이 다름. 한 파이프라인에 묶으면 복잡도 폭증.',
      alt: '단일 파이프라인 — 기각.',
    },
  ],
  openQuestions: [
    '960개 배치 시 Claude API 비용 — Max 플랜이면 감당 가능한가?',
    '힉스필드 이미지 저작권 이슈 확인 필요',
  ],
};
