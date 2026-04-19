export type RelationType = 'one-to-one' | 'one-to-many' | 'many-to-many';

export interface ERD {
  project: string;
  version: number;
  updated: string;
  vision?: string;
  groups: EntityGroup[];
  entities: Entity[];
  relationships: Relationship[];
  canvas?: { width: number; height: number };
}

export interface EntityGroup {
  id: string;
  name: string;            // '콘텐츠', '재무', '파트너'
  color: string;           // hex, 메인 색 (예: '#1e3a8a')
  accentBg: string;        // 헤더 아이콘 박스 배경 (예: '#eff6ff')
  accentText?: string;     // 텍스트 색 (예: '#1e3a8a')
}

export interface Entity {
  id: string;              // 'clients' (unique)
  name: string;            // 'clients' (DB 테이블명)
  label: string;           // '클라이언트'
  groupId: string;
  icon?: string;           // 내부 아이콘 키 (Users/Briefcase/...)
  description?: string;
  x: number;               // 좌상단 x (SVG 좌표)
  y: number;
  width?: number;          // 기본 240
  fields: Field[];
}

export interface Field {
  name: string;
  type: string;            // 'uuid' | 'text' | 'int' | 'enum' | 'date' | 'timestamp' | ...
  pk?: boolean;
  fk?: { entity: string; field?: string };
  nullable?: boolean;
  unique?: boolean;
  note?: string;
}

export interface Relationship {
  from: string;            // entity id
  to: string;              // entity id
  type: RelationType;
  label?: string;          // verb ('has', 'contains', ...)
  color: string;           // 선 + crow's foot 색 (group 색과 매칭)
  path: string;            // 완전한 SVG path ("M x y C cx cy, cx cy, x y")
  labelPos?: { x: number; y: number }; // verb 라벨 위치 (없으면 비표시)
}
