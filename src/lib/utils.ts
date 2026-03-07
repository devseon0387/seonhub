import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ProjectBudget, Episode } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 유보금 계산 함수
export function calculateReserve(budget: ProjectBudget): number {
  return budget.totalAmount - budget.partnerPayment - budget.managementFee;
}

// 전화번호 포맷 (숫자만 추출 후 하이픈 자동 삽입)
export function formatPhoneNumber(value: string | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

// 날짜 포맷 함수
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// 자동 계산 프로젝트 상태
export type ComputedProjectStatus = 'active' | 'standby' | 'dormant' | 'inactive';

export function getComputedProjectStatus(
  projectEpisodes: Episode[]
): ComputedProjectStatus {
  if (projectEpisodes.length === 0) return 'inactive';

  const hasNonCompleted = projectEpisodes.some(ep => ep.status !== 'completed');
  if (hasNonCompleted) return 'active';

  // 모두 완료 → completedAt 최대값 기준
  const completedDates = projectEpisodes
    .map(ep => ep.completedAt)
    .filter((d): d is string => !!d)
    .map(d => new Date(d).getTime());

  if (completedDates.length === 0) return 'inactive';

  const lastCompletedAt = Math.max(...completedDates);
  const daysSince = (Date.now() - lastCompletedAt) / (1000 * 60 * 60 * 24);

  if (daysSince < 14) return 'standby';
  if (daysSince < 28) return 'dormant';
  return 'inactive';
}

// 프로젝트 정렬 키 (active: 가장 가까운 미완료 dueDate, 나머지: 마지막 completedAt)
export function getProjectSortKey(
  projectEpisodes: Episode[],
  computedStatus: ComputedProjectStatus
): number {
  if (computedStatus === 'active') {
    // 미완료 에피소드 중 가장 가까운 dueDate (오름차순 → 작은 값이 먼저)
    const dueDates = projectEpisodes
      .filter(ep => ep.status !== 'completed' && ep.dueDate)
      .map(ep => new Date(ep.dueDate!).getTime());
    if (dueDates.length > 0) return Math.min(...dueDates);
    return Infinity; // dueDate 없으면 맨 뒤
  }
  // 대기/휴면/비활성: 마지막 completedAt (내림차순 → 큰 값이 먼저 → 음수로 변환)
  const completedDates = projectEpisodes
    .map(ep => ep.completedAt)
    .filter((d): d is string => !!d)
    .map(d => new Date(d).getTime());
  if (completedDates.length > 0) return -Math.max(...completedDates);
  return 0;
}

// 프로젝트 상태 한글 변환
export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    planning: '기획 중',
    in_progress: '진행 중',
    completed: '완료',
    on_hold: '보류',
  };
  return statusMap[status] || status;
}

// 프로젝트 상태별 색상
export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    planning: 'bg-orange-100 text-orange-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    on_hold: 'bg-gray-100 text-gray-800',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}
