export type PhaseStatus = 'done' | 'in-progress' | 'planned' | 'deferred';
export type ItemStatus = 'done' | 'todo' | 'blocked' | 'skipped';
export type RiskSeverity = 'low' | 'med' | 'high';

export interface Roadmap {
  project: string;
  version: number;
  updated: string;           // ISO 날짜
  vision: string;            // 한 문단, 왜 이 제품이 존재하는가
  currentPhaseId: string;    // 지금 집중하는 페이즈
  phases: Phase[];
  decisions: Decision[];     // 최신순 (맨 앞이 가장 최근)
  openQuestions: string[];
  risks?: Risk[];
}

export interface Phase {
  id: string;
  title: string;
  status: PhaseStatus;
  start?: string;            // 실제 시작일
  end?: string;              // 실제 종료일
  target?: string;           // 목표 종료일
  summary: string;           // 한 줄, Claude 맥락용
  goal: string;              // 이 페이즈 완료 기준
  items: Item[];
  wireframes?: string[];     // 이 페이즈와 연결된 wireframe slug들 (registry 참조)
}

export interface Item {
  title: string;
  status: ItemStatus;
  note?: string;             // 블로커·결정 근거
}

export interface Decision {
  date: string;              // ISO 날짜
  title: string;
  why: string;
  alt?: string;              // 대안으로 고려했던 것
}

export interface Risk {
  title: string;
  mitigation: string;
  severity?: RiskSeverity;
}
