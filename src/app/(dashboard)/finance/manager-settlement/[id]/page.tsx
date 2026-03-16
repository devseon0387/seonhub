'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Copy, Check, Landmark, Receipt, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Project, Partner, Episode } from '@/types';
import { getProjects, getPartners, getAllEpisodes } from '@/lib/supabase/db';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import Link from 'next/link';

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';

function calcNetAmount(amount: number, partnerType?: 'freelancer' | 'business') {
  if (partnerType === 'business') return Math.round(amount * 1.1);
  if (partnerType === 'freelancer') return Math.round(amount * (1 - 0.033));
  return amount;
}

function getNetLabel(partnerType?: 'freelancer' | 'business') {
  if (partnerType === 'business') return '부가세 10%';
  if (partnerType === 'freelancer') return '3.3% 원천징수';
  return '';
}

function getDday(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return { label: 'D-day', color: 'text-red-500 font-semibold' };
  if (diff < 0) return { label: `D+${Math.abs(diff)}`, color: 'text-red-500 font-semibold' };
  if (diff <= 3) return { label: `D-${diff}`, color: 'text-orange-500 font-semibold' };
  return { label: `D-${diff}`, color: 'text-gray-400' };
}

interface EpisodeWithProject {
  episode: Episode & { projectId: string };
  project: Project;
}

