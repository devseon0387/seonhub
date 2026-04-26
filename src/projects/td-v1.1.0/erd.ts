import type { ERD } from '@/erd/types';

/**
 * 터미널 대시보드 데이터 모델 — 런타임 메모리 객체 기준.
 * DB 없음. 설정은 electron-store / localStorage.
 */
export const TD_ERD: ERD = {
  project: '터미널 대시보드',
  version: 1,
  updated: '2026-04-21',
  vision:
    'main.js 프로세스가 관리하는 런타임 상태 모델. Host 레지스트리 + Terminal 인스턴스 + 시스템 통계 스냅샷. v1.1.0부터 멀티호스트 대응.',
  canvas: { width: 1280, height: 620 },
  groups: [
    { id: 'host',    name: '호스트',   color: '#1e3a8a', accentBg: '#eff6ff', accentText: '#1e3a8a' },
    { id: 'runtime', name: '런타임',   color: '#16a34a', accentBg: '#ecfdf5', accentText: '#15803d' },
    { id: 'config',  name: '설정',     color: '#d97706', accentBg: '#fffbeb', accentText: '#b45309' },
  ],
  entities: [
    {
      id: 'hosts',
      name: 'Host',
      label: '호스트',
      groupId: 'host',
      icon: 'Database',
      description: '머신 1대 = Host 1개. 로컬(맥북) 또는 원격(SSH). 탭바/헤더/미니카드/시스템카드 색상·아이콘·약어 라벨의 소스.',
      x: 80, y: 80,
      width: 260,
      fields: [
        { name: 'id', type: 'text', pk: true, note: "'local' | 'imac' | UUID" },
        { name: 'label', type: 'text', note: 'MacBook / iMac / 서버1' },
        { name: 'shortLabel', type: 'text', note: 'MB / iMac / S1 (2-4자)' },
        { name: 'color', type: 'text', note: 'hex (#22d3ee 등)' },
        { name: 'icon', type: 'enum', note: 'laptop | desktop | server' },
        { name: 'connection_type', type: 'enum', note: 'local | ssh' },
        { name: 'ssh_config', type: 'json', nullable: true, note: '{user, host, port, keyPath}' },
        { name: 'status', type: 'enum', note: 'online | offline | connecting' },
        { name: 'last_ping', type: 'int', nullable: true, note: 'ms' },
      ],
    },
    {
      id: 'terminals',
      name: 'Terminal',
      label: '터미널',
      groupId: 'runtime',
      icon: 'Play',
      description: 'node-pty 프로세스 1개 = 탭 1개. v1.1.0부터 hostId 연결로 "어느 머신의 셸인지" 식별.',
      x: 500, y: 80,
      width: 260,
      fields: [
        { name: 'id', type: 'uuid', pk: true },
        { name: 'host_id', type: 'text', fk: { entity: 'hosts' } },
        { name: 'title', type: 'text' },
        { name: 'proc_type', type: 'enum', note: 'pty | ssh_channel' },
        { name: 'cwd', type: 'text' },
        { name: 'history', type: 'json', note: '출력 버퍼 (휘발)' },
        { name: 'state', type: 'enum', note: 'connected | busy | disconnected | ssh-fail' },
        { name: 'created_at', type: 'timestamp' },
      ],
    },
    {
      id: 'stats_snapshots',
      name: 'StatsSnapshot',
      label: '시스템 통계',
      groupId: 'host',
      icon: 'Calendar',
      description: '각 호스트의 실시간 통계. 미니 대시보드 + 시스템 카드 + 스파크라인(계획)에 사용.',
      x: 920, y: 80,
      width: 260,
      fields: [
        { name: 'id', type: 'uuid', pk: true },
        { name: 'host_id', type: 'text', fk: { entity: 'hosts' } },
        { name: 'cpu_usage', type: 'float' },
        { name: 'mem_used', type: 'int' },
        { name: 'mem_total', type: 'int' },
        { name: 'disk_percent', type: 'float' },
        { name: 'captured_at', type: 'timestamp' },
      ],
    },
    {
      id: 'settings',
      name: 'Settings',
      label: '앱 설정',
      groupId: 'config',
      icon: 'UserCog',
      description: 'electron-store 또는 localStorage 영속화. 탭 레이아웃·Host 레지스트리·키맵 등.',
      x: 500, y: 420,
      width: 260,
      fields: [
        { name: 'key', type: 'text', pk: true },
        { name: 'value', type: 'json' },
        { name: 'updated_at', type: 'timestamp' },
      ],
    },
  ],
  relationships: [
    {
      from: 'hosts', to: 'terminals',
      type: 'one-to-many', label: 'has',
      color: '#1e3a8a',
      path: 'M 340 180 L 500 180',
      labelPos: { x: 420, y: 165 },
      explanation: '한 호스트에 여러 터미널 세션이 연결될 수 있어요.',
    },
    {
      from: 'hosts', to: 'stats_snapshots',
      type: 'one-to-many', label: 'generates',
      color: '#1e3a8a',
      path: 'M 340 130 C 600 40, 800 40, 920 130',
      labelPos: { x: 620, y: 40 },
      explanation: '호스트가 매 ms 시스템 통계 스냅샷을 만들어요.',
    },
  ],
};
