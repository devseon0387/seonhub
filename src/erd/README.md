# ERD (Entity-Relationship Diagram)

SEON Hub의 데이터 모델을 단일 TS 파일로 기록.

## 왜

- **Claude 계약**: 데이터 수정 전 ERD를 먼저 읽어 관계·FK 이해 → 안전한 쿼리·마이그레이션
- **사람**: 도메인 구조·관계를 한눈에 파악, 새 기능 설계 시 어디에 붙일지 판단

## 파일

- `types.ts` — 스키마 타입 (ERD / Entity / Field / Relationship / EntityGroup)
- `erd.ts` — SEON Hub 데이터 모델 + 다이어그램 레이아웃
- 뷰: `src/components/ERDView.tsx`, 라우트: `/erd` + `/dev/[id]` ERD 탭

## 규약

- **그룹(도메인)은 4개 이하** — 콘텐츠·재무·파트너·시스템 수준
- **엔티티는 DB 테이블명 기준** (복수형 snake_case)
- **레이아웃**은 수동 좌표 (`x`, `y`) — 초기 규모(10~15개)에선 자동 배치보다 명료
- **Relationship.path**는 완전한 SVG path 문자열 — 곡선·S 커브 자유롭게
- **변경 시 `updated` 필드도 갱신**

## 추가 시

```ts
// 1. entities에 추가
{
  id: 'contracts',
  name: 'contracts',
  label: '계약',
  groupId: 'content',
  icon: 'FileText',
  x: 60, y: 380,
  fields: [
    { name: 'id', type: 'uuid', pk: true },
    { name: 'project_id', type: 'uuid', fk: { entity: 'projects' } },
    // ...
  ],
}

// 2. relationships에 추가
{
  from: 'projects', to: 'contracts',
  type: 'one-to-many', label: 'requires',
  color: '#1e3a8a',
  path: 'M 420 280 C 420 330, 200 330, 180 380',
  labelPos: { x: 300, y: 325 },
}
```

## Claude 계약

- 데이터 관련 작업 (쿼리, 마이그레이션, 엔티티 수정) 시 먼저 `src/erd/erd.ts` Read
- 스키마 변경 시 `erd.ts` 파일 동기 업데이트 (추가·삭제·FK 변경)
- `updated` 필드 갱신
