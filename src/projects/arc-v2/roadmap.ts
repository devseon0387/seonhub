import type { Roadmap } from '@/roadmap/types';

export const ARC_V2_ROADMAP: Roadmap = {
  project: 'ARC V2 — Agent Monitoring Dashboard',
  version: 1,
  updated: '2026-04-21',
  vision:
    '외부 에이전트(텔레그램 봇·도화·리릭 등)의 상태·대화를 중앙 대시보드에서 모니터링. 에이전트는 각자 돌아가고 MCP로 ARC에 보고. SQLite(WAL) + Express + WebSocket + MCP 서버 결합.',
  currentPhaseId: 'p2-ops',
  phases: [
    {
      id: 'p1-core',
      title: '코어 — 세션·메시지·MCP',
      status: 'done',
      summary: 'Express + SQLite + EventEmitter 버스 + MCP stdio 서버. 에이전트 등록/조회/메시지 push.',
      goal: '외부 에이전트가 MCP 툴로 ARC에 상태/대화 보고 가능.',
      items: [
        { title: 'better-sqlite3 (WAL, FK)', status: 'done' },
        { title: 'Express + CORS + 에러 핸들러', status: 'done' },
        { title: 'communication/monitor + message-bus', status: 'done' },
        { title: 'MCP stdio 서버 + arc_* 도구 (register/push/heartbeat/list/get)', status: 'done' },
        { title: 'REST API (/api/agents, /api/chat, /api/telegram, /api/status)', status: 'done' },
        { title: 'WebSocket /ws subscribe/broadcast', status: 'done' },
      ],
    },
    {
      id: 'p2-ops',
      title: '운영 — 스쿼드·태스크·도메인 규칙',
      status: 'in-progress',
      target: '2026-05-31',
      summary: '여러 에이전트를 스쿼드로 묶고 태스크 단위로 배정/추적. 도메인 규칙 로드 + 검수 피드백.',
      goal: '1인 운영자가 다수 에이전트의 작업 상태를 태스크 단위로 파악.',
      items: [
        { title: '스쿼드 CRUD (/api/squads)', status: 'done' },
        { title: '태스크 CRUD (/api/tasks)', status: 'done' },
        { title: 'arc_get_domain_rules — 에이전트별 검수 규칙 로드', status: 'done' },
        { title: 'arc_save_feedback — 검수 결과 누적', status: 'done' },
        { title: 'note_pages / note_groups 삭제 감사 트리거', status: 'done' },
        { title: '대시보드 UI에 스쿼드·태스크 뷰 (arc-v2 web)', status: 'todo' },
      ],
    },
    {
      id: 'p3-integrations',
      title: '외부 연동 확장',
      status: 'planned',
      target: '2026-07-31',
      summary: '텔레그램 외 Slack·Discord·X 등 채널 확장. 에이전트간 메시지 라우팅.',
      goal: '한 에이전트가 다른 에이전트 호출하는 multi-agent orchestration.',
      items: [
        { title: 'Slack 봇 채널', status: 'todo' },
        { title: 'Discord 봇 채널', status: 'todo' },
        { title: 'arc_dispatch — 에이전트 간 호출 라우팅', status: 'todo' },
      ],
    },
  ],
  decisions: [
    {
      date: '2026-02-15',
      title: 'DB를 Supabase 대신 SQLite(로컬) 선택',
      why: '단일 사용자 로컬 운영이 주 케이스. WAL 모드로 다중 프로세스 읽기 안전. 원격 공유 필요시 Supabase로 이전 가능.',
      alt: 'Supabase 즉시 도입 — 보류. Pro 플랜 DOKKAEBI는 다른 프로젝트 공유 중.',
    },
  ],
  openQuestions: [
    'Supabase로 이전 시점 — 에이전트 수 10개 초과하면 검토',
    '에이전트 간 호출 라우팅을 MCP로 할지, 별도 queue로 할지',
  ],
  risks: [
    {
      title: 'SQLite 삭제 사고',
      mitigation: 'note_* 삭제 감사 트리거 + IF NOT EXISTS/DROP TABLE 금지 규칙 CLAUDE.md에 명시',
      severity: 'high',
    },
  ],
};
