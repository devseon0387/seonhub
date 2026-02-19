'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Project, Client, Episode, Partner } from '@/types';
import { ArrowLeft, Calendar, User, DollarSign, Tag, Edit, Trash2, TrendingUp, ChevronRight, X, UserCircle, FileText, Users, Video, Palette, Image, CheckCircle2, Clock, Pause, Target, ChevronDown, ClipboardCheck } from 'lucide-react';
import { calculateReserve } from '@/lib/utils';
import { addToTrash } from '@/lib/trash';
import { getProjectById, updateProject, deleteProject, getClients as fetchClients, getProjectEpisodes, getPartners, upsertEpisode, deleteEpisode, deleteProjectEpisodes } from '@/lib/supabase/db';
import Link from 'next/link';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import ProjectChecklistModal from '@/components/ProjectChecklistModal';
import EpisodeDetailModal from '@/components/EpisodeDetailModal';

interface EpisodeWithProjectId extends Episode {
  projectId: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [episodes, setEpisodes] = useState<EpisodeWithProjectId[]>([]);
  const [partnerIds, setPartnerIds] = useState<string[]>([]);
  const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState(false);
  const [managerIds, setManagerIds] = useState<string[]>([]);
  const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [allPartners, setAllPartners] = useState<Partner[]>([]);
  const [workTypeCosts, setWorkTypeCosts] = useState({
    '롱폼': { partnerCost: 0, managementCost: 0 },
    '기획 숏폼': { partnerCost: 0, managementCost: 0 },
    '본편 숏폼': { partnerCost: 0, managementCost: 0 },
    '썸네일': { partnerCost: 0, managementCost: 0 },
  });
  const [totalAmount, setTotalAmount] = useState<number>(0);
  // 통합 프로젝트 수정 모달
  const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState<'basic' | 'workers' | 'budget'>('basic');

