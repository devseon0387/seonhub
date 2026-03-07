import { Project, Partner, Client } from '@/types';

export interface ClientSettlement {
  clientName: string;
  clientInfo?: Client;
  projects: Project[];
  totalAmount: number;
}

export interface PartnerSettlement {
  partner: Partner;
  partnerProjects: Project[];
  totalAmount: number;
  projectCount: number;
}

/**
 * 프로젝트를 클라이언트별로 그룹핑하고 정산 금액을 계산
 */
export function groupByClient(projects: Project[], clients: Client[]): ClientSettlement[] {
  const grouped: Record<string, ClientSettlement> = {};
  projects.forEach(p => {
    if (!p.client && !p.clientId) return;
    const clientInfo = p.clientId
      ? clients.find(c => c.id === p.clientId)
      : clients.find(c => c.name === p.client);
    const key = clientInfo?.id ?? p.client;
    if (!grouped[key]) {
      grouped[key] = { clientName: clientInfo?.name ?? p.client, clientInfo, projects: [], totalAmount: 0 };
    }
    grouped[key].projects.push(p);
    grouped[key].totalAmount += p.budget.totalAmount;
  });
  return Object.values(grouped);
}

/**
 * 파트너별 정산 목록 생성 (참여 프로젝트가 있는 파트너만)
 */
export function groupByPartner(projects: Project[], partners: Partner[]): PartnerSettlement[] {
  return partners.map(partner => {
    const partnerProjects = projects.filter(p => p.partnerIds?.includes(partner.id) || p.partnerId === partner.id);
    const totalAmount = partnerProjects.reduce((s, p) => s + p.budget.partnerPayment, 0);
    return { partner, partnerProjects, totalAmount, projectCount: partnerProjects.length };
  }).filter(ps => ps.projectCount > 0);
}

/**
 * 매니저 관리비 합계 계산
 */
export function calculateManagerTotal(projects: Project[]): number {
  return projects.reduce((s, p) => s + p.budget.managementFee, 0);
}
