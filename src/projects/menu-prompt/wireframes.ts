import type { ExternalWireframe } from '../plick/wireframes';

export const MENU_PROMPT_WIREFRAMES: ExternalWireframe[] = [
  { slug: 'prototype', label: '프로토타입 전체', category: '프로토타입', file: '_prototype/prototype.html' },
  { slug: 'designs',   label: '디자인 시안 모음', category: '프로토타입', file: '_prototype/designs.html' },
];

/** designs.html이 디자인 시안 모음 역할도 겸함 */
export const MENU_PROMPT_DESIGN_SYSTEM_FILE = '_prototype/designs.html';
