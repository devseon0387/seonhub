export interface TutorialStep {
  target: string;       // data-tour 속성값
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

export type TutorialPageKey = 'management' | 'projects' | 'clients' | 'partners' | 'projectDetail' | 'episodeDetail';

export const TUTORIAL_STEPS: Record<TutorialPageKey, TutorialStep[]> = {
  management: [
    {
      target: 'tour-mgmt-tabs',
      title: '탭 네비게이션',
      description: '체크리스트, 오늘의 업무, 이번 주 업무를 탭으로 전환할 수 있어요.',
      placement: 'bottom',
    },
    {
      target: 'tour-mgmt-checklist',
      title: '체크리스트',
      description: '할 일을 추가하고 완료 체크를 할 수 있어요. 알림과 반복 설정도 가능합니다.',
      placement: 'bottom',
    },
    {
      target: 'tour-mgmt-calendar',
      title: '달력',
      description: '체크리스트 일정을 달력에서 한눈에 확인할 수 있어요.',
      placement: 'top',
    },
    {
      target: 'tour-fab',
      title: '빠른 액션',
      description: '검색, 알림, 새 프로젝트 시작 등의 빠른 액션을 사용할 수 있어요.',
      placement: 'left',
    },
  ],

  projects: [
    {
      target: 'tour-proj-filters',
      title: '상태 필터',
      description: '전체, 시작 전, 진행 중, 종료 상태별로 프로젝트를 필터링할 수 있어요.',
      placement: 'bottom',
    },
    {
      target: 'tour-proj-search',
      title: '검색 및 정렬',
      description: '프로젝트를 검색하고, 최신순·금액순·이름순으로 정렬할 수 있어요.',
      placement: 'bottom',
    },
    {
      target: 'tour-proj-grid',
      title: '프로젝트 카드',
      description: '각 프로젝트의 상태, 파트너, 회차 진행 현황을 한눈에 볼 수 있어요. 클릭하면 상세 페이지로 이동합니다.',
      placement: 'bottom',
    },
    {
      target: 'tour-proj-new',
      title: '새 프로젝트',
      description: '새로운 프로젝트를 추가할 수 있어요.',
      placement: 'bottom',
    },
  ],

  clients: [
    {
      target: 'tour-client-stats',
      title: '클라이언트 통계',
      description: '전체, 활성, 비활성 클라이언트 수를 한눈에 확인할 수 있어요.',
      placement: 'bottom',
    },
    {
      target: 'tour-client-search',
      title: '검색',
      description: '이름, 담당자, 이메일, 전화번호 등으로 클라이언트를 검색할 수 있어요.',
      placement: 'bottom',
    },
    {
      target: 'tour-client-table',
      title: '클라이언트 목록',
      description: '등록된 클라이언트 목록이에요. 클릭하면 상세 정보를 볼 수 있어요.',
      placement: 'top',
    },
    {
      target: 'tour-client-new',
      title: '새 클라이언트',
      description: '새로운 클라이언트를 추가할 수 있어요.',
      placement: 'bottom',
    },
  ],

  partners: [
    {
      target: 'tour-partner-filters',
      title: '상태 필터',
      description: '전체, 활성, 비활성 상태별로 파트너를 필터링할 수 있어요.',
      placement: 'bottom',
    },
    {
      target: 'tour-partner-stats',
      title: '파트너 통계',
      description: '진행중 회차, 이번 달 완료, 이번 달 지출을 한눈에 확인할 수 있어요.',
      placement: 'bottom',
    },
    {
      target: 'tour-partner-search',
      title: '검색',
      description: '이름, 이메일, 전화번호, 회사명으로 파트너를 검색할 수 있어요.',
      placement: 'bottom',
    },
    {
      target: 'tour-partner-table',
      title: '파트너 목록',
      description: '등록된 파트너 목록이에요. 클릭하면 상세 정보를 볼 수 있어요.',
      placement: 'top',
    },
    {
      target: 'tour-partner-new',
      title: '새 파트너',
      description: '새로운 파트너를 추가할 수 있어요.',
      placement: 'bottom',
    },
  ],

  projectDetail: [
    {
      target: 'tour-detail-header',
      title: '프로젝트 헤더',
      description: '프로젝트 이름, 상태, 클라이언트를 확인할 수 있어요. 수정·삭제·체크리스트 버튼도 여기에 있어요.',
      placement: 'bottom',
    },
    {
      target: 'tour-detail-tabs',
      title: '탭 네비게이션',
      description: '진행 중인 회차, 회차 관리, 프로젝트 개요를 탭으로 전환할 수 있어요.',
      placement: 'bottom',
    },
    {
      target: 'tour-detail-inprogress',
      title: '진행 중인 회차',
      description: '대기·진행 중인 회차의 상태와 작업 진행도를 한눈에 볼 수 있어요. 클릭하면 회차 상세로 이동합니다.',
      placement: 'bottom',
    },
    {
      target: 'tour-detail-add-episode',
      title: '회차 추가',
      description: '새 회차를 추가할 수 있어요. 회차 관리 탭에서 수정·삭제도 가능합니다.',
      placement: 'bottom',
    },
  ],

  episodeDetail: [
    {
      target: 'tour-episode-header',
      title: '회차 정보',
      description: '편 수와 제목을 클릭하면 바로 수정할 수 있어요. 변경 사항은 자동 저장됩니다.',
      placement: 'bottom',
    },
    {
      target: 'tour-episode-info',
      title: '기본 정보',
      description: '시작일, 종료일, 담당 파트너와 매니저를 확인할 수 있어요.',
      placement: 'bottom',
    },
    {
      target: 'tour-episode-checklist',
      title: '작업 체크리스트',
      description: '롱폼, 숏폼, 썸네일 등 작업 유형별 진행도를 타임라인으로 확인할 수 있어요.',
      placement: 'top',
    },
    {
      target: 'tour-episode-tasks',
      title: '작업 항목',
      description: '각 작업 유형을 펼쳐서 세부 단계를 관리할 수 있어요. 담당자 배정과 상태 변경이 가능합니다.',
      placement: 'top',
    },
  ],
};
