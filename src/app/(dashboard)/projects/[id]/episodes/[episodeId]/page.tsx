'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Episode, Partner, EpisodeWorkItem, WorkContentType, Project, WorkStep, WorkTypeBudget } from '@/types';
import { Plus, Calendar, DollarSign, ChevronDown, ChevronRight, ArrowLeft, X, User } from 'lucide-react';
import { getProjects, getProjectEpisodes, getPartners, upsertEpisode } from '@/lib/supabase/db';
import DateRangePicker from '@/components/DateRangePicker';
import DatePicker from '@/components/DatePicker';
import { motion, AnimatePresence } from 'framer-motion';

// 모든 작업 타입 정의
const ALL_WORK_TYPES: WorkContentType[] = ['롱폼', '기획 숏폼', '본편 숏폼', '썸네일'];


interface EpisodeWithProjectId extends Episode {
  projectId: string;
}

export default function EpisodeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const episodeId = params.episodeId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<WorkContentType | null>(null);
  const [editedEpisode, setEditedEpisode] = useState<Episode | null>(null);

  // 초기 마운트 추적
  const isInitialMount = useRef(true);
  // 수정 후에만 주황→검정 애니메이션 재생
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());

  // 자동 저장 상태
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 섹션 접기/펼치기 상태
  const [collapsedSections, setCollapsedSections] = useState({
    basicInfo: false,
    budget: false,
  });
  const [paymentStatusOpen, setPaymentStatusOpen] = useState(false);
  const paymentStatusRef = useRef<HTMLDivElement>(null);
  const [invoiceStatusOpen, setInvoiceStatusOpen] = useState(false);
  const invoiceStatusRef = useRef<HTMLDivElement>(null);

  // 각 작업 타입별 작업 단계들을 관리
  const [workSteps, setWorkSteps] = useState<Record<WorkContentType, WorkStep[]>>({
    '롱폼': [],
    '기획 숏폼': [],
    '본편 숏폼': [],
    '썸네일': [],
  });

  const [prevWorkSteps, setPrevWorkSteps] = useState<Record<WorkContentType, WorkStep[] | null>>({
    '롱폼': null,
    '기획 숏폼': null,
    '본편 숏폼': null,
    '썸네일': null,
  });

  // 각 작업 타입별 비용 관리
  const [workBudgets, setWorkBudgets] = useState<Record<WorkContentType, WorkTypeBudget>>({
    '롱폼': { partnerPayment: 0, managementFee: 0 },
    '기획 숏폼': { partnerPayment: 0, managementFee: 0 },
    '본편 숏폼': { partnerPayment: 0, managementFee: 0 },
    '썸네일': { partnerPayment: 0, managementFee: 0 },
  });

  // 비용 상세 펼침/접힘 상태
  const [expandedBudgets, setExpandedBudgets] = useState<Record<WorkContentType, boolean>>({
    '롱폼': false,
    '기획 숏폼': false,
    '본편 숏폼': false,
    '썸네일': false,
  });

  // 작업 타입 펼침/접힘 상태
  const [expandedWorkTypes, setExpandedWorkTypes] = useState<Record<WorkContentType, boolean>>({
    '롱폼': true,
    '기획 숏폼': true,
    '본편 숏폼': true,
    '썸네일': true,
  });

  // 작업 목록 모달 상태
  const [selectedWorkTypeModal, setSelectedWorkTypeModal] = useState<WorkContentType | null>(null);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [isTabSwitching, setIsTabSwitching] = useState(false);
  const [modalHeight, setModalHeight] = useState<number | null>(null);
  const modalCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tabSwitchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modalContentRef = useRef<HTMLDivElement | null>(null);

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

  // 탭 전환 함수
  const switchTab = (newWorkType: WorkContentType) => {
    if (newWorkType === selectedWorkTypeModal) return;
    if (!modalContentRef.current) return;

    // 1. 현재 높이 측정 및 고정
    const currentHeight = modalContentRef.current.offsetHeight;
    setModalHeight(currentHeight);

    setIsTabSwitching(true);
    if (tabSwitchTimeoutRef.current) {
      clearTimeout(tabSwitchTimeoutRef.current);
    }

    // 2. 콘텐츠 페이드 아웃 (200ms)
    setTimeout(() => {
      // 3. 콘텐츠 변경
      setSelectedWorkTypeModal(newWorkType);

      // 4. 높이를 auto로 임시 설정해서 진짜 높이 측정
      requestAnimationFrame(() => {
        if (modalContentRef.current) {
          // auto로 설정 (transition 없이)
          modalContentRef.current.style.transition = 'none';
          modalContentRef.current.style.height = 'auto';

          // 진짜 높이 측정
          const newHeight = modalContentRef.current.offsetHeight;

          // 현재 높이로 다시 설정 (transition 없이)
          modalContentRef.current.style.height = `${currentHeight}px`;

          // 다음 프레임에서 transition 재활성화 및 새 높이로 전환
          requestAnimationFrame(() => {
            if (modalContentRef.current) {
              modalContentRef.current.style.transition = 'height 600ms cubic-bezier(0.4, 0, 0.2, 1)';
              setModalHeight(newHeight);

              // 5. 페이드 인 시작
              setTimeout(() => {
                setIsTabSwitching(false);
                // 6. 애니메이션 완료 후 높이 auto로 복귀
                setTimeout(() => {
                  setModalHeight(null);
                  if (modalContentRef.current) {
                    modalContentRef.current.style.transition = '';
                  }
                }, 600);
              }, 50);
            }
          });
        }
      });
    }, 200);
  };

  // 토스트 알림 상태
  const [toast, setToast] = useState<{ message: string; show: boolean; isClosing: boolean }>({
    message: '',
    show: false,
    isClosing: false
  });
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 토스트 표시 함수
  const showToast = (message: string) => {
    // 기존 타이머 제거
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    if (toastCloseTimeoutRef.current) {
      clearTimeout(toastCloseTimeoutRef.current);
    }

    setToast({ message, show: true, isClosing: false });

    // 2.7초 후 닫힘 애니메이션 시작
    toastTimeoutRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, isClosing: true }));

      // 0.3초 후 완전히 숨김 (애니메이션 시간)
      toastCloseTimeoutRef.current = setTimeout(() => {
        setToast({ message: '', show: false, isClosing: false });
      }, 300);
    }, 2700);
  };

  // 데이터 로드
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (paymentStatusRef.current && !paymentStatusRef.current.contains(e.target as Node)) {
        setPaymentStatusOpen(false);
      }
      if (invoiceStatusRef.current && !invoiceStatusRef.current.contains(e.target as Node)) {
        setInvoiceStatusOpen(false);
      }
    };
    if (paymentStatusOpen || invoiceStatusOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [paymentStatusOpen, invoiceStatusOpen]);

  useEffect(() => {
    const loadData = async () => {
      const [projects, episodes, partnersData] = await Promise.all([
        getProjects(),
        getProjectEpisodes(projectId),
        getPartners(),
      ]);

      const foundProject = projects.find(p => p.id === projectId);
      if (foundProject) setProject(foundProject);

      const foundEpisode = episodes.find(e => e.id === episodeId);
      if (foundEpisode) {
        setEpisode(foundEpisode);
        setEditedEpisode(foundEpisode);

        if (foundEpisode.workSteps) {
          // 기존 작업 단계들의 label을 카테고리 기반으로 자동 재생성
          const relabeledSteps = { ...foundEpisode.workSteps };
          for (const wt of Object.keys(relabeledSteps) as WorkContentType[]) {
            const steps = relabeledSteps[wt];
            if (!steps) continue;
            const categoryCount: Record<string, number> = {};
            relabeledSteps[wt] = steps.map(step => {
              const cat = step.category || '가편';
              if (cat === '원본 전달') return { ...step, label: '원본 전달' };
              categoryCount[cat] = (categoryCount[cat] || 0) + 1;
              return { ...step, label: `${categoryCount[cat]}차 ${cat}` };
            });
          }
          setWorkSteps(relabeledSteps);
        }

        if (foundEpisode.workBudgets) {
          setWorkBudgets(foundEpisode.workBudgets);
        } else if (foundProject?.workTypeCosts && foundEpisode.workContent) {
          const newBudgets = { ...workBudgets };
          foundEpisode.workContent.forEach(workType => {
            if (foundProject.workTypeCosts![workType]) {
              newBudgets[workType] = {
                partnerPayment: foundProject.workTypeCosts![workType].partnerCost,
                managementFee: foundProject.workTypeCosts![workType].managementCost,
              };
            }
          });
          setWorkBudgets(newBudgets);
        }
      }

      setPartners(partnersData);
      isInitialMount.current = false;
    };
    loadData();
  }, [projectId, episodeId]);

  // 실시간 자동 저장
  useEffect(() => {
    // 초기 마운트 시에는 저장하지 않음
    if (isInitialMount.current || !editedEpisode) return;

    setSaveStatus('saving');

    const updatedEpisodeData: Episode & { projectId: string } = {
      ...editedEpisode,
      projectId,
      status: getOverallEpisodeStatus(),
      workSteps,
      workBudgets,
      updatedAt: new Date().toISOString(),
    };

    upsertEpisode(updatedEpisodeData).then(() => {
      setSaveStatus('saved');
      if (saveStatusTimeoutRef.current) clearTimeout(saveStatusTimeoutRef.current);
      saveStatusTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    });
  }, [editedEpisode, workSteps, workBudgets, episodeId, projectId]);

  if (!episode || !editedEpisode || !project) {
    return (
      <div className="min-h-screen bg-[#f5f4f2] flex items-center justify-center">
        <div className="text-center bg-white rounded-xl border border-gray-100 px-8 py-6">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  const partner = partners.find(p => p.id === editedEpisode.assignee);
  const managerPartner = partners.find(p => p.id === editedEpisode.manager);

  // 실제 종료일 계산 (모든 작업 단계의 마감일 중 가장 늦은 날짜)
  const calculateActualEndDate = (): string | null => {
    let latestDate: string | null = null;

    activeWorkTypes.forEach(workType => {
      const steps = workSteps[workType] || [];
      steps.forEach(step => {
        if (step.dueDate) {
          if (!latestDate || new Date(step.dueDate) > new Date(latestDate)) {
            latestDate = step.dueDate;
          }
        }
      });
    });

    return latestDate;
  };

  // 활성화된 작업 타입 목록
  const activeWorkTypes = editedEpisode.workContent || [];

  // 비활성화된 작업 타입 목록
  const inactiveWorkTypes = ALL_WORK_TYPES.filter(type => !activeWorkTypes.includes(type));

  // 작업 추가 (비활성화 → 활성화)
  const handleAddWorkType = (workType: WorkContentType) => {
    const updatedWorkContent = [...editedEpisode.workContent, workType];
    const newWorkItem: EpisodeWorkItem = {
      type: workType,
      status: 'waiting',
      startDate: editedEpisode.startDate,
      dueDate: editedEpisode.dueDate,
    };
    const updatedWorkItems = [...(editedEpisode.workItems || []), newWorkItem];

    setEditedEpisode(prev => prev ? ({
      ...prev,
      workContent: updatedWorkContent,
      workItems: updatedWorkItems,
    }) : null);

    // 프로젝트의 비용 정보를 기반으로 작업별 비용 자동 설정
    if (project.workTypeCosts && project.workTypeCosts[workType]) {
      setWorkBudgets(prev => ({
        ...prev,
        [workType]: {
          partnerPayment: project.workTypeCosts![workType]!.partnerCost,
          managementFee: project.workTypeCosts![workType]!.managementCost,
        },
      }));
    }

    // 작업 단계도 1개 자동 생성
    const newStep: WorkStep = {
      id: `${workType}-${Date.now()}`,
      label: '원본 전달',
      category: '원본 전달',
      status: 'waiting',
      startDate: editedEpisode.startDate,
      dueDate: editedEpisode.dueDate || '',
      assigneeId: editedEpisode.assignee || undefined,
    };

    setWorkSteps(prev => ({
      ...prev,
      [workType]: [newStep],
    }));
  };

  // 작업 제거 (활성화 → 비활성화)
  const handleRemoveWorkType = (workType: WorkContentType) => {
    const updatedWorkContent = editedEpisode.workContent.filter(type => type !== workType);
    const updatedWorkItems = (editedEpisode.workItems || []).filter(item => item.type !== workType);

    setEditedEpisode(prev => prev ? ({
      ...prev,
      workContent: updatedWorkContent,
      workItems: updatedWorkItems,
    }) : null);

    // 작업 단계도 초기화
    setWorkSteps(prev => ({
      ...prev,
      [workType]: [],
    }));
  };

  // 카테고리별 자동 label 생성
  const generateStepLabel = (category: string, workType: WorkContentType, existingSteps: WorkStep[], excludeStepId?: string) => {
    if (category === '원본 전달') return '원본 전달';
    const sameCategory = existingSteps.filter(s => s.category === category && s.id !== excludeStepId);
    const count = sameCategory.length + 1;
    return `${count}차 ${category}`;
  };

  // 작업 단계 추가
  const handleAddWorkStep = (workType: WorkContentType) => {
    const existing = workSteps[workType] || [];
    const isFirst = existing.length === 0;
    const category = isFirst ? '원본 전달' : '가편';
    const label = generateStepLabel(category, workType, existing);
    const newStep: WorkStep = {
      id: `${workType}-${Date.now()}`,
      label,
      category,
      status: 'waiting',
      startDate: editedEpisode.startDate,
      dueDate: editedEpisode.dueDate || '',
      assigneeId: editedEpisode.assignee || undefined,
    };

    setWorkSteps(prev => ({
      ...prev,
      [workType]: [...(prev[workType] || []), newStep],
    }));
  };

  // 작업 단계 제거
  const handleRemoveWorkStep = (workType: WorkContentType, stepId: string) => {
    setWorkSteps(prev => ({
      ...prev,
      [workType]: prev[workType].filter(step => step.id !== stepId),
    }));
  };

  // 작업 단계 업데이트
  const handleUpdateWorkStep = (
    workType: WorkContentType,
    stepId: string,
    field: keyof WorkStep,
    value: string
  ) => {
    setWorkSteps(prev => {
      const steps = prev[workType];
      if (field === 'category') {
        // 카테고리 변경 시 label 자동 갱신
        const label = generateStepLabel(value, workType, steps, stepId);
        return {
          ...prev,
          [workType]: steps.map(step =>
            step.id === stepId ? { ...step, category: value, label } : step
          ),
        };
      }
      return {
        ...prev,
        [workType]: steps.map(step =>
          step.id === stepId ? { ...step, [field]: value } : step
        ),
      };
    });
  };

  // 비용 토글
  const toggleBudget = (workType: WorkContentType) => {
    setExpandedBudgets(prev => ({
      ...prev,
      [workType]: !prev[workType],
    }));
  };

  // 비용 업데이트
  // 금액 포맷: 550000 → "550,000"
  const formatCurrency = (v: number | undefined): string => {
    if (!v) return '';
    return v.toLocaleString();
  };
  // 콤마 제거 후 숫자 파싱
  const parseCurrency = (s: string): number => {
    return Number(s.replace(/,/g, '')) || 0;
  };

  const handleUpdateBudget = (
    workType: WorkContentType,
    field: 'partnerPayment' | 'managementFee',
    value: number
  ) => {
    setWorkBudgets(prev => ({
      ...prev,
      [workType]: {
        ...prev[workType],
        [field]: value,
      },
    }));
  };

  // 작업 타입별 총 비용 계산
  const getTotalBudget = (workType: WorkContentType): number => {
    const budget = workBudgets[workType];
    return budget.partnerPayment + budget.managementFee;
  };


  // 모든 작업 단계를 완료로 표시
  const handleMarkAllComplete = (workType: WorkContentType) => {
    setPrevWorkSteps(prev => ({ ...prev, [workType]: workSteps[workType].map(s => ({ ...s })) }));
    setWorkSteps(prev => ({
      ...prev,
      [workType]: prev[workType].map(step => ({ ...step, status: 'completed' as const })),
    }));
  };

  // 되돌리기
  const handleUndoMarkAll = (workType: WorkContentType) => {
    const saved = prevWorkSteps[workType];
    if (!saved) return;
    setWorkSteps(prev => ({ ...prev, [workType]: saved }));
    setPrevWorkSteps(prev => ({ ...prev, [workType]: null }));
  };

  // 섹션 토글
  const toggleSection = (section: 'basicInfo' | 'budget') => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // 작업 타입의 전체 상태 계산 (작업 단계들의 상태를 기반으로)
  const getWorkTypeStatus = (workType: WorkContentType): 'waiting' | 'in_progress' | 'completed' => {
    const steps = workSteps[workType] || [];

    // 작업 단계가 없으면 대기
    if (steps.length === 0) return 'waiting';

    // 하나라도 진행 중이면 진행 중
    if (steps.some(step => step.status === 'in_progress')) {
      return 'in_progress';
    }

    // 모두 완료면 완료
    if (steps.every(step => step.status === 'completed')) {
      return 'completed';
    }

    // 일부가 완료되고 나머지가 대기 중이면 진행 중으로 처리
    // (예: 1차 종편 완료, 2차 종편 대기 → 진행 중)
    if (steps.some(step => step.status === 'completed')) {
      return 'in_progress';
    }

    // 그 외는 대기 (모두 대기인 경우)
    return 'waiting';
  };

  // 전체 회차의 상태 계산 (모든 작업 타입의 상태를 기반으로)
  const getOverallEpisodeStatus = (): 'waiting' | 'in_progress' | 'review' | 'completed' => {
    if (activeWorkTypes.length === 0) return 'waiting';

    // 모든 작업 타입의 상태를 확인
    const workTypeStatuses = activeWorkTypes.map(workType => getWorkTypeStatus(workType));

    // 하나라도 진행 중이면 진행 중
    if (workTypeStatuses.some(status => status === 'in_progress')) {
      return 'in_progress';
    }

    // 모두 완료면 완료
    if (workTypeStatuses.every(status => status === 'completed')) {
      return 'completed';
    }

    // 일부 작업이 완료되고 나머지가 대기 중이면 진행 중으로 처리
    // (예: 롱폼 완료, 본편 숏폼 대기 → 진행 중)
    if (workTypeStatuses.some(status => status === 'completed')) {
      return 'in_progress';
    }

    // 그 외는 대기 (모든 작업이 대기 중인 경우)
    return 'waiting';
  };

  const handleFieldClick = (field: string) => {
    setEditingField(field);
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedEpisode(prev => prev ? ({ ...prev, [field]: value }) : null);
    setEditedFields(prev => new Set(prev).add(field));
  };

  const handleFieldBlur = () => {
    setEditingField(null);
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      waiting: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      review: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
    };
    return statusMap[status] || statusMap.waiting;
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      waiting: '대기',
      in_progress: '진행 중',
      review: '검토 중',
      completed: '완료',
    };
    return statusMap[status] || status;
  };

  return (
    <div className="min-h-screen bg-[#f5f4f2]">
      <div className="max-w-5xl mx-auto py-8 px-4">
        {/* 헤더 + 기본 정보 통합 */}
        <div data-tour="tour-episode-header" className="bg-white rounded-xl border border-gray-100 mb-6">
          <div className="px-6 py-4">
            {/* 뒤로가기 버튼 */}
            <button
              onClick={() => router.push(`/projects/${projectId}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">프로젝트로 돌아가기</span>
            </button>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1">
                {editingField === 'episodeNumber' ? (
                  <motion.div
                    className="flex items-center"
                    initial={{ scaleX: 0.9, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    style={{ originX: 0 }}
                  >
                    <input
                      type="number"
                      autoFocus
                      value={editedEpisode.episodeNumber}
                      onChange={(e) => handleFieldChange('episodeNumber', Number(e.target.value))}
                      onBlur={handleFieldBlur}
                      className="text-2xl font-bold text-gray-900 bg-orange-50/50 border-b-2 border-orange-400 border-t-0 border-l-0 border-r-0 rounded-none px-1 py-0.5 w-16 focus:outline-none focus:ring-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-2xl font-bold text-gray-900 ml-0.5">편</span>
                  </motion.div>
                ) : (
                  <motion.span
                    key={`ep-display-${editedEpisode.episodeNumber}`}
                    onClick={() => handleFieldClick('episodeNumber')}
                    className="text-2xl font-bold cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2"
                    initial={{ color: editedFields.has('episodeNumber') ? '#ea580c' : '#1c1917' }}
                    animate={{ color: '#1c1917' }}
                    transition={{ duration: 0.6, delay: 1, ease: 'easeOut' }}
                  >
                    {editedEpisode.episodeNumber}편
                  </motion.span>
                )}
                {editingField === 'title' ? (
                  <motion.div
                    initial={{ scaleX: 0.9, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    style={{ originX: 0 }}
                  >
                    <input
                      type="text"
                      autoFocus
                      value={editedEpisode.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      onBlur={handleFieldBlur}
                      className="text-2xl font-bold text-gray-900 bg-orange-50/50 border-b-2 border-orange-400 border-t-0 border-l-0 border-r-0 rounded-none px-1 py-0.5 focus:outline-none focus:ring-0"
                    />
                  </motion.div>
                ) : (
                  <motion.span
                    key={`title-display-${editedEpisode.title}`}
                    onClick={() => handleFieldClick('title')}
                    className="text-2xl font-bold cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                    initial={{ color: editedFields.has('title') ? '#ea580c' : '#1c1917' }}
                    animate={{ color: '#1c1917' }}
                    transition={{ duration: 0.6, delay: 1, ease: 'easeOut' }}
                  >
                    {editedEpisode.title}
                  </motion.span>
                )}
                {(() => {
                  const overallStatus = getOverallEpisodeStatus();
                  return (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(overallStatus)}`}>
                      {getStatusLabel(overallStatus)}
                    </span>
                  );
                })()}
              </div>

              {/* 자동 저장 표시 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {saveStatus === 'saving' && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    저장 중...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-xs text-green-600 flex items-center gap-1 animate-fade-in">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    저장됨
                  </span>
                )}
              </div>
            </div>

            {/* 기본 정보 */}
            <div data-tour="tour-episode-info" className="border-t border-gray-200 pt-4 space-y-3">
              <div className="grid grid-cols-3 gap-4 mb-1">
                <div>
                  <label className="text-sm text-gray-500 block">시작일</label>
                </div>
                <div>
                  <label className="text-sm text-gray-500 block">예정 종료일</label>
                </div>
                <div>
                  <label className="text-sm text-gray-500 block flex items-center gap-1">
                    실제 종료일
                    <span className="text-xs text-gray-400">(자동)</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
                <div className="col-span-2">
                  <DateRangePicker
                    startDate={editedEpisode.startDate?.split('T')[0] ?? ''}
                    endDate={editedEpisode.dueDate?.split('T')[0] ?? ''}
                    onStartChange={(v) => handleFieldChange('startDate', v)}
                    onEndChange={(v) => handleFieldChange('dueDate', v === 'tbd' ? '' : v)}
                  />
                </div>
                <div>
                  {(() => {
                    const actualEndDate = calculateActualEndDate();
                    return (
                      <div className="h-12 px-4 border-2 border-gray-200 rounded-xl flex items-center gap-2 bg-gray-50/50">
                        <Calendar size={16} className={actualEndDate ? 'text-orange-500' : 'text-gray-400'} />
                        <span className={`text-sm ${actualEndDate ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                          {!actualEndDate ? '작업 마감일 필요' : (() => {
                            const [y, m, d] = actualEndDate.split('-').map(Number);
                            return `${y}년 ${m}월 ${d}일`;
                          })()}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 담당자 / 매니저 */}
              {(partner || managerPartner) && (
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                  {partner && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">파트너:</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-[10px] font-medium text-gray-600">{partner.name.charAt(0)}</span>
                        </div>
                        <span className="text-sm text-gray-700">{partner.name}</span>
                      </div>
                    </div>
                  )}
                  {partner && managerPartner && (
                    <span className="text-gray-300">·</span>
                  )}
                  {managerPartner && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">매니저:</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-[10px] font-medium text-gray-600">{managerPartner.name.charAt(0)}</span>
                        </div>
                        <span className="text-sm text-gray-700">{managerPartner.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div className="space-y-6">

          {/* 비용 정보 */}
          {editedEpisode.budget && (
            <div className="bg-white rounded-xl border border-gray-100">
              <div
                className={`flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors ${collapsedSections.budget ? 'rounded-xl' : 'rounded-t-xl'}`}
                onClick={() => toggleSection('budget')}
              >
                <h3 className="text-lg font-semibold text-gray-900">회차별 비용</h3>
                {collapsedSections.budget ? (
                  <ChevronRight size={20} className="text-gray-400" />
                ) : (
                  <ChevronDown size={20} className="text-gray-400" />
                )}
              </div>
              <div className={`transition-all duration-300 ease-in-out ${!collapsedSections.budget ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="px-6 pb-6">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    {(() => {
                      const totalPartner = activeWorkTypes.reduce((sum, wt) => sum + (workBudgets[wt]?.partnerPayment || 0), 0);
                      const totalManagement = activeWorkTypes.reduce((sum, wt) => sum + (workBudgets[wt]?.managementFee || 0), 0);
                      const totalAmount = editedEpisode.budget!.totalAmount;
                      return (
                        <>
                          {/* 1행: 총 비용 | 파트너 지급 | 매니저 지급 | 유보금 */}
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">총 비용</p>
                              <p className="text-xl font-bold text-gray-900 mt-1">
                                {totalAmount.toLocaleString()}원
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">파트너 지급</p>
                              <p className="text-xl font-bold text-orange-600 mt-1">
                                {totalPartner.toLocaleString()}원
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">매니저 지급</p>
                              <p className="text-xl font-bold text-orange-600 mt-1">
                                {totalManagement.toLocaleString()}원
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">유보금</p>
                              <p className="text-xl font-bold text-green-600 mt-1">
                                {(totalAmount - totalPartner - totalManagement).toLocaleString()}원
                              </p>
                            </div>
                          </div>

                          {/* 2행: 입금 예정일 | 입금 상태 | 세금계산서 발행일 | 발행 상태 */}
                          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
                            <div>
                              <p className="text-xs text-gray-400 mb-1.5">입금 예정일</p>
                              <DatePicker
                                value={editedEpisode.paymentDueDate || ''}
                                onChange={(val) => setEditedEpisode(prev => prev ? { ...prev, paymentDueDate: val || undefined } : prev)}
                                placeholder="날짜 선택"
                              />
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1.5">입금 상태</p>
                              <div ref={paymentStatusRef} className="relative">
                                <button
                                  type="button"
                                  onClick={() => setPaymentStatusOpen(!paymentStatusOpen)}
                                  className={`w-full h-12 px-4 border-2 rounded-xl text-left flex items-center justify-between transition-all ${
                                    paymentStatusOpen
                                      ? 'border-orange-500 ring-2 ring-orange-100'
                                      : editedEpisode.paymentStatus === 'completed'
                                      ? 'border-green-200 bg-green-50'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${editedEpisode.paymentStatus === 'completed' ? 'bg-green-500' : 'bg-orange-400'}`} />
                                    <span className={`text-sm font-medium ${editedEpisode.paymentStatus === 'completed' ? 'text-green-700' : 'text-gray-900'}`}>
                                      {editedEpisode.paymentStatus === 'completed' ? '입금 완료' : '입금 전'}
                                    </span>
                                  </div>
                                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${paymentStatusOpen ? 'rotate-180' : ''}`} />
                                </button>
                                <AnimatePresence>
                                  {paymentStatusOpen && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                      transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                                      className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden"
                                    >
                                      {[
                                        { value: 'pending' as const, label: '입금 전', color: 'orange' },
                                        { value: 'completed' as const, label: '입금 완료', color: 'green' },
                                      ].map((opt) => {
                                        const isSelected = (editedEpisode.paymentStatus || 'pending') === opt.value;
                                        return (
                                          <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => {
                                              setEditedEpisode(prev => prev ? { ...prev, paymentStatus: opt.value } : prev);
                                              setPaymentStatusOpen(false);
                                            }}
                                            className={`w-full px-4 py-2.5 flex items-center gap-2.5 text-sm transition-colors ${
                                              isSelected
                                                ? opt.color === 'green' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                                                : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                          >
                                            <span className={`w-2 h-2 rounded-full ${opt.color === 'green' ? 'bg-green-500' : 'bg-orange-400'}`} />
                                            <span className="font-medium">{opt.label}</span>
                                            {isSelected && (
                                              <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1.5">세금계산서 발행일</p>
                              <DatePicker
                                value={editedEpisode.invoiceDate || ''}
                                onChange={(val) => setEditedEpisode(prev => prev ? { ...prev, invoiceDate: val || undefined } : prev)}
                                placeholder="날짜 선택"
                              />
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1.5">발행 상태</p>
                              <div ref={invoiceStatusRef} className="relative">
                                <button
                                  type="button"
                                  onClick={() => setInvoiceStatusOpen(!invoiceStatusOpen)}
                                  className={`w-full h-12 px-4 border-2 rounded-xl text-left flex items-center justify-between transition-all ${
                                    invoiceStatusOpen
                                      ? 'border-orange-500 ring-2 ring-orange-100'
                                      : editedEpisode.invoiceStatus === 'completed'
                                      ? 'border-green-200 bg-green-50'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${editedEpisode.invoiceStatus === 'completed' ? 'bg-green-500' : 'bg-orange-400'}`} />
                                    <span className={`text-sm font-medium ${editedEpisode.invoiceStatus === 'completed' ? 'text-green-700' : 'text-gray-900'}`}>
                                      {editedEpisode.invoiceStatus === 'completed' ? '발행 완료' : '미발행'}
                                    </span>
                                  </div>
                                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${invoiceStatusOpen ? 'rotate-180' : ''}`} />
                                </button>
                                <AnimatePresence>
                                  {invoiceStatusOpen && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                      transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                                      className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden"
                                    >
                                      {[
                                        { value: 'pending' as const, label: '미발행', color: 'orange' },
                                        { value: 'completed' as const, label: '발행 완료', color: 'green' },
                                      ].map((opt) => {
                                        const isSelected = (editedEpisode.invoiceStatus || 'pending') === opt.value;
                                        return (
                                          <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => {
                                              setEditedEpisode(prev => prev ? { ...prev, invoiceStatus: opt.value } : prev);
                                              setInvoiceStatusOpen(false);
                                            }}
                                            className={`w-full px-4 py-2.5 flex items-center gap-2.5 text-sm transition-colors ${
                                              isSelected
                                                ? opt.color === 'green' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                                                : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                          >
                                            <span className={`w-2 h-2 rounded-full ${opt.color === 'green' ? 'bg-green-500' : 'bg-orange-400'}`} />
                                            <span className="font-medium">{opt.label}</span>
                                            {isSelected && (
                                              <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* 작업별 비용 수정 */}
                  <div className="mt-4">
                    <button
                      onClick={() => setExpandedBudgets(prev => {
                        const anyOpen = activeWorkTypes.some(wt => prev[wt]);
                        const next = { ...prev };
                        activeWorkTypes.forEach(wt => { next[wt] = !anyOpen; });
                        return next;
                      })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-700 transition-all"
                      type="button"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      비용 수정
                    </button>

                    {activeWorkTypes.some(wt => expandedBudgets[wt]) && (
                      <div className="mt-3 space-y-2">
                        {/* 총 제작비 */}
                        <div className="bg-white rounded-xl border border-gray-100 p-4">
                          <label className="text-xs text-gray-400 block mb-1">총 제작비</label>
                          <div className="flex items-center">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatCurrency(editedEpisode.budget?.totalAmount)}
                              onChange={(e) => setEditedEpisode(prev => prev ? {
                                ...prev,
                                budget: {
                                  totalAmount: parseCurrency(e.target.value),
                                  partnerPayment: prev.budget?.partnerPayment || 0,
                                  managementFee: prev.budget?.managementFee || 0,
                                },
                              } : prev)}
                              placeholder="0"
                              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
                            />
                            <span className="ml-1.5 text-xs text-gray-400">원</span>
                          </div>
                        </div>

                        {activeWorkTypes.map(workType => (
                          <div key={workType} className="bg-white rounded-xl border border-gray-100 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-900">{workType}</span>
                              <span className="text-xs font-medium text-gray-500">
                                합계 {getTotalBudget(workType).toLocaleString()}원
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">파트너 지급</label>
                                <div className="flex items-center">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={formatCurrency(workBudgets[workType].partnerPayment)}
                                    onChange={(e) => handleUpdateBudget(workType, 'partnerPayment', parseCurrency(e.target.value))}
                                    placeholder="0"
                                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
                                  />
                                  <span className="ml-1.5 text-xs text-gray-400">원</span>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">매니징 비용</label>
                                <div className="flex items-center">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={formatCurrency(workBudgets[workType].managementFee)}
                                    onChange={(e) => handleUpdateBudget(workType, 'managementFee', parseCurrency(e.target.value))}
                                    placeholder="0"
                                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
                                  />
                                  <span className="ml-1.5 text-xs text-gray-400">원</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 비용 정보 추가 버튼 (budget이 없을 때) */}
          {!editedEpisode.budget && (
            <button
              onClick={() => {
                setEditedEpisode(prev => prev ? {
                  ...prev,
                  budget: { totalAmount: 0, partnerPayment: 0, managementFee: 0 }
                } : prev);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-white rounded-xl border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-gray-500 hover:text-gray-700"
              type="button"
            >
              <DollarSign size={16} />
              <span className="text-sm font-medium">비용 정보 추가</span>
            </button>
          )}

          {/* 작업 체크리스트 */}
          <div data-tour="tour-episode-checklist" className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">작업 체크리스트</h3>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-700">작업 목록</h4>
            </div>

            {/* 작업 진행도 타임라인 */}
            {activeWorkTypes.length === 0 ? (
              <div className="mb-6 p-6 bg-gray-50 rounded-xl border border-gray-100">
                <style jsx global>{`
                  @keyframes waiting-pulse-empty {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 0.8; }
                  }
                  .waiting-pulse-empty {
                    animation: waiting-pulse-empty 3s ease-in-out infinite;
                  }
                `}</style>
                <div className="flex items-center gap-3">
                  {/* 대기 박스 */}
                  <div className="flex items-center gap-2 rounded-xl border-2 bg-white/50 border-gray-200/60 px-4 py-2 min-w-[140px] backdrop-blur-md">
                    <span className="font-semibold text-sm text-gray-600">대기</span>
                  </div>

                  {/* 진행 표시 (3개의 점) */}
                  <div className="flex items-center gap-2 px-2">
                    {[0, 1, 2].map((dotIndex) => (
                      <div
                        key={dotIndex}
                        className="w-2 h-2 rounded-full bg-gray-300 waiting-pulse-empty"
                        style={{ animationDelay: `${dotIndex * 0.3}s` }}
                      />
                    ))}
                  </div>

                  {/* 마감 */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 rounded-full border-2 bg-white border-gray-300 flex items-center justify-center" />
                    <div className="flex flex-col text-xs">
                      <span className="text-gray-500 font-medium">마감</span>
                      <span className="text-gray-400 text-xs">미정</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-6 bg-gray-50 rounded-xl border border-gray-100 overflow-x-auto">
                <style jsx global>{`
                  @keyframes pulse-dot {
                    0%, 100% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                  }
                  @keyframes waiting-pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 0.8; }
                  }
                  @keyframes fade-in {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                  @keyframes slide-up {
                    from {
                      opacity: 0;
                      transform: translateY(20px) scale(0.95);
                    }
                    to {
                      opacity: 1;
                      transform: translateY(0) scale(1);
                    }
                  }
                  @keyframes slide-out {
                    from {
                      opacity: 1;
                      transform: translateY(0) scale(1);
                    }
                    to {
                      opacity: 0;
                      transform: translateY(20px) scale(0.95);
                    }
                  }
                  @keyframes modal-overlay-in {
                    from {
                      opacity: 0;
                      backdrop-filter: blur(0px);
                    }
                    to {
                      opacity: 1;
                      backdrop-filter: blur(4px);
                    }
                  }
                  @keyframes modal-overlay-out {
                    from {
                      opacity: 1;
                      backdrop-filter: blur(4px);
                    }
                    to {
                      opacity: 0;
                      backdrop-filter: blur(0px);
                    }
                  }
                  @keyframes modal-content-in {
                    from {
                      opacity: 0;
                      transform: scale(0.95) translateY(-20px);
                    }
                    to {
                      opacity: 1;
                      transform: scale(1) translateY(0);
                    }
                  }
                  @keyframes modal-content-out {
                    from {
                      opacity: 1;
                      transform: scale(1) translateY(0);
                    }
                    to {
                      opacity: 0;
                      transform: scale(0.95) translateY(-20px);
                    }
                  }
                  .pulse-dot {
                    animation: pulse-dot 1.5s ease-in-out infinite;
                  }
                  .waiting-pulse {
                    animation: waiting-pulse 3s ease-in-out infinite;
                  }
                  .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                  }
                  .animate-slide-up {
                    animation: slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                  }
                  .animate-slide-out {
                    animation: slide-out 0.3s cubic-bezier(0.36, 0, 0.66, -0.56);
                  }
                  .animate-modal-overlay {
                    animation: modal-overlay-in 0.3s ease-out forwards;
                  }
                  .animate-modal-overlay-out {
                    animation: modal-overlay-out 0.2s ease-in forwards;
                  }
                  .animate-modal-content {
                    animation: modal-content-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                  }
                  .animate-modal-content-out {
                    animation: modal-content-out 0.2s ease-in forwards;
                  }
                `}</style>
                <div className="flex items-center gap-3">
                  {/* 작업들 */}
                  {activeWorkTypes.map((workType, index) => {
                    const status = getWorkTypeStatus(workType);
                    const stepsCount = workSteps[workType]?.length || 0;
                    const completedCount = workSteps[workType]?.filter(s => s.status === 'completed').length || 0;

                    // 이전 작업 중 하나라도 완료되었는지 확인
                    const hasPreviousCompleted = activeWorkTypes.slice(0, index).some(wt => getWorkTypeStatus(wt) === 'completed');

                    return (
                      <div key={workType} className="flex items-center gap-3">
                        {/* 작업 박스 */}
                        <button
                          onClick={() => setSelectedWorkTypeModal(workType)}
                          className={`flex items-center gap-2 rounded-xl border-2 transition-all cursor-pointer hover:shadow-2xl backdrop-blur-md ${
                          status === 'completed'
                            ? 'bg-green-100/50 border-green-300/60 px-4 py-2 min-w-[140px] opacity-60 hover:opacity-100'
                            : (status === 'in_progress' || (status === 'waiting' && hasPreviousCompleted))
                            ? 'bg-yellow-100/60 border-yellow-300/70 px-5 py-3 min-w-[160px] shadow-xl scale-110 hover:scale-[1.15]'
                            : 'bg-white/50 border-gray-200/60 px-4 py-2 min-w-[140px] hover:border-gray-300 hover:bg-gray-50'
                        }`}>
                          <span className={`font-semibold text-sm ${
                            status === 'completed'
                              ? 'text-green-800'
                              : (status === 'in_progress' || (status === 'waiting' && hasPreviousCompleted))
                              ? 'text-yellow-800'
                              : 'text-gray-600'
                          }`}>
                            {workType}
                          </span>
                          {stepsCount > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : (status === 'in_progress' || (status === 'waiting' && hasPreviousCompleted))
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {completedCount}/{stepsCount}
                            </span>
                          )}
                        </button>

                        {/* 진행 표시 (3개의 점) */}
                        <div className="flex items-center gap-2 px-2">
                          {[0, 1, 2].map((dotIndex) => {
                            // 현재 작업이 진행 중이거나, 대기 상태지만 이전 작업이 완료되었으면 진행 중 애니메이션
                            const isActive = status === 'in_progress' || (status === 'waiting' && hasPreviousCompleted);
                            const isFilled = status === 'completed';
                            const isWaiting = status === 'waiting' && !hasPreviousCompleted;
                            const dotDelay = `${dotIndex * 0.3}s`;

                            return (
                              <div
                                key={dotIndex}
                                className={`w-2 h-2 rounded-full transition-all ${
                                  isFilled
                                    ? 'bg-green-500'
                                    : isActive
                                    ? 'bg-yellow-500 pulse-dot'
                                    : isWaiting
                                    ? 'bg-gray-400 waiting-pulse'
                                    : 'bg-gray-300'
                                }`}
                                style={(isActive || isWaiting) ? { animationDelay: dotDelay } : {}}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* 최종 마감 (맨 끝에 하나만) */}
                  {(() => {
                    // 전체 작업의 상태 계산
                    const overallStatus = getOverallEpisodeStatus();

                    // 전체 작업 중 가장 늦은 마감일 찾기
                    let finalDueDate: string | null = null;
                    activeWorkTypes.forEach(workType => {
                      const steps = workSteps[workType] || [];
                      steps.forEach(step => {
                        if (step.dueDate) {
                          if (!finalDueDate || new Date(step.dueDate) > new Date(finalDueDate)) {
                            finalDueDate = step.dueDate;
                          }
                        }
                      });
                    });

                    return (
                      <div className="flex items-center gap-3">
                        {/* 마감 원 */}
                        <div className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                          overallStatus === 'completed'
                            ? 'bg-green-500 border-green-600'
                            : overallStatus === 'in_progress'
                            ? 'bg-white border-yellow-400'
                            : 'bg-white border-gray-300'
                        }`}>
                          {overallStatus === 'completed' && (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {overallStatus === 'in_progress' && (
                            <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full pulse-dot" />
                          )}
                        </div>

                        {/* 마감일 표시 */}
                        <div className="flex flex-col text-xs">
                          <span className="text-gray-500 font-medium">마감</span>
                          {finalDueDate ? (
                            <span className={`font-bold text-sm ${
                              overallStatus === 'completed'
                                ? 'text-green-600'
                                : overallStatus === 'in_progress'
                                ? 'text-yellow-600'
                                : 'text-gray-600'
                            }`}>
                              {new Date(finalDueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">미정</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* 활성화된 작업 */}
            {activeWorkTypes.length > 0 ? (<div data-tour="tour-episode-tasks">
              <AnimatePresence mode="popLayout">
                {(() => {
                  const allCompleted = activeWorkTypes.every(wt => getWorkTypeStatus(wt) === 'completed');
                  return activeWorkTypes.map((workType) => {
                  return (
                    <motion.div
                      key={workType}
                      layout
                      initial={{ opacity: 0, height: 0, scale: 0.95 }}
                      animate={{ opacity: 1, height: 'auto', scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className={`rounded-xl transition-all mb-3 ${
                        getWorkTypeStatus(workType) === 'completed'
                          ? allCompleted
                            ? 'border border-gray-100'
                            : 'border border-gray-100 opacity-50 hover:opacity-100'
                          : getWorkTypeStatus(workType) === 'in_progress'
                          ? 'border-l-[3px] border-l-orange-400 border border-gray-200/50 bg-orange-50/10'
                          : 'border border-gray-200/50'
                      }`}
                    >
                      <div className="flex-1">
                        {/* 제목 & 상태 배지 & 비용 & 접기/펼치기 & 제거 버튼 */}
                        <div className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50 transition-colors ${expandedWorkTypes[workType] ? 'rounded-t-xl' : 'rounded-xl'}`} onClick={() => setExpandedWorkTypes(prev => ({ ...prev, [workType]: !prev[workType] }))}>
                          <div className="flex items-center gap-2">
                            {expandedWorkTypes[workType] ? (
                              <ChevronDown size={16} className="text-gray-400" />
                            ) : (
                              <ChevronRight size={16} className="text-gray-400" />
                            )}

                            <span className={`font-medium text-base ${getWorkTypeStatus(workType) === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                              {workType}
                            </span>

                            {/* 상태 배지 */}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(getWorkTypeStatus(workType))}`}>
                              {getStatusLabel(getWorkTypeStatus(workType))}
                            </span>

                            {/* 작업 단계 개수 */}
                            {workSteps[workType]?.length > 0 && (
                              <span className="text-xs text-gray-500">
                                {workSteps[workType].filter(s => s.status === 'completed').length}/{workSteps[workType].length}
                              </span>
                            )}

                          </div>

                          {/* 제거 버튼 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmRemove(workType);
                            }}
                            className="p-1 hover:bg-red-50 rounded transition-colors group"
                            title="작업 제거"
                            type="button"
                          >
                            <X size={16} className="text-gray-400 group-hover:text-red-500" />
                          </button>
                        </div>

                        {/* 펼쳐진 상태일 때만 내용 표시 */}
                        <div className={`transition-all duration-300 ease-in-out ${
                          expandedWorkTypes[workType] ? 'max-h-[2000px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'
                        }`}>
                          <div className="px-4 pb-4">
                            {/* 빠른 액션 버튼 */}
                            <div className="flex items-center gap-2 mb-4">
                              {workSteps[workType]?.length > 0 && (
                                <>
                                  <button
                                    onClick={() => handleMarkAllComplete(workType)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50/40 hover:bg-green-50 rounded-md transition-colors"
                                    type="button"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    모두 완료로 표시
                                  </button>
                                  {prevWorkSteps[workType] && (
                                    <button
                                      onClick={() => handleUndoMarkAll(workType)}
                                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100/60 hover:bg-gray-100 rounded-md transition-colors"
                                      type="button"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
                                      </svg>
                                      되돌리기
                                    </button>
                                  )}
                                </>
                              )}
                            </div>

                            {/* 비용 상세는 회차별 비용 섹션으로 이동 */}

                            {/* 작업 단계 목록 */}
                            <div className="space-y-3">
                              <style jsx>{`
                                @keyframes slideInUp {
                                  from {
                                    opacity: 0;
                                    transform: translateY(10px);
                                  }
                                  to {
                                    opacity: 1;
                                    transform: translateY(0);
                                  }
                                }
                                .task-item-enter {
                                  animation: slideInUp 0.3s ease-out;
                                }
                              `}</style>
                              {workSteps[workType]?.length > 0 ? (
                                workSteps[workType].map((step, index) => (
                                  <div
                                    key={step.id}
                                    className={`relative pb-3 border-b border-gray-100 last:border-b-0 last:pb-0 -mx-2 px-2 rounded-lg hover:bg-gray-50/80 hover:border-transparent transition-all duration-200 group task-item-enter ${
                                      step.status === 'completed'
                                        ? (workSteps[workType].every(s => s.status === 'completed') ? '' : 'opacity-40 hover:opacity-100')
                                        : step.status === 'in_progress'
                                        ? 'bg-orange-50/30'
                                        : ''
                                    }`}
                                    style={{
                                      animationDelay: `${index * 50}ms`
                                    }}
                                  >
                                    {/* 한 줄: 카테고리 + 작업 단계 + 담당 파트너 + 진행 사항 + 시작일 + 마감일 */}
                                    <div className="grid grid-cols-[2fr_3fr_3fr_2fr_6fr] gap-2">
                                      {/* 카테고리 */}
                                      <div>
                                        {index === 0 ? (
                                          <div className="w-full text-xs px-2 py-2 bg-gray-100 border border-gray-200 rounded-md text-gray-600 font-medium text-center">
                                            원본 전달
                                          </div>
                                        ) : editingField === `${workType}-${step.id}-category` ? (
                                          <div className="relative">
                                            <div className="absolute z-10 w-full bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                                              {['가편', '종편'].map(cat => {
                                                const catStyle = cat === '가편'
                                                  ? { active: 'bg-yellow-50', text: 'text-yellow-700' }
                                                  : { active: 'bg-blue-50', text: 'text-blue-700' };
                                                return (
                                                  <button
                                                    key={cat}
                                                    onClick={() => {
                                                      handleUpdateWorkStep(workType, step.id, 'category', cat);
                                                      setEditingField(null);
                                                    }}
                                                    className={`w-full flex items-center px-3 py-2 hover:bg-gray-50 transition-colors text-left ${(step.category || '가편') === cat ? catStyle.active : ''}`}
                                                    type="button"
                                                  >
                                                    <span className={`text-xs font-medium ${(step.category || '가편') === cat ? catStyle.text : 'text-gray-700'}`}>{cat}</span>
                                                  </button>
                                                );
                                              })}
                                            </div>
                                            <div
                                              className="fixed inset-0 z-0"
                                              onClick={() => setEditingField(null)}
                                            />
                                          </div>
                                        ) : (
                                          <div
                                            onClick={() => setEditingField(`${workType}-${step.id}-category`)}
                                            className={`w-full flex items-center justify-center px-2 py-2 border rounded-md cursor-pointer transition-colors ${
                                              (step.category || '가편') === '가편'
                                                ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300'
                                                : 'bg-blue-50 border-blue-200 hover:border-blue-300'
                                            }`}
                                          >
                                            <span className={`text-xs font-medium ${
                                              (step.category || '가편') === '가편' ? 'text-yellow-700' : 'text-blue-700'
                                            }`}>{step.category || '가편'}</span>
                                            <ChevronDown size={12} className="ml-1 text-gray-400" />
                                          </div>
                                        )}
                                      </div>

                                      {/* 작업 단계/메모 */}
                                      <div>
                                        <input
                                          type="text"
                                          value={step.label}
                                          onChange={(e) => handleUpdateWorkStep(workType, step.id, 'label', e.target.value)}
                                          placeholder="작업 단계"
                                          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
                                        />
                                      </div>

                                      {/* 담당 파트너 */}
                                      <div>
                                        {editingField === `${workType}-${step.id}-assignee` ? (
                                          <div className="relative">
                                            <div className="absolute z-10 w-full bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-hidden">
                                              <div className="sticky top-0 p-1.5 border-b border-gray-100 bg-white/95">
                                                <input
                                                  type="text"
                                                  value={partnerSearch}
                                                  onChange={(e) => setPartnerSearch(e.target.value)}
                                                  placeholder="파트너 검색..."
                                                  className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
                                                  autoFocus
                                                  onClick={(e) => e.stopPropagation()}
                                                />
                                              </div>
                                              <div className="max-h-44 overflow-auto">
                                              <button
                                                onClick={() => {
                                                  handleUpdateWorkStep(workType, step.id, 'assigneeId', '');
                                                  setEditingField(null);
                                                  setPartnerSearch('');
                                                }}
                                                className="w-full flex items-center px-3 py-2 hover:bg-gray-50 transition-colors text-left border-b border-gray-100/60"
                                                type="button"
                                              >
                                                <span className="text-sm text-gray-500">선택 안함</span>
                                              </button>
                                              {partners.filter(p => p.status === 'active' && (!p.position || p.position === 'partner') && p.name.toLowerCase().includes(partnerSearch.toLowerCase())).map(p => (
                                                <button
                                                  key={p.id}
                                                  onClick={() => {
                                                    handleUpdateWorkStep(workType, step.id, 'assigneeId', p.id);
                                                    setEditingField(null);
                                                    setPartnerSearch('');
                                                  }}
                                                  className="w-full flex items-center px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                                                  type="button"
                                                >
                                                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-2 flex-shrink-0">
                                                    {p.name.charAt(0)}
                                                  </div>
                                                  <span className="text-sm text-gray-900 truncate">{p.name}</span>
                                                </button>
                                              ))}
                                              </div>
                                            </div>
                                            <div
                                              className="fixed inset-0 z-0"
                                              onClick={() => { setEditingField(null); setPartnerSearch(''); }}
                                            />
                                          </div>
                                        ) : (
                                          <div
                                            onClick={() => { setEditingField(`${workType}-${step.id}-assignee`); setPartnerSearch(''); }}
                                            className="w-full flex items-center px-3 py-2 border border-gray-200 rounded-md cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors bg-white"
                                          >
                                            {step.assigneeId ? (
                                              <>
                                                <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mr-2">
                                                  <User size={10} className="text-orange-500" />
                                                </div>
                                                <span className="text-sm text-gray-900 truncate">
                                                  {partners.find(p => p.id === step.assigneeId)?.name}
                                                </span>
                                              </>
                                            ) : (
                                              <span className="text-sm text-gray-400">파트너</span>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {/* 진행 사항 */}
                                      <div>
                                        {editingField === `${workType}-${step.id}-status` ? (
                                          <div className="relative">
                                            <div className="absolute z-10 w-full bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                                              {([
                                                { value: 'waiting', label: '대기', color: 'bg-gray-100 text-gray-800' },
                                                { value: 'in_progress', label: '진행중', color: 'bg-yellow-100 text-yellow-800' },
                                                { value: 'completed', label: '완료', color: 'bg-green-100 text-green-800' },
                                              ] as const).map(opt => (
                                                <button
                                                  key={opt.value}
                                                  onClick={() => {
                                                    handleUpdateWorkStep(workType, step.id, 'status', opt.value);
                                                    setEditingField(null);
                                                  }}
                                                  className={`w-full flex items-center px-3 py-2 hover:bg-gray-50 transition-colors text-left ${step.status === opt.value ? 'bg-gray-100' : ''}`}
                                                  type="button"
                                                >
                                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${opt.color}`}>{opt.label}</span>
                                                </button>
                                              ))}
                                            </div>
                                            <div
                                              className="fixed inset-0 z-0"
                                              onClick={() => setEditingField(null)}
                                            />
                                          </div>
                                        ) : (
                                          <div
                                            onClick={() => setEditingField(`${workType}-${step.id}-status`)}
                                            className={`w-full flex items-center justify-center px-2 py-2 rounded-md cursor-pointer border border-transparent hover:border-gray-300 transition-colors font-medium text-xs ${getStatusColor(step.status)}`}
                                          >
                                            <span>{getStatusLabel(step.status)}</span>
                                            <ChevronDown size={12} className="ml-1 opacity-50" />
                                          </div>
                                        )}
                                      </div>

                                      {/* 시작일 · 마감일 */}
                                      <div>
                                        <DateRangePicker
                                          compact
                                          startDate={step.startDate}
                                          endDate={step.dueDate}
                                          onStartChange={(v) => handleUpdateWorkStep(workType, step.id, 'startDate', v)}
                                          onEndChange={(v) => handleUpdateWorkStep(workType, step.id, 'dueDate', v === 'tbd' ? '' : v)}
                                        />
                                      </div>
                                    </div>

                                    {/* 작업 단계 제거 버튼 */}
                                    <button
                                      onClick={() => handleRemoveWorkStep(workType, step.id)}
                                      className="absolute right-2 top-1 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-all"
                                      title="작업 단계 제거"
                                      type="button"
                                    >
                                      <X size={14} className="text-gray-400 hover:text-red-500" />
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-4 text-gray-400 text-xs">
                                  작업 단계를 추가해보세요
                                </div>
                              )}

                              {/* 작업 단계 추가 버튼 */}
                              <button
                                onClick={() => handleAddWorkStep(workType)}
                                className="w-full flex items-center justify-center px-3 py-2 mt-2 border border-dashed border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors group text-sm"
                                type="button"
                              >
                                <Plus size={14} className="mr-1 text-gray-400 group-hover:text-gray-600" />
                                <span className="text-gray-500 group-hover:text-gray-700">작업 단계 추가</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                });
                })()}
              </AnimatePresence>
            </div>) : (
              <div data-tour="tour-episode-tasks" className="text-center py-8 text-gray-500">
                <p className="text-sm">아직 작업이 추가되지 않았습니다.</p>
                <p className="text-xs mt-1">아래에서 작업을 추가해보세요.</p>
              </div>
            )}

            {/* 비활성화된 작업 (작업 추가 영역) */}
            {inactiveWorkTypes.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-400">콘텐츠 추가</span>
                  <AnimatePresence mode="popLayout">
                    {inactiveWorkTypes.map((workType) => (
                      <motion.button
                        key={workType}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                        onClick={() => handleAddWorkType(workType)}
                        className="flex items-center gap-2 px-5 py-3.5 text-base font-medium text-gray-500 border border-dashed border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 hover:shadow-sm transition-all"
                        type="button"
                      >
                        <Plus size={16} />
                        {workType}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 작업 삭제 확인 모달 */}
      <AnimatePresence>
        {confirmRemove && (
          <>
            <motion.div
              className="fixed inset-0 z-[10000] bg-black/30 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setConfirmRemove(null)}
            />
            <motion.div
              className="fixed z-[10001] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-[360px] max-w-[90vw]"
              initial={{ opacity: 0, scale: 0.93, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <h3 className="text-base font-semibold text-gray-900 mb-2">작업 삭제</h3>
              <p className="text-sm text-gray-500 mb-5">
                <span className="font-medium text-gray-700">{confirmRemove}</span> 작업을 삭제하시겠습니까?<br />
                <span className="text-xs text-gray-400">포함된 작업 단계와 비용 정보가 모두 초기화됩니다.</span>
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmRemove(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  type="button"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    handleRemoveWorkType(confirmRemove);
                    setConfirmRemove(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
                  type="button"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 작업 목록 모달 */}
      {selectedWorkTypeModal && (
        <div className={`fixed inset-0 z-50 overflow-y-auto ${isModalClosing ? 'animate-modal-overlay-out' : 'animate-modal-overlay'}`}>
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          <div className="flex min-h-full items-center justify-center p-4">
            <div
              ref={modalContentRef}
              className={`relative bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/60 max-w-4xl w-full max-h-[80vh] ${isTabSwitching ? 'overflow-hidden' : 'overflow-y-auto'} ${isModalClosing ? 'animate-modal-content-out' : 'animate-modal-content'}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                height: modalHeight !== null ? `${modalHeight}px` : 'auto',
                transition: 'height 1600ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {/* 헤더 */}
              <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 z-10">
                {/* 상단 헤더 바 */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">작업 목록</h2>
                    {(() => {
                      const steps = workSteps[selectedWorkTypeModal] || [];
                      const completedCount = steps.filter(s => s.status === 'completed').length;
                      const status = getWorkTypeStatus(selectedWorkTypeModal);
                      return (
                        <>
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
                        </>
                      );
                    })()}
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-white/80 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                {/* 타임라인 겸 탭 */}
                <div className="px-6 pb-4 pt-2">
                  <style jsx>{`
                    @keyframes tabPulse {
                      0%, 100% { transform: scale(1); }
                      50% { transform: scale(1.05); }
                    }
                    .tab-pulse {
                      animation: tabPulse 2s ease-in-out infinite;
                    }
                  `}</style>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 overflow-x-auto">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* 작업들 */}
                        {activeWorkTypes.map((workType, index) => {
                          const status = getWorkTypeStatus(workType);
                          const stepsCount = workSteps[workType]?.length || 0;
                          const completedCount = workSteps[workType]?.filter(s => s.status === 'completed').length || 0;
                          const hasPreviousCompleted = activeWorkTypes.slice(0, index).some(wt => getWorkTypeStatus(wt) === 'completed');
                          const isSelected = workType === selectedWorkTypeModal;

                          return (
                            <div key={workType} className="flex items-center gap-3">
                              {/* 작업 박스 (클릭 가능) */}
                              <button
                                onClick={() => switchTab(workType)}
                                className={`flex items-center gap-2 rounded-xl border-2 transition-all backdrop-blur-md cursor-pointer ${
                                isSelected
                                  ? status === 'completed'
                                    ? 'bg-green-100/70 border-green-400/80 px-5 py-3 min-w-[140px] shadow-xl ring-2 ring-green-300/50'
                                    : (status === 'in_progress' || (status === 'waiting' && hasPreviousCompleted))
                                    ? 'bg-yellow-100/80 border-yellow-400/90 px-5 py-3 min-w-[160px] shadow-2xl scale-110 ring-2 ring-yellow-300/50 tab-pulse'
                                    : 'bg-orange-100/70 border-orange-400/80 px-5 py-3 min-w-[140px] shadow-xl ring-2 ring-orange-300/50'
                                  : status === 'completed'
                                  ? 'bg-green-100/40 border-green-300/50 px-3 py-1.5 min-w-[120px] opacity-70 hover:opacity-100 hover:shadow-lg'
                                  : (status === 'in_progress' || (status === 'waiting' && hasPreviousCompleted))
                                  ? 'bg-yellow-100/50 border-yellow-300/60 px-4 py-2 min-w-[140px] shadow-md hover:shadow-xl scale-105'
                                  : 'bg-white/50 border-gray-200/60 px-3 py-1.5 min-w-[120px] hover:border-gray-300 hover:bg-gray-50 hover:shadow-md'
                              }`}>
                                <span className={`font-semibold text-sm ${
                                  isSelected
                                    ? status === 'completed'
                                      ? 'text-green-900'
                                      : (status === 'in_progress' || (status === 'waiting' && hasPreviousCompleted))
                                      ? 'text-yellow-900'
                                      : 'text-orange-900'
                                    : status === 'completed'
                                    ? 'text-green-800'
                                    : (status === 'in_progress' || (status === 'waiting' && hasPreviousCompleted))
                                    ? 'text-yellow-800'
                                    : 'text-gray-600'
                                }`}>
                                  {workType}
                                </span>
                                {stepsCount > 0 && (
                                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                                    isSelected
                                      ? status === 'completed'
                                        ? 'bg-green-200/60 text-green-900'
                                        : (status === 'in_progress' || (status === 'waiting' && hasPreviousCompleted))
                                        ? 'bg-yellow-200/60 text-yellow-900'
                                        : 'bg-orange-200/60 text-orange-900'
                                      : status === 'completed'
                                      ? 'bg-green-100 text-green-700'
                                      : (status === 'in_progress' || (status === 'waiting' && hasPreviousCompleted))
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {completedCount}/{stepsCount}
                                  </span>
                                )}
                              </button>

                              {/* 진행 표시 (3개의 점) - 모든 작업 뒤에 표시 */}
                              <div className="flex items-center gap-2 px-2">
                                {[0, 1, 2].map((dotIndex) => {
                                  const isActive = status === 'in_progress' || (status === 'waiting' && hasPreviousCompleted);
                                  const isFilled = status === 'completed';
                                  const isWaiting = status === 'waiting' && !hasPreviousCompleted;
                                  const dotDelay = `${dotIndex * 0.3}s`;

                                  return (
                                    <div
                                      key={dotIndex}
                                      className={`w-2 h-2 rounded-full transition-all ${
                                        isFilled
                                          ? 'bg-green-500'
                                          : isActive
                                          ? 'bg-yellow-500 pulse-dot'
                                          : isWaiting
                                          ? 'bg-gray-400 waiting-pulse'
                                          : 'bg-gray-300'
                                      }`}
                                      style={(isActive || isWaiting) ? { animationDelay: dotDelay } : {}}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {/* 최종 마감 */}
                        {(() => {
                        const overallStatus = getOverallEpisodeStatus();
                        let finalDueDate: string | null = null;
                        activeWorkTypes.forEach(workType => {
                          const steps = workSteps[workType] || [];
                          steps.forEach(step => {
                            if (step.dueDate) {
                              if (!finalDueDate || new Date(step.dueDate) > new Date(finalDueDate)) {
                                finalDueDate = step.dueDate;
                              }
                            }
                          });
                        });

                        return (
                          <div className="flex items-center gap-3">
                            {/* 마감 원 */}
                            <div className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                              overallStatus === 'completed'
                                ? 'bg-green-500 border-green-600'
                                : overallStatus === 'in_progress'
                                ? 'bg-white border-yellow-400'
                                : 'bg-white border-gray-300'
                            }`}>
                              {overallStatus === 'completed' && (
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {overallStatus === 'in_progress' && (
                                <div className="w-2 h-2 bg-yellow-400 rounded-full pulse-dot" />
                              )}
                            </div>

                            {/* 마감일 표시 */}
                            <div className="flex flex-col text-xs">
                              <span className="text-gray-500 font-medium">마감</span>
                              {finalDueDate ? (
                                <span className={`font-bold text-sm ${
                                  overallStatus === 'completed'
                                    ? 'text-green-600'
                                    : overallStatus === 'in_progress'
                                    ? 'text-yellow-600'
                                    : 'text-gray-600'
                                }`}>
                                  {new Date(finalDueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">미정</span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                      </div>

                      {/* 새 작업 추가 버튼 */}
                      <button
                        onClick={() => {
                          const currentSteps = workSteps[selectedWorkTypeModal] || [];
                          const newStep: WorkStep = {
                            id: Date.now().toString(),
                            label: `작업 ${currentSteps.length + 1}`,
                            status: 'waiting',
                            assigneeId: '',
                            startDate: '',
                            dueDate: '',
                          };
                          setWorkSteps({
                            ...workSteps,
                            [selectedWorkTypeModal]: [...currentSteps, newStep]
                          });
                          showToast(`새 작업이 추가되었습니다.`);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all font-medium text-sm shadow-md flex items-center gap-1 flex-shrink-0"
                      >
                        <Plus size={16} />
                        새 작업
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 작업 단계 목록 */}
              <div className="p-6">
                <div
                  className={`${isTabSwitching ? 'opacity-0' : 'opacity-100'}`}
                  style={{
                    transition: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {(() => {
                    const steps = workSteps[selectedWorkTypeModal] || [];

                    if (steps.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <p className="text-gray-500 mb-4">작업 단계가 없습니다.</p>
                          <button
                            onClick={closeModal}
                            className="px-4 py-2 bg-orange-500/90 backdrop-blur-sm text-white rounded-xl hover:bg-orange-600 transition-colors shadow-md"
                          >
                            작업 단계 추가하기
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                      <style jsx>{`
                        @keyframes fadeSlideIn {
                          from {
                            opacity: 0;
                            transform: translateY(15px) scale(0.95);
                          }
                          to {
                            opacity: 1;
                            transform: translateY(0) scale(1);
                          }
                        }
                        .modal-task-item {
                          animation: fadeSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                        }
                      `}</style>
                      {steps.map((step, index) => {
                        const partner = partners.find(p => p.id === step.assigneeId);

                        return (
                          <div
                            key={step.id}
                            className={`modal-task-item p-4 rounded-xl border-2 transition-all backdrop-blur-md shadow-md ${
                              step.status === 'completed'
                                ? 'bg-green-50/60 border-green-200/60'
                                : step.status === 'in_progress'
                                ? 'bg-yellow-50/60 border-yellow-200/60'
                                : 'bg-white/60 border-gray-200/60'
                            }`}
                            style={{
                              animationDelay: `${index * 60}ms`
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                {/* 순서 번호 */}
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                  step.status === 'completed'
                                    ? 'bg-green-500 text-white'
                                    : step.status === 'in_progress'
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-gray-300 text-gray-600'
                                }`}>
                                  {step.status === 'completed' ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    index + 1
                                  )}
                                </div>

                                {/* 작업 정보 */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-gray-900">{step.label || `작업 ${index + 1}`}</h4>
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
                                        <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                          <User size={10} className="text-orange-500" />
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
                                    onClick={() => {
                                      const updatedSteps = [...steps];
                                      updatedSteps[index] = { ...step, status: 'completed' };
                                      setWorkSteps({ ...workSteps, [selectedWorkTypeModal]: updatedSteps });
                                      showToast(`"${step.label || `작업 ${index + 1}`}"을(를) 완료로 표시했습니다.`);
                                    }}
                                    className="px-3 py-1.5 bg-green-500/90 backdrop-blur-sm text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium shadow-sm"
                                  >
                                    완료로 표시
                                  </button>
                                )}
                                {step.status === 'completed' && (
                                  <button
                                    onClick={() => {
                                      const updatedSteps = [...steps];
                                      updatedSteps[index] = { ...step, status: 'in_progress' };
                                      setWorkSteps({ ...workSteps, [selectedWorkTypeModal]: updatedSteps });
                                      showToast(`"${step.label || `작업 ${index + 1}`}"을(를) 진행중으로 변경했습니다.`);
                                    }}
                                    className="px-3 py-1.5 bg-yellow-500/90 backdrop-blur-sm text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium shadow-sm"
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
                  );
                })()}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 토스트 알림 */}
      {toast.show && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 ${toast.isClosing ? 'animate-slide-out' : 'animate-slide-up'}`}>
          <div className="bg-gradient-to-r from-green-500/95 to-green-600/95 backdrop-blur-xl text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 min-w-[320px]">
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
                }, 300);
              }}
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
