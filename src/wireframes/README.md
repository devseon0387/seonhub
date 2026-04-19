# 와이어프레임

SEON Hub의 각 화면을 저가공 구조 수준에서 그린 프레임 모음.

## 용도

- 색/폰트/이미지 없이 **레이아웃·정보 계층·플로우만** 검증
- 새 화면을 구현하기 전에 구조 먼저 고정
- 구현된 실제 화면이 와이어프레임과 계속 일치하는지 리뷰

## 규약

- 모든 frame은 `src/wireframes/frames/` 아래 TSX 파일
- `frames/` 의 각 파일은 `default export`로 React 컴포넌트를 내놓는다
- 색상 금지. `ink-100 / ink-200 / ink-300`만 사용. 텍스트는 mono
- 점선 테두리 + 회색 박스 + placeholder 라벨
- 실제 데이터/이미지 금지 — "Title", "Meta", "Content" 같은 자리표시만
- 새 frame 추가 시 `src/wireframes/registry.ts` 의 `WIREFRAMES` 배열에 등록

## 등록 형식

```ts
{
  slug: 'dashboard',
  title: '대시보드',
  description: '진행 중 프로젝트·통계 요약',
  relatedRoute: '/dashboard',
  component: DashboardWireframe,
}
```

## 전시

`/wireframes` 라우트에서 썸네일 그리드, `/wireframes/[slug]` 에서 전체 프레임 확인.
