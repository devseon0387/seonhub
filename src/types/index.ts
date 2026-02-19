// 사용자 권한 타입
export type UserRole = 'admin' | 'partner';

// 파트너 타입
export interface Partner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  partnerType?: 'freelancer' | 'business'; // 프리랜서 / 사업자
  role: UserRole;
  status: 'active' | 'inactive';
  generation?: number; // 파트너 기수 (1기, 2기, 3기...)
  bank?: string; // 은행명
  bankAccount?: string; // 계좌번호
  createdAt: string;
  profileImage?: string;
}

// 프로젝트 상태
export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'on_hold';

// 프로젝트 비용 정보
export interface ProjectBudget {
  totalAmount: number; // 전체 프로젝트 비용 (클라이언트로부터 받는 총 금액)
  partnerPayment: number; // 파트너 지급 비용
  managementFee: number; // 매니징 비용
  marginRate: number; // 마진율 (%)
}

// 프로젝트 타입
export interface Project {
  id: string;
  title: string;
  description: string;
  client: string;
  partnerId: string; // 담당 파트너
  status: ProjectStatus;
  budget: ProjectBudget; // 비용 정보
  workContent?: WorkContentType[]; // 작업 내용 (복수 선택 가능)
  thumbnailUrl?: string;
  videoUrl?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  workTypeCosts?: { [key in WorkContentType]?: { partnerCost: number; managementCost: number } }; // 작업별 비용 정보
  totalAmount?: number; // 전체 금액
}

// 회차 상태
export type EpisodeStatus = 'waiting' | 'in_progress' | 'review' | 'completed';

// 작업 내용 타입
export type WorkContentType = '롱폼' | '기획 숏폼' | '본편 숏폼' | '썸네일';

// 작업 항목 상세 타입
export interface EpisodeWorkItem {
  type: WorkContentType;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  status: 'waiting' | 'in_progress' | 'completed';
}

// 회차별 비용 정보
export interface EpisodeBudget {
  totalAmount: number; // 회차 총 비용
  partnerPayment: number; // 파트너 지급액
  managementFee: number; // 매니징 비용
}

// 작업 단계 타입
export interface WorkStep {
  id: string;
  label: string;
  status: 'waiting' | 'in_progress' | 'completed';
  startDate: string;
  dueDate: string;
  assigneeId?: string;
}

// 작업 타입별 비용
export interface WorkTypeBudget {
  partnerPayment: number;
  managementFee: number;
}

// 회차 타입
export interface Episode {
  id: string;
  episodeNumber: number; // 회차 번호 (1, 2, 3...)
  title: string; // 회차 이름
  description?: string; // 회차 설명
  client?: string; // 클라이언트 이름
  workContent: WorkContentType[]; // 작업 내용 (복수 선택 가능)
  workItems?: EpisodeWorkItem[]; // 작업 항목별 상세 정보
  status: EpisodeStatus; // 진행사항
  assignee: string; // 담당자 ID (파트너)
  manager: string; // 매니저 ID
  startDate: string; // 작업 시작일
  endDate?: string; // 작업 종료일
  dueDate?: string; // 마감일
  budget?: EpisodeBudget; // 회차별 비용 정보
  workSteps?: Record<WorkContentType, WorkStep[]>; // 작업 타입별 상세 작업 단계
  workBudgets?: Record<WorkContentType, WorkTypeBudget>; // 작업 타입별 비용 정보
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 클라이언트 타입
export interface Client {
  id: string;
  name: string; // 클라이언트 이름/회사명
  contactPerson?: string; // 담당자 이름
  email?: string;
  phone?: string;
  company?: string; // 회사명
  address?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  notes?: string; // 메모
}

// 포트폴리오 항목 타입
export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  client: string;
  partnerId?: string;
  completedAt: string;
  tags: string[];
  youtubeUrl: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

// 휴지통 항목 타입
export type TrashItemType = 'project' | 'episode' | 'client' | 'partner';

export interface TrashItem {
  id: string; // 휴지통 항목 자체의 ID
  type: TrashItemType; // 삭제된 항목의 타입
  data: Project | Episode | Client | Partner; // 원본 데이터
  deletedAt: string; // 삭제 시간
  originalProjectId?: string; // 회차의 경우 원래 소속된 프로젝트 ID
}
