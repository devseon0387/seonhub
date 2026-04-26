import type { ERD } from '@/erd/types';

/**
 * menu-prompt (메뉴한컷) 데이터 모델
 * DB 없이 JSON 파일 기반. 이 ERD는 content/*.json의 스키마를 "엔티티"로 시각화한 것.
 */
export const MENU_PROMPT_ERD: ERD = {
  project: '메뉴한컷',
  version: 1,
  updated: '2026-04-21',
  vision:
    '소상공인용 음식 사진 프롬프트 갤러리. DB 없이 JSON 파일 1개로 데이터 운영. 사용자가 추가하는 프롬프트는 localStorage + 업로드 이미지는 my-befores로 별도 관리.',
  canvas: { width: 1280, height: 620 },
  groups: [
    { id: 'content', name: '콘텐츠',       color: '#1e3a8a', accentBg: '#eff6ff', accentText: '#1e3a8a' },
    { id: 'meta',    name: '메타/분류',    color: '#16a34a', accentBg: '#ecfdf5', accentText: '#15803d' },
    { id: 'user',    name: '사용자 업로드', color: '#d97706', accentBg: '#fffbeb', accentText: '#b45309' },
  ],
  entities: [
    {
      id: 'prompts',
      name: 'prompts',
      label: '프롬프트',
      groupId: 'content',
      icon: 'FileText',
      description: 'content/prompts.json — 카드 한 장 = 한 프롬프트',
      x: 440, y: 80,
      width: 260,
      fields: [
        { name: 'slug', type: 'text', pk: true, note: 'URL-safe 식별자' },
        { name: 'category', type: 'text', fk: { entity: 'categories' } },
        { name: 'title', type: 'text', note: '카드 제목' },
        { name: 'description', type: 'text' },
        { name: 'fullTitle', type: 'text', note: '상세 페이지 타이틀 (줄바꿈 포함)' },
        { name: 'lead', type: 'text', note: '한 줄 설명' },
        { name: 'prompt', type: 'text', note: '실제 복사되는 영문 프롬프트' },
        { name: 'beforeImage', type: 'text', note: 'Before 이미지 URL' },
        { name: 'afterImage', type: 'text', note: 'After 이미지 URL' },
      ],
    },
    {
      id: 'categories',
      name: 'categories',
      label: '카테고리',
      groupId: 'meta',
      icon: 'Tag',
      description: 'category-rules.md에 정의된 10개 (korean, japanese, western, cafe, dessert ...)',
      x: 60, y: 80,
      fields: [
        { name: 'key', type: 'text', pk: true, note: 'korean | cafe | dessert ...' },
        { name: 'emoji', type: 'text' },
        { name: 'name', type: 'text', note: '한식 / 카페 / 디저트 ...' },
        { name: 'range', type: 'text', note: '해당 카테고리에 속하는 음식군 설명' },
      ],
    },
    {
      id: 'my_befores',
      name: 'my_befores',
      label: '사용자 Before',
      groupId: 'user',
      icon: 'Users',
      description: 'content/my-befores.json — 사용자가 업로드한 원본 음식 사진',
      x: 820, y: 80,
      width: 260,
      fields: [
        { name: 'id', type: 'uuid', pk: true },
        { name: 'image_path', type: 'text' },
        { name: 'uploaded_at', type: 'timestamp' },
        { name: 'linked_prompt_slug', type: 'text', fk: { entity: 'prompts' }, nullable: true },
      ],
    },
    {
      id: 'user_prompts',
      name: 'user_prompts (localStorage)',
      label: '유저 프롬프트',
      groupId: 'user',
      icon: 'FileText',
      description: '사용자가 AddPromptModal로 추가한 프롬프트. 현재 localStorage 저장.',
      x: 440, y: 400,
      width: 260,
      fields: [
        { name: 'id', type: 'uuid', pk: true },
        { name: 'category', type: 'text', fk: { entity: 'categories' } },
        { name: 'title', type: 'text' },
        { name: 'prompt', type: 'text' },
        { name: 'before_image', type: 'text', nullable: true },
        { name: 'created_at', type: 'timestamp' },
      ],
    },
  ],
  relationships: [
    {
      from: 'categories', to: 'prompts',
      type: 'one-to-many', label: 'categorizes',
      color: '#16a34a',
      path: 'M 300 180 L 440 180',
      labelPos: { x: 370, y: 165 },
      explanation: '한 카테고리에 여러 프롬프트가 속해요 (10개 업종 분류).',
    },
    {
      from: 'prompts', to: 'my_befores',
      type: 'one-to-many', label: 'has',
      color: '#1e3a8a',
      path: 'M 700 180 L 820 180',
      labelPos: { x: 760, y: 165 },
      explanation: '각 프롬프트에 사용자가 업로드한 Before 이미지를 연결할 수 있어요.',
    },
    {
      from: 'categories', to: 'user_prompts',
      type: 'one-to-many', label: 'categorizes',
      color: '#16a34a',
      path: 'M 180 220 C 180 330, 200 330, 440 430',
      labelPos: { x: 240, y: 360 },
      explanation: '사용자가 추가한 프롬프트도 동일 카테고리 체계를 따라요.',
    },
  ],
};
