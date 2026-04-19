import type { ComponentType } from 'react';
import LoginWireframe from './frames/login';
import DashboardWireframe from './frames/dashboard';
import ProjectsListWireframe from './frames/projects-list';
import ManagementWireframe from './frames/management';
import DevWorkspaceWireframe from './frames/dev-workspace';

export interface WireframeEntry {
  slug: string;
  title: string;
  description: string;
  relatedRoute?: string;
  component: ComponentType;
}

export const WIREFRAMES: WireframeEntry[] = [
  {
    slug: 'login',
    title: '로그인',
    description: '이메일·비밀번호, SEON Hub 브랜딩',
    relatedRoute: '/login',
    component: LoginWireframe,
  },
  {
    slug: 'dashboard',
    title: '대시보드',
    description: '콘텐츠·마케팅·재무 3탭, KPI 4개, 최근 프로젝트 + 임박 데드라인',
    relatedRoute: '/dashboard',
    component: DashboardWireframe,
  },
  {
    slug: 'projects',
    title: '프로젝트 목록',
    description: '상태·타입 필터, 검색/정렬, 카드 그리드 (진행률 포함)',
    relatedRoute: '/projects',
    component: ProjectsListWireframe,
  },
  {
    slug: 'management',
    title: '매니지먼트',
    description: '메인·미기입·리포트 3탭, 회차별 작업 테이블 + 요약',
    relatedRoute: '/management',
    component: ManagementWireframe,
  },
  {
    slug: 'dev-workspace',
    title: 'Dev Workspace',
    description: '5 통계 스트립, 필터 칩, 프로젝트 카드 그리드',
    relatedRoute: '/dev',
    component: DevWorkspaceWireframe,
  },
];
