# SEON Hub 디자인 시스템

SEON Hub 프로젝트의 디자인 언어·토큰·컴포넌트 규약.

## 원칙

1. **토큰이 source of truth** — 색/폰트/간격은 `tokens.css` CSS 변수만 사용. 컴포넌트·페이지에서 `#xxxxxx` 하드코딩 금지.
2. **Primitive 조합** — `src/components/ui/*` 의 원시 컴포넌트 조합으로 모든 UI 구성. 없으면 먼저 primitive 추가 후 사용.
3. **아이콘은 lucide-react** — 이모지 금지 (전역 규칙).
4. **차분한 톤** — 글래스모피즘·그라디언트 과용 금지. 불투명 바탕 + 얇은 테두리 + 작은 그림자 기본.
5. **새 컴포넌트는 /design에 즉시 등록** — 코드가 디자인 시스템의 증거.

## 토큰 (`tokens.css`)

### 색상

- `ink-50 ~ ink-900` — 중립 warm 그레이. 텍스트·테두리·배경.
- `brand-50 ~ brand-700` — SEON Hub 네이비 (`brand-600` = `#1e3a8a` 기본).
- `ok-*`, `warn-*`, `bad-*` — 시맨틱 (성공/경고/에러).

### 타이포그래피 (globals.css 유틸리티)

| 클래스 | 크기 | 용도 |
|---|---|---|
| `.text-meta` | 10px | 메타데이터, 타임스탬프 |
| `.text-caption` | 11px | 보조 설명 |
| `.text-body` | 13px | 본문 |
| `.text-section` | 13px bold | 섹션 제목 |
| `.text-page` | 20px bold | 페이지 제목 |
| `.text-kicker` | 11px uppercase | 카테고리 라벨 |

### 라디우스

- `rounded-md` (6px) — 작은 요소 (Chip, Badge)
- `rounded-lg` (8px) — Input, Button
- `rounded-xl` (12px) — Card 기본
- `rounded-2xl` (16px) — Card lg
- `rounded-[20px]` — Card xl

### 카드

- `.card` 유틸 — `#ffffff` 바탕 + `#ede9e6` 1px 테두리 + 얇은 그림자 + `rounded-xl`

## Primitives (`src/components/ui/`)

| 컴포넌트 | 파일 | 주요 props |
|---|---|---|
| Button | `Button.tsx` | variant, size, loading, iconLeft/Right |
| Input | `Input.tsx` | size, invalid |
| Textarea | `Textarea.tsx` | rows, invalid |
| Select | `Select.tsx` | options, size, invalid |
| Checkbox | `Checkbox.tsx` | checked, label |
| Tabs | `Tabs.tsx` | items, value, onChange |
| Card | `Card.tsx` | variant, radius, padded |
| Chip | `Chip.tsx` | tone, size |
| SectionHeader | `SectionHeader.tsx` | title, kicker, count, icon, right |
| EmptyState | `EmptyState.tsx` | label, description, icon, size |

## 금지사항

- 이모지 (UI·문서 전체) — lucide-react로 대체
- 하드코딩 색 (`#xxxxxx`, `rgb(...)`) — 반드시 토큰 경유
- primitive 복제 (variant로 해결할 것)
- 글래스모피즘 남발 (`backdrop-blur-xl + white/95` 등)

## 전시

실제 컴포넌트는 `/design` 라우트에서 확인. 새 primitive 추가 시 해당 페이지에도 섹션을 추가하는 것을 원칙으로 한다.
