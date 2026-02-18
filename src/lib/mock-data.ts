import { Partner, Project, Portfolio, Episode, Client } from '@/types';

// 목 파트너 데이터
export const mockPartners: Partner[] = [];

// 목 클라이언트 데이터
export const mockClients: Client[] = [];

// 클라이언트별 프로젝트 수 계산
export const getClientProjectCount = (clientId: string): number => {
  // client 필드를 사용하여 프로젝트 수 계산 (실제로는 clientId로 매칭해야 하지만 현재는 이름으로)
  const client = mockClients.find(c => c.id === clientId);
  if (!client) return 0;
  return mockProjects.filter(p => p.client === client.name).length;
};

// 목 매니저 데이터
export const mockManagers: Partner[] = [];

// 목 프로젝트 데이터
export const mockProjects: Project[] = [];

// 프로젝트 상태별 통계
export const getProjectStats = () => {
  return {
    total: mockProjects.length,
    completed: mockProjects.filter(p => p.status === 'completed').length,
    inProgress: mockProjects.filter(p => p.status === 'in_progress').length,
    planning: mockProjects.filter(p => p.status === 'planning').length,
  };
};

// 파트너별 프로젝트 수
export const getPartnerProjectCount = (partnerId: string) => {
  return mockProjects.filter(p => p.partnerId === partnerId).length;
};

// 목 회차 데이터 (프로젝트별)
export const mockEpisodes: Record<string, Episode[]> = {};

// 프로젝트 ID로 회차 가져오기
export const getEpisodesByProjectId = (projectId: string): Episode[] => {
  return mockEpisodes[projectId] || [];
};

// 파트너 통계 정보 가져오기
export const getPartnerStats = (partnerId: string) => {
  // localStorage에서 프로젝트와 회차 가져오기
  let projects: Project[] = mockProjects;
  let allEpisodes: Episode[] = [];

  if (typeof window !== 'undefined') {
    const storedProjects = localStorage.getItem('video-moment-projects');
    if (storedProjects) {
      try {
        projects = JSON.parse(storedProjects);
      } catch (e) {
        console.error('Failed to parse projects:', e);
      }
    }

    const storedEpisodes = localStorage.getItem('video-moment-episodes');
    if (storedEpisodes) {
      try {
        allEpisodes = JSON.parse(storedEpisodes);
      } catch (e) {
        console.error('Failed to parse episodes:', e);
      }
    } else {
      // localStorage에 없으면 mock 데이터에서 가져오기
      allEpisodes = Object.values(mockEpisodes).flat();
    }
  }

  // 파트너가 담당하는 프로젝트
  const partnerProjects = projects.filter(p => p.partnerId === partnerId);
  const inProgressProjects = partnerProjects.filter(p => p.status === 'in_progress');
  const completedProjects = partnerProjects.filter(p => p.status === 'completed');

  // 파트너가 담당하는 회차 (assignee로 필터링)
  const partnerEpisodes = allEpisodes.filter(e => e.assignee === partnerId);
  const completedEpisodes = partnerEpisodes.filter(e => e.status === 'completed');
  const inProgressEpisodes = partnerEpisodes.filter(e => e.status === 'in_progress');

  // 이번 달 완료한 회차
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEpisodes = completedEpisodes.filter(e => {
    const updatedDate = new Date(e.updatedAt);
    return updatedDate >= thisMonthStart;
  });

  // 수익 계산 (회차의 partnerPayment 합계)
  const totalRevenue = partnerEpisodes.reduce((sum, episode) => {
    return sum + (episode.budget?.partnerPayment || 0);
  }, 0);

  const thisMonthRevenue = thisMonthEpisodes.reduce((sum, episode) => {
    return sum + (episode.budget?.partnerPayment || 0);
  }, 0);

  const avgRevenuePerEpisode = partnerEpisodes.length > 0
    ? totalRevenue / partnerEpisodes.length
    : 0;

  // 최근 활동일 (가장 최근 회차의 updatedAt)
  const lastActivity = partnerEpisodes.length > 0
    ? partnerEpisodes.reduce((latest, episode) => {
        const episodeDate = new Date(episode.updatedAt);
        return episodeDate > latest ? episodeDate : latest;
      }, new Date(partnerEpisodes[0].updatedAt))
    : null;

  return {
    // 프로젝트 통계
    totalProjects: partnerProjects.length,
    inProgressProjects: inProgressProjects.length,
    completedProjects: completedProjects.length,

    // 회차 통계
    totalEpisodes: partnerEpisodes.length,
    completedEpisodes: completedEpisodes.length,
    inProgressEpisodes: inProgressEpisodes.length,
    thisMonthEpisodes: thisMonthEpisodes.length,

    // 수익 정보
    totalRevenue,
    thisMonthRevenue,
    avgRevenuePerEpisode,

    // 활동 정보
    lastActivity: lastActivity ? lastActivity.toISOString() : null,

    // 상세 목록
    projects: partnerProjects,
    episodes: partnerEpisodes,
  };
};
