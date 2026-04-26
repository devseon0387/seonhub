import type { Roadmap } from '@/roadmap/types';

export const HEYSQUID_ROADMAP: Roadmap = {
  project: 'heysquid — PM agent',
  version: 1,
  updated: '2026-04-21',
  vision:
    'Claude Code를 항상 켜져 있는 PM 에이전트로 변환. Telegram/Slack/Discord로 메시지 보내면 PM이 Plan → Confirm → Execute → Report 프로토콜 따라 작업하고 답변. 3-tier memory + 6인 스페셜리스트 에이전트팀 + 플러그인 자동 발견.',
  currentPhaseId: 'p3-plugins',
  phases: [
    {
      id: 'p1-pm-core',
      title: 'PM 프로토콜 코어',
      status: 'done',
      summary: 'Telegram → Listener → Executor → Claude Code (PM mode) → Telegram 파이프라인. launchd 데몬.',
      goal: '맥북이 켜져 있으면 언제든 메시지 → Plan/Execute/Report.',
      items: [
        { title: 'launchd 데몬 + 재시작 복구', status: 'done' },
        { title: 'Telegram 봇 토큰 기반 Listener', status: 'done' },
        { title: 'Claude Code CLI 실행 오케스트레이션', status: 'done' },
        { title: 'PM Plan → Confirm → Execute → Report 프로토콜', status: 'done' },
        { title: 'Crash recovery — 세션 중단 시 다음 세션에서 이어감', status: 'done' },
      ],
    },
    {
      id: 'p2-memory-agents',
      title: '3-Tier 메모리 + 6인 에이전트 팀',
      status: 'done',
      summary: 'permanent/session/workspace 메모리. PM이 필요한 작업마다 스페셜리스트 에이전트 자동 디스패치.',
      goal: 'PM이 과거 학습한 교훈, 현재 세션 컨텍스트, 프로젝트별 메모리를 모두 활용.',
      items: [
        { title: 'Permanent memory — 장기 교훈', status: 'done' },
        { title: 'Session memory — 현재 세션', status: 'done' },
        { title: 'Workspace memory — 프로젝트별', status: 'done' },
        { title: '6인 스페셜리스트 자동 디스패치', status: 'done' },
      ],
    },
    {
      id: 'p3-plugins',
      title: '플러그인 자동 발견 시스템',
      status: 'in-progress',
      target: '2026-06-30',
      summary: '`skills/` 또는 `automations/` 폴더에 드롭하면 바로 사용 가능. 설정 파일 없음.',
      goal: '사용자가 자기 스킬 폴더 만들면 PM이 자동 인식해서 호출 가능.',
      items: [
        { title: 'skills/ 자동 discovery', status: 'done' },
        { title: 'automations/ 자동 discovery', status: 'done' },
        { title: 'FanMolt 내장 (AI 크리에이터 자동 운영)', status: 'in-progress' as const },
        { title: '커뮤니티 스킬 공유 저장소', status: 'todo' },
      ],
    },
    {
      id: 'p4-multi-channel',
      title: '멀티 채널 확장',
      status: 'planned',
      target: '2026-08-31',
      summary: 'Slack, Discord, X, Threads 추가. 같은 PM이 채널 어디서든 응답.',
      goal: '어느 메신저에서든 메시지 → 같은 PM.',
      items: [
        { title: 'Slack 채널 어댑터', status: 'todo' },
        { title: 'Discord 채널 어댑터', status: 'todo' },
        { title: 'X/Threads 포스팅 어댑터', status: 'todo' },
      ],
    },
    {
      id: 'p5-windows',
      title: 'Windows (WSL2) 지원',
      status: 'planned',
      target: '2026-10-31',
      summary: '현재 macOS launchd only. WSL2 systemd로 데몬 이식.',
      goal: 'Windows 사용자도 동일한 PM 경험.',
      items: [
        { title: 'WSL2 systemd 서비스 유닛', status: 'todo' },
        { title: 'Claude Code CLI 경로 분기', status: 'todo' },
      ],
    },
  ],
  decisions: [
    {
      date: '2026-02-01',
      title: 'Python 배포 (pip install)',
      why: '사용자 설치 장벽 최소화. Node.js는 Claude Code CLI 전제로만 필요.',
      alt: 'Docker 이미지 — 기각. Python 생태계의 pip 간단함이 우선.',
    },
    {
      date: '2026-03-15',
      title: 'Claude Max ($100/mo) 권장',
      why: '데몬은 사용량이 많아 Claude Pro 일일 한도로 부족. Max는 사실상 무제한.',
      alt: 'Pro로 출시 — 사용자 경험 저하 위험.',
    },
  ],
  openQuestions: [
    'FanMolt 연동 — 구독료 정산 경로',
    '여러 사용자를 한 데몬으로 멀티테넌트 지원할지 아니면 사용자별 데몬 하나씩',
  ],
  risks: [
    {
      title: '데몬 크래시 → 메시지 손실',
      mitigation: 'launchd KeepAlive + crash recovery 프로토콜. 실패시 Telegram으로 에러 통보.',
      severity: 'high',
    },
  ],
};
