/**
 * ERD 관계선 verb 사전 (beginner view 전용)
 *
 * 새 verb를 `erd.ts`의 relationship.label 에 추가했다면 **반드시** 여기에도 추가하세요.
 * 초보자 뷰의 "용어 사전" 섹션이 이 매핑을 읽어 자동으로 정리합니다.
 * 누락된 verb는 화면에 "등록 필요" 경고로 표시됩니다.
 */

export interface RelationVerbEntry {
  /** 한국어 동사 (짧게). 예: '가진다' */
  ko: string;
  /** 한 문장 설명. 왼쪽 엔티티 기준으로 서술. */
  description: string;
  /** 예시 문장 (선택) */
  example?: string;
}

export const RELATION_VERBS: Record<string, RelationVerbEntry> = {
  has: {
    ko: '가진다',
    description: '왼쪽이 오른쪽을 소유하거나 보유합니다.',
    example: '클라이언트가 프로젝트를 가진다.',
  },
  contains: {
    ko: '포함한다',
    description: '왼쪽 안에 오른쪽이 속해 있습니다 (부모-자식 구조).',
    example: '프로젝트가 회차를 포함한다.',
  },
  incurs: {
    ko: '발생시킨다',
    description: '왼쪽의 활동 결과로 오른쪽이 생깁니다 (보통 비용·부채).',
    example: '프로젝트가 지출을 발생시킨다.',
  },
  generates: {
    ko: '만들어낸다',
    description: '왼쪽이 진행되면서 오른쪽 데이터가 자동으로 생성됩니다.',
    example: '회차가 정산을 만들어낸다.',
  },
  receives: {
    ko: '받는다',
    description: '왼쪽이 오른쪽을 수령합니다 (돈·물품·신호 등).',
    example: '파트너가 정산을 받는다.',
  },
  // ─── 확장 예시 (아직 미사용) ─────────────────
  belongs_to: {
    ko: '속한다',
    description: '왼쪽이 오른쪽 하위에 소속됩니다 (역방향 has).',
  },
  references: {
    ko: '참조한다',
    description: '왼쪽이 오른쪽을 연결 고리(FK)로 가리킵니다.',
  },
  tagged_with: {
    ko: '태그된다',
    description: '왼쪽에 오른쪽이 태그로 붙습니다.',
  },
  assigned_to: {
    ko: '할당된다',
    description: '왼쪽이 오른쪽에게 배정됩니다 (담당자 지정 등).',
  },
  approves: {
    ko: '승인한다',
    description: '왼쪽이 오른쪽을 검토·승인합니다.',
  },
  produces: {
    ko: '산출한다',
    description: '왼쪽의 결과물로 오른쪽이 나옵니다 (콘텐츠 생성 등).',
  },
  uses: {
    ko: '사용한다',
    description: '왼쪽이 오른쪽을 이용합니다.',
  },
  triggers: {
    ko: '촉발한다',
    description: '왼쪽의 변화가 오른쪽을 실행/발생시킵니다.',
  },
};

export function lookupVerb(verb: string | undefined | null): RelationVerbEntry | null {
  if (!verb) return null;
  return RELATION_VERBS[verb.toLowerCase()] ?? null;
}
