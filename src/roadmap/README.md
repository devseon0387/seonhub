# 로드맵

SEON Hub의 방향·진행 상태·주요 결정을 단일 파일로 기록.

## 원칙

1. **`roadmap.ts`가 source of truth** — GUI도, Claude도 같은 파일만 본다
2. **페이즈는 3~5개** — 너무 많으면 관리 안 됨. 완료된 건 done으로 남기고 새 건 추가
3. **`currentPhaseId`는 정확히 하나** — 동시 진행 페이즈는 페이즈 쪼개기
4. **Decisions는 삭제 금지** — 결정을 되돌릴 땐 새 decision으로 상쇄
5. **Items 완료 시 즉시 `status: 'done'`으로 업데이트** — 쌓아두지 말기

## Claude 계약

- 새 작업 시작 시 `src/roadmap/roadmap.ts` 먼저 Read
- `currentPhaseId` 페이즈에서 첫 `status: 'todo'` 아이템이 다음 작업
- 아이템 완료 → `status: 'done'`으로 파일 수정
- 페이즈 전체 done이면 사용자에게 "다음 페이즈 시작할까?" 확인
- 새 의사결정은 `decisions` 배열 맨 앞에 추가 (최신순)

## 스키마

`types.ts` 참조. 주요 필드:

- `phases[].status`: `done | in-progress | planned | deferred`
- `phases[].items[].status`: `done | todo | blocked | skipped`
- `decisions[]`: 날짜·제목·why·alt
- `openQuestions[]`: 아직 답 안 나온 질문 (답 나오면 decisions로 이동)
- `risks[]`: 알고 있는 리스크 + 대응책

## 전시

- `/roadmap` — 스탠드얼론
- `/dev/[id]` 드릴인 — 로드맵 탭

## 템플릿 복제

다른 프로젝트에 동일 구조 적용하려면:
1. `src/roadmap/` 폴더 복사
2. `types.ts`는 그대로, `roadmap.ts` 내용만 해당 프로젝트에 맞게 교체
3. `/roadmap` 라우트와 `RoadmapView` 컴포넌트도 이식 (또는 SEON Hub Dev Workspace 드릴인에서 확인)