  // 기본 정보 임시 상태
  const [tempEditedProject, setTempEditedProject] = useState<Partial<Project>>({});
  const [tempEditTags, setTempEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [tempSelectedClient, setTempSelectedClient] = useState<string>('');
  const [tempManagerIds, setTempManagerIds] = useState<string[]>([]);
  const [tempPartnerIds, setTempPartnerIds] = useState<string[]>([]);
  const [tempSelectedCategory, setTempSelectedCategory] = useState<string>('');
  const [tempWorkContent, setTempWorkContent] = useState<('롱폼' | '기획 숏폼' | '본편 숏폼' | '썸네일')[]>([]);

  // 비용 정보 임시 상태
  const [tempTotalAmount, setTempTotalAmount] = useState<number>(0);
  const [tempWorkTypeCosts, setTempWorkTypeCosts] = useState({
    '롱폼': { partnerCost: 0, managementCost: 0 },
    '기획 숏폼': { partnerCost: 0, managementCost: 0 },
    '본편 숏폼': { partnerCost: 0, managementCost: 0 },
    '썸네일': { partnerCost: 0, managementCost: 0 },
  });

  const [deleteEpisodeId, setDeleteEpisodeId] = useState<string | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [activeTab, setActiveTab] = useState<'in-progress' | 'episodes' | 'overview'>('in-progress');

  // 토스트 알림
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 체크리스트 모달
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [selectedEpisodeForDetail, setSelectedEpisodeForDetail] = useState<Episode | null>(null);

  // 드롭다운 외부 클릭 감지를 위한 ref
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const managerDropdownRef = useRef<HTMLDivElement>(null);
  const partnerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      const [foundProject, clientsData, partnersData, eps] = await Promise.all([
        getProjectById(projectId),
        fetchClients(),
        getPartners(),
        getProjectEpisodes(projectId),
      ]);
      setProject(foundProject);
      if (foundProject) {
        setPartnerIds(foundProject.partnerIds);
        setManagerIds(foundProject.managerIds);
        setSelectedClient(foundProject.client || '');
        setSelectedCategory(foundProject.category || '');
        const defaultCosts = {
          '롱폼': { partnerCost: 0, managementCost: 0 },
          '기획 숏폼': { partnerCost: 0, managementCost: 0 },
          '본편 숏폼': { partnerCost: 0, managementCost: 0 },
          '썸네일': { partnerCost: 0, managementCost: 0 },
        };
        const costs = foundProject.workTypeCosts ? { ...defaultCosts, ...foundProject.workTypeCosts } : defaultCosts;
        setWorkTypeCosts(costs);
        setTotalAmount(foundProject.budget.totalAmount);
        setTempWorkContent(foundProject.workContent || []);
      }
      setClients(clientsData);
      setAllPartners(partnersData);
      setEpisodes(eps);
      setIsLoadingProject(false);
    };
    loadData();
  }, [projectId]);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setIsClientDropdownOpen(false);
      }
      if (managerDropdownRef.current && !managerDropdownRef.current.contains(event.target as Node)) {
        setIsManagerDropdownOpen(false);
      }
      if (partnerDropdownRef.current && !partnerDropdownRef.current.contains(event.target as Node)) {
        setIsPartnerDropdownOpen(false);
      }
    };

    if (isStatusDropdownOpen || isClientDropdownOpen || isManagerDropdownOpen || isPartnerDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStatusDropdownOpen, isClientDropdownOpen, isManagerDropdownOpen, isPartnerDropdownOpen]);

  // ⚠️ 에피소드 자동 저장 제거 - 개별 액션에서만 저장
  // 이전에는 episodes 상태가 바뀔 때마다 저장했지만,
  // 이로 인해 다른 프로젝트의 에피소드가 삭제되는 문제가 있었습니다.

  const handleEpisodeStatusChange = async (episodeId: string, newStatus: Episode['status']) => {
    const episode = episodes.find(e => e.id === episodeId);
    if (!episode) return;
    const updated = {
      ...episode,
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    };
    setEpisodes(prev => prev.map(e => e.id === episodeId ? updated : e));
    const ok = await upsertEpisode(updated);
    if (!ok) {
      setEpisodes(prev => prev.map(e => e.id === episodeId ? episode : e));
      showToastMessage('상태 변경에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleDelete = async () => {
    if (!project) return;

    // 에피소드를 먼저 휴지통으로 이전 (프로젝트 삭제 전에 해야 조회 가능)
    const eps = await getProjectEpisodes(projectId);
    for (const ep of eps) {
      await addToTrash('episode', ep, projectId);
    }
    await deleteProjectEpisodes(projectId);

    // 프로젝트 휴지통 이전 후 삭제
    await addToTrash('project', project);
    const deleted = await deleteProject(project.id);
    if (!deleted) {
      showToastMessage('프로젝트 삭제에 실패했습니다. 다시 시도해주세요.');
      return;
    }

    router.push('/projects');
  };

  const handleAddPartner = (partnerId: string) => {
    if (!partnerIds.includes(partnerId)) {
      const newPartnerIds = [...partnerIds, partnerId];
      setPartnerIds(newPartnerIds);
      updateProjectPartners(newPartnerIds);
    }
    setIsPartnerDropdownOpen(false);
  };

  const handleRemovePartner = (partnerId: string) => {
    const newPartnerIds = partnerIds.filter(id => id !== partnerId);
    setPartnerIds(newPartnerIds);
    updateProjectPartners(newPartnerIds);
  };

  const updateProjectPartners = async (newPartnerIds: string[]) => {
    const ok = await updateProject(projectId, { partnerIds: newPartnerIds });
    if (!ok) showToastMessage('파트너 저장에 실패했습니다.');
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setIsCategoryDropdownOpen(false);
    updateProjectCategory(category);
  };

  const updateProjectCategory = async (category: string) => {
    const ok = await updateProject(projectId, { category });
    if (!ok) showToastMessage('카테고리 저장에 실패했습니다.');
  };

  const handleClientSelect = (clientName: string) => {
    setSelectedClient(clientName);
    setIsClientDropdownOpen(false);
    updateProjectClient(clientName);
  };

  const updateProjectClient = async (clientName: string) => {
    const ok = await updateProject(projectId, { client: clientName });
    if (ok) {
      if (project) setProject({ ...project, client: clientName });
    } else {
      showToastMessage('클라이언트 저장에 실패했습니다.');
    }
  };

  const handleAddManager = (managerId: string) => {
    if (!managerIds.includes(managerId)) {
      const newManagerIds = [...managerIds, managerId];
      setManagerIds(newManagerIds);
      updateProjectManagers(newManagerIds);
    }
    setIsManagerDropdownOpen(false);
  };

  const handleRemoveManager = (managerId: string) => {
    const newManagerIds = managerIds.filter(id => id !== managerId);
    setManagerIds(newManagerIds);
    updateProjectManagers(newManagerIds);
  };

  const updateProjectManagers = async (newManagerIds: string[]) => {
    const ok = await updateProject(projectId, { managerIds: newManagerIds });
    if (!ok) showToastMessage('매니저 저장에 실패했습니다.');
  };

  // 토스트 표시 함수
  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const updateTempWorkTypeCost = (workType: string, costType: 'partnerCost' | 'managementCost', value: string) => {
    const numericValue = parseInt(value.replace(/,/g, '')) || 0;
    setTempWorkTypeCosts({
      ...tempWorkTypeCosts,
      [workType]: {
        ...tempWorkTypeCosts[workType as keyof typeof tempWorkTypeCosts],
        [costType]: numericValue,
      },
    });

    // 비용이 0보다 크면 작업 내용에 자동으로 추가
    if (numericValue > 0) {
      const workTypeValue = workType as '롱폼' | '기획 숏폼' | '본편 숏폼' | '썸네일';
      if (!tempWorkContent.includes(workTypeValue)) {
        setTempWorkContent([...tempWorkContent, workTypeValue]);
      }
    }
  };

  // 통합 프로젝트 수정 모달 열기
  const openProjectEditModal = (tab: 'basic' | 'workers' | 'budget' = 'basic') => {
    if (!project) return;

    // 기본 정보 초기화
    setTempEditedProject({
      title: project.title,
      description: project.description,
      status: project.status,
      client: project.client,
    });
    setTempEditTags(project.tags || []);
    setTempSelectedClient(selectedClient);
    setTempManagerIds(managerIds);
    setTempPartnerIds(partnerIds);
    setTempSelectedCategory(selectedCategory);
    setTempWorkContent(project?.workContent || []);

    // 비용 정보 초기화
    setTempTotalAmount(totalAmount);
    setTempWorkTypeCosts(workTypeCosts);

    setActiveEditTab(tab);
    setIsProjectEditModalOpen(true);
  };

  const handleDeleteEpisode = async () => {
    if (!deleteEpisodeId) return;
    const episodeToDelete = episodes.find(ep => ep.id === deleteEpisodeId);
    if (episodeToDelete) {
      const deleted = await deleteEpisode(deleteEpisodeId);
      if (!deleted) {
        showToastMessage('에피소드 삭제에 실패했습니다. 다시 시도해주세요.');
        setDeleteEpisodeId(null);
        return;
      }
      await addToTrash('episode', episodeToDelete, projectId);
      setEpisodes(episodes.filter(ep => ep.id !== deleteEpisodeId));
    }
    setDeleteEpisodeId(null);
  };


  const formatCurrency = (value: number) => {
    return value.toLocaleString('ko-KR');
  };

  const updateTempTotalAmount = (value: string) => {
    const numericValue = parseInt(value.replace(/,/g, '')) || 0;
    setTempTotalAmount(numericValue);
  };

  // Calculate total partner payment from work types
  const getTotalPartnerPayment = () => {
    return Object.values(workTypeCosts).reduce((sum, cost) => sum + cost.partnerCost, 0);
  };

  // Calculate total management fee from work types
  const getTotalManagementFee = () => {
    return Object.values(workTypeCosts).reduce((sum, cost) => sum + cost.managementCost, 0);
  };

  // Calculate reserve
  const getReserveAmount = () => {
    const partnerPayment = getTotalPartnerPayment();
    const managementFee = getTotalManagementFee();
    return totalAmount - partnerPayment - managementFee;
  };

  // Calculate margin rate
  const getMarginRate = () => {
    if (totalAmount === 0) return 0;
    const reserve = getReserveAmount();
    return ((reserve / totalAmount) * 100).toFixed(1);
  };


  if (isLoadingProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">프로젝트를 찾을 수 없습니다</h2>
          <p className="text-gray-500 mb-6">요청하신 프로젝트가 존재하지 않습니다.</p>
          <Link
            href="/projects"
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" />
            프로젝트 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const partners = partnerIds.map(id => allPartners.find(p => p.id === id)).filter(Boolean);
  const managers = managerIds.map(id => allPartners.find(p => p.id === id)).filter(Boolean);
  const availablePartners = allPartners.filter(p => !partnerIds.includes(p.id));
  const availableManagers = allPartners.filter(p => !managerIds.includes(p.id));

  // Calculate budget values
  const calculatedPartnerPayment = getTotalPartnerPayment();
  const calculatedManagementFee = getTotalManagementFee();
  const calculatedReserve = getReserveAmount();
  const calculatedMarginRate = getMarginRate();

  // 누적 작업 수 계산
  const getTotalWorkCount = () => {
    const counts = { '롱폼': 0, '본편 숏폼': 0, '기획 숏폼': 0 };
    episodes.forEach(ep => {
      ep.workContent.forEach(work => {
        if (work === '롱폼') counts['롱폼']++;
        else if (work === '본편 숏폼') counts['본편 숏폼']++;
        else if (work === '기획 숏폼') counts['기획 숏폼']++;
      });
    });
    return counts;
  };

  // 진행 중인 작업 수 계산
  const getInProgressWorkCount = () => {
    const counts = { '롱폼': 0, '본편 숏폼': 0, '기획 숏폼': 0 };
    episodes
      .filter(ep => ep.status === 'in_progress')
      .forEach(ep => {
        ep.workContent.forEach(work => {
          if (work === '롱폼') counts['롱폼']++;
          else if (work === '본편 숏폼') counts['본편 숏폼']++;
          else if (work === '기획 숏폼') counts['기획 숏폼']++;
        });
      });
    return counts;
  };

  // 최종 납품일 계산
  const getLastDeliveryDate = () => {
    const completedEpisodes = episodes.filter(ep => ep.endDate);
    if (completedEpisodes.length === 0) return null;

    const dates = completedEpisodes.map(ep => new Date(ep.endDate!));
    return new Date(Math.max(...dates.map(d => d.getTime())));
  };

  // 오늘 마감인 회차 찾기
  const getTodayDueEpisodes = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return episodes.filter(ep => {
      if (!ep.dueDate || ep.status === 'completed') return false;

      const dueDate = new Date(ep.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      return dueDate.getTime() === today.getTime();
    });
  };

  // 이번 주 마감인 회차 찾기 (오늘 제외)
  const getThisWeekDueEpisodes = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 이번 주 일요일 계산
    const sunday = new Date(today);
    const dayOfWeek = today.getDay(); // 0(일) ~ 6(토)
    sunday.setDate(today.getDate() + (7 - dayOfWeek) % 7);
    sunday.setHours(23, 59, 59, 999);

    return episodes.filter(ep => {
      if (!ep.dueDate || ep.status === 'completed') return false;

      const dueDate = new Date(ep.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      // 오늘보다 크고, 이번 주 일요일 이하
      return dueDate.getTime() > today.getTime() && dueDate.getTime() <= sunday.getTime();
    });
  };

  // 편집 모달 열기
  // 통합 모달 취소
  const cancelProjectEditModal = () => {
    setIsProjectEditModalOpen(false);
    setTempEditedProject({});
    setTempEditTags([]);
    setNewTag('');
  };

  // 통합 모달 저장
  const saveProjectEditModal = async () => {
    if (isSavingProject) return;
    if (!project || !tempEditedProject.title) {
      alert('프로젝트 이름을 입력해주세요.');
      return;
    }
    setIsSavingProject(true);

    const partnerPayment = Object.values(tempWorkTypeCosts).reduce((s, c) => s + c.partnerCost, 0);
    const managementFee = Object.values(tempWorkTypeCosts).reduce((s, c) => s + c.managementCost, 0);
    const marginRate = tempTotalAmount > 0
      ? Math.round(((tempTotalAmount - partnerPayment - managementFee) / tempTotalAmount) * 100 * 10) / 10
      : 0;

    const updates: Partial<Project> = {
      ...tempEditedProject,
      tags: tempEditTags,
      client: tempSelectedClient,
      partnerIds: tempPartnerIds,
      managerIds: tempManagerIds,
      category: tempSelectedCategory,
      workContent: tempWorkContent,
      workTypeCosts: tempWorkTypeCosts,
      budget: {
        totalAmount: tempTotalAmount,
        partnerPayment,
        managementFee,
        marginRate,
      },
    };

    const success = await updateProject(projectId, updates);
    setIsSavingProject(false);
    if (success) {
      setProject({
        ...project,
        ...updates,
        updatedAt: new Date().toISOString()
      });
      setSelectedClient(tempSelectedClient);
      setManagerIds(tempManagerIds);
      setPartnerIds(tempPartnerIds);
      setSelectedCategory(tempSelectedCategory);
      setTotalAmount(tempTotalAmount);
      setWorkTypeCosts(tempWorkTypeCosts);
      showToastMessage('프로젝트가 저장되었습니다!');
      cancelProjectEditModal();
    } else {
      showToastMessage('저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 태그 추가
  const addTag = () => {
    if (newTag.trim() && !tempEditTags.includes(newTag.trim())) {
      setTempEditTags([...tempEditTags, newTag.trim()]);
      setNewTag('');
    }
  };

  // 태그 제거
  const removeTag = (tagToRemove: string) => {
    setTempEditTags(tempEditTags.filter(tag => tag !== tagToRemove));
  };

  const totalWorkCount = getTotalWorkCount();
  const inProgressWorkCount = getInProgressWorkCount();
  const lastDeliveryDate = getLastDeliveryDate();
  const todayDueEpisodes = getTodayDueEpisodes();
  const thisWeekDueEpisodes = getThisWeekDueEpisodes();

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @keyframes modal-overlay-in {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(4px); }
        }
        @keyframes modal-content-in {
          from { opacity: 0; transform: scale(0.95) translateY(-20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-overlay {
          animation: modal-overlay-in 0.3s ease-out forwards;
        }
        .animate-modal-content {
          animation: modal-content-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/projects"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
            <p className="text-gray-500 mt-1">프로젝트 상세 정보</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsChecklistModalOpen(true)}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center"
          >
            <ClipboardCheck size={16} className="mr-2" />
            체크리스트
          </button>
          <button
            onClick={() => openProjectEditModal('basic')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
          >
            <Edit size={16} className="mr-2" />
            수정
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center"
          >
            <Trash2 size={16} className="mr-2" />
            삭제
          </button>
        </div>
      </div>

      {/* 상태 배지 */}
      <div>
        <StatusBadge status={project.status} />
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('in-progress')}
            className={`${
              activeTab === 'in-progress'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
          >
            진행 중인 회차
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
              {episodes.filter(ep => ep.status === 'in_progress').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('episodes')}
            className={`${
              activeTab === 'episodes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
          >
            회차 관리
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
              {episodes.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            프로젝트 개요
          </button>
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 기본 정보 */}
        <div className="lg:col-span-3 bg-gray-50 rounded-lg shadow p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">기본 정보</h2>
              <button
                onClick={() => openProjectEditModal('basic')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="기본 정보 수정"
              >
                <Edit size={16} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 클라이언트, 매니저, 담당 파트너 - 한 줄로 */}
              <div className="grid grid-cols-3 gap-4">
                {/* 클라이언트 */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">클라이언트</p>
                  {selectedClient ? (
                    <div className="flex items-center p-2">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-2 flex-shrink-0">
                        {selectedClient.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate">{selectedClient}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">미설정</p>
                  )}
                </div>

                {/* 매니저 */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">매니저</p>
                  {managers.length > 0 ? (
                    <div className="space-y-2">
                      {managers.map((manager) => manager && (
                        <div key={manager.id} className="flex items-center p-2">
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-2 flex-shrink-0">
                            {manager.name.charAt(0)}
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">{manager.name}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">미설정</p>
                  )}
                </div>

                {/* 담당 파트너 */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">담당 파트너</p>
                  {partners.length > 0 ? (
                    <div className="space-y-2">
                      {partners.map((partner) => partner && (
                        <div key={partner.id} className="flex items-center p-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-2 flex-shrink-0">
                            {partner.name.charAt(0)}
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">{partner.name}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">미설정</p>
                  )}
                </div>
              </div>

              {/* 분류와 작업 내용 - 한 줄로 */}
              <div className="grid grid-cols-2 gap-4">
                {/* 분류 */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">분류</p>
                  {selectedCategory ? (
                    <div className="p-2 bg-blue-50 rounded-lg inline-block">
                      <span className="text-sm font-medium text-gray-600">{selectedCategory}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">미설정</p>
                  )}
                </div>

                {/* 작업 내용 */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">작업 내용</p>
                  {project?.workContent && project.workContent.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {project.workContent.map((work, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-purple-50 text-purple-600 rounded text-xs font-medium"
                        >
                          {work}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">미설정</p>
                  )}
                </div>
              </div>

              {/* 마감 예정 - 오늘 & 이번 주 */}
              <div className="pt-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-6">
                    {/* 오늘 마감 */}
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-3">오늘 마감</p>
                      {todayDueEpisodes.length > 0 ? (
                        <div className="space-y-2">
                          {todayDueEpisodes.map((episode) => (
                            <button
                              key={episode.id}
                              onClick={() => router.push(`/projects/${projectId}/episodes/${episode.id}`)}
                              className="w-full flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                              type="button"
                            >
                              <div className="flex items-center space-x-2">
                                <div className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {episode.episodeNumber}
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-semibold text-gray-900">{episode.title}</p>
                                  {episode.workContent.length > 0 && (
                                    <div className="flex gap-1 mt-0.5">
                                      {episode.workContent.map((work, idx) => (
                                        <span key={idx} className="text-xs text-red-700">
                                          {work}{idx < episode.workContent.length - 1 ? ',' : ''}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <ChevronRight size={14} className="text-red-600 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">마감 없음</p>
                      )}
                    </div>

                    {/* 이번 주 마감 */}
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-3">이번 주 마감</p>
                      {thisWeekDueEpisodes.length > 0 ? (
                        <div className="space-y-2">
                          {thisWeekDueEpisodes.map((episode) => (
                            <button
                              key={episode.id}
                              onClick={() => router.push(`/projects/${projectId}/episodes/${episode.id}`)}
                              className="w-full flex items-center justify-between p-3 bg-orange-50 border border-gray-200 rounded-lg hover:bg-orange-100 transition-colors"
                              type="button"
                            >
                              <div className="flex items-center space-x-2">
                                <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {episode.episodeNumber}
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-semibold text-gray-900">{episode.title}</p>
                                  {episode.dueDate && (
                                    <p className="text-xs text-gray-600">
                                      {new Date(episode.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <ChevronRight size={14} className="text-orange-600 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">마감 없음</p>
                      )}
                    </div>
                  </div>
                </div>

              {/* 진행 중인 작업 & 누적 작업 수 - 한 줄로 */}
              <div className="pt-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-6">
                  {/* 진행 중인 작업 */}
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-3">진행 중인 작업</p>
                    <div className="flex divide-x divide-gray-200">
                      <div className="flex-1 text-center py-2">
                        <p className="text-xs text-gray-500 font-medium">롱폼</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{inProgressWorkCount['롱폼']}</p>
                      </div>
                      <div className="flex-1 text-center py-2">
                        <p className="text-xs text-gray-500 font-medium">본편 숏폼</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{inProgressWorkCount['본편 숏폼']}</p>
                      </div>
                      <div className="flex-1 text-center py-2">
                        <p className="text-xs text-gray-500 font-medium">기획 숏폼</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{inProgressWorkCount['기획 숏폼']}</p>
                      </div>
                    </div>
                  </div>

                  {/* 누적 작업 수 */}
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-3">누적 작업 수</p>
                    <div className="flex divide-x divide-gray-200">
                      <div className="flex-1 text-center py-2">
                        <p className="text-xs text-gray-500 font-medium">롱폼</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{totalWorkCount['롱폼']}</p>
                      </div>
                      <div className="flex-1 text-center py-2">
                        <p className="text-xs text-gray-500 font-medium">본편 숏폼</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{totalWorkCount['본편 숏폼']}</p>
                      </div>
                      <div className="flex-1 text-center py-2">
                        <p className="text-xs text-gray-500 font-medium">기획 숏폼</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{totalWorkCount['기획 숏폼']}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 최종 납품일 */}
              {lastDeliveryDate && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-start">
                    <Calendar size={20} className="text-gray-400 mr-3 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">최종 납품일</p>
                      <p className="text-base text-gray-900 mt-1">
                        {lastDeliveryDate.toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {project.description && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-500 mb-2">설명</p>
                  <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {project.description}
                  </p>
                </div>
              )}

              {project.tags && project.tags.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-500 mb-2">태그</p>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 비용 정보 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-50 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <DollarSign size={20} className="mr-2" />
                비용 정보
              </h2>
              <button
                onClick={() => openProjectEditModal('budget')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="비용 수정"
              >
                <Edit size={16} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">전체 비용</p>
                <p className={`text-2xl font-bold ${totalAmount === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                  {formatCurrency(totalAmount)}원
                </p>
              </div>

              {/* 파트너 지급, 매니징 비용 - 한 줄로 */}
              <div className="pt-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">파트너 지급 (합산)</p>
                    <p className={`text-lg font-semibold ${calculatedPartnerPayment === 0 ? 'text-gray-400' : 'text-blue-600'}`}>
                      {formatCurrency(calculatedPartnerPayment)}원
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">매니징 비용 (합산)</p>
                    <p className={`text-lg font-semibold ${calculatedManagementFee === 0 ? 'text-gray-400' : 'text-purple-600'}`}>
                      {formatCurrency(calculatedManagementFee)}원
                    </p>
                  </div>
                </div>
              </div>

              {/* 유보금, 마진율 - 한 줄로 */}
              <div className="pt-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">유보금</p>
                    <p className={`text-lg font-semibold ${calculatedReserve === 0 ? 'text-gray-400' : 'text-orange-600'}`}>
                      {formatCurrency(calculatedReserve)}원
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1 flex items-center">
                      <TrendingUp size={12} className="mr-1" />
                      마진율
                    </p>
                    <p className={`text-lg font-semibold ${Number(calculatedMarginRate) === 0 ? 'text-gray-400' : 'text-green-600'}`}>
                      {calculatedMarginRate}%
                    </p>
                  </div>
                </div>
              </div>

              {/* 작업별 비용 */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-3">작업별 비용</p>
                <div className="grid grid-cols-4 gap-3">
                  {/* 롱폼 */}
                  <div className={`rounded-lg p-3 ${workTypeCosts['롱폼'].partnerCost === 0 && workTypeCosts['롱폼'].managementCost === 0 ? 'bg-gray-50' : 'bg-purple-50'}`}>
                    <p className={`text-xs font-semibold mb-2 ${workTypeCosts['롱폼'].partnerCost === 0 && workTypeCosts['롱폼'].managementCost === 0 ? 'text-gray-400' : 'text-gray-600'}`}>롱폼</p>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-600">파트너 비용</label>
                        <p className={`text-sm font-semibold mt-1 ${workTypeCosts['롱폼'].partnerCost === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                          {formatCurrency(workTypeCosts['롱폼'].partnerCost)}원
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">매니징 비용</label>
                        <p className={`text-sm font-semibold mt-1 ${workTypeCosts['롱폼'].managementCost === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                          {formatCurrency(workTypeCosts['롱폼'].managementCost)}원
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 기획 숏폼 */}
                  <div className={`rounded-lg p-3 ${workTypeCosts['기획 숏폼'].partnerCost === 0 && workTypeCosts['기획 숏폼'].managementCost === 0 ? 'bg-gray-50' : 'bg-green-50'}`}>
                    <p className={`text-xs font-semibold mb-2 ${workTypeCosts['기획 숏폼'].partnerCost === 0 && workTypeCosts['기획 숏폼'].managementCost === 0 ? 'text-gray-400' : 'text-gray-600'}`}>기획 숏폼</p>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-600">파트너 비용</label>
                        <p className={`text-sm font-semibold mt-1 ${workTypeCosts['기획 숏폼'].partnerCost === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                          {formatCurrency(workTypeCosts['기획 숏폼'].partnerCost)}원
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">매니징 비용</label>
                        <p className={`text-sm font-semibold mt-1 ${workTypeCosts['기획 숏폼'].managementCost === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                          {formatCurrency(workTypeCosts['기획 숏폼'].managementCost)}원
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 본편 숏폼 */}
                  <div className={`rounded-lg p-3 ${workTypeCosts['본편 숏폼'].partnerCost === 0 && workTypeCosts['본편 숏폼'].managementCost === 0 ? 'bg-gray-50' : 'bg-blue-50'}`}>
                    <p className={`text-xs font-semibold mb-2 ${workTypeCosts['본편 숏폼'].partnerCost === 0 && workTypeCosts['본편 숏폼'].managementCost === 0 ? 'text-gray-400' : 'text-gray-600'}`}>본편 숏폼</p>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-600">파트너 비용</label>
                        <p className={`text-sm font-semibold mt-1 ${workTypeCosts['본편 숏폼'].partnerCost === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                          {formatCurrency(workTypeCosts['본편 숏폼'].partnerCost)}원
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">매니징 비용</label>
                        <p className={`text-sm font-semibold mt-1 ${workTypeCosts['본편 숏폼'].managementCost === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                          {formatCurrency(workTypeCosts['본편 숏폼'].managementCost)}원
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 썸네일 */}
                  <div className={`rounded-lg p-3 ${workTypeCosts['썸네일'].partnerCost === 0 && workTypeCosts['썸네일'].managementCost === 0 ? 'bg-gray-50' : 'bg-orange-50'}`}>
                    <p className={`text-xs font-semibold mb-2 ${workTypeCosts['썸네일'].partnerCost === 0 && workTypeCosts['썸네일'].managementCost === 0 ? 'text-gray-400' : 'text-gray-600'}`}>썸네일</p>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-600">파트너 비용</label>
                        <p className={`text-sm font-semibold mt-1 ${workTypeCosts['썸네일'].partnerCost === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                          {formatCurrency(workTypeCosts['썸네일'].partnerCost)}원
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">매니징 비용</label>
                        <p className={`text-sm font-semibold mt-1 ${workTypeCosts['썸네일'].managementCost === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                          {formatCurrency(workTypeCosts['썸네일'].managementCost)}원
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 진행 중인 회차 탭 */}
      {activeTab === 'in-progress' && (
      <div className="bg-gray-50 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            진행 중인 회차
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
              {episodes.filter(ep => ep.status === 'in_progress').length}개
            </span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">현재 작업 중인 회차만 표시됩니다</p>
        </div>

        {episodes.filter(ep => ep.status === 'in_progress').length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium">진행 중인 회차가 없습니다</p>
            <p className="text-sm mt-2">회차 관리 탭에서 회차를 추가하고 상태를 변경해주세요</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {episodes
              .filter(ep => ep.status === 'in_progress')
              .sort((a, b) => a.episodeNumber - b.episodeNumber)
              .map((episode) => {
                const assignee = allPartners.find(p => p.id === episode.assignee);
                const manager = allPartners.find(p => p.id === episode.manager);

                // 진행률 계산 (workItems 기반)
                const totalWorkItems = episode.workItems?.length || 0;
                const completedWorkItems = episode.workItems?.filter(item => item.status === 'completed').length || 0;
                const progressRate = totalWorkItems > 0 ? Math.round((completedWorkItems / totalWorkItems) * 100) : 0;

                // 총 비용 계산
                const totalBudget = episode.budget
                  ? episode.budget.totalAmount
                  : 0;

                return (
                  <div key={episode.id} className="relative group">
                    <button
                      onClick={() => router.push(`/projects/${projectId}/episodes/${episode.id}`)}
                      className="w-full text-left border-2 border-yellow-300 rounded-lg p-4 hover:border-yellow-400 hover:bg-yellow-50 transition-all bg-yellow-50/30"
                      type="button"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-3">
                        {/* 첫 번째 줄: 회차 번호, 제목, 상태, 작업 개수 */}
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-bold text-gray-900">
                            {episode.episodeNumber}화
                          </span>
                          <h3 className="text-base font-semibold text-gray-900">
                            {episode.title}
                          </h3>
                          <select
                            value={episode.status}
                            onClick={e => e.stopPropagation()}
                            onChange={e => handleEpisodeStatusChange(episode.id, e.target.value as Episode['status'])}
                            className="text-xs font-medium px-2 py-1 rounded-full border border-gray-200 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
                          >
                            <option value="waiting">대기</option>
                            <option value="in_progress">진행 중</option>
                            <option value="review">검수</option>
                            <option value="completed">완료</option>
                          </select>
                          {episode.workContent.length > 0 && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {episode.workContent.join(', ')}
                            </span>
                          )}
                        </div>

                        {/* 두 번째 줄: 담당자, 매니저, 예산 */}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {assignee && (
                            <div className="flex items-center gap-1.5">
                              <User size={14} className="text-gray-400" />
                              <span>{assignee.name}</span>
                            </div>
                          )}
                          {manager && (
                            <div className="flex items-center gap-1.5">
                              <UserCircle size={14} className="text-gray-400" />
                              <span>매니저: {manager.name}</span>
                            </div>
                          )}
                          {totalBudget > 0 && (
                            <div className="flex items-center gap-1.5">
                              <DollarSign size={14} className="text-gray-400" />
                              <span>{(totalBudget / 10000).toFixed(0)}만원</span>
                            </div>
                          )}
                        </div>

                        {/* 세 번째 줄: 진행률 바 */}
                        {totalWorkItems > 0 && (
                          <div>
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>작업 진행률</span>
                              <span className="font-semibold">{progressRate}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${progressRate}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                              <span>완료: {completedWorkItems}/{totalWorkItems}</span>
                            </div>
                          </div>
                        )}

                        {/* 마감일 */}
                        {episode.dueDate && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Calendar size={12} className="text-gray-400" />
                            <span>마감: {new Date(episode.dueDate).toLocaleDateString('ko-KR')}</span>
                          </div>
                        )}
                        </div>

                        <div className="ml-4 flex items-center">
                          <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </div>
                      </div>
                    </button>

                    {/* 삭제 버튼 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteEpisodeId(episode.id);
                      }}
                      className="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 bg-gray-50 rounded-lg shadow-md hover:bg-red-50 hover:text-red-600 transition-all"
                      title="회차 삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      )}

      {/* 회차 탭 */}
      {activeTab === 'episodes' && (
      <div className="bg-gray-50 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">회차 관리</h2>
          <button
            onClick={async () => {
              const nextEpisodeNumber = episodes.length > 0
                ? Math.max(...episodes.map(ep => ep.episodeNumber)) + 1
                : 1;

              // 프로젝트의 담당 파트너와 매니저를 자동 배치
              const defaultAssignee = partnerIds.length > 0 ? partnerIds[0] : (allPartners[0]?.id || '');
              const defaultManager = managerIds.length > 0 ? managerIds[0] : (allPartners[0]?.id || '');

              const newEpisode: EpisodeWithProjectId = {
                id: crypto.randomUUID(),
                projectId: projectId,
                episodeNumber: nextEpisodeNumber,
                title: `${nextEpisodeNumber}화`,
                client: project?.client,
                workContent: [],
                status: 'waiting',
                assignee: defaultAssignee,
                manager: defaultManager,
                startDate: new Date().toISOString(),
                budget: { totalAmount: 0, partnerPayment: 0, managementFee: 0 },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              const ok = await upsertEpisode(newEpisode);
              if (!ok) {
                showToastMessage('회차 추가에 실패했습니다. 다시 시도해주세요.');
                return;
              }
              setEpisodes(prev => [...prev, newEpisode]);
              router.push(`/projects/${projectId}/episodes/${newEpisode.id}`);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            + 회차 추가
          </button>
        </div>

        {episodes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>등록된 회차가 없습니다.</p>
            <p className="text-sm mt-1">회차를 추가하여 프로젝트를 관리하세요.</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {episodes.sort((a, b) => a.episodeNumber - b.episodeNumber).map((episode) => {
              const assignee = allPartners.find(p => p.id === episode.assignee);
              const manager = allPartners.find(p => p.id === episode.manager);

              // 진행률 계산 (workItems 기반)
              const totalWorkItems = episode.workItems?.length || 0;
              const completedWorkItems = episode.workItems?.filter(item => item.status === 'completed').length || 0;
              const progressRate = totalWorkItems > 0 ? Math.round((completedWorkItems / totalWorkItems) * 100) : 0;

              // 총 비용 계산
              const totalBudget = episode.budget
                ? episode.budget.totalAmount
                : 0;

              return (
                <div key={episode.id} className="relative group">
                  <button
                    onClick={() => router.push(`/projects/${projectId}/episodes/${episode.id}`)}
                    className="w-full text-left border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-all"
                    type="button"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-3">
                      {/* 첫 번째 줄: 회차 번호, 제목, 상태, 작업 개수 */}
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-bold text-gray-900">
                          {episode.episodeNumber}화
                        </span>
                        <h3 className="text-base font-semibold text-gray-900">
                          {episode.title}
                        </h3>
                        <EpisodeStatusBadge status={episode.status} />
                        {episode.workContent.length > 0 && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            작업 {episode.workContent.length}개
                          </span>
                        )}
                      </div>

                      {/* 두 번째 줄: 담당자 정보, 날짜, 비용 */}
                      <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
                        {/* 담당 파트너 */}
                        <div className="flex items-center">
                          <User size={14} className="mr-1.5 text-blue-500" />
                          <span className="font-medium">{assignee?.name || '미정'}</span>
                        </div>

                        {/* 담당 매니저 */}
                        <div className="flex items-center">
                          <User size={14} className="mr-1.5 text-purple-500" />
                          <span className="font-medium">{manager?.name || '미정'}</span>
                        </div>

                        {/* 시작일 */}
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-1.5" />
                          <span>{new Date(episode.startDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                        </div>

                        {/* 마감일 */}
                        {episode.dueDate && (
                          <div className="flex items-center">
                            <span className="text-gray-400 mr-1">→</span>
                            <span className="text-orange-600 font-medium">
                              {new Date(episode.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )}

                        {/* 완료일 (완료 상태인 경우) */}
                        {episode.status === 'completed' && episode.endDate && (
                          <div className="flex items-center">
                            <span className="text-green-600 text-xs">
                              ✓ {new Date(episode.endDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )}

                        {/* 비용 */}
                        {totalBudget > 0 && (
                          <div className="flex items-center">
                            <DollarSign size={14} className="mr-1 text-green-600" />
                            <span className="font-semibold text-gray-600">
                              {totalBudget.toLocaleString('ko-KR')}원
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 진행률 바 */}
                      {totalWorkItems > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">진행률</span>
                            <span className="font-semibold text-blue-600">{progressRate}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progressRate}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* 작업 내용 배지 */}
                      {episode.workContent.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {episode.workContent.map((work, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs font-medium"
                            >
                              {work}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                      <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0 ml-4" />
                    </div>
                  </button>

                  {/* 삭제 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteEpisodeId(episode.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-gray-50 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 border border-gray-200 hover:border-red-300"
                    title="회차 삭제"
                  >
                    <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}


      {/* 삭제 확인 모달 */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setIsDeleteModalOpen(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-gray-50 rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">프로젝트 삭제</h3>
              <p className="text-gray-600 mb-6">
                <span className="font-semibold text-gray-900">"{project.title}"</span> 프로젝트를 삭제하시겠습니까?
                <br />
                <span className="text-sm text-blue-600">휴지통으로 이동되며, 30일 이내에 복구할 수 있습니다.</span>
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 프로젝트 정보 수정 모달 */}
      {/* 통합 프로젝트 수정 모달 (탭 방식) */}
      {isProjectEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-modal-overlay">
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={cancelProjectEditModal}
          />

          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-gray-50 rounded-lg shadow-xl max-w-4xl w-full animate-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="sticky top-0 bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">프로젝트 수정</h2>
                  <button
                    onClick={cancelProjectEditModal}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                {/* 탭 네비게이션 */}
                <div className="flex gap-2 border-b border-gray-200 bg-gray-50 px-2 rounded-t-lg">
                  <button
                    onClick={() => setActiveEditTab('basic')}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all relative rounded-t-lg ${
                      activeEditTab === 'basic'
                        ? 'text-blue-600 bg-gray-50 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <FileText size={18} />
                    기본 정보
                    {activeEditTab === 'basic' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveEditTab('workers')}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all relative rounded-t-lg ${
                      activeEditTab === 'workers'
                        ? 'text-blue-600 bg-gray-50 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Users size={18} />
                    작업자 정보
                    {activeEditTab === 'workers' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveEditTab('budget')}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all relative rounded-t-lg ${
                      activeEditTab === 'budget'
                        ? 'text-blue-600 bg-gray-50 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <DollarSign size={18} />
                    비용 정보
                    {activeEditTab === 'budget' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                    )}
                  </button>
                </div>
              </div>

              {/* 탭 내용 */}
              <div className="p-6 max-h-[70vh] overflow-y-auto bg-gray-50">
                {activeEditTab === 'basic' && (
                  <div className="space-y-5">
                    {/* 프로젝트 기본 정보 카드 */}
                    <div className="bg-gray-50 rounded-xl p-5 shadow-sm border border-gray-100">
                      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText size={18} className="text-blue-600" />
                        프로젝트 기본
                      </h3>
                      <div className="space-y-4">
                        {/* 프로젝트 이름 */}
                        <FloatingLabelInput
                          label="프로젝트 이름"
                          required
                          type="text"
                          value={tempEditedProject.title || ''}
                          onChange={(e) => setTempEditedProject({ ...tempEditedProject, title: e.target.value })}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          {/* 프로젝트 상태 - 커스텀 드롭다운 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                              <Target size={14} className="text-gray-500" />
                              프로젝트 상태 <span className="text-gray-400 text-xs">(선택)</span>
                            </label>
                            <div className="relative" ref={statusDropdownRef}>
                              <button
                                type="button"
                                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                className={`w-full pl-10 pr-10 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer font-medium text-left ${
                                  (tempEditedProject.status || project?.status) === 'planning' ? 'border-blue-300 bg-blue-50 text-blue-700' :
                                  (tempEditedProject.status || project?.status) === 'in_progress' ? 'border-green-300 bg-green-50 text-green-700' :
                                  (tempEditedProject.status || project?.status) === 'completed' ? 'border-gray-300 bg-gray-50 text-gray-700' :
                                  'border-yellow-300 bg-yellow-50 text-yellow-700'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  {(tempEditedProject.status || project?.status) === 'planning' && '기획 중'}
                                  {(tempEditedProject.status || project?.status) === 'in_progress' && '진행 중'}
                                  {(tempEditedProject.status || project?.status) === 'completed' && '완료'}
                                  {(tempEditedProject.status || project?.status) === 'on_hold' && '보류'}
                                </span>
                              </button>
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                {(tempEditedProject.status || project?.status) === 'planning' && <Clock size={16} className="text-blue-600" />}
                                {(tempEditedProject.status || project?.status) === 'in_progress' && <TrendingUp size={16} className="text-green-600" />}
                                {(tempEditedProject.status || project?.status) === 'completed' && <CheckCircle2 size={16} className="text-gray-600" />}
                                {(tempEditedProject.status || project?.status) === 'on_hold' && <Pause size={16} className="text-yellow-600" />}
                              </div>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronRight size={16} className={`text-gray-500 transition-transform ${isStatusDropdownOpen ? 'rotate-90' : 'rotate-0'}`} />
                              </div>
                              {isStatusDropdownOpen && (
                                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl overflow-hidden animate-modal-content">
                                  {[
                                    { value: 'planning', label: '기획 중', icon: Clock, emoji: '🎯', color: 'blue', desc: '프로젝트 기획 단계' },
                                    { value: 'in_progress', label: '진행 중', icon: TrendingUp, emoji: '⚡', color: 'green', desc: '현재 작업 진행 중' },
                                    { value: 'completed', label: '완료', icon: CheckCircle2, emoji: '✅', color: 'gray', desc: '프로젝트 완료됨' },
                                    { value: 'on_hold', label: '보류', icon: Pause, emoji: '⏸️', color: 'yellow', desc: '일시적으로 중단' }
                                  ].map((status) => {
                                    const Icon = status.icon;
                                    const isSelected = (tempEditedProject.status || project?.status) === status.value;
                                    return (
                                      <button
                                        key={status.value}
                                        type="button"
                                        onClick={() => {
                                          setTempEditedProject({ ...tempEditedProject, status: status.value as Project['status'] });
                                          setIsStatusDropdownOpen(false);
                                        }}
                                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-${status.color}-50 transition-colors border-l-4 ${
                                          isSelected ? `bg-${status.color}-50 border-${status.color}-500` : 'border-transparent'
                                        }`}
                                      >
                                        <Icon size={18} className={`text-${status.color}-600 flex-shrink-0`} />
                                        <div className="flex-1 text-left">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-gray-900">{status.label}</span>
                                            {isSelected && <CheckCircle2 size={14} className="text-blue-600" />}
                                          </div>
                                          <p className="text-xs text-gray-500 mt-0.5">{status.desc}</p>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 클라이언트 - 커스텀 드롭다운 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                              <UserCircle size={14} className="text-gray-500" />
                              클라이언트 <span className="text-gray-400 text-xs">(선택)</span>
                            </label>
                            <div className="relative" ref={clientDropdownRef}>
                              <button
                                type="button"
                                onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                                className="w-full pl-10 pr-10 py-2.5 border-2 border-gray-300 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all cursor-pointer font-medium text-gray-700 hover:border-gray-400 text-left"
                              >
                                {tempSelectedClient || '클라이언트를 선택하세요'}
                              </button>
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <User size={16} className="text-gray-500" />
                              </div>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronRight size={16} className={`text-gray-500 transition-transform ${isClientDropdownOpen ? 'rotate-90' : 'rotate-0'}`} />
                              </div>
                              {isClientDropdownOpen && (
                                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto animate-modal-content">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTempSelectedClient('');
                                      setIsClientDropdownOpen(false);
                                    }}
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-l-4 border-transparent text-left"
                                  >
                                    <UserCircle size={18} className="text-gray-400 flex-shrink-0" />
                                    <span className="text-sm font-medium text-gray-400 italic">클라이언트 선택 안 함</span>
                                  </button>
                                  {clients.filter(c => c.status === 'active').map((client) => {
                                    const isSelected = tempSelectedClient === client.name;
                                    return (
                                      <button
                                        key={client.id}
                                        type="button"
                                        onClick={() => {
                                          setTempSelectedClient(client.name);
                                          setIsClientDropdownOpen(false);
                                        }}
                                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors border-l-4 ${
                                          isSelected ? 'bg-blue-50 border-blue-500' : 'border-transparent'
                                        }`}
                                      >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                                          {client.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 text-left">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-gray-900">{client.name}</span>
                                            {isSelected && <CheckCircle2 size={14} className="text-blue-600" />}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 설명 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            프로젝트 설명 <span className="text-gray-400 text-xs">(선택)</span>
                          </label>
                          <textarea
                            value={tempEditedProject.description || ''}
                            onChange={(e) => setTempEditedProject({ ...tempEditedProject, description: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] transition-shadow resize-none"
                            placeholder="프로젝트에 대한 설명을 입력하세요"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 분류 및 작업 카드 */}
                    <div className="bg-gray-50 rounded-xl p-5 shadow-sm border border-gray-100">
                      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Tag size={18} className="text-blue-600" />
                        분류 및 작업
                      </h3>
                      <div className="space-y-4">
                        {/* 분류 */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            분류 <span className="text-gray-400 text-xs">(선택)</span>
                          </label>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white flex items-center justify-between"
                            >
                              <span className={tempSelectedCategory ? 'text-gray-900' : 'text-gray-500'}>
                                {tempSelectedCategory || '선택하세요'}
                              </span>
                              <ChevronDown size={16} className="text-gray-400" />
                            </button>
                            {isCategoryDropdownOpen && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempSelectedCategory('');
                                    setIsCategoryDropdownOpen(false);
                                  }}
                                  className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                                    tempSelectedCategory === '' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                                  }`}
                                >
                                  선택하세요
                                </button>
                                {['예능', '교양', '쇼양', '스케치', '모션그래픽'].map((category) => (
                                  <button
                                    key={category}
                                    type="button"
                                    onClick={() => {
                                      setTempSelectedCategory(category);
                                      setIsCategoryDropdownOpen(false);
                                    }}
                                    className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                                      tempSelectedCategory === category ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                                    }`}
                                  >
                                    {category}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 작업 내용 */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-3 block">
                            작업 내용 <span className="text-gray-400 text-xs">(복수 선택)</span>
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            {(['롱폼', '기획 숏폼', '본편 숏폼', '썸네일'] as const).map((workType) => {
                              const icons = {
                                '롱폼': <Video size={16} />,
                                '기획 숏폼': <Video size={16} />,
                                '본편 숏폼': <Video size={16} />,
                                '썸네일': <Image size={16} />
                              };
                              return (
                                <label
                                  key={workType}
                                  className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                    tempWorkContent.includes(workType)
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={tempWorkContent.includes(workType)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setTempWorkContent([...tempWorkContent, workType]);
                                      } else {
                                        setTempWorkContent(tempWorkContent.filter(w => w !== workType));
                                      }
                                    }}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className={tempWorkContent.includes(workType) ? 'text-gray-600' : 'text-gray-700'}>
                                    {icons[workType]}
                                  </span>
                                  <span className={`text-sm font-medium ${tempWorkContent.includes(workType) ? 'text-gray-600' : 'text-gray-700'}`}>
                                    {workType}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeEditTab === 'workers' && (
                  <div className="space-y-5">
                    {/* 매니저 카드 */}
                    <div className="bg-gray-50 rounded-xl p-5 shadow-sm border border-gray-100">
                      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <UserCircle size={18} className="text-purple-600" />
                        매니저 <span className="text-gray-400 text-xs font-normal">(선택)</span>
                      </h3>
                      <div className="space-y-3">
                        {tempManagerIds.length === 0 ? (
                          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                            <UserCircle size={32} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500">매니저를 추가해보세요</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {tempManagerIds.map((managerId) => {
                              const manager = allPartners.find(p => p.id === managerId);
                              return manager ? (
                                <div key={managerId} className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-purple-25 border border-purple-100 rounded-lg group hover:shadow-md transition-all">
                                  <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
                                    {manager.name.charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{manager.name}</p>
                                    <p className="text-xs text-purple-600 font-medium">매니저</p>
                                  </div>
                                  <button
                                    onClick={() => setTempManagerIds(tempManagerIds.filter(id => id !== managerId))}
                                    className="flex-shrink-0 p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                        <div className="relative" ref={managerDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setIsManagerDropdownOpen(!isManagerDropdownOpen)}
                            className="w-full pl-10 pr-10 py-2.5 border-2 border-purple-300 bg-purple-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all cursor-pointer font-medium text-purple-700 hover:border-purple-400 text-left"
                          >
                            + 매니저 추가
                          </button>
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <UserCircle size={16} className="text-purple-600" />
                          </div>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ChevronRight size={16} className={`text-purple-600 transition-transform ${isManagerDropdownOpen ? 'rotate-90' : 'rotate-0'}`} />
                          </div>
                          {isManagerDropdownOpen && allPartners.filter(p => !tempManagerIds.includes(p.id)).length > 0 && (
                            <div className="absolute z-50 w-full mt-2 bg-white border-2 border-purple-200 rounded-xl shadow-xl max-h-64 overflow-y-auto animate-modal-content">
                              {allPartners.filter(p => !tempManagerIds.includes(p.id)).map((manager) => (
                                <button
                                  key={manager.id}
                                  type="button"
                                  onClick={() => {
                                    setTempManagerIds([...tempManagerIds, manager.id]);
                                    setIsManagerDropdownOpen(false);
                                  }}
                                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-purple-50 transition-colors border-l-4 border-transparent text-left"
                                >
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                                    {manager.name.charAt(0)}
                                  </div>
                                  <div className="flex-1">
                                    <span className="text-sm font-semibold text-gray-900">{manager.name}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 담당 파트너 카드 */}
                    <div className="bg-gray-50 rounded-xl p-5 shadow-sm border border-gray-100">
                      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Users size={18} className="text-green-600" />
                        담당 파트너 <span className="text-gray-400 text-xs font-normal">(선택)</span>
                      </h3>
                      <div className="space-y-3">
                        {tempPartnerIds.length === 0 ? (
                          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                            <Users size={32} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500">파트너를 추가해보세요</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {tempPartnerIds.map((partnerId) => {
                              const partner = allPartners.find(p => p.id === partnerId);
                              return partner ? (
                                <div key={partnerId} className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-green-25 border border-green-100 rounded-lg group hover:shadow-md transition-all">
                                  <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
                                    {partner.name.charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{partner.name}</p>
                                    <p className="text-xs text-green-600 font-medium">파트너</p>
                                  </div>
                                  <button
                                    onClick={() => setTempPartnerIds(tempPartnerIds.filter(id => id !== partnerId))}
                                    className="flex-shrink-0 p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                        <div className="relative" ref={partnerDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setIsPartnerDropdownOpen(!isPartnerDropdownOpen)}
                            className="w-full pl-10 pr-10 py-2.5 border-2 border-green-300 bg-green-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all cursor-pointer font-medium text-green-700 hover:border-green-400 text-left"
                          >
                            + 파트너 추가
                          </button>
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Users size={16} className="text-green-600" />
                          </div>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ChevronRight size={16} className={`text-green-600 transition-transform ${isPartnerDropdownOpen ? 'rotate-90' : 'rotate-0'}`} />
                          </div>
                          {isPartnerDropdownOpen && allPartners.filter(p => !tempPartnerIds.includes(p.id)).length > 0 && (
                            <div className="absolute z-50 w-full mt-2 bg-white border-2 border-green-200 rounded-xl shadow-xl max-h-64 overflow-y-auto animate-modal-content">
                              {allPartners.filter(p => !tempPartnerIds.includes(p.id)).map((partner) => (
                                <button
                                  key={partner.id}
                                  type="button"
                                  onClick={() => {
                                    setTempPartnerIds([...tempPartnerIds, partner.id]);
                                    setIsPartnerDropdownOpen(false);
                                  }}
                                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-green-50 transition-colors border-l-4 border-transparent text-left"
                                >
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                                    {partner.name.charAt(0)}
                                  </div>
                                  <div className="flex-1">
                                    <span className="text-sm font-semibold text-gray-900">{partner.name}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeEditTab === 'budget' && (
                  <div className="space-y-5">
                    {/* 전체 비용 카드 */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/80 rounded-xl p-6 shadow-sm border-2 border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-blue-700">프로젝트 총 비용</h3>
                        <DollarSign size={24} className="text-blue-500" />
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={formatCurrency(tempTotalAmount)}
                          onChange={(e) => updateTempTotalAmount(e.target.value)}
                          className="w-full px-4 py-3 pr-16 text-3xl font-bold bg-gray-50 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition-all"
                          placeholder="0"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-medium">원</span>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">아래 작업별 비용의 합계와 다를 수 있습니다</p>
                    </div>

                    {/* 작업별 비용 */}
                    <div className="bg-gray-50 rounded-xl p-5 shadow-sm border border-gray-100">
                      <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Tag size={18} className="text-blue-600" />
                        작업별 비용 <span className="text-gray-400 text-xs font-normal">(선택)</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {/* 롱폼 */}
                        <div className={`bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border-2 shadow-sm hover:shadow-md transition-all ${
                          tempWorkContent.includes('롱폼') ? 'border-gray-200 opacity-100' : 'border-gray-100 opacity-40'
                        }`}>
                          <div className="flex items-center gap-2 mb-3">
                            <Video size={18} className="text-gray-600" />
                            <p className="text-sm font-bold text-gray-900">롱폼</p>
                            {!tempWorkContent.includes('롱폼') && (
                              <span className="ml-auto text-xs text-gray-400 italic">미선택</span>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-medium text-gray-600 block mb-1.5">파트너 비용</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={formatCurrency(tempWorkTypeCosts['롱폼'].partnerCost)}
                                  onChange={(e) => updateTempWorkTypeCost('롱폼', 'partnerCost', e.target.value)}
                                  className="w-full px-3 py-2.5 pr-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-all"
                                  placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">원</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 block mb-1.5">매니징 비용</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={formatCurrency(tempWorkTypeCosts['롱폼'].managementCost)}
                                  onChange={(e) => updateTempWorkTypeCost('롱폼', 'managementCost', e.target.value)}
                                  className="w-full px-3 py-2.5 pr-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-all"
                                  placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">원</span>
                              </div>
                            </div>
                            <div className="pt-2 mt-2 border-t-2 border-gray-200">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-gray-600">소계</span>
                                <span className="text-sm font-bold text-gray-900">
                                  {formatCurrency(tempWorkTypeCosts['롱폼'].partnerCost + tempWorkTypeCosts['롱폼'].managementCost)}원
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 기획 숏폼 */}
                        <div className={`bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border-2 shadow-sm hover:shadow-md transition-all ${
                          tempWorkContent.includes('기획 숏폼') ? 'border-gray-200 opacity-100' : 'border-gray-100 opacity-40'
                        }`}>
                          <div className="flex items-center gap-2 mb-3">
                            <Video size={18} className="text-gray-600" />
                            <p className="text-sm font-bold text-gray-900">기획 숏폼</p>
                            {!tempWorkContent.includes('기획 숏폼') && (
                              <span className="ml-auto text-xs text-gray-400 italic">미선택</span>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-medium text-gray-600 block mb-1.5">파트너 비용</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={formatCurrency(tempWorkTypeCosts['기획 숏폼'].partnerCost)}
                                  onChange={(e) => updateTempWorkTypeCost('기획 숏폼', 'partnerCost', e.target.value)}
                                  className="w-full px-3 py-2.5 pr-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-all"
                                  placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">원</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 block mb-1.5">매니징 비용</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={formatCurrency(tempWorkTypeCosts['기획 숏폼'].managementCost)}
                                  onChange={(e) => updateTempWorkTypeCost('기획 숏폼', 'managementCost', e.target.value)}
                                  className="w-full px-3 py-2.5 pr-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-all"
                                  placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">원</span>
                              </div>
                            </div>
                            <div className="pt-2 mt-2 border-t-2 border-gray-200">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-gray-600">소계</span>
                                <span className="text-sm font-bold text-gray-900">
                                  {formatCurrency(tempWorkTypeCosts['기획 숏폼'].partnerCost + tempWorkTypeCosts['기획 숏폼'].managementCost)}원
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 본편 숏폼 */}
                        <div className={`bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border-2 shadow-sm hover:shadow-md transition-all ${
                          tempWorkContent.includes('본편 숏폼') ? 'border-gray-200 opacity-100' : 'border-gray-100 opacity-40'
                        }`}>
                          <div className="flex items-center gap-2 mb-3">
                            <Video size={18} className="text-gray-600" />
                            <p className="text-sm font-bold text-gray-900">본편 숏폼</p>
                            {!tempWorkContent.includes('본편 숏폼') && (
                              <span className="ml-auto text-xs text-gray-400 italic">미선택</span>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-medium text-gray-600 block mb-1.5">파트너 비용</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={formatCurrency(tempWorkTypeCosts['본편 숏폼'].partnerCost)}
                                  onChange={(e) => updateTempWorkTypeCost('본편 숏폼', 'partnerCost', e.target.value)}
                                  className="w-full px-3 py-2.5 pr-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-all"
                                  placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">원</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 block mb-1.5">매니징 비용</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={formatCurrency(tempWorkTypeCosts['본편 숏폼'].managementCost)}
                                  onChange={(e) => updateTempWorkTypeCost('본편 숏폼', 'managementCost', e.target.value)}
                                  className="w-full px-3 py-2.5 pr-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-all"
                                  placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">원</span>
                              </div>
                            </div>
                            <div className="pt-2 mt-2 border-t-2 border-gray-200">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-gray-600">소계</span>
                                <span className="text-sm font-bold text-gray-900">
                                  {formatCurrency(tempWorkTypeCosts['본편 숏폼'].partnerCost + tempWorkTypeCosts['본편 숏폼'].managementCost)}원
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 썸네일 */}
                        <div className={`bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border-2 shadow-sm hover:shadow-md transition-all ${
                          tempWorkContent.includes('썸네일') ? 'border-gray-200 opacity-100' : 'border-gray-100 opacity-40'
                        }`}>
                          <div className="flex items-center gap-2 mb-3">
                            <Image size={18} className="text-gray-600" />
                            <p className="text-sm font-bold text-gray-900">썸네일</p>
                            {!tempWorkContent.includes('썸네일') && (
                              <span className="ml-auto text-xs text-gray-400 italic">미선택</span>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-medium text-gray-600 block mb-1.5">파트너 비용</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={formatCurrency(tempWorkTypeCosts['썸네일'].partnerCost)}
                                  onChange={(e) => updateTempWorkTypeCost('썸네일', 'partnerCost', e.target.value)}
                                  className="w-full px-3 py-2.5 pr-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-all"
                                  placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">원</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 block mb-1.5">매니징 비용</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={formatCurrency(tempWorkTypeCosts['썸네일'].managementCost)}
                                  onChange={(e) => updateTempWorkTypeCost('썸네일', 'managementCost', e.target.value)}
                                  className="w-full px-3 py-2.5 pr-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-all"
                                  placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">원</span>
                              </div>
                            </div>
                            <div className="pt-2 mt-2 border-t-2 border-gray-200">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-gray-600">소계</span>
                                <span className="text-sm font-bold text-gray-900">
                                  {formatCurrency(tempWorkTypeCosts['썸네일'].partnerCost + tempWorkTypeCosts['썸네일'].managementCost)}원
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 푸터 */}
              <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3 rounded-b-lg">
                <button
                  onClick={cancelProjectEditModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  취소
                </button>
                <button
                  onClick={saveProjectEditModal}
                  disabled={isSavingProject}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingProject ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 회차 삭제 확인 모달 */}
      {deleteEpisodeId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setDeleteEpisodeId(null)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-gray-50 rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">회차 삭제</h3>
              <p className="text-gray-600 mb-6">
                <span className="font-semibold text-gray-900">"{episodes.find(ep => ep.id === deleteEpisodeId)?.title}"</span>을(를) 삭제하시겠습니까?
                <br />
                <span className="text-sm text-blue-600">휴지통으로 이동되며, 30일 이내에 복구할 수 있습니다.</span>
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteEpisodeId(null)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteEpisode}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 체크리스트 모달 */}
      {project && <ProjectChecklistModal
        project={project}
        episodes={episodes}
        isOpen={isChecklistModalOpen}
        onClose={() => setIsChecklistModalOpen(false)}
        onEpisodeClick={(episode) => {
          setSelectedEpisodeForDetail(episode);
          setIsChecklistModalOpen(false);
        }}
      />}

      {/* 에피소드 상세 모달 */}
      {selectedEpisodeForDetail && (
        <EpisodeDetailModal
          episode={selectedEpisodeForDetail}
          partner={allPartners.find(p => p.id === selectedEpisodeForDetail.assignee)}
          partners={allPartners}
          projectWorkTypeCosts={workTypeCosts}
          isOpen={!!selectedEpisodeForDetail}
          onClose={() => setSelectedEpisodeForDetail(null)}
          onSave={async (updatedEpisode) => {
            const ok = await upsertEpisode({ ...updatedEpisode, projectId });
            if (ok) {
              setEpisodes(prev =>
                prev.map(e => e.id === updatedEpisode.id ? { ...updatedEpisode, projectId } : e)
              );
              showToastMessage('회차가 저장되었습니다.');
            } else {
              showToastMessage('저장에 실패했습니다. 다시 시도해주세요.');
            }
          }}
        />
      )}

      {/* 토스트 알림 */}
      {showToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-modal-content">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[320px]">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle2 size={20} className="text-white" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{toastMessage}</p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// 상태 배지 컴포넌트
function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
    planning: { label: '기획 중', color: 'text-gray-600', bgColor: 'bg-blue-100' },
    in_progress: { label: '진행 중', color: 'text-gray-600', bgColor: 'bg-green-100' },
    completed: { label: '완료', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    on_hold: { label: '보류', color: 'text-gray-600', bgColor: 'bg-orange-100' },
  };

  const { label, color, bgColor } = statusMap[status] || statusMap.on_hold;

  return (
    <span className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${color} ${bgColor}`}>
      {label}
    </span>
  );
}

// 에피소드 상태 배지 컴포넌트
function EpisodeStatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
    waiting: { label: '대기', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    in_progress: { label: '진행 중', color: 'text-gray-600', bgColor: 'bg-blue-100' },
    review: { label: '검토', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    completed: { label: '완료', color: 'text-gray-600', bgColor: 'bg-green-100' },
  };

  const { label, color, bgColor } = statusMap[status] || statusMap.waiting;

  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${color} ${bgColor}`}>
      {label}
    </span>
  );
}
