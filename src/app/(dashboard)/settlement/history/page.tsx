'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Briefcase, Users, ClipboardCheck, Wallet, ArrowRight, ChevronDown, Receipt, Calendar } from 'lucide-react';
import { Project, Partner, Client } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { getProjects, getPartners, getClients } from '@/lib/supabase/db';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { groupByClient, groupByPartner } from '@/lib/settlement';
import Link from 'next/link';

const statusConfig: Record<string, { label: string; dot: string }> = {
  planning:    { label: '시작 전', dot: 'bg-orange-400' },
  in_progress: { label: '진행 중', dot: 'bg-yellow-400' },
  completed:   { label: '종료',   dot: 'bg-gray-300' },
};

function getYearMonth(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatYearMonth(ym: string) {
  const [year, month] = ym.split('-');
  return `${year}년 ${parseInt(month)}월`;
}

export default function SettlementHistoryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'client' | 'partner' | 'manager'>('client');
  const [tabDirection, setTabDirection] = useState(1);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (id: string) => setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  const isGroupOpen = (id: string) => openGroups[id] !== false;

  const TAB_ORDER = ['client', 'partner', 'manager'] as const;
  const switchTab = (tab: 'client' | 'partner' | 'manager') => {
    setTabDirection(TAB_ORDER.indexOf(tab) > TAB_ORDER.indexOf(activeTab) ? 1 : -1);
    setActiveTab(tab);
  };

  const loadData = useCallback(() => {
    Promise.all([getProjects(), getPartners(), getClients()]).then(
      ([p, pa, c]) => {
        setProjects(p);
        setPartners(pa);
        setClients(c);
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useSupabaseRealtime(['episodes', 'projects', 'partners'], loadData);

  // 월별로 프로젝트 그룹핑 (createdAt 기준)
  const monthlyData = useMemo(() => {
    const grouped: Record<string, Project[]> = {};
    projects.forEach(p => {
      const ym = getYearMonth(p.createdAt);
      if (!grouped[ym]) grouped[ym] = [];
      grouped[ym].push(p);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a)) // 최신순
      .map(([ym, projs]) => {
        const clientTotal = projs.reduce((s, p) => s + p.budget.totalAmount, 0);
        const partnerTotal = projs.reduce((s, p) => s + p.budget.partnerPayment, 0);
        const managerTotal = projs.reduce((s, p) => s + p.budget.managementFee, 0);
        const margin = clientTotal - partnerTotal - managerTotal;
        return { yearMonth: ym, projects: projs, clientTotal, partnerTotal, managerTotal, margin };
      });
  }, [projects]);

  const currentMonthData = selectedMonth
    ? monthlyData.find(m => m.yearMonth === selectedMonth)
    : null;

  // 선택된 월의 정산 계산
  const filteredProjects = currentMonthData?.projects ?? [];

  const clientSettlements = useMemo(() => groupByClient(filteredProjects, clients), [filteredProjects, clients]);

  const partnerSettlements = useMemo(() => groupByPartner(filteredProjects, partners), [filteredProjects, partners]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
      </div>
    );
  }

  // 월 선택 전 → 월별 목록 표시
  if (!selectedMonth) {
    return (
      <div className="space-y-8">
        <div>
          <Link
            href="/settlement"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4"
          >
            <ArrowLeft size={14} />
            이번 달 정산으로
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">월별 정산 내역</h1>
          <p className="text-gray-500 mt-2">월별로 정산 내역을 확인하세요</p>
        </div>

        {monthlyData.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-20 text-center">
            <Receipt className="mx-auto mb-3 text-gray-200" size={36} />
            <p className="font-medium text-gray-500">정산 내역이 없어요</p>
            <p className="text-xs text-gray-400 mt-1">프로젝트를 추가하면 표시됩니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {monthlyData.map(({ yearMonth, projects: mp, clientTotal, partnerTotal, managerTotal, margin }) => (
              <button
                key={yearMonth}
                onClick={() => setSelectedMonth(yearMonth)}
                className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-orange-200 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                      <Calendar size={18} className="text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{formatYearMonth(yearMonth)}</h3>
                      <p className="text-xs text-gray-400">{mp.length}개 프로젝트</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-gray-300 group-hover:text-orange-400 transition-colors" />
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[80px]">
                    <p className="text-xs text-gray-400 mb-0.5">클라이언트</p>
                    <p className="text-sm font-semibold text-gray-700">{(clientTotal / 10000).toFixed(0)}만원</p>
                  </div>
                  <div className="flex-1 min-w-[80px]">
                    <p className="text-xs text-gray-400 mb-0.5">파트너</p>
                    <p className="text-sm font-semibold text-gray-700">{(partnerTotal / 10000).toFixed(0)}만원</p>
                  </div>
                  <div className="flex-1 min-w-[80px]">
                    <p className="text-xs text-gray-400 mb-0.5">매니저</p>
                    <p className="text-sm font-semibold text-gray-700">{(managerTotal / 10000).toFixed(0)}만원</p>
                  </div>
                  <div className="flex-1 min-w-[80px]">
                    <p className="text-xs text-gray-400 mb-0.5">유보금</p>
                    <p className="text-sm font-semibold text-emerald-600">{(margin / 10000).toFixed(0)}만원</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 월 선택 후 → 상세 정산 표시
  const md = currentMonthData!;

  return (
    <div className="space-y-8">
      {/* 뒤로가기 + 헤더 */}
      <div>
        <button
          onClick={() => setSelectedMonth(null)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          월별 목록으로
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">{formatYearMonth(selectedMonth)} 정산</h1>
          <span className="text-sm text-gray-400">{md.projects.length}개 프로젝트</span>
        </div>
      </div>

      {/* 정산 흐름 요약 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[100px]">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
              <Briefcase size={11} className="text-orange-400" />클라이언트 수금
            </p>
            <p className="text-xl font-bold text-orange-600">{(md.clientTotal / 10000).toFixed(0)}<span className="text-sm font-medium text-orange-300 ml-0.5">만원</span></p>
          </div>
          <ArrowRight size={14} className="text-gray-200 flex-shrink-0" />
          <div className="flex-1 min-w-[100px]">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
              <Users size={11} className="text-orange-400" />파트너 지급
            </p>
            <p className="text-xl font-bold text-orange-600">{(md.partnerTotal / 10000).toFixed(0)}<span className="text-sm font-medium text-orange-300 ml-0.5">만원</span></p>
          </div>
          <ArrowRight size={14} className="text-gray-200 flex-shrink-0" />
          <div className="flex-1 min-w-[100px]">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
              <ClipboardCheck size={11} className="text-orange-400" />매니저 지급
            </p>
            <p className="text-xl font-bold text-orange-500">{(md.managerTotal / 10000).toFixed(0)}<span className="text-sm font-medium text-orange-300 ml-0.5">만원</span></p>
          </div>
          <ArrowRight size={14} className="text-gray-200 flex-shrink-0" />
          <div className="flex-1 min-w-[100px]">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
              <Wallet size={11} className="text-emerald-400" />유보금
            </p>
            <p className="text-xl font-bold text-emerald-600">{(md.margin / 10000).toFixed(0)}<span className="text-sm font-medium text-emerald-300 ml-0.5">만원</span></p>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-200 inline-flex gap-2">
        {([
          { key: 'client'  as const, icon: Briefcase,     label: '클라이언트 정산' },
          { key: 'partner' as const, icon: Users,          label: '파트너 정산' },
          { key: 'manager' as const, icon: ClipboardCheck, label: '매니저 정산' },
        ]).map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => switchTab(key)} className="relative px-6 py-3 rounded-xl font-semibold">
            {activeTab === key && (
              <motion.div
                layoutId="history-tab-pill"
                className="absolute inset-0 bg-orange-500 rounded-xl shadow-lg shadow-orange-500/30"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <div className={`relative flex items-center gap-2 transition-colors duration-200 ${activeTab === key ? 'text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              <Icon size={18} />
              <span>{label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div style={{ overflowX: 'clip' }}>
        <AnimatePresence mode="wait" custom={tabDirection}>
          <motion.div
            key={activeTab}
            custom={tabDirection}
            variants={{
              enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit:  (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          >

          {/* 클라이언트 정산 */}
          {activeTab === 'client' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-orange-500" />
                  <h2 className="font-semibold text-gray-900">클라이언트별 정산 내역</h2>
                </div>
                {clientSettlements.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-bold">{clientSettlements.length}개</span>
                )}
              </div>

              {clientSettlements.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <Receipt className="mx-auto mb-3 text-gray-200" size={36} />
                  <p className="font-medium text-gray-500">이 달의 클라이언트 정산 내역이 없어요</p>
                </div>
              ) : (
                <>
                  {clientSettlements.map(({ clientName, clientInfo, projects: cp, totalAmount }) => (
                    <div key={clientName} className="divide-y divide-gray-50">
                      <button
                        onClick={() => toggleGroup(`c-${clientName}`)}
                        className="w-full px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${isGroupOpen(`c-${clientName}`) ? '' : '-rotate-90'}`} />
                          <span className="text-sm font-semibold text-gray-800">{clientName}</span>
                          {clientInfo?.company && <span className="text-xs text-gray-400">{clientInfo.company}</span>}
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-400">{cp.length}건</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{(totalAmount / 10000).toFixed(0)}만원</span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isGroupOpen(`c-${clientName}`) && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                            {cp.map(project => {
                              const sc = statusConfig[project.status] ?? statusConfig.planning;
                              return (
                                <div key={project.id} className="pl-10 pr-5 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between border-t border-gray-50">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                                    <span className="text-sm text-gray-600 truncate">{project.title}</span>
                                    <span className="text-xs text-gray-400 flex-shrink-0">{sc.label}</span>
                                  </div>
                                  <span className="text-sm text-gray-700 ml-4 flex-shrink-0">{(project.budget.totalAmount / 10000).toFixed(0)}만원</span>
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                  <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-gray-500">총 수금 예정</span>
                    <span className="text-sm font-semibold text-gray-800">{(md.clientTotal / 10000).toFixed(0)}만원</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 파트너 정산 */}
          {activeTab === 'partner' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-orange-500" />
                  <h2 className="font-semibold text-gray-900">파트너별 정산 내역</h2>
                </div>
                {partnerSettlements.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-bold">{partnerSettlements.length}명</span>
                )}
              </div>

              {partnerSettlements.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <Receipt className="mx-auto mb-3 text-gray-200" size={36} />
                  <p className="font-medium text-gray-500">이 달의 파트너 정산 내역이 없어요</p>
                </div>
              ) : (
                <>
                  {partnerSettlements.map(({ partner, partnerProjects, totalAmount, projectCount }) => (
                    <div key={partner.id} className="divide-y divide-gray-50">
                      <button
                        onClick={() => toggleGroup(`p-${partner.id}`)}
                        className="w-full px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${isGroupOpen(`p-${partner.id}`) ? '' : '-rotate-90'}`} />
                          <span className="text-sm font-semibold text-gray-800">{partner.name}</span>
                          {partner.email && <span className="text-xs text-gray-400">{partner.email}</span>}
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-400">{projectCount}건</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{(totalAmount / 10000).toFixed(0)}만원</span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isGroupOpen(`p-${partner.id}`) && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                            {partnerProjects.map(project => {
                              const sc = statusConfig[project.status] ?? statusConfig.planning;
                              return (
                                <div key={project.id} className="pl-10 pr-5 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between border-t border-gray-50">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                                    <span className="text-sm text-gray-600 truncate">{project.title}</span>
                                    <span className="text-xs text-gray-400 flex-shrink-0">{project.client}</span>
                                  </div>
                                  <span className="text-sm text-gray-700 ml-4 flex-shrink-0">{(project.budget.partnerPayment / 10000).toFixed(0)}만원</span>
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                  <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-500">총 지급 예정</span>
                    <span className="text-base font-bold text-orange-600">{(md.partnerTotal / 10000).toFixed(0)}만원</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 매니저 정산 */}
          {activeTab === 'manager' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardCheck size={16} className="text-orange-500" />
                  <h2 className="font-semibold text-gray-900">프로젝트별 매니징 비용</h2>
                </div>
              </div>

              {filteredProjects.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <Receipt className="mx-auto mb-3 text-gray-200" size={36} />
                  <p className="font-medium text-gray-500">이 달의 매니저 정산 내역이 없어요</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[380px]">
                    <div className="px-5 py-2.5 bg-gray-50 grid grid-cols-[1fr_72px_84px_60px] gap-3 text-xs font-semibold text-gray-400 border-b border-gray-100">
                      <span>프로젝트</span>
                      <span className="text-right">총 매출</span>
                      <span className="text-right">매니징 비용</span>
                      <span className="text-right">마진율</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {filteredProjects.map(project => {
                        const sc = statusConfig[project.status] ?? statusConfig.planning;
                        return (
                          <div key={project.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors grid grid-cols-[1fr_72px_84px_60px] gap-3 items-center">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{project.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{project.client}</p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 text-right">{(project.budget.totalAmount / 10000).toFixed(0)}만</p>
                            <p className="text-sm font-semibold text-orange-500 text-right">{(project.budget.managementFee / 10000).toFixed(0)}만원</p>
                            <p className="text-sm font-semibold text-emerald-600 text-right">{project.budget.marginRate}%</p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-5 py-4 border-t border-gray-100 grid grid-cols-[1fr_72px_84px_60px] gap-3 items-center">
                      <span className="text-sm font-semibold text-gray-500">총 매니징 비용</span>
                      <span className="text-sm text-gray-400 text-right">{(md.clientTotal / 10000).toFixed(0)}만</span>
                      <span className="text-base font-bold text-orange-500 text-right">{(md.managerTotal / 10000).toFixed(0)}만원</span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
