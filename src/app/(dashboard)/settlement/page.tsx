'use client';

import { useState, useEffect } from 'react';
import { Users, Receipt, FolderOpen, Briefcase, TrendingUp, ClipboardCheck, Wallet, ArrowRight, ChevronDown } from 'lucide-react';
import { Project, Partner, Client } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { getProjects, getPartners, getClients } from '@/lib/supabase/db';

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  planning:    { label: '시작 전', dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-600' },
  in_progress: { label: '진행 중', dot: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700' },
  completed:   { label: '종료',   dot: 'bg-gray-300',   badge: 'bg-gray-100 text-gray-500' },
};

export default function SettlementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'client' | 'partner' | 'manager'>('client');
  const [tabDirection, setTabDirection] = useState(1);
  const [openClients, setOpenClients] = useState<Record<string, boolean>>({});
  const toggleClient = (name: string) => setOpenClients(prev => ({ ...prev, [name]: !prev[name] }));
  const isClientOpen = (name: string) => openClients[name] !== false; // 기본 열림

  const [openPartners, setOpenPartners] = useState<Record<string, boolean>>({});
  const togglePartner = (id: string) => setOpenPartners(prev => ({ ...prev, [id]: !prev[id] }));
  const isPartnerOpen = (id: string) => openPartners[id] !== false; // 기본 열림

  const TAB_ORDER = ['client', 'partner', 'manager'] as const;
  const switchTab = (tab: 'client' | 'partner' | 'manager') => {
    setTabDirection(TAB_ORDER.indexOf(tab) > TAB_ORDER.indexOf(activeTab) ? 1 : -1);
    setActiveTab(tab);
  };

  useEffect(() => {
    Promise.all([getProjects(), getPartners(), getClients()]).then(
      ([projectsData, partnersData, clientsData]) => {
        setProjects(projectsData);
        setPartners(partnersData);
        setClients(clientsData);
        setLoading(false);
      }
    );
  }, []);

  // 클라이언트 정산
  const clientSettlements = (() => {
    const grouped: Record<string, { clientName: string; clientInfo?: Client; projects: Project[]; totalAmount: number }> = {};
    projects.forEach(p => {
      if (!p.client) return;
      if (!grouped[p.client]) {
        grouped[p.client] = { clientName: p.client, clientInfo: clients.find(c => c.name === p.client), projects: [], totalAmount: 0 };
      }
      grouped[p.client].projects.push(p);
      grouped[p.client].totalAmount += p.budget.totalAmount;
    });
    return Object.values(grouped);
  })();
  const clientGrandTotal = clientSettlements.reduce((s, cs) => s + cs.totalAmount, 0);

  // 파트너 정산
  const partnerSettlements = partners.map(partner => {
    const partnerProjects = projects.filter(p => p.partnerIds?.includes(partner.id) || p.partnerId === partner.id);
    const totalAmount = partnerProjects.reduce((s, p) => s + p.budget.partnerPayment, 0);
    return { partner, partnerProjects, totalAmount, projectCount: partnerProjects.length };
  }).filter(ps => ps.projectCount > 0);
  const partnerGrandTotal = partnerSettlements.reduce((s, ps) => s + ps.totalAmount, 0);

  // 매니저 정산
  const managerTotal = projects.reduce((s, p) => s + p.budget.managementFee, 0);
  const avgMarginRate = projects.length > 0
    ? (projects.reduce((s, p) => s + p.budget.marginRate, 0) / projects.length).toFixed(1)
    : '0';
  const margin = clientGrandTotal - partnerGrandTotal - managerTotal;

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">정산</h1>
        <p className="text-gray-500 mt-2">클라이언트 수금 후 파트너와 매니저에게 지급하세요</p>
      </div>

      {/* 정산 흐름 요약 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[100px]">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
              <Briefcase size={11} className="text-blue-400" />클라이언트 수금
            </p>
            <p className="text-xl font-bold text-blue-600">{(clientGrandTotal / 10000).toFixed(0)}<span className="text-sm font-medium text-blue-300 ml-0.5">만원</span></p>
          </div>
          <ArrowRight size={14} className="text-gray-200 flex-shrink-0" />
          <div className="flex-1 min-w-[100px]">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
              <Users size={11} className="text-purple-400" />파트너 지급
            </p>
            <p className="text-xl font-bold text-purple-600">{(partnerGrandTotal / 10000).toFixed(0)}<span className="text-sm font-medium text-purple-300 ml-0.5">만원</span></p>
          </div>
          <ArrowRight size={14} className="text-gray-200 flex-shrink-0" />
          <div className="flex-1 min-w-[100px]">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
              <ClipboardCheck size={11} className="text-orange-400" />매니저 지급
            </p>
            <p className="text-xl font-bold text-orange-500">{(managerTotal / 10000).toFixed(0)}<span className="text-sm font-medium text-orange-300 ml-0.5">만원</span></p>
          </div>
          <ArrowRight size={14} className="text-gray-200 flex-shrink-0" />
          <div className="flex-1 min-w-[100px]">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
              <Wallet size={11} className="text-emerald-400" />유보금
            </p>
            <p className="text-xl font-bold text-emerald-600">{(margin / 10000).toFixed(0)}<span className="text-sm font-medium text-emerald-300 ml-0.5">만원</span></p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

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
                layoutId="settlement-tab-pill"
                className="absolute inset-0 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/30"
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
                  <Briefcase size={16} className="text-blue-500" />
                  <h2 className="font-semibold text-gray-900">클라이언트별 정산 내역</h2>
                </div>
                {clientSettlements.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-bold">{clientSettlements.length}개</span>
                )}
              </div>

              {clientSettlements.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <Receipt className="mx-auto mb-3 text-gray-200" size={36} />
                  <p className="font-medium text-gray-500">정산 내역이 없어요</p>
                  <p className="text-xs mt-1">프로젝트를 추가하면 표시됩니다</p>
                </div>
              ) : (
                <>
                  {clientSettlements.map(({ clientName, clientInfo, projects: cp, totalAmount }) => (
                    <div key={clientName} className="divide-y divide-gray-50">
                      {/* 클라이언트 그룹 헤더 */}
                      <button
                        onClick={() => toggleClient(clientName)}
                        className="w-full px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <ChevronDown
                            size={14}
                            className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${isClientOpen(clientName) ? '' : '-rotate-90'}`}
                          />
                          <span className="text-sm font-semibold text-gray-800">{clientName}</span>
                          {clientInfo?.company && <span className="text-xs text-gray-400">{clientInfo.company}</span>}
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-400">{cp.length}건</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{(totalAmount / 10000).toFixed(0)}만원</span>
                      </button>
                      {/* 프로젝트 서브 행 */}
                      <AnimatePresence initial={false}>
                        {isClientOpen(clientName) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                            style={{ overflow: 'hidden' }}
                          >
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
                    <span className="text-sm font-semibold text-gray-800">{(clientGrandTotal / 10000).toFixed(0)}만원</span>
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
                  <Users size={16} className="text-purple-500" />
                  <h2 className="font-semibold text-gray-900">파트너별 정산 내역</h2>
                </div>
                {partnerSettlements.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 font-bold">{partnerSettlements.length}명</span>
                )}
              </div>

              {partnerSettlements.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <Receipt className="mx-auto mb-3 text-gray-200" size={36} />
                  <p className="font-medium text-gray-500">정산 내역이 없어요</p>
                  <p className="text-xs mt-1">프로젝트에 파트너를 연결하면 표시됩니다</p>
                </div>
              ) : (
                <>
                  {partnerSettlements.map(({ partner, partnerProjects, totalAmount, projectCount }) => (
                    <div key={partner.id} className="divide-y divide-gray-50">
                      {/* 파트너 그룹 헤더 */}
                      <button
                        onClick={() => togglePartner(partner.id)}
                        className="w-full px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <ChevronDown
                            size={14}
                            className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${isPartnerOpen(partner.id) ? '' : '-rotate-90'}`}
                          />
                          <span className="text-sm font-semibold text-gray-800">{partner.name}</span>
                          {partner.email && <span className="text-xs text-gray-400">{partner.email}</span>}
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-400">{projectCount}건</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{(totalAmount / 10000).toFixed(0)}만원</span>
                      </button>
                      {/* 프로젝트 서브 행 */}
                      <AnimatePresence initial={false}>
                        {isPartnerOpen(partner.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                            style={{ overflow: 'hidden' }}
                          >
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
                    <span className="text-base font-bold text-purple-600">{(partnerGrandTotal / 10000).toFixed(0)}만원</span>
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
                <span className="text-xs text-gray-400">평균 마진율 {avgMarginRate}%</span>
              </div>

              {projects.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  <Receipt className="mx-auto mb-3 text-gray-200" size={36} />
                  <p className="font-medium text-gray-500">정산 내역이 없어요</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[380px]">
                  {/* 컬럼 헤더 */}
                  <div className="px-5 py-2.5 bg-gray-50 grid grid-cols-[1fr_72px_84px_60px] gap-3 text-xs font-semibold text-gray-400 border-b border-gray-100">
                    <span>프로젝트</span>
                    <span className="text-right">총 매출</span>
                    <span className="text-right">매니징 비용</span>
                    <span className="text-right">마진율</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {projects.map(project => {
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
                    <span className="text-sm text-gray-400 text-right">{(clientGrandTotal / 10000).toFixed(0)}만</span>
                    <span className="text-base font-bold text-orange-500 text-right">{(managerTotal / 10000).toFixed(0)}만원</span>
                    <span className="text-sm font-semibold text-emerald-600 text-right">{avgMarginRate}%</span>
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
