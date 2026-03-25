'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import { Project, Partner, Episode } from '@/types';
import { getProjects, getPartners, getAllEpisodes } from '@/lib/supabase/db';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import Link from 'next/link';

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

interface PartnerSummary {
  partner: Partner;
  projectCount: number;
  episodeCount: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  nearestDueDate: string | null; // 미지급 중 가장 가까운 정산일
}

export default function PartnerSettlementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [allEpisodes, setAllEpisodes] = useState<(Episode & { projectId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const prevMonth = () => {
    setSelectedDate(prev => prev.month === 1
      ? { year: prev.year - 1, month: 12 }
      : { year: prev.year, month: prev.month - 1 }
    );
  };

  const isMinMonth = selectedDate.year === 2026 && selectedDate.month === 3;

  const nextMonth = () => {
    setSelectedDate(prev => prev.month === 12
      ? { year: prev.year + 1, month: 1 }
      : { year: prev.year, month: prev.month + 1 }
    );
  };

  const loadData = useCallback(() => {
    setError(false);
    setLoading(true);
    Promise.all([getProjects(), getPartners(), getAllEpisodes()]).then(
      ([p, pa, ep]) => {
        setProjects(p);
        setPartners(pa);
        setAllEpisodes(ep);
        setLoading(false);
      }
    ).catch(() => { setError(true); setLoading(false); });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useSupabaseRealtime(['episodes', 'projects', 'partners'], loadData);

  const selectedYM = `${selectedDate.year}-${String(selectedDate.month).padStart(2, '0')}`;

  // 에피소드를 projectId 기준으로 그룹핑
  const episodesMap = useMemo(() => {
    const map: Record<string, (Episode & { projectId: string })[]> = {};
    allEpisodes.forEach(ep => {
      if (!map[ep.projectId]) map[ep.projectId] = [];
      map[ep.projectId].push(ep);
    });
    return map;
  }, [allEpisodes]);

  // 파트너별 정산: paymentDueDate 기준으로 해당 월 에피소드 필터링
  const summaries: PartnerSummary[] = useMemo(() => {
    return partners
      .map(partner => {
        // 이 파트너가 참여한 모든 프로젝트
        const partnerAllProjects = projects.filter(
          p => p.partnerIds?.includes(partner.id) || p.partnerId === partner.id
        );

        let totalAmount = 0;
        let paidAmount = 0;
        let episodeCount = 0;
        const projectIds = new Set<string>();
        const unpaidDueDates: string[] = [];

        partnerAllProjects.forEach(project => {
          const episodes = (episodesMap[project.id] || []).filter(
            ep => (ep.assignee === partner.id || ep.assignee === partner.name) && ep.paymentDueDate?.slice(0, 7) === selectedYM
          );
          if (episodes.length > 0) {
            episodeCount += episodes.length;
            projectIds.add(project.id);
            episodes.forEach(ep => {
              const amt = ep.budget?.partnerPayment ?? 0;
              totalAmount += amt;
              if (ep.paymentStatus === 'completed') {
                paidAmount += amt;
              } else if (ep.paymentDueDate) {
                unpaidDueDates.push(ep.paymentDueDate);
              }
            });
          }
        });

        // 미지급 중 오늘 기준 가장 가까운 날짜
        const today = new Date().toISOString().slice(0, 10);
        const sorted = unpaidDueDates.sort((a, b) => Math.abs(new Date(a).getTime() - new Date(today).getTime()) - Math.abs(new Date(b).getTime() - new Date(today).getTime()));
        const nearestDueDate = sorted[0] ?? null;

        return {
          partner,
          projectCount: projectIds.size,
          episodeCount,
          totalAmount,
          paidAmount,
          unpaidAmount: totalAmount - paidAmount,
          nearestDueDate,
        };
      })
      .filter(s => s.episodeCount > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [partners, projects, episodesMap, selectedYM]);

  const grandTotal = summaries.reduce((s, ps) => s + ps.totalAmount, 0);
  const grandPaid = summaries.reduce((s, ps) => s + ps.paidAmount, 0);
  const grandUnpaid = grandTotal - grandPaid;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">데이터를 불러오는데 실패했습니다.</p>
        <button onClick={loadData} className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors text-sm font-medium">
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">파트너 정산</h1>
          <p className="text-gray-500 mt-1">파트너를 선택해 정산 내역을 확인하세요</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1 py-1 shadow-sm">
          <button onClick={prevMonth} disabled={isMinMonth} className={`p-2 rounded-lg transition-colors ${isMinMonth ? 'invisible' : 'hover:bg-gray-100'}`}>
              <ChevronLeft size={16} className="text-gray-500" />
            </button>
          <span className="px-3 py-1.5 text-sm font-semibold text-gray-800 min-w-[120px] text-center">
            {selectedDate.year}년 {selectedDate.month}월
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">총 지급 예정</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(grandTotal)}</p>
          <p className="text-xs text-gray-400 mt-1">{summaries.length}명 파트너</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">지급 완료</p>
          <p className="text-2xl font-bold text-emerald-600">{fmt(grandPaid)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">지급 대기</p>
          <p className="text-2xl font-bold text-orange-500">{fmt(grandUnpaid)}</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
        </div>
      )}

      {/* 파트너 테이블 */}
      {!loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="px-6 py-3 bg-gray-50 grid grid-cols-[1fr_80px_80px_120px_80px_90px] gap-4 text-xs font-semibold text-gray-400 border-b border-gray-100">
                <span>파트너</span>
                <span>유형</span>
                <span>프로젝트 수</span>
                <span className="text-right">정산 금액</span>
                <span className="text-right">지급 상태</span>
                <span className="text-right">가까운 정산일</span>
              </div>
              {summaries.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <Receipt className="mx-auto mb-3 text-gray-200" size={36} />
                  <p className="font-medium text-gray-500">정산 내역이 없어요</p>
                  <p className="text-xs mt-1">{selectedDate.year}년 {selectedDate.month}월에 해당하는 프로젝트가 없습니다</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {summaries.map(({ partner, projectCount, episodeCount, totalAmount, unpaidAmount, nearestDueDate }) => (
                    <Link
                      key={partner.id}
                      href={`/finance/partner-settlement/${partner.id}?year=${selectedDate.year}&month=${selectedDate.month}`}
                      className="px-6 py-5 grid grid-cols-[1fr_80px_80px_120px_80px_90px] gap-4 items-center hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                          <Users size={18} className="text-orange-400" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 truncate">{partner.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {partner.partnerType === 'business' ? '사업자' : partner.partnerType === 'freelancer' ? '프리랜서' : '-'}
                      </span>
                      <span className="text-sm text-gray-700">{projectCount}개{episodeCount > 0 ? ` · ${episodeCount}회차` : ''}</span>
                      <span className="text-sm font-semibold text-gray-900 text-right">{fmt(totalAmount)}</span>
                      <div className="text-right">
                        {unpaidAmount > 0 ? (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 font-semibold">미지급</span>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 font-semibold">완료</span>
                        )}
                      </div>
                      <span className="text-sm text-gray-400 text-right">
                        {nearestDueDate ? new Date(nearestDueDate).toLocaleDateString('ko-KR') : '-'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
