import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ProjectBudget } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 유보금 계산 함수
export function calculateReserve(budget: ProjectBudget): number {
  return budget.totalAmount - budget.partnerPayment - budget.managementFee;
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
