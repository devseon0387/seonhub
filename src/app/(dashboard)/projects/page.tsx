'use client';

import { useState, useEffect, useRef } from 'react';
import { getProjects, insertProject, getClients as fetchClients, getAllEpisodes, getPartners } from '@/lib/supabase/db';
import { Calendar, User, X, ChevronDown, Search, ArrowRight, Plus } from 'lucide-react';
import { calculateReserve } from '@/lib/utils';
import Link from 'next/link';
import { Project, Client, Episode, WorkContentType, Partner } from '@/types';
import { updateEpisodeInStorage } from '@/lib/storage';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { motion, AnimatePresence } from 'framer-motion';


interface EpisodeWithProjectId extends Episode {
  projectId: string;
}

export default function ProjectsPage() {
  // Supabase에서 프로젝트 데이터 로드
  const [projects, setProjects] = useState<Project[]>([]);

  // Supabase에서 클라이언트 데이터 로드
  const [clients, setClients] = useState<Client[]>([]);

  // Supabase에서 에피소드 데이터 로드
  const [episodes, setEpisodes] = useState<EpisodeWithProjectId[]>([]);

  // Supabase에서 파트너 데이터 로드
  const [allPartners, setAllPartners] = useState<Partner[]>([]);

  // 초기 로드 완료 여부 추적
  const isInitialMount = useRef(true);

  useEffect(() => {
    const loadData = async () => {
      const [projectsData, clientsData, episodesData, partnersData] = await Promise.all([
        getProjects(),
        fetchClients(),
        getAllEpisodes(),
        getPartners(),
      ]);
      setProjects(projectsData);
      setClients(clientsData);
      setEpisodes(episodesData);
      setAllPartners(partnersData);
      isInitialMount.current = false;
    };
    loadData();
  }, []);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'in_progress' | 'completed' | 'planning'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'amount' | 'name'>('recent');
  const [isProjectSuccess, setIsProjectSuccess] = useState(false);

  // 작업 타입 모달 상태
  const [selectedWorkTypeModal, setSelectedWorkTypeModal] = useState<{ episodeId: string; workType: WorkContentType } | null>(null);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const modalCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 토스트 알림 상태
  const [toast, setToast] = useState<{ message: string; show: boolean; isClosing: boolean }>({
    message: '',
    show: false,
    isClosing: false
  });
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  // 이 useEffect를 제거했습니다 - localStorage 덮어쓰기 문제 해결

  // ⚠️ 에피소드 자동 저장 제거 - 모달에서 상태 변경 시에만 저장
  // episodes 상태가 바뀔 때마다 저장하면 다른 에피소드가 삭제될 수 있습니다.

  // 모달 닫기 함수
  const closeModal = () => {
    setIsModalClosing(true);
    if (modalCloseTimeoutRef.current) {
      clearTimeout(modalCloseTimeoutRef.current);
    }
    modalCloseTimeoutRef.current = setTimeout(() => {
      setSelectedWorkTypeModal(null);
      setIsModalClosing(false);
    }, 200);
  };

  // 토스트 표시 함수
  const showToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    if (toastCloseTimeoutRef.current) {
      clearTimeout(toastCloseTimeoutRef.current);
    }

    setToast({ message, show: true, isClosing: false });

    toastTimeoutRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, isClosing: true }));
      toastCloseTimeoutRef.current = setTimeout(() => {
        setToast({ message: '', show: false, isClosing: false });
      }, 300);
    }, 2000);
  };

  // 필터링 및 정렬된 프로젝트 목록
  const filteredAndSortedProjects = projects
    .filter(project => {
      // 필터 적용
      if (activeFilter !== 'all' && project.status !== activeFilter) return false;

      // 검색 적용
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          project.title.toLowerCase().includes(query) ||
          project.client.toLowerCase().includes(query)
        );
      }

      return true;
    })
    .sort((a, b) => {
      // 정렬 적용
      if (sortBy === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'amount') {
        return b.budget.totalAmount - a.budget.totalAmount;
      } else if (sortBy === 'name') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

  // 통계 계산
  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    totalRevenue: projects.reduce((sum, p) => sum + p.budget.totalAmount, 0),
    avgMargin: projects.length > 0
      ? projects.reduce((sum, p) => sum + p.budget.marginRate, 0) / projects.length
      : 0,
  };

  // 오늘 전달할 에피소드 계산
  const today = new Date().toISOString().split('T')[0];
  const todayDeliveries = episodes.filter(episode => episode.dueDate === today)
    .map(episode => {
      const project = projects.find(p => p.id === episode.projectId);
      return { episode, project };
    })
    .filter(item => item.project); // 프로젝트가 있는 것만

  const handleAddProject = async () => {
    if (!newProject.title || !newProject.client || !newProject.partnerId) {
      alert('프로젝트 이름, 클라이언트, 담당자를 입력해주세요.');
      return;
    }

    const projectData = {
      title: newProject.title!,
      description: newProject.description || '',
      client: newProject.client!,
      partnerId: newProject.partnerId!,
      status: newProject.status || 'planning',
      budget: newProject.budget || {
        totalAmount: 0,
        partnerPayment: 0,
        managementFee: 0,
        marginRate: 0,
      },
      tags: newProject.tags || [],
      workContent: [],
    } as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;

    const saved = await insertProject(projectData);
    if (saved) {
      setProjects(prev => [...prev, saved]);
      setIsProjectSuccess(true);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setIsProjectSuccess(false);
        setNewProject({
          title: '',
          description: '',
          client: '',
          partnerId: '',
          status: 'planning',
          budget: { totalAmount: 0, partnerPayment: 0, managementFee: 0, marginRate: 0 },
          tags: [],
        });
      }, 1500);
    }
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setIsProjectSuccess(false);
    setNewProject({
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
  };

  return (
    <div className="space-y-5">
      <style jsx global>{`
        @keyframes modal-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modal-overlay-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes modal-content-in {
          from { opacity: 0; transform: scale(0.95) translateY(-16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes modal-content-out {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to { opacity: 0; transform: scale(0.95) translateY(-16px); }
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, -12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes toast-out {
          from { opacity: 1; transform: translate(-50%, 0); }
          to { opacity: 0; transform: translate(-50%, -12px); }
        }
        .animate-modal-overlay { animation: modal-overlay-in 0.2s ease-out forwards; }
        .animate-modal-overlay-out { animation: modal-overlay-out 0.2s ease-in forwards; }
        .animate-modal-content { animation: modal-content-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-modal-content-out { animation: modal-content-out 0.2s ease-in forwards; }
        .animate-toast-in { animation: toast-in 0.25s ease-out forwards; }
        .animate-toast-out { animation: toast-out 0.25s ease-in forwards; }
        @keyframes checkmark { 100% { stroke-dashoffset: 0; } }
        @keyframes circle-scale {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .checkmark-circle { animation: circle-scale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .checkmark-check {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: checkmark 0.5s 0.3s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }
      `}</style>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">프로젝트</h1>
          <p className="text-gray-500 mt-2">진행 중인 프로젝트와 에피소드를 한눈에 관리하세요</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium flex items-center gap-1.5 text-sm"
        >
          <Plus size={16} />
          새 프로젝트
        </button>
      </div>

      {/* 필터 탭 + 정렬 */}
      <div className="flex items-center justify-between gap-3">
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-200 inline-flex gap-2">
          {([
            { key: 'all',        label: '전체',   count: projects.length },
            { key: 'planning',   label: '시작 전', count: projects.filter(p => p.status === 'planning').length },
            { key: 'in_progress', label: '진행 중', count: projects.filter(p => p.status === 'in_progress').length },
            { key: 'completed',  label: '종료',   count: projects.filter(p => p.status === 'completed').length },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className="relative px-6 py-3 rounded-xl font-semibold"
            >
              {activeFilter === key && (
                <motion.div
                  layoutId="project-filter-pill"
                  className="absolute inset-0 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/30"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <div className={`relative flex items-center gap-2 transition-colors duration-200 ${
                activeFilter === key ? 'text-white' : 'text-gray-600 hover:text-gray-900'
              }`}>
                <span>{label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold transition-colors duration-200 ${
                  activeFilter === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* 검색 + 정렬 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
            <Search size={15} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent focus:outline-none text-sm text-gray-700 placeholder-gray-400 w-36"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-300 hover:text-gray-500">
                <X size={14} />
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none text-xs text-gray-600"
          >
            <option value="recent">최신순</option>
            <option value="amount">금액순</option>
            <option value="name">이름순</option>
          </select>
        </div>
      </div>

      {/* 프로젝트 그리드 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeFilter + '|' + searchQuery + '|' + sortBy}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          {filteredAndSortedProjects.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-400 text-sm">
              프로젝트가 없습니다
            </div>
          ) : filteredAndSortedProjects.map((project, cardIndex) => {
            const partner = allPartners.find(p => p.id === project.partnerId);
            const projectEpisodes = episodes.filter(e => e.projectId === project.id);
            const completedEpisodes = projectEpisodes.filter(ep => {
              const allTypes = ep.workContent || [];
              if (allTypes.length === 0) return false;
              return allTypes.every(wt => {
                const steps = ep.workSteps?.[wt] || [];
                return steps.length > 0 && steps.every(s => s.status === 'completed');
              });
            }).length;

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: cardIndex * 0.03 }}
              >
                <Link
                  href={`/projects/${project.id}`}
                  className="group block bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 p-4"
                >
                  {/* 클라이언트 + 상태 */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 truncate">{project.client}</span>
                    <StatusBadge status={project.status} />
                  </div>

                  {/* 프로젝트명 */}
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm leading-snug line-clamp-1 mb-3">
                    {project.title}
                  </h3>

                  {/* 하단: 파트너 + 에피소드 + 금액 */}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {partner ? (
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                          {partner.name.charAt(0)}
                        </div>
                        <span className="truncate">{partner.name}</span>
                      </div>
                    ) : (
                      <div className="flex-1" />
                    )}
                    {projectEpisodes.length > 0 && (
                      <span className="flex-shrink-0">{completedEpisodes}/{projectEpisodes.length}회차</span>
                    )}
                    <span className="font-semibold text-gray-700 flex-shrink-0">
                      {project.budget.totalAmount > 0
                        ? `${(project.budget.totalAmount / 10000).toFixed(0)}만원`
                        : '-'
                      }
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* 프로젝트 추가 모달 - Toss Style */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !isProjectSuccess && handleCloseModal()}
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
                      onClick={handleCloseModal}
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
                                  <p>등록된 클라이언트가 없습니다</p>
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
                                  {allPartners.find(p => p.id === newProject.partnerId)?.name.charAt(0)}
                                </div>
                                <span className="text-gray-900 font-medium">
                                  {allPartners.find(p => p.id === newProject.partnerId)?.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">파트너를 선택해주세요</span>
                            )}
                            <ChevronDown size={20} className="text-gray-400" />
                          </button>
                          {isPartnerDropdownOpen && (
                            <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-auto">
                              {allPartners.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">
                                  <p>등록된 파트너가 없습니다</p>
                                </div>
                              ) : (
                                allPartners.map((partner) => (
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
                        onClick={handleCloseModal}
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

      {/* 작업 목록 모달 */}
      {selectedWorkTypeModal && (() => {
        const selectedEpisode = episodes.find(e => e.id === selectedWorkTypeModal.episodeId);
        if (!selectedEpisode) return null;

        const workType = selectedWorkTypeModal.workType;
        const steps = selectedEpisode.workSteps?.[workType] || [];
        const completedCount = steps.filter(s => s.status === 'completed').length;

        const getWorkTypeStatus = (wt: WorkContentType): 'waiting' | 'in_progress' | 'completed' => {
          const stps = selectedEpisode.workSteps?.[wt] || [];
          if (stps.length === 0) return 'waiting';
          if (stps.some(step => step.status === 'in_progress')) return 'in_progress';
          if (stps.every(step => step.status === 'completed')) return 'completed';
          return 'waiting';
        };

        const status = getWorkTypeStatus(workType);

        return (
          <div className={`fixed inset-0 z-50 overflow-y-auto ${isModalClosing ? 'animate-modal-overlay-out' : 'animate-modal-overlay'}`}>
            <div
              className="fixed inset-0 bg-gray-900/50"
              onClick={closeModal}
            />

            <div className="flex min-h-full items-center justify-center p-4">
              <div
                className={`relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto ${isModalClosing ? 'animate-modal-content-out' : 'animate-modal-content'}`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* 헤더 */}
                <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">{workType} 작업 목록</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : status === 'in_progress'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {status === 'completed' ? '완료' : status === 'in_progress' ? '진행중' : '대기'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {completedCount}/{steps.length} 완료
                    </span>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                {/* 작업 단계 목록 */}
                <div className="p-6">
                  {steps.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 mb-4">작업 단계가 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {steps.map((step, index) => {
                        const partner = allPartners.find(p => p.id === step.assigneeId);

                        return (
                          <div
                            key={step.id}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              step.status === 'completed'
                                ? 'bg-green-50 border-green-200'
                                : step.status === 'in_progress'
                                ? 'bg-yellow-50 border-yellow-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                {/* 순서 번호 */}
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                  step.status === 'completed'
                                    ? 'bg-green-500 text-white'
                                    : step.status === 'in_progress'
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-gray-300 text-gray-700'
                                }`}>
                                  {index + 1}
                                </div>

                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-900">{step.label}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      step.status === 'completed'
                                        ? 'bg-green-100 text-green-800'
                                        : step.status === 'in_progress'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {step.status === 'completed' ? '완료' : step.status === 'in_progress' ? '진행중' : '대기'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-4 text-sm text-gray-600">
                                    {partner && (
                                      <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-semibold">
                                          {partner.name.charAt(0)}
                                        </div>
                                        <span>{partner.name}</span>
                                      </div>
                                    )}
                                    {step.startDate && (
                                      <div className="flex items-center gap-1">
                                        <Calendar size={14} />
                                        <span>시작: {step.startDate}</span>
                                      </div>
                                    )}
                                    {step.dueDate && (
                                      <div className="flex items-center gap-1">
                                        <Calendar size={14} />
                                        <span className="font-medium">마감: {step.dueDate}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 상태 변경 버튼 */}
                              <div className="flex items-center gap-2 ml-4">
                                {step.status !== 'completed' && (
                                  <button
                                    onClick={async () => {
                                      const updatedEpisodes = episodes.map(ep => {
                                        if (ep.id === selectedWorkTypeModal.episodeId) {
                                          const updatedSteps = [...steps];
                                          updatedSteps[index] = { ...step, status: 'completed' };
                                          return {
                                            ...ep,
                                            workSteps: { ...ep.workSteps, [workType]: updatedSteps }
                                          } as EpisodeWithProjectId;
                                        }
                                        return ep;
                                      });
                                      setEpisodes(updatedEpisodes);
                                      // Supabase에 안전하게 저장
                                      const updatedEpisode = updatedEpisodes.find(e => e.id === selectedWorkTypeModal.episodeId);
                                      if (updatedEpisode) {
                                        await updateEpisodeInStorage(updatedEpisode);
                                      }
                                      showToast(`"${step.label || `작업 ${index + 1}`}"을(를) 완료로 표시했습니다.`);
                                    }}
                                    className="px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm font-medium"
                                  >
                                    완료로 표시
                                  </button>
                                )}
                                {step.status === 'completed' && (
                                  <button
                                    onClick={async () => {
                                      const updatedEpisodes = episodes.map(ep => {
                                        if (ep.id === selectedWorkTypeModal.episodeId) {
                                          const updatedSteps = [...steps];
                                          updatedSteps[index] = { ...step, status: 'in_progress' };
                                          return {
                                            ...ep,
                                            workSteps: { ...ep.workSteps, [workType]: updatedSteps }
                                          } as EpisodeWithProjectId;
                                        }
                                        return ep;
                                      });
                                      setEpisodes(updatedEpisodes);
                                      // Supabase에 안전하게 저장
                                      const updatedEpisode = updatedEpisodes.find(e => e.id === selectedWorkTypeModal.episodeId);
                                      if (updatedEpisode) {
                                        await updateEpisodeInStorage(updatedEpisode);
                                      }
                                      showToast(`"${step.label || `작업 ${index + 1}`}"을(를) 진행중으로 변경했습니다.`);
                                    }}
                                    className="px-3 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-sm font-medium"
                                  >
                                    진행중으로 변경
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 푸터 */}
                <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 토스트 알림 */}
      {toast.show && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[60] ${toast.isClosing ? 'animate-toast-out' : 'animate-toast-in'}`}>
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[320px]">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{toast.message}</p>
            </div>
            <button
              onClick={() => {
                if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                if (toastCloseTimeoutRef.current) clearTimeout(toastCloseTimeoutRef.current);
                setToast(prev => ({ ...prev, isClosing: true }));
                setTimeout(() => {
                  setToast({ message: '', show: false, isClosing: false });
                }, 200);
              }}
              className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 탭 버튼 컴포넌트
function TabButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 font-medium text-sm transition-colors ${
        active
          ? 'text-blue-600 border-b-2 border-blue-600'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

// 상태 배지 컴포넌트
function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { label: string; color: string }> = {
    planning: { label: '시작 전', color: 'bg-blue-50 text-blue-600' },
    in_progress: { label: '진행 중', color: 'bg-green-50 text-green-600' },
    completed: { label: '종료', color: 'bg-gray-100 text-gray-500' },
    on_hold: { label: '보류', color: 'bg-orange-50 text-orange-500' },
  };

  const { label, color } = statusMap[status] || statusMap.on_hold;

  return (
    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 ${color}`}>
      {label}
    </span>
  );
}
