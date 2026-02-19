'use client';

import { useState, useEffect } from 'react';
import { Users, FolderOpen, CheckCircle, Clock, TrendingUp, Wallet, Calendar, X, ChevronDown, Sparkles, AlertTriangle, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Project, Episode, Partner, Client, WorkContentType } from '@/types';
import { EmptyReviews, EmptyDeadlines } from '@/components/EmptyState';
import { FloatingLabelInput, FloatingLabelTextarea } from '@/components/FloatingLabelInput';
import ProjectWizardModal from '@/components/ProjectWizardModal';
import { getProjects, getPartners, getClients, insertClient, insertPartner, insertProject, getAllEpisodes, upsertEpisodes } from '@/lib/supabase/db';
import { useToast } from '@/contexts/ToastContext';

export default function DashboardPage() {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // 모든 에피소드 데이터 (프로젝트별로 저장되어 있음)
  const [allEpisodes, setAllEpisodes] = useState<(Episode & { projectId: string })[]>([]);

  // 위자드 모달 상태
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // 탭 상태
  const [activeTab, setActiveTab] = useState<'content' | 'marketing' | 'finance'>('content');
  const [tabDirection, setTabDirection] = useState(1);
  const TAB_ORDER = ['content', 'marketing', 'finance'] as const;
  const switchTab = (tab: 'content' | 'marketing' | 'finance') => {
    setTabDirection(TAB_ORDER.indexOf(tab) > TAB_ORDER.indexOf(activeTab) ? 1 : -1);
    setActiveTab(tab);
  };

  // 모달 상태
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);

  // 성공 상태
  const [isClientSuccess, setIsClientSuccess] = useState(false);
  const [isPartnerSuccess, setIsPartnerSuccess] = useState(false);
  const [isProjectSuccess, setIsProjectSuccess] = useState(false);
  const [lastAddedClientName, setLastAddedClientName] = useState('');

  // 드롭다운 상태
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState(false);
  const [isPartnerRoleDropdownOpen, setIsPartnerRoleDropdownOpen] = useState(false);
  const [isPartnerStatusDropdownOpen, setIsPartnerStatusDropdownOpen] = useState(false);
  const [isClientStatusDropdownOpen, setIsClientStatusDropdownOpen] = useState(false);
  const [isGenerationDropdownOpen, setIsGenerationDropdownOpen] = useState(false);

  // 폼 데이터
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    notes: '',
    status: 'active',
  });

  const [newPartner, setNewPartner] = useState<Partial<Partner>>({
    name: '',
    email: '',
    phone: '',
    partnerType: 'freelancer',
    role: 'partner',
    status: 'active',
    generation: 1,
  });

  const [newProject, setNewProject] = useState<Partial<Project>>({
    title: '',
    description: '',
    client: '',
    partnerId: '',
    status: 'planning',
    budget: {
      totalAmount: 0,
      partnerPayment: 0,
      managementFee: 0,
      marginRate: 0,
    },
    tags: [],
  });

  useEffect(() => {
    const loadData = async () => {
      const [projectsData, partnersData, clientsData, episodesData] = await Promise.all([
        getProjects(),
        getPartners(),
        getClients(),
        getAllEpisodes(),
      ]);
      setProjects(projectsData);
      setPartners(partnersData);
      setClients(clientsData);
      setAllEpisodes(episodesData);
      setLoading(false);
    };
    loadData();
  }, []);

  // 클라이언트 추가 핸들러
  const handleAddClient = async () => {
    if (!newClient.name) {
      alert('클라이언트 이름을 입력해주세요.');
      return;
    }

    const saved = await insertClient({
      name: newClient.name,
      contactPerson: newClient.contactPerson,
      email: newClient.email,
      phone: newClient.phone,
      company: newClient.company,
      address: newClient.address,
      status: newClient.status || 'active',
      notes: newClient.notes,
    });

    if (saved) {
      setClients(prev => [saved, ...prev]);
      setLastAddedClientName(saved.name);
      setIsClientSuccess(true);
    } else {
      toast.error('클라이언트 추가에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 클라이언트 추가 후 프로젝트 추가로 이동
  const handleAddProjectFromClient = () => {
    // 클라이언트 모달 닫기
    setIsAddClientModalOpen(false);
    setIsClientSuccess(false);
    setNewClient({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      notes: '',
      status: 'active',
    });

    // 프로젝트 모달 열기 (클라이언트 자동 선택)
    setNewProject({
      ...newProject,
      client: lastAddedClientName,
    });
    setIsAddProjectModalOpen(true);
  };

  // 클라이언트 모달만 닫기
  const handleCloseClientModal = () => {
    setIsAddClientModalOpen(false);
    setIsClientSuccess(false);
    setNewClient({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      notes: '',
      status: 'active',
    });
  };

  // 파트너 추가 핸들러
  const handleAddPartner = async () => {
    if (!newPartner.name || !newPartner.email) {
      alert('파트너 이름과 이메일을 입력해주세요.');
      return;
    }

    const saved = await insertPartner({
      name: newPartner.name,
      email: newPartner.email,
      phone: newPartner.phone,
      company: newPartner.company,
      partnerType: newPartner.partnerType || 'freelancer',
      generation: newPartner.generation ?? 1,
      role: newPartner.role || 'partner',
      status: newPartner.status || 'active',
    });

    if (saved) {
      setPartners(prev => [saved, ...prev]);
      setIsPartnerSuccess(true);
      setTimeout(() => {
        setIsAddPartnerModalOpen(false);
        setIsPartnerSuccess(false);
        setNewPartner({ name: '', email: '', phone: '', company: '', role: 'partner', status: 'active' });
      }, 1500);
    } else {
      toast.error('파트너 추가에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 프로젝트 추가 핸들러
  const handleAddProject = async () => {
    if (!newProject.title || !newProject.client || !newProject.partnerId) {
      alert('프로젝트 이름, 클라이언트, 담당자를 입력해주세요.');
      return;
    }

    const saved = await insertProject({
      title: newProject.title!,
      description: newProject.description || '',
      client: newProject.client!,
      partnerId: newProject.partnerId!,
      partnerIds: newProject.partnerId ? [newProject.partnerId] : [],
      managerIds: [],
      status: newProject.status || 'planning',
      budget: newProject.budget || { totalAmount: 0, partnerPayment: 0, managementFee: 0, marginRate: 0 },
      tags: newProject.tags || [],
      workContent: [],
    });

    if (saved) {
      setProjects(prev => [saved, ...prev]);
      setIsProjectSuccess(true);
      setTimeout(() => {
        setIsAddProjectModalOpen(false);
        setIsProjectSuccess(false);
        setNewProject({
          title: '', description: '', client: '', partnerId: '', status: 'planning',
          budget: { totalAmount: 0, partnerPayment: 0, managementFee: 0, marginRate: 0 },
          tags: [],
        });
      }, 1500);
    } else {
      toast.error('프로젝트 추가에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 현재 날짜
  const now = new Date();

  // 이번 달 시작일과 종료일
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // 이번 달 프로젝트 필터링 (생성일 기준)
  const thisMonthProjects = projects.filter(p => {
    if (!p.completedAt) return false;
    const completedDate = new Date(p.completedAt);
    return completedDate >= thisMonthStart && completedDate <= thisMonthEnd;
  });

  // 이번 달 에피소드 필터링 (완료일 기준)
  const thisMonthCompletedEpisodes = allEpisodes.filter(ep => {
    if (ep.status !== 'completed' || !ep.completedAt) return false;
    const completedDate = new Date(ep.completedAt);
    return completedDate >= thisMonthStart && completedDate <= thisMonthEnd;
  });

  // 통계 계산
  const stats = {
    total: projects.length,
    completed: projects.filter(p => p.status === 'completed').length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    planning: projects.filter(p => p.status === 'planning').length,
  };

  // 이번 달 통계
  const thisMonthStats = {
    newProjects: thisMonthProjects.length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    completedEpisodes: thisMonthCompletedEpisodes.length,
    totalEpisodes: allEpisodes.filter(ep => ep.status === 'in_progress' || ep.status === 'waiting').length,
  };

  // 이번 달 비용 통계 계산
  const thisMonthRevenue = thisMonthProjects.reduce((sum, p) => sum + p.budget.totalAmount, 0);
  const thisMonthPartnerPayment = thisMonthProjects.reduce((sum, p) => sum + p.budget.partnerPayment, 0);
  const thisMonthManagementFee = thisMonthProjects.reduce((sum, p) => sum + p.budget.managementFee, 0);
  const thisMonthMargin = thisMonthRevenue - thisMonthPartnerPayment - thisMonthManagementFee;
  const thisMonthAvgMarginRate = thisMonthProjects.length > 0
    ? (thisMonthProjects.reduce((sum, p) => sum + p.budget.marginRate, 0) / thisMonthProjects.length).toFixed(1)
    : 0;

  // 다가오는 마감일 (7일 이내)
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = allEpisodes
    .filter(ep => {
      if (!ep.dueDate) return false;
      const dueDate = new Date(ep.dueDate);
      return dueDate >= now && dueDate <= sevenDaysLater && ep.status !== 'completed';
    })
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  // 검수 대기 중인 에피소드
  const reviewingEpisodes = allEpisodes.filter(ep => ep.status === 'review').slice(0, 5);

  // 파트너별 작업 현황
  const partnerWorkload = partners.map(partner => {
    const partnerEpisodes = allEpisodes.filter(ep => ep.assignee === partner.id);
    const inProgress = partnerEpisodes.filter(ep => ep.status === 'in_progress').length;
    const waiting = partnerEpisodes.filter(ep => ep.status === 'waiting').length;
    const completed = partnerEpisodes.filter(ep => ep.status === 'completed').length;

    return {
      partner,
      inProgress,
      waiting,
      completed,
      total: partnerEpisodes.length,
    };
  }).filter(pw => pw.total > 0); // 작업이 있는 파트너만

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-500 mt-2">콘텐츠 제작, 마케팅, 재무 현황을 한눈에 확인하세요</p>
        </div>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-5 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/30 font-semibold flex items-center gap-2"
        >
          <Sparkles size={18} />
          새 프로젝트 시작
        </button>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-200 inline-flex gap-2">
        {([
          { key: 'content' as const, icon: FolderOpen, label: '콘텐츠 제작' },
          { key: 'marketing' as const, icon: Megaphone, label: '마케팅' },
          { key: 'finance' as const, icon: Wallet, label: '재무' },
        ]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className="relative px-6 py-3 rounded-xl font-semibold"
          >
            {activeTab === key && (
              <motion.div
                layoutId="dashboard-tab-pill"
                className="absolute inset-0 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/30"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <div className={`relative flex items-center gap-2 transition-colors duration-200 ${
              activeTab === key ? 'text-white' : 'text-gray-600 hover:text-gray-900'
            }`}>
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
            exit: (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        >

        {/* 콘텐츠 제작 탭 */}
        {activeTab === 'content' && (
        <div className="space-y-6">
          {/* 핵심 지표 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-50 rounded-xl"><FolderOpen size={16} className="text-blue-500" /></div>
                <span className="text-sm text-gray-500 font-medium">진행 중</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.inProgress}</p>
              <p className="text-xs text-gray-400 mt-1">전체 {stats.total}개 프로젝트</p>
            </div>

            <div className={`rounded-2xl shadow-sm border p-5 ${upcomingDeadlines.length > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-xl ${upcomingDeadlines.length > 0 ? 'bg-red-100' : 'bg-orange-50'}`}>
                  <AlertTriangle size={16} className={upcomingDeadlines.length > 0 ? 'text-red-500' : 'text-orange-400'} />
                </div>
                <span className="text-sm text-gray-500 font-medium">마감 D-7</span>
              </div>
              <p className={`text-3xl font-bold ${upcomingDeadlines.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>{upcomingDeadlines.length}</p>
              <p className="text-xs text-gray-400 mt-1">7일 이내 마감</p>
            </div>

            <div className={`rounded-2xl shadow-sm border p-5 ${reviewingEpisodes.length > 0 ? 'bg-purple-50 border-purple-100' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-xl ${reviewingEpisodes.length > 0 ? 'bg-purple-100' : 'bg-purple-50'}`}>
                  <CheckCircle size={16} className="text-purple-500" />
                </div>
                <span className="text-sm text-gray-500 font-medium">검수 대기</span>
              </div>
              <p className={`text-3xl font-bold ${reviewingEpisodes.length > 0 ? 'text-purple-600' : 'text-gray-900'}`}>{reviewingEpisodes.length}</p>
              <p className="text-xs text-gray-400 mt-1">검수 필요</p>
            </div>
          </div>

          {/* 검수 대기 & 마감 임박 & 파트너 현황 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 검수 대기 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-purple-500" />
                  <h2 className="font-semibold text-gray-900">검수 대기 중</h2>
                </div>
                {reviewingEpisodes.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 font-bold">{reviewingEpisodes.length}</span>
                )}
              </div>
              <div className="divide-y divide-gray-50">
                {reviewingEpisodes.length === 0 ? (
                  <EmptyReviews />
                ) : (
                  reviewingEpisodes.map((episode) => {
                    const project = projects.find(p => p.id === episode.projectId);
                    const partner = partners.find(p => p.id === episode.assignee);
                    return (
                      <div key={episode.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                        <p className="text-sm font-medium text-gray-900 truncate">{episode.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {project && <p className="text-xs text-gray-400 truncate">{project.title}</p>}
                          {partner && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <div className="w-4 h-4 bg-purple-400 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                                {partner.name.charAt(0)}
                              </div>
                              <span className="text-xs text-gray-400">{partner.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 다가오는 마감일 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-orange-500" />
                  <h2 className="font-semibold text-gray-900">다가오는 마감일</h2>
                </div>
                {upcomingDeadlines.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-bold">{upcomingDeadlines.length}</span>
                )}
              </div>
              <div className="divide-y divide-gray-50">
                {upcomingDeadlines.length === 0 ? (
                  <EmptyDeadlines />
                ) : (
                  upcomingDeadlines.map((episode) => {
                    const project = projects.find(p => p.id === episode.projectId);
                    const daysUntilDue = Math.ceil((new Date(episode.dueDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const isUrgent = daysUntilDue <= 2;
                    return (
                      <div key={episode.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{episode.title}</p>
                          {project && <p className="text-xs text-gray-400 mt-0.5 truncate">{project.title}</p>}
                        </div>
                        <span className={`flex-shrink-0 text-xs px-2 py-1 rounded-lg font-semibold ${
                          isUrgent ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {daysUntilDue === 0 ? '오늘' : daysUntilDue === 1 ? '내일' : `${daysUntilDue}일`}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 파트너별 작업 현황 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Users size={16} className="text-blue-500" />
                <h2 className="font-semibold text-gray-900">파트너 현황</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {partnerWorkload.length === 0 ? (
                  <div className="px-5 py-10 text-center text-gray-400 text-sm">
                    <Users className="mx-auto mb-2 text-gray-200" size={28} />
                    작업 중인 파트너가 없습니다
                  </div>
                ) : (
                  partnerWorkload.map(({ partner, inProgress, waiting, completed, total }) => (
                    <div key={partner.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {partner.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{partner.name}</p>
                        </div>
                        <span className="text-xs text-gray-400">{total}개</span>
                      </div>
                      <div className="flex gap-1.5 ml-10">
                        {inProgress > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">진행 {inProgress}</span>}
                        {waiting > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">대기 {waiting}</span>}
                        {completed > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">완료 {completed}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 진행 중인 프로젝트 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen size={16} className="text-blue-500" />
                <h2 className="font-semibold text-gray-900">진행 중인 프로젝트</h2>
              </div>
              <Link href="/projects" className="text-sm text-blue-500 hover:text-blue-600 font-medium transition-colors">
                전체 보기 →
              </Link>
            </div>
            {projects.filter(p => p.status === 'in_progress' || p.status === 'planning').length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <FolderOpen className="mx-auto mb-3 text-gray-200" size={36} />
                <p className="font-medium text-gray-500 mb-1">진행 중인 프로젝트가 없어요</p>
                <p className="text-xs mb-4">새 프로젝트를 시작해보세요</p>
                <button
                  onClick={() => setIsWizardOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  <Sparkles size={14} /> 프로젝트 시작
                </button>
              </div>
            ) : (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {projects.filter(p => p.status === 'in_progress' || p.status === 'planning').slice(0, 6).map((project) => {
                  const partner = partners.find(p => p.id === project.partnerId);
                  const projectEpisodes = allEpisodes.filter(ep => ep.projectId === project.id);
                  const totalEpisodes = projectEpisodes.length;
                  const completedEpisodes = projectEpisodes.filter(ep => ep.status === 'completed').length;
                  const progressRate = totalEpisodes > 0 ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0;
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="group block bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-xl p-4 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs text-gray-400 truncate">{project.client}</span>
                        <StatusBadge status={project.status} />
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 text-sm leading-snug line-clamp-1 transition-colors mb-3">
                        {project.title}
                      </h3>
                      {totalEpisodes > 0 && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>진행률</span>
                            <span>{completedEpisodes}/{totalEpisodes}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${progressRate}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {partner && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                            {partner.name.charAt(0)}
                          </div>
                          <span className="text-xs text-gray-400">{partner.name}</span>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        )}

        {/* 마케팅 탭 */}
        {activeTab === 'marketing' && (
        <div className="py-24 text-center text-gray-400">
          <Megaphone className="mx-auto mb-3 text-gray-200" size={44} />
          <p className="font-medium text-gray-500">마케팅 기능 준비 중</p>
          <p className="text-xs mt-1 text-gray-400">곧 업데이트될 예정이에요</p>
        </div>
        )}

        {/* 재무 탭 */}
        {activeTab === 'finance' && (
        <div className="space-y-6">
          {/* 재무 KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-green-50 rounded-xl"><TrendingUp size={16} className="text-green-500" /></div>
                <span className="text-sm text-gray-500 font-medium">총 매출</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{(thisMonthRevenue / 10000).toFixed(0)}<span className="text-base font-medium text-gray-400 ml-0.5">만</span></p>
              <p className="text-xs text-gray-400 mt-1">신규 {thisMonthProjects.length}건</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-50 rounded-xl"><Users size={16} className="text-purple-500" /></div>
                <span className="text-sm text-gray-500 font-medium">파트너 지급</span>
              </div>
              <p className="text-3xl font-bold text-purple-600">{(thisMonthPartnerPayment / 10000).toFixed(0)}<span className="text-base font-medium text-purple-300 ml-0.5">만</span></p>
              <p className="text-xs text-gray-400 mt-1">&nbsp;</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-orange-50 rounded-xl"><Clock size={16} className="text-orange-500" /></div>
                <span className="text-sm text-gray-500 font-medium">매니징 비용</span>
              </div>
              <p className="text-3xl font-bold text-orange-500">{(thisMonthManagementFee / 10000).toFixed(0)}<span className="text-base font-medium text-orange-300 ml-0.5">만</span></p>
              <p className="text-xs text-gray-400 mt-1">&nbsp;</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-emerald-50 rounded-xl"><Wallet size={16} className="text-emerald-500" /></div>
                <span className="text-sm text-gray-500 font-medium">유보금</span>
              </div>
              <p className="text-3xl font-bold text-emerald-600">{(thisMonthMargin / 10000).toFixed(0)}<span className="text-base font-medium text-emerald-300 ml-0.5">만</span></p>
              <p className="text-xs text-gray-400 mt-1">평균 마진율 {thisMonthAvgMarginRate}%</p>
            </div>
          </div>

          {/* 이번 달 프로젝트별 재무 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <FolderOpen size={16} className="text-blue-500" />
              <h2 className="font-semibold text-gray-900">이번 달 프로젝트 재무</h2>
            </div>
            {thisMonthProjects.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <Wallet className="mx-auto mb-3 text-gray-200" size={36} />
                <p className="font-medium text-gray-500">이번 달 등록된 프로젝트가 없어요</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {thisMonthProjects.map((project) => (
                  <div key={project.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{project.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{project.client}</p>
                      </div>
                      <div className="flex gap-6 text-right flex-shrink-0">
                        <div>
                          <p className="text-xs text-gray-400">매출</p>
                          <p className="text-sm font-semibold text-gray-900">{(project.budget.totalAmount / 10000).toFixed(0)}만</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">파트너</p>
                          <p className="text-sm font-semibold text-purple-600">{(project.budget.partnerPayment / 10000).toFixed(0)}만</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">유보금</p>
                          <p className="text-sm font-semibold text-emerald-600">{((project.budget.totalAmount - project.budget.partnerPayment - project.budget.managementFee) / 10000).toFixed(0)}만</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        </motion.div>
      </AnimatePresence>
      </div>

      {/* 프로젝트 마법사 모달 */}
      <ProjectWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={async (data) => {
          if (!data.project.title) { setIsWizardOpen(false); return; }

          let clientName = '';
          if (data.client?.isNew && data.client.name) {
            const saved = await insertClient({ name: data.client.name, contactPerson: data.client.contact, email: data.client.email, status: 'active' });
            clientName = saved?.name || data.client.name;
            if (saved) setClients(prev => [saved, ...prev]);
          } else if (data.client?.id) {
            clientName = clients.find(c => c.id === data.client!.id)?.name || '';
          }

          const savedProject = await insertProject({
            title: data.project.title,
            description: data.project.description || '',
            client: clientName,
            partnerId: data.project.partnerIds[0] || '',
            partnerIds: data.project.partnerIds,
            managerIds: [],
            category: data.project.category,
            status: 'planning',
            budget: { totalAmount: 0, partnerPayment: 0, managementFee: 0, marginRate: 0 },
            workContent: [],
            tags: data.project.category ? [data.project.category] : [],
          });

          if (!savedProject) { toast.error('프로젝트 생성에 실패했습니다.'); setIsWizardOpen(false); return; }
          setProjects(prev => [savedProject, ...prev]);

          if (data.episodes.shouldCreate && data.episodes.count) {
            const now = new Date().toISOString();
            const episodes: (Episode & { projectId: string })[] = Array.from({ length: data.episodes.count }, (_, i) => ({
              id: crypto.randomUUID(),
              projectId: savedProject.id,
              episodeNumber: i + 1,
              title: `${i + 1}회차`,
              workContent: [] as WorkContentType[],
              status: 'waiting' as const,
              assignee: '',
              manager: '',
              startDate: data.episodes.dates?.[i]?.startDate || '',
              endDate: data.episodes.dates?.[i]?.endDate || '',
              createdAt: now,
              updatedAt: now,
            }));
            const ok = await upsertEpisodes(episodes);
            if (ok) setAllEpisodes(prev => [...prev, ...episodes]);
          }

          setIsWizardOpen(false);
        }}
        clients={clients}
        partners={partners}
      />

      {/* 클라이언트 추가 모달 - Toss Style */}
      {isAddClientModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-in fade-in duration-200">
          <style jsx>{`
            @keyframes checkmark {
              0% {
                stroke-dashoffset: 100;
              }
              100% {
                stroke-dashoffset: 0;
              }
            }
            @keyframes circle-scale {
              0% {
                transform: scale(0);
                opacity: 0;
              }
              50% {
                transform: scale(1.1);
              }
              100% {
                transform: scale(1);
                opacity: 1;
              }
            }
            .checkmark-circle {
              animation: circle-scale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .checkmark-check {
              stroke-dasharray: 100;
              stroke-dashoffset: 100;
              animation: checkmark 0.5s 0.3s cubic-bezier(0.65, 0, 0.45, 1) forwards;
            }
          `}</style>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !isClientSuccess && setIsAddClientModalOpen(false)}
          />
          <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
            <div
              className="relative bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl max-w-2xl w-full animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {isClientSuccess ? (
                /* 성공 화면 */
                <div className="px-6 sm:px-8 py-12 flex flex-col items-center justify-center">
                  <div className="checkmark-circle w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mb-6">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <path
                        className="checkmark-check"
                        d="M14 24L20 30L34 16"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">클라이언트 추가 완료</h2>
                  <p className="text-gray-500 mb-8">새로운 클라이언트가 등록되었습니다</p>

                  {/* 프로젝트 추가 제안 */}
                  <div className="w-full max-w-md space-y-4">
                    <p className="text-center text-gray-700 font-medium">해당 클라이언트의 프로젝트도<br />추가하시겠어요?</p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleAddProjectFromClient}
                        className="flex-1 h-14 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-semibold text-base hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30"
                      >
                        프로젝트 추가
                      </button>
                      <button
                        onClick={handleCloseClientModal}
                        className="flex-1 h-14 bg-gray-100 text-gray-700 rounded-2xl font-semibold text-base hover:bg-gray-200 transition-all"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* 헤더 */}
                  <div className="px-6 sm:px-8 pt-8 pb-6">
                <button
                  onClick={() => setIsAddClientModalOpen(false)}
                  className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-gray-400" />
                </button>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">새 클라이언트를<br />추가할게요</h2>
                <p className="text-sm text-gray-500">클라이언트 정보를 입력해주세요</p>
              </div>

              {/* 폼 */}
              <div className="px-6 sm:px-8 pb-8 space-y-6">
                {/* 기본 정보 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    기본 정보
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FloatingLabelInput
                      label="클라이언트 이름"
                      required
                      type="text"
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    />
                    <FloatingLabelInput
                      label="담당자 이름"
                      type="text"
                      value={newClient.contactPerson}
                      onChange={(e) => setNewClient({ ...newClient, contactPerson: e.target.value })}
                    />
                  </div>
                </div>

                {/* 연락처 정보 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    연락처 정보
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FloatingLabelInput
                      label="이메일"
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    />
                    <FloatingLabelInput
                      label="전화번호"
                      type="tel"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    />
                  </div>
                </div>

                {/* 추가 정보 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    추가 정보
                  </h3>
                  <FloatingLabelInput
                    label="회사명"
                    type="text"
                    value={newClient.company}
                    onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                  />
                  <FloatingLabelInput
                    label="주소"
                    type="text"
                    value={newClient.address}
                    onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                  />
                  <FloatingLabelTextarea
                    label="메모"
                    value={newClient.notes}
                    onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              {/* 푸터 */}
              <div className="sticky bottom-0 bg-white px-6 sm:px-8 py-6 border-t border-gray-100 rounded-b-[28px]">
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsAddClientModalOpen(false)}
                    className="flex-1 h-14 text-gray-700 font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-all active:scale-[0.98]"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAddClient}
                    disabled={!newClient.name}
                    className="flex-1 h-14 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98] shadow-lg shadow-blue-500/30"
                  >
                    클라이언트 추가하기
                  </button>
                </div>
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 파트너 추가 모달 - Toss Style */}
      {isAddPartnerModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-in fade-in duration-200">
          <style jsx>{`
            @keyframes checkmark {
              0% {
                stroke-dashoffset: 100;
              }
              100% {
                stroke-dashoffset: 0;
              }
            }
            @keyframes circle-scale {
              0% {
                transform: scale(0);
                opacity: 0;
              }
              50% {
                transform: scale(1.1);
              }
              100% {
                transform: scale(1);
                opacity: 1;
              }
            }
            .checkmark-circle {
              animation: circle-scale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .checkmark-check {
              stroke-dasharray: 100;
              stroke-dashoffset: 100;
              animation: checkmark 0.5s 0.3s cubic-bezier(0.65, 0, 0.45, 1) forwards;
            }
          `}</style>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !isPartnerSuccess && setIsAddPartnerModalOpen(false)}
          />
          <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
            <div
              className="relative bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl max-w-lg w-full animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {isPartnerSuccess ? (
                /* 성공 화면 */
                <div className="px-6 sm:px-8 py-16 flex flex-col items-center justify-center">
                  <div className="checkmark-circle w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mb-6">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <path
                        className="checkmark-check"
                        d="M14 24L20 30L34 16"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">파트너 추가 완료</h2>
                  <p className="text-gray-500">새로운 파트너가 등록되었습니다</p>
                </div>
              ) : (
                <>
                  {/* 헤더 */}
                  <div className="px-6 sm:px-8 pt-8 pb-6">
                <button
                  onClick={() => setIsAddPartnerModalOpen(false)}
                  className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-gray-400" />
                </button>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">새 파트너를<br />추가할게요</h2>
                <p className="text-sm text-gray-500">파트너 정보를 입력해주세요</p>
              </div>

              {/* 폼 */}
              <div className="px-6 sm:px-8 pb-8 space-y-6">
                {/* 기본 정보 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    기본 정보
                  </h3>
                  <FloatingLabelInput
                    label="이름"
                    required
                    type="text"
                    value={newPartner.name}
                    onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                  />
                  <FloatingLabelInput
                    label="이메일"
                    required
                    type="email"
                    value={newPartner.email}
                    onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
                  />
                </div>

                {/* 연락처 정보 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    연락처 정보
                  </h3>
                  <FloatingLabelInput
                    label="전화번호"
                    type="tel"
                    value={newPartner.phone}
                    onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
                  />

                  {/* 파트너 유형 선택 - 토스 스타일 버튼 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">파트너 유형</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNewPartner({ ...newPartner, partnerType: 'freelancer' })}
                        className={`h-14 rounded-xl font-semibold transition-all ${
                          newPartner.partnerType === 'freelancer'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        프리랜서
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewPartner({ ...newPartner, partnerType: 'business' })}
                        className={`h-14 rounded-xl font-semibold transition-all ${
                          newPartner.partnerType === 'business'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        사업자
                      </button>
                    </div>
                  </div>

                  {/* 파트너 기수 선택 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      파트너 기수
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsGenerationDropdownOpen(!isGenerationDropdownOpen)}
                        className="w-full h-14 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex items-center justify-between hover:border-gray-300 transition-all"
                      >
                        <span className="text-gray-900 font-medium">{newPartner.generation}기</span>
                        <ChevronDown size={20} className="text-gray-400" />
                      </button>
                      {isGenerationDropdownOpen && (
                        <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                          {[1, 2, 3].map((gen) => (
                            <button
                              key={gen}
                              type="button"
                              onClick={() => {
                                setNewPartner({ ...newPartner, generation: gen });
                                setIsGenerationDropdownOpen(false);
                              }}
                              className="w-full px-4 py-3 hover:bg-blue-50 text-left transition-colors first:rounded-t-xl last:rounded-b-xl"
                            >
                              <span className="text-gray-900 font-medium">{gen}기</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 푸터 */}
              <div className="sticky bottom-0 bg-white px-6 sm:px-8 py-6 border-t border-gray-100 rounded-b-[28px]">
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsAddPartnerModalOpen(false)}
                    className="flex-1 h-14 text-gray-700 font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-all active:scale-[0.98]"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAddPartner}
                    disabled={!newPartner.name || !newPartner.email}
                    className="flex-1 h-14 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98] shadow-lg shadow-blue-500/30"
                  >
                    파트너 추가하기
                  </button>
                </div>
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 프로젝트 추가 모달 - Toss Style */}
      {isAddProjectModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-in fade-in duration-200">
          <style jsx>{`
            @keyframes checkmark {
              0% {
                stroke-dashoffset: 100;
              }
              100% {
                stroke-dashoffset: 0;
              }
            }
            @keyframes circle-scale {
              0% {
                transform: scale(0);
                opacity: 0;
              }
              50% {
                transform: scale(1.1);
              }
              100% {
                transform: scale(1);
                opacity: 1;
              }
            }
            .checkmark-circle {
              animation: circle-scale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .checkmark-check {
              stroke-dasharray: 100;
              stroke-dashoffset: 100;
              animation: checkmark 0.5s 0.3s cubic-bezier(0.65, 0, 0.45, 1) forwards;
            }
          `}</style>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !isProjectSuccess && setIsAddProjectModalOpen(false)}
          />
          <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
            <div
              className="relative bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {isProjectSuccess ? (
                /* 성공 화면 */
                <div className="px-6 sm:px-8 py-16 flex flex-col items-center justify-center">
                  <div className="checkmark-circle w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mb-6">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <path
                        className="checkmark-check"
                        d="M14 24L20 30L34 16"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">프로젝트 추가 완료</h2>
                  <p className="text-gray-500">새로운 프로젝트가 시작되었습니다</p>
                </div>
              ) : (
                <>
                  {/* 헤더 */}
                  <div className="sticky top-0 bg-white px-6 sm:px-8 pt-8 pb-6 rounded-t-[28px] z-10">
                <button
                  onClick={() => setIsAddProjectModalOpen(false)}
                  className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-gray-400" />
                </button>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">새 프로젝트를<br />시작할게요</h2>
                <p className="text-sm text-gray-500">프로젝트 정보를 입력해주세요</p>
              </div>

              {/* 폼 */}
              <div className="px-6 sm:px-8 pb-8 space-y-6">
                {/* 기본 정보 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    프로젝트 기본 정보
                  </h3>
                  <FloatingLabelInput
                    label="프로젝트 이름"
                    required
                    type="text"
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  />
                </div>

                {/* 담당자 선택 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    담당자 선택
                  </h3>

                  {/* 클라이언트 선택 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      클라이언트 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                        className="w-full h-14 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex items-center justify-between hover:border-gray-300 transition-all"
                      >
                        {newProject.client ? (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {newProject.client.charAt(0)}
                            </div>
                            <span className="text-gray-900 font-medium">{newProject.client}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">클라이언트를 선택해주세요</span>
                        )}
                        <ChevronDown size={20} className="text-gray-400" />
                      </button>
                      {isClientDropdownOpen && (
                        <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-auto">
                          {clients.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                              <p className="mb-2">등록된 클라이언트가 없습니다</p>
                              <button
                                onClick={() => {
                                  setIsClientDropdownOpen(false);
                                  setIsAddClientModalOpen(true);
                                }}
                                className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                              >
                                클라이언트 먼저 추가하기 →
                              </button>
                            </div>
                          ) : (
                            clients.map((client) => (
                              <button
                                key={client.id}
                                type="button"
                                onClick={() => {
                                  setNewProject({ ...newProject, client: client.name });
                                  setIsClientDropdownOpen(false);
                                }}
                                className="w-full px-4 py-3 hover:bg-blue-50 flex items-center gap-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl"
                              >
                                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                  {client.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-gray-900 font-medium">{client.name}</p>
                                  {client.company && <p className="text-xs text-gray-500">{client.company}</p>}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 파트너 선택 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      담당 파트너 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsPartnerDropdownOpen(!isPartnerDropdownOpen)}
                        className="w-full h-14 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex items-center justify-between hover:border-gray-300 transition-all"
                      >
                        {newProject.partnerId ? (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {partners.find(p => p.id === newProject.partnerId)?.name.charAt(0)}
                            </div>
                            <span className="text-gray-900 font-medium">
                              {partners.find(p => p.id === newProject.partnerId)?.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">파트너를 선택해주세요</span>
                        )}
                        <ChevronDown size={20} className="text-gray-400" />
                      </button>
                      {isPartnerDropdownOpen && (
                        <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-auto">
                          {partners.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                              <p className="mb-2">등록된 파트너가 없습니다</p>
                              <button
                                onClick={() => {
                                  setIsPartnerDropdownOpen(false);
                                  setIsAddPartnerModalOpen(true);
                                }}
                                className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                              >
                                파트너 먼저 추가하기 →
                              </button>
                            </div>
                          ) : (
                            partners.map((partner) => (
                              <button
                                key={partner.id}
                                type="button"
                                onClick={() => {
                                  setNewProject({ ...newProject, partnerId: partner.id });
                                  setIsPartnerDropdownOpen(false);
                                }}
                                className="w-full px-4 py-3 hover:bg-blue-50 flex items-center gap-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl"
                              >
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                  {partner.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-gray-900 font-medium">{partner.name}</p>
                                  <p className="text-xs text-gray-500">{partner.email}</p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 비용 정보 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    비용 정보
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FloatingLabelInput
                      label="전체 비용"
                      type="number"
                      value={newProject.budget?.totalAmount || 0}
                      onChange={(e) => setNewProject({
                        ...newProject,
                        budget: { ...newProject.budget!, totalAmount: Number(e.target.value) }
                      })}
                    />
                    <FloatingLabelInput
                      label="파트너 지급"
                      type="number"
                      value={newProject.budget?.partnerPayment || 0}
                      onChange={(e) => setNewProject({
                        ...newProject,
                        budget: { ...newProject.budget!, partnerPayment: Number(e.target.value) }
                      })}
                    />
                    <FloatingLabelInput
                      label="매니징 비용"
                      type="number"
                      value={newProject.budget?.managementFee || 0}
                      onChange={(e) => setNewProject({
                        ...newProject,
                        budget: { ...newProject.budget!, managementFee: Number(e.target.value) }
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* 푸터 */}
              <div className="sticky bottom-0 bg-white px-6 sm:px-8 py-6 border-t border-gray-100 rounded-b-[28px]">
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsAddProjectModalOpen(false)}
                    className="flex-1 h-14 text-gray-700 font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-all active:scale-[0.98]"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAddProject}
                    disabled={!newProject.title || !newProject.client || !newProject.partnerId}
                    className="flex-1 h-14 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98] shadow-lg shadow-blue-500/30"
                  >
                    프로젝트 시작하기
                  </button>
                </div>
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// 상태 배지 컴포넌트
function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { label: string; color: string }> = {
    planning: { label: '시작 전', color: 'bg-blue-50 text-blue-600' },
    in_progress: { label: '진행 중', color: 'bg-yellow-50 text-yellow-700' },
    completed: { label: '종료', color: 'bg-gray-100 text-gray-500' },
    on_hold: { label: '보류', color: 'bg-orange-50 text-orange-500' },
  };

  const { label, color } = statusMap[status] || statusMap.on_hold;

  return (
    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap ${color}`}>
      {label}
    </span>
  );
}