export default function ManagerSettlementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [manager, setManager] = useState<Partner | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<(Episode & { projectId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => {
    const y = searchParams.get('year');
    const m = searchParams.get('month');
    const now = new Date();
    return {
      year: y ? parseInt(y) : now.getFullYear(),
      month: m ? parseInt(m) : now.getMonth() + 1,
    };
  });

  const prevMonth = () => {
    setSelectedDate(prev => prev.month === 1
      ? { year: prev.year - 1, month: 12 }
      : { year: prev.year, month: prev.month - 1 }
    );
  };

  const nextMonth = () => {
    setSelectedDate(prev => prev.month === 12
      ? { year: prev.year + 1, month: 1 }
      : { year: prev.year, month: prev.month + 1 }
    );
  };

  const copyAccount = () => {
    if (!manager?.bank || !manager?.bankAccount) return;
    navigator.clipboard.writeText(`${manager.bank} ${manager.bankAccount}`);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([getProjects(), getPartners(), getAllEpisodes()]).then(
      ([p, pa, ep]) => {
        setProjects(p);
        setManager(pa.find(partner => partner.id === id) ?? null);
        setAllEpisodes(ep);
        setLoading(false);
      }
    ).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);
  useSupabaseRealtime(['episodes', 'projects', 'partners'], loadData);

  const selectedYM = `${selectedDate.year}-${String(selectedDate.month).padStart(2, '0')}`;

  const episodesMap = useMemo(() => {
    const map: Record<string, (Episode & { projectId: string })[]> = {};
    allEpisodes.forEach(ep => {
      if (!map[ep.projectId]) map[ep.projectId] = [];
      map[ep.projectId].push(ep);
    });
    return map;
  }, [allEpisodes]);

  // 해당 월의 매니저 에피소드를 입금일별로 그룹핑
  const dateGroups = useMemo(() => {
    if (!manager) return [];
    const managerAllProjects = projects.filter(
      p => p.managerIds?.includes(manager.id)
    );

    const allEps: EpisodeWithProject[] = [];
    managerAllProjects.forEach(project => {
      const episodes = (episodesMap[project.id] || []).filter(
        ep => (ep.manager === manager.id || ep.manager === manager.name) && ep.paymentDueDate?.slice(0, 7) === selectedYM
      );
      episodes.forEach(ep => allEps.push({ episode: ep, project }));
    });

    const grouped: Record<string, EpisodeWithProject[]> = {};
    allEps.forEach(item => {
      const date = item.episode.paymentDueDate ?? 'unknown';
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({
        date,
        items,
        totalAmount: items.reduce((s, i) => s + (i.episode.budget?.managementFee ?? 0), 0),
        paidCount: items.filter(i => i.episode.paymentStatus === 'completed').length,
        allPaid: items.every(i => i.episode.paymentStatus === 'completed'),
      }));
  }, [manager, projects, episodesMap, selectedYM]);

  const allItems = dateGroups.flatMap(g => g.items);
  const totalAmount = allItems.reduce((s, i) => s + (i.episode.budget?.managementFee ?? 0), 0);
  const paidAmount = allItems.filter(i => i.episode.paymentStatus === 'completed').reduce((s, i) => s + (i.episode.budget?.managementFee ?? 0), 0);
  const unpaidAmount = totalAmount - paidAmount;
  const totalNetAmount = calcNetAmount(totalAmount, manager?.partnerType);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
      </div>
    );
  }

  if (!manager) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">매니저를 찾을 수 없습니다.</p>
        <Link href="/finance/manager-settlement" className="text-sm text-orange-500 hover:text-orange-600">
          ← 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/finance/manager-settlement`}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-bold text-gray-900">{manager.name}</h1>
              {manager.partnerType && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  manager.partnerType === 'business'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-purple-50 text-purple-600'
                }`}>
                  {manager.partnerType === 'business' ? '사업자' : '프리랜서'}
                </span>
              )}
              {manager.jobTitle && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                  {manager.jobTitle}
                </span>
              )}
            </div>
            <p className="text-gray-500 mt-1">매니징 정산 내역</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1 py-1 shadow-sm">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-0.5">작업 수</p>
          <p className="text-2xl font-bold text-gray-900">{allItems.length}<span className="text-sm font-medium text-gray-400 ml-0.5">건</span></p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-0.5">총 매니징 비용</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(totalAmount)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-0.5">
            실 지급액{manager.partnerType && <span className="text-blue-400 ml-1">({getNetLabel(manager.partnerType)})</span>}
          </p>
          <p className="text-2xl font-bold text-blue-600">{fmt(totalNetAmount)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-0.5">지급 완료</p>
          <p className="text-2xl font-bold text-emerald-600">{fmt(paidAmount)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-0.5">지급 대기</p>
          <p className="text-2xl font-bold text-orange-500">{fmt(unpaidAmount)}</p>
        </div>
      </div>

      {/* 입금일별 그룹 */}
      {dateGroups.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-20 text-center">
          <Receipt className="mx-auto mb-3 text-gray-200" size={36} />
          <p className="font-medium text-gray-500">정산 내역이 없어요</p>
          <p className="text-xs text-gray-400 mt-1">{selectedDate.year}년 {selectedDate.month}월에 매니징한 내역이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dateGroups.map(({ date, items, totalAmount: groupTotal, paidCount, allPaid }) => {
            const dday = date !== 'unknown' ? getDday(date) : null;
            const groupNet = calcNetAmount(groupTotal, manager.partnerType);
            return (
              <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* 날짜 그룹 헤더 */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-orange-400" />
                    <span className="text-sm font-semibold text-gray-900">
                      {date !== 'unknown' ? date : '입금일 미정'}
                    </span>
                    {dday && (
                      <span className={`text-xs ${dday.color}`}>{dday.label}</span>
                    )}
                    {allPaid && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">전체 완료</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-400">{items.length}건 · 완료 {paidCount}/{items.length}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{fmt(groupTotal)}</span>
                      <span className="text-xs text-blue-500 ml-2">{fmt(groupNet)}</span>
                    </div>
                  </div>
                </div>

                {/* 에피소드 테이블 */}
                <div className="overflow-x-auto">
                  <div className="min-w-[750px]">
                    <div className="px-5 py-2 bg-gray-50 grid grid-cols-[minmax(160px,2fr)_minmax(200px,2fr)_auto_110px_110px_60px] gap-3 text-[11px] font-semibold text-gray-400 border-b border-gray-100">
                      <span>프로젝트</span>
                      <span>회차</span>
                      <span>작업 내용</span>
                      <span className="text-right">매니징 비용</span>
                      <span className="text-right">실 수령액</span>
                      <span className="text-right">지급</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {items.map(({ episode: ep, project }) => {
                        const epAmount = ep.budget?.managementFee ?? 0;
                        const epNet = calcNetAmount(epAmount, manager.partnerType);
                        return (
                          <div key={ep.id} className="px-5 py-3 grid grid-cols-[minmax(160px,2fr)_minmax(200px,2fr)_auto_110px_110px_60px] gap-3 items-center hover:bg-gray-50 transition-colors">
                            <span className="text-sm text-gray-700 whitespace-nowrap">{project.title}</span>
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <span className="text-sm text-orange-500 font-semibold">{ep.episodeNumber}편</span>
                              {ep.title && <span className="text-sm text-gray-500">{ep.title}</span>}
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                              {ep.workContent && ep.workContent.length > 0 ? (
                                ep.workContent.map(wc => (
                                  <span key={wc} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">{wc}</span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-800 text-right">{fmt(epAmount)}</span>
                            <span className="text-sm font-medium text-blue-600 text-right">{fmt(epNet)}</span>
                            <div className="text-right">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                ep.paymentStatus === 'completed'
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-orange-50 text-orange-500'
                              }`}>
                                {ep.paymentStatus === 'completed' ? '완료' : '대기'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* 날짜 소계 */}
                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 grid grid-cols-[minmax(160px,2fr)_minmax(200px,2fr)_auto_110px_110px_60px] gap-3 items-center">
                      <span className="text-xs font-semibold text-gray-400">소계</span>
                      <span />
                      <span />
                      <span className="text-sm font-bold text-gray-900 text-right">{fmt(groupTotal)}</span>
                      <span className="text-sm font-bold text-blue-600 text-right">{fmt(groupNet)}</span>
                      <span />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 전체 합계 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex items-center justify-between">
            {(manager.bank && manager.bankAccount) ? (
              <button
                onClick={copyAccount}
                className="flex items-center gap-2 text-xs px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Landmark size={12} className="text-gray-400" />
                <span className="text-gray-600">{manager.bank} {manager.bankAccount}</span>
                {copiedId ? (
                  <Check size={12} className="text-emerald-500" />
                ) : (
                  <Copy size={12} className="text-gray-300" />
                )}
              </button>
            ) : (
              <Link
                href={`/partners`}
                className="flex items-center gap-2 text-xs px-3 py-1.5 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors text-orange-500"
              >
                <Landmark size={12} />
                <span>계좌 정보 미등록</span>
              </Link>
            )}
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-500">총 합계</span>
              <span className="text-sm text-gray-500">{fmt(totalAmount)}</span>
              <span className="text-lg font-bold text-blue-600">{fmt(totalNetAmount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
