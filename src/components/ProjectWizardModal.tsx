'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/contexts/ToastContext';
import { X, ChevronRight, ChevronLeft, ChevronDown, Check, Sparkles, Building2, Zap, Briefcase, Film, CheckCircle, Youtube, Camera, BookOpen, MoreHorizontal, Users, User, Search } from 'lucide-react';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import DateRangePicker from '@/components/DateRangePicker';
import { Client, Partner } from '@/types';

interface ProjectWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: WizardData) => void;
  clients: Client[];
  partners: Partner[];
}

interface WizardData {
  startType: 'with-client' | 'project-only';
  client?: {
    isNew: boolean;
    id?: string;
    name?: string;
    contact?: string;
    email?: string;
  };
  project: {
    title: string;
    category: string;
    description?: string;
    partnerIds: string[];
  };
  episodes: {
    shouldCreate: boolean;
    count?: number;
    dates?: Array<{ startDate: string; endDate: string }>;
  };
}

const CATEGORIES = [
  { label: '유튜브', icon: Youtube, color: 'text-red-500', bg: 'bg-red-50' },
  { label: '브이로그', icon: Camera, color: 'text-orange-500', bg: 'bg-orange-50' },
  { label: '기업 홍보', icon: Building2, color: 'text-orange-500', bg: 'bg-orange-50' },
  { label: '교육', icon: BookOpen, color: 'text-green-500', bg: 'bg-green-50' },
  { label: '기타', icon: MoreHorizontal, color: 'text-gray-500', bg: 'bg-gray-100' },
];

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 48 : -48,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -48 : 48,
    opacity: 0,
    transition: { duration: 0.2, ease: [0.55, 0, 1, 0.45] },
  }),
};

export default function ProjectWizardModal({
  isOpen,
  onClose,
  onComplete,
  clients,
  partners,
}: ProjectWizardModalProps) {
  const { warning } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [wizardData, setWizardData] = useState<Partial<WizardData>>({});

  // 임시 폼 데이터
  const [startType, setStartType] = useState<'with-client' | 'project-only' | null>(null);
  const [clientOption, setClientOption] = useState<'existing' | 'new' | 'skip'>('existing');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientContact, setNewClientContact] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');

  const [projectTitle, setProjectTitle] = useState('');
  const [projectCategory, setProjectCategory] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);

  const [addProjectNow, setAddProjectNow] = useState<boolean | null>(null);
  const [shouldCreateEpisodes, setShouldCreateEpisodes] = useState<boolean | null>(null);
  const [episodeCount, setEpisodeCount] = useState(10);
  const [episodeInputType, setEpisodeInputType] = useState<'quick' | 'custom' | null>(null);
  const [customEpisodeCount, setCustomEpisodeCount] = useState('');
  const [episodeDates, setEpisodeDates] = useState<Array<{ startDate: string; endDate: string }>>([]);

  // 회차 수가 바뀔 때 날짜 배열 동기화
  useEffect(() => {
    setEpisodeDates(prev =>
      Array.from({ length: episodeCount }, (_, i) => prev[i] ?? { startDate: '', endDate: '' })
    );
  }, [episodeCount]);

  // "프로젝트만 빠르게"에서 인라인으로 선택할 클라이언트
  const [projectOnlyClientId, setProjectOnlyClientId] = useState('');

  // 드롭다운 상태
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [partnerSearch, setPartnerSearch] = useState('');
  const clientDropdownRef = useRef<HTMLButtonElement>(null);
  const [clientDropdownPos, setClientDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const [clientDropdownTarget, setClientDropdownTarget] = useState<'step2' | 'projectOnly'>('step2');
  const categoryDropdownRef = useRef<HTMLButtonElement>(null);
  const [categoryDropdownPos, setCategoryDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const partnerDropdownRef = useRef<HTMLButtonElement>(null);
  const [partnerDropdownPos, setPartnerDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const openClientDropdown = useCallback((target: 'step2' | 'projectOnly') => {
    if (clientDropdownRef.current) {
      const rect = clientDropdownRef.current.getBoundingClientRect();
      setClientDropdownPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
    setClientDropdownTarget(target);
    setIsClientDropdownOpen(true);
    setClientSearch('');
  }, []);

  const openCategoryDropdown = useCallback(() => {
    if (categoryDropdownRef.current) {
      const rect = categoryDropdownRef.current.getBoundingClientRect();
      setCategoryDropdownPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
    setIsCategoryDropdownOpen(true);
  }, []);

  const openPartnerDropdown = useCallback(() => {
    if (partnerDropdownRef.current) {
      const rect = partnerDropdownRef.current.getBoundingClientRect();
      setPartnerDropdownPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
    setIsPartnerDropdownOpen(true);
    setPartnerSearch('');
  }, []);

  const showToast = (message: string) => warning(message);

  const steps = [
    { number: 1, label: '시작' },
    { number: 2, label: '클라이언트' },
    { number: 3, label: '프로젝트' },
    { number: 4, label: '회차' },
    { number: 5, label: '완료' },
  ];

  const goToStep = (nextStep: number) => {
    setDirection(nextStep > currentStep ? 1 : -1);
    setCurrentStep(nextStep);
  };

  const handleNext = () => {
    if (currentStep === 1 && !startType) {
      showToast('시작 방법을 선택해주세요.');
      return;
    }

    if (currentStep === 2 && startType === 'with-client') {
      if (clientOption === 'existing' && !selectedClientId) {
        showToast('클라이언트를 선택해주세요.');
        return;
      }
      if (clientOption === 'new' && !newClientName) {
        showToast('클라이언트 이름을 입력해주세요.');
        return;
      }
      // 기존 클라이언트 선택 시 프로젝트 폼 자동 활성화
      if (clientOption === 'existing') {
        setAddProjectNow(true);
      }
    }

    if (currentStep === 3) {
      if (clientOption !== 'existing' && addProjectNow === null) {
        showToast('프로젝트 추가 여부를 선택해주세요.');
        return;
      }
      if (addProjectNow === true && !projectTitle) {
        showToast('프로젝트 이름을 입력해주세요.');
        return;
      }
    }

    if (currentStep === 4 && shouldCreateEpisodes === null) {
      showToast('회차 추가 여부를 선택해주세요.');
      return;
    }

    // "프로젝트만 빠르게"는 step 2 건너뜀
    if (currentStep === 1 && startType === 'project-only') {
      goToStep(3);
      return;
    }

    if (currentStep < 5) {
      goToStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    // "프로젝트만 빠르게"는 step 3에서 step 1로 돌아감
    if (currentStep === 3 && startType === 'project-only') {
      goToStep(1);
      return;
    }

    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    const data: WizardData = {
      startType: startType!,
      project: {
        title: projectTitle,
        category: projectCategory,
        description: projectDescription,
        partnerIds: selectedPartnerIds,
      },
      episodes: {
        shouldCreate: shouldCreateEpisodes || false,
        count: shouldCreateEpisodes ? episodeCount : undefined,
        dates: shouldCreateEpisodes ? episodeDates : undefined,
      },
    };

    if (startType === 'with-client') {
      if (clientOption === 'existing') {
        data.client = { isNew: false, id: selectedClientId };
      } else if (clientOption === 'new') {
        data.client = { isNew: true, name: newClientName, contact: newClientContact, email: newClientEmail };
      }
    } else if (startType === 'project-only' && projectOnlyClientId) {
      data.client = { isNew: false, id: projectOnlyClientId };
    }

    onComplete(data);
  };

  const togglePartner = (partnerId: string) => {
    if (selectedPartnerIds.includes(partnerId)) {
      setSelectedPartnerIds(selectedPartnerIds.filter(id => id !== partnerId));
    } else {
      setSelectedPartnerIds([...selectedPartnerIds, partnerId]);
    }
  };


  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 배경 */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* 모달 */}
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 타임라인 헤더 */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-white" size={24} />
                  <h2 className="text-2xl font-bold text-white">새 프로젝트 시작</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>

              {/* 스텝 타임라인 */}
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={step.number} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <motion.div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                          currentStep > step.number
                            ? 'bg-white text-orange-600'
                            : currentStep === step.number
                            ? 'bg-white text-orange-600'
                            : 'bg-orange-400/30 text-white'
                        }`}
                        animate={
                          currentStep === step.number
                            ? { boxShadow: '0 0 0 4px rgba(255,255,255,0.35)' }
                            : { boxShadow: '0 0 0 0px rgba(255,255,255,0)' }
                        }
                        transition={{ duration: 0.3 }}
                      >
                        {currentStep > step.number ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          >
                            <Check size={20} strokeWidth={3} />
                          </motion.div>
                        ) : (
                          step.number
                        )}
                      </motion.div>
                      <span
                        className={`text-xs mt-2 font-medium transition-colors ${
                          currentStep >= step.number ? 'text-white' : 'text-orange-200'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="flex-1 h-1 mx-2 rounded-full bg-orange-400/30 overflow-hidden">
                        <motion.div
                          className="h-full bg-white rounded-full"
                          initial={false}
                          animate={{ width: currentStep > step.number ? '100%' : '0%' }}
                          transition={{ duration: 0.4, ease: 'easeInOut' }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 컨텐츠 */}
            <div className="min-h-[400px] max-h-[60vh] overflow-y-auto overflow-x-hidden">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={stepVariants as any}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="p-8"
                >
                  {/* 스텝 1: 시작 */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">새 프로젝트를 시작합니다</h3>
                        <p className="text-gray-500">어떻게 시작하시겠어요?</p>
                      </div>

                      <div className="space-y-4">
                        <motion.button
                          onClick={() => setStartType('with-client')}
                          className={`w-full p-6 rounded-xl border-2 transition-colors text-left ${
                            startType === 'with-client'
                              ? 'border-orange-500 bg-white'
                              : 'border-gray-200 hover:border-orange-300'
                          }`}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="flex items-start gap-4">
                            <motion.div
                              className={`p-3 rounded-lg transition-colors ${startType === 'with-client' ? 'bg-orange-500' : 'bg-gray-100'}`}
                              animate={{ scale: startType === 'with-client' ? 1.08 : 1 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            >
                              <Building2 className={startType === 'with-client' ? 'text-white' : 'text-gray-600'} size={24} />
                            </motion.div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">클라이언트부터 시작</h4>
                              <p className="text-sm text-gray-600">새 클라이언트와 함께 프로젝트 생성</p>
                            </div>
                            <AnimatePresence>
                              {startType === 'with-client' && (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                >
                                  <CheckCircle className="text-orange-500" size={24} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.button>

                        <div
                          className={`rounded-xl border-2 transition-colors ${
                            startType === 'project-only'
                              ? 'border-orange-500 bg-white'
                              : 'border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          <motion.button
                            onClick={() => setStartType('project-only')}
                            className="w-full p-6 text-left"
                            whileTap={{ scale: 0.99 }}
                          >
                            <div className="flex items-start gap-4">
                              <motion.div
                                className={`p-3 rounded-lg transition-colors ${startType === 'project-only' ? 'bg-orange-500' : 'bg-gray-100'}`}
                                animate={{ scale: startType === 'project-only' ? 1.08 : 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                              >
                                <Zap className={startType === 'project-only' ? 'text-white' : 'text-gray-600'} size={24} />
                              </motion.div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">프로젝트만 빠르게</h4>
                                <p className="text-sm text-gray-600">기존 클라이언트 연결 또는 나중에 추가</p>
                              </div>
                              <AnimatePresence>
                                {startType === 'project-only' && (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                  >
                                    <CheckCircle className="text-orange-500" size={24} />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.button>

                          {/* 인라인 클라이언트 선택기 */}
                          <AnimatePresence>
                            {startType === 'project-only' && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.22, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="px-6 pb-5 pt-0" onClick={(e) => e.stopPropagation()}>
                                  <div className="border-t border-orange-200 pt-4">
                                    <p className="text-xs text-orange-600 font-medium mb-2">기존 클라이언트 연결 (선택사항)</p>
                                    {/* 선택된 클라이언트 칩 */}
                                    {projectOnlyClientId && (() => {
                                      const c = clients.find(cl => cl.id === projectOnlyClientId);
                                      return c ? (
                                        <div className="mb-2">
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium border border-orange-200">
                                            <Building2 size={12} />
                                            {c.name}
                                            <button type="button" onClick={() => setProjectOnlyClientId('')} className="hover:text-orange-900"><X size={12} /></button>
                                          </span>
                                        </div>
                                      ) : null;
                                    })()}
                                    {/* 드롭다운 트리거 */}
                                    <button
                                      ref={clientDropdownRef}
                                      type="button"
                                      onClick={() => isClientDropdownOpen ? setIsClientDropdownOpen(false) : openClientDropdown('projectOnly')}
                                      className={`w-full px-4 py-2.5 border rounded-xl bg-white text-left flex items-center justify-between transition-all ${
                                        isClientDropdownOpen ? 'border-orange-500 ring-2 ring-orange-100' : 'border-gray-300 hover:border-gray-400'
                                      }`}
                                    >
                                      <span className={projectOnlyClientId ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                        {projectOnlyClientId ? clients.find(c => c.id === projectOnlyClientId)?.name : '클라이언트를 선택하세요'}
                                      </span>
                                      <motion.div animate={{ rotate: isClientDropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                        <ChevronDown size={16} className="text-gray-400" />
                                      </motion.div>
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 스텝 2: 클라이언트 */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">클라이언트 선택</h3>
                        <p className="text-gray-500">기존 클라이언트를 선택하거나 새로 추가하세요</p>
                      </div>

                      <div className="space-y-3">
                        {/* 기존 클라이언트 선택 */}
                        <div
                          className={`rounded-xl border-2 cursor-pointer transition-colors ${
                            clientOption === 'existing' ? 'border-orange-500 bg-white' : 'border-gray-200 hover:border-orange-300'
                          }`}
                          onClick={() => setClientOption('existing')}
                        >
                          <div className="flex items-center gap-4 p-5">
                            <motion.div
                              className={`p-3 rounded-lg transition-colors flex-shrink-0 ${clientOption === 'existing' ? 'bg-orange-500' : 'bg-gray-100'}`}
                              animate={{ scale: clientOption === 'existing' ? 1.08 : 1 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            >
                              <Users className={clientOption === 'existing' ? 'text-white' : 'text-gray-600'} size={22} />
                            </motion.div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">기존 클라이언트 선택</h4>
                              <p className="text-sm text-gray-500 mt-0.5">등록된 클라이언트를 연결합니다</p>
                            </div>
                            <AnimatePresence>
                              {clientOption === 'existing' && (
                                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                                  <CheckCircle className="text-orange-500" size={22} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <AnimatePresence>
                            {clientOption === 'existing' && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                                style={{ overflow: 'hidden' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="px-5 pb-5 pt-0">
                                  <div className="border-t border-orange-100 pt-4">
                                    {/* 선택된 클라이언트 칩 */}
                                    {selectedClientId && (() => {
                                      const c = clients.find(cl => cl.id === selectedClientId);
                                      return c ? (
                                        <div className="mb-2">
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium border border-orange-200">
                                            <Building2 size={12} />
                                            {c.name}
                                            <button type="button" onClick={() => setSelectedClientId('')} className="hover:text-orange-900"><X size={12} /></button>
                                          </span>
                                        </div>
                                      ) : null;
                                    })()}
                                    {/* 드롭다운 트리거 */}
                                    <button
                                      ref={clientDropdownRef}
                                      type="button"
                                      onClick={() => isClientDropdownOpen ? setIsClientDropdownOpen(false) : openClientDropdown('step2')}
                                      className={`w-full px-4 py-2.5 border rounded-xl bg-white text-left flex items-center justify-between transition-all ${
                                        isClientDropdownOpen ? 'border-orange-500 ring-2 ring-orange-100' : 'border-gray-300 hover:border-gray-400'
                                      }`}
                                    >
                                      <span className={selectedClientId ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                        {selectedClientId ? clients.find(c => c.id === selectedClientId)?.name : '클라이언트를 선택하세요'}
                                      </span>
                                      <motion.div animate={{ rotate: isClientDropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                        <ChevronDown size={16} className="text-gray-400" />
                                      </motion.div>
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* 새 클라이언트 추가 */}
                        {startType === 'with-client' && (
                          <div
                            className={`rounded-xl border-2 cursor-pointer transition-colors ${
                              clientOption === 'new' ? 'border-orange-500 bg-white' : 'border-gray-200 hover:border-orange-300'
                            }`}
                            onClick={() => setClientOption('new')}
                          >
                            <div className="flex items-center gap-4 p-5">
                              <motion.div
                                className={`p-3 rounded-lg transition-colors flex-shrink-0 ${clientOption === 'new' ? 'bg-orange-500' : 'bg-gray-100'}`}
                                animate={{ scale: clientOption === 'new' ? 1.08 : 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                              >
                                <Briefcase className={clientOption === 'new' ? 'text-white' : 'text-gray-600'} size={22} />
                              </motion.div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">새 클라이언트 추가</h4>
                                <p className="text-sm text-gray-500 mt-0.5">새 클라이언트 정보를 직접 입력합니다</p>
                              </div>
                              <AnimatePresence>
                                {clientOption === 'new' && (
                                  <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                                    <CheckCircle className="text-orange-500" size={22} />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            <AnimatePresence>
                              {clientOption === 'new' && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                                  style={{ overflow: 'hidden' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="px-5 pb-5 pt-0">
                                    <div className="border-t border-orange-100 pt-4 space-y-3">
                                      <FloatingLabelInput label="회사명" required value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
                                      <FloatingLabelInput label="담당자" value={newClientContact} onChange={(e) => setNewClientContact(e.target.value)} />
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* 건너뛰기 */}
                        <motion.button
                          className={`w-full rounded-xl border-2 transition-colors text-left ${
                            clientOption === 'skip' ? 'border-orange-500 bg-white' : 'border-gray-200 hover:border-orange-300'
                          }`}
                          onClick={() => setClientOption('skip')}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="flex items-center gap-4 p-5">
                            <motion.div
                              className={`p-3 rounded-lg transition-colors flex-shrink-0 ${clientOption === 'skip' ? 'bg-orange-500' : 'bg-gray-100'}`}
                              animate={{ scale: clientOption === 'skip' ? 1.08 : 1 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            >
                              <ChevronRight className={clientOption === 'skip' ? 'text-white' : 'text-gray-600'} size={22} />
                            </motion.div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">나중에 추가할게요</h4>
                              <p className="text-sm text-gray-500 mt-0.5">프로젝트 생성 후 클라이언트를 연결합니다</p>
                            </div>
                            <AnimatePresence>
                              {clientOption === 'skip' && (
                                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                                  <CheckCircle className="text-orange-500" size={22} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.button>
                      </div>
                    </div>
                  )}

                  {/* 스텝 3: 프로젝트 정보 */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">프로젝트 정보</h3>
                        <p className="text-gray-500">
                          {clientOption === 'existing'
                            ? '프로젝트의 기본 정보를 입력하세요'
                            : '프로젝트의 기본 정보를 입력하세요'}
                        </p>
                      </div>

                      {/* 기존 클라이언트 선택 시 → 바로 폼 표시 */}
                      {clientOption === 'existing' ? (
                        <div className="space-y-4">
                          {(() => {
                            const selected = CATEGORIES.find(c => c.label === projectCategory);
                            return (
                              <>
                                <FloatingLabelInput
                                  label="프로젝트 이름"
                                  required
                                  value={projectTitle}
                                  onChange={(e) => setProjectTitle(e.target.value)}
                                  placeholder="예: 유튜브 채널 시리즈"
                                />

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                                  <button
                                    ref={categoryDropdownRef}
                                    type="button"
                                    onClick={() => isCategoryDropdownOpen ? setIsCategoryDropdownOpen(false) : openCategoryDropdown()}
                                    className={`w-full px-4 py-2.5 border rounded-xl bg-white text-left flex items-center justify-between transition-all ${
                                      isCategoryDropdownOpen ? 'border-orange-500 ring-2 ring-orange-100' : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {selected ? (
                                        <>
                                          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${selected.bg}`}>
                                            <selected.icon size={14} className={selected.color} />
                                          </div>
                                          <span className="text-gray-900 font-medium">{selected.label}</span>
                                        </>
                                      ) : (
                                        <span className="text-gray-400">선택하세요</span>
                                      )}
                                    </div>
                                    <motion.div animate={{ rotate: isCategoryDropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                      <ChevronDown size={16} className="text-gray-400" />
                                    </motion.div>
                                  </button>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">파트너 선택</label>
                                  {/* 선택된 파트너 칩 */}
                                  {selectedPartnerIds.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                      {selectedPartnerIds.map(id => {
                                        const p = partners.find(pt => pt.id === id);
                                        if (!p) return null;
                                        return (
                                          <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium border border-orange-200">
                                            {p.name}
                                            <button type="button" onClick={() => togglePartner(id)} className="hover:text-orange-900"><X size={12} /></button>
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {/* 드롭다운 트리거 */}
                                  <button
                                    ref={partnerDropdownRef}
                                    type="button"
                                    onClick={() => isPartnerDropdownOpen ? setIsPartnerDropdownOpen(false) : openPartnerDropdown()}
                                    className={`w-full px-4 py-2.5 border rounded-xl bg-white text-left flex items-center justify-between transition-all ${
                                      isPartnerDropdownOpen ? 'border-orange-500 ring-2 ring-orange-100' : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                  >
                                    <span className={selectedPartnerIds.length > 0 ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                      {selectedPartnerIds.length > 0 ? `${selectedPartnerIds.length}명 선택됨` : '파트너를 선택하세요'}
                                    </span>
                                    <motion.div animate={{ rotate: isPartnerDropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                      <ChevronDown size={16} className="text-gray-400" />
                                    </motion.div>
                                  </button>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        /* 기존 클라이언트 아닐 때 → 선택 카드 + 폼 */
                        <>
                          <div className="space-y-3">
                            <motion.div
                              className={`rounded-xl border-2 transition-colors cursor-pointer ${addProjectNow === true ? 'border-orange-500 bg-white' : 'border-gray-200 hover:border-orange-300'}`}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => setAddProjectNow(true)}
                            >
                              <div className="flex items-center gap-4 p-5">
                                <div className={`p-2.5 rounded-lg transition-colors ${addProjectNow === true ? 'bg-orange-500' : 'bg-gray-100'}`}>
                                  <Film className={addProjectNow === true ? 'text-white' : 'text-gray-600'} size={20} />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">지금 프로젝트 추가하기</h4>
                                  <p className="text-sm text-gray-500 mt-0.5">프로젝트 이름, 카테고리 등을 입력합니다</p>
                                </div>
                                <AnimatePresence>
                                  {addProjectNow === true && (
                                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                                      <CheckCircle className="text-orange-500" size={22} />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </motion.div>
                          </div>

                          <AnimatePresence>
                            {addProjectNow === true && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                                style={{ overflow: 'hidden' }}
                              >
                                <div className="space-y-4 pt-2 px-0.5 pb-0.5">
                                  <FloatingLabelInput label="프로젝트 이름" required value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="예: 유튜브 채널 시리즈" />

                                  <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                                    {(() => {
                                      const selected = CATEGORIES.find(c => c.label === projectCategory);
                                      return (
                                          <button
                                            ref={categoryDropdownRef}
                                            type="button"
                                            onClick={() => isCategoryDropdownOpen ? setIsCategoryDropdownOpen(false) : openCategoryDropdown()}
                                            className={`w-full px-4 py-2.5 border rounded-xl bg-white text-left flex items-center justify-between transition-all ${isCategoryDropdownOpen ? 'border-orange-500 ring-2 ring-orange-100' : 'border-gray-300 hover:border-gray-400'}`}
                                          >
                                            <div className="flex items-center gap-2">
                                              {selected ? (
                                                <>
                                                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${selected.bg}`}>
                                                    <selected.icon size={14} className={selected.color} />
                                                  </div>
                                                  <span className="text-gray-900 font-medium">{selected.label}</span>
                                                </>
                                              ) : (
                                                <span className="text-gray-400">선택하세요</span>
                                              )}
                                            </div>
                                            <motion.div animate={{ rotate: isCategoryDropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                              <ChevronDown size={16} className="text-gray-400" />
                                            </motion.div>
                                          </button>
                                      );
                                    })()}
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">파트너 선택</label>
                                    {/* 선택된 파트너 칩 */}
                                    {selectedPartnerIds.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mb-2">
                                        {selectedPartnerIds.map(id => {
                                          const p = partners.find(pt => pt.id === id);
                                          if (!p) return null;
                                          return (
                                            <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium border border-orange-200">
                                              {p.name}
                                              <button type="button" onClick={() => togglePartner(id)} className="hover:text-orange-900"><X size={12} /></button>
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                    {/* 드롭다운 트리거 */}
                                    <button
                                      ref={partnerDropdownRef}
                                      type="button"
                                      onClick={() => isPartnerDropdownOpen ? setIsPartnerDropdownOpen(false) : openPartnerDropdown()}
                                      className={`w-full px-4 py-2.5 border rounded-xl bg-white text-left flex items-center justify-between transition-all ${
                                        isPartnerDropdownOpen ? 'border-orange-500 ring-2 ring-orange-100' : 'border-gray-300 hover:border-gray-400'
                                      }`}
                                    >
                                      <span className={selectedPartnerIds.length > 0 ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                        {selectedPartnerIds.length > 0 ? `${selectedPartnerIds.length}명 선택됨` : '파트너를 선택하세요'}
                                      </span>
                                      <motion.div animate={{ rotate: isPartnerDropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                        <ChevronDown size={16} className="text-gray-400" />
                                      </motion.div>
                                    </button>
                                  </div>

                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {(() => {
                            const disabled = (startType === 'project-only' && !projectOnlyClientId) || (startType === 'with-client' && clientOption === 'skip');
                            return (
                              <motion.div
                                className={`rounded-xl border-2 transition-colors ${
                                  addProjectNow === false
                                    ? 'border-orange-500 bg-white'
                                    : disabled ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50' : 'border-gray-200 hover:border-orange-300 cursor-pointer'
                                }`}
                                onClick={() => { if (disabled) return; setAddProjectNow(false); goToStep(5); }}
                                whileTap={!disabled ? { scale: 0.99 } : {}}
                              >
                                <div className="flex items-center gap-4 p-5">
                                  <motion.div
                                    className={`p-2.5 rounded-lg transition-colors flex-shrink-0 ${addProjectNow === false ? 'bg-orange-500' : 'bg-gray-100'}`}
                                    animate={{ scale: addProjectNow === false ? 1.08 : 1 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                  >
                                    <ChevronRight className={addProjectNow === false ? 'text-white' : disabled ? 'text-gray-300' : 'text-gray-600'} size={20} />
                                  </motion.div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">나중에 프로젝트를 추가할게요</h4>
                                    <p className="text-sm text-gray-500 mt-0.5">프로젝트 생성 후 추가합니다</p>
                                    {disabled && <p className="text-xs text-red-400 mt-1">클라이언트를 먼저 연결해야 이 옵션을 선택할 수 있어요</p>}
                                  </div>
                                  <AnimatePresence>
                                    {addProjectNow === false && (
                                      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                                        <CheckCircle className="text-orange-500" size={22} />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </motion.div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  )}

                  {/* 스텝 4: 회차 설정 */}
                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">회차를 추가하시겠어요?</h3>
                        <p className="text-gray-500">지금 회차를 추가하거나 나중에 추가할 수 있습니다</p>
                      </div>

                      <div className="space-y-4">
                        <motion.div
                          className={`w-full p-6 rounded-xl border-2 transition-colors cursor-pointer ${
                            shouldCreateEpisodes === true
                              ? 'border-orange-500 bg-white cursor-default'
                              : 'border-gray-200 hover:border-orange-300'
                          }`}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => {
                            if (shouldCreateEpisodes !== true) {
                              setShouldCreateEpisodes(true);
                              if (!episodeInputType) {
                                setEpisodeInputType('quick');
                                setEpisodeCount(1);
                              }
                            }
                          }}
                        >
                          <div className="flex items-start gap-4" onClick={(e) => shouldCreateEpisodes === true && e.stopPropagation()}>
                            <div className="p-3 rounded-lg bg-orange-500 flex-shrink-0">
                              <Film className="text-white" size={24} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">
                                지금 회차 추가하기
                              </h4>
                              <p className="text-sm text-gray-600 mb-4">회차를 자동으로 생성합니다</p>

                              <AnimatePresence>
                                {shouldCreateEpisodes === true && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                    className="overflow-hidden"
                                  >
                                    <div className="space-y-4">
                                      {/* 빠른 선택 버튼 */}
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-3">빠른 선택</label>
                                        <div className="grid grid-cols-4 gap-2">
                                          {[1, 2, 3, 4].map((count) => (
                                            <motion.button
                                              key={count}
                                              onClick={() => {
                                                setEpisodeInputType('quick');
                                                setEpisodeCount(count);
                                              }}
                                              className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                                                episodeInputType === 'quick' && episodeCount === count
                                                  ? 'bg-orange-500 text-white shadow-lg'
                                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                              }`}
                                              whileTap={{ scale: 0.95 }}
                                            >
                                              {count}회차
                                            </motion.button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* 직접 입력 */}
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">또는 직접 입력</label>
                                        <div className="flex items-center gap-3">
                                          <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={episodeInputType === 'custom' ? customEpisodeCount : ''}
                                            onChange={(e) => {
                                              setEpisodeInputType('custom');
                                              const num = parseInt(e.target.value);
                                              if (isNaN(num) || e.target.value === '') {
                                                setCustomEpisodeCount(e.target.value);
                                                return;
                                              }
                                              if (num > 10) {
                                                setCustomEpisodeCount('10');
                                                setEpisodeCount(10);
                                                showToast('최대 10개까지만 생성할 수 있습니다.');
                                                return;
                                              }
                                              if (num > 0) {
                                                setCustomEpisodeCount(e.target.value);
                                                setEpisodeCount(num);
                                              }
                                            }}
                                            onFocus={() => setEpisodeInputType('custom')}
                                            placeholder="숫자 입력 (최대 10)"
                                            className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                                              episodeInputType === 'custom' ? 'border-orange-500' : 'border-gray-300'
                                            }`}
                                          />
                                          <span className="text-gray-600 font-medium">회</span>
                                        </div>
                                      </div>

                                      {/* 회차별 일정 */}
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <label className="text-sm font-medium text-gray-700">회차별 일정</label>
                                          <span className="text-xs text-gray-400">선택사항</span>
                                        </div>
                                        {/* 열 헤더 */}
                                        <div className="flex items-center gap-3 px-0.5 mb-1">
                                          <div className="w-9 flex-shrink-0" />
                                          <div className="flex-1 grid grid-cols-2 gap-3">
                                            <span className="text-xs font-medium text-orange-400 pl-1">시작일</span>
                                            <span className="text-xs font-medium text-orange-400 pl-1">마감일</span>
                                          </div>
                                        </div>

                                        {/* 회차 행 */}
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                          {Array.from({ length: episodeCount }, (_, i) => (
                                            <motion.div
                                              key={i}
                                              initial={{ opacity: 0, y: -6 }}
                                              animate={{ opacity: 1, y: 0 }}
                                              transition={{ delay: i * 0.04, duration: 0.18 }}
                                              className="flex items-center gap-3"
                                            >
                                              <div className="w-9 h-9 rounded-full bg-orange-50 border-2 border-orange-100 flex items-center justify-center flex-shrink-0">
                                                <span className="text-[11px] font-bold text-orange-500">{i + 1}</span>
                                              </div>
                                              <div className="flex-1">
                                                <DateRangePicker
                                                  startDate={episodeDates[i]?.startDate ?? ''}
                                                  endDate={episodeDates[i]?.endDate ?? ''}
                                                  onStartChange={(v) => {
                                                    const next = [...episodeDates];
                                                    next[i] = { ...next[i], startDate: v };
                                                    setEpisodeDates(next);
                                                  }}
                                                  onEndChange={(v) => {
                                                    const next = [...episodeDates];
                                                    next[i] = { ...next[i], endDate: v };
                                                    setEpisodeDates(next);
                                                  }}
                                                />
                                              </div>
                                            </motion.div>
                                          ))}
                                        </div>
                                      </div>

                                      <motion.p
                                        className="text-xs text-gray-500 bg-orange-50 p-3 rounded-lg"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.1 }}
                                      >
                                        1~{episodeCount}회 자동 생성 (나중에 개별 수정 가능)
                                      </motion.p>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            <AnimatePresence>
                              {shouldCreateEpisodes === true && (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                  className="flex-shrink-0"
                                >
                                  <CheckCircle className="text-orange-500" size={24} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>

                        <motion.button
                          onClick={() => {
                            setShouldCreateEpisodes(false);
                            setEpisodeInputType(null);
                          }}
                          className={`w-full p-6 rounded-xl border-2 transition-colors text-left ${
                            shouldCreateEpisodes === false
                              ? 'border-orange-500 bg-white'
                              : 'border-gray-200 hover:border-orange-300'
                          }`}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg transition-colors ${shouldCreateEpisodes === false ? 'bg-orange-500' : 'bg-gray-100'}`}>
                              <ChevronRight className={shouldCreateEpisodes === false ? 'text-white' : 'text-gray-600'} size={24} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">나중에 회차 추가할게요</h4>
                              <p className="text-sm text-gray-600">프로젝트 생성 후 회차를 추가합니다</p>
                            </div>
                            <AnimatePresence>
                              {shouldCreateEpisodes === false && (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                >
                                  <CheckCircle className="text-orange-500" size={24} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.button>
                      </div>
                    </div>
                  )}

                  {/* 스텝 5: 완료 & 요약 */}
                  {currentStep === 5 && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <motion.div
                          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                        >
                          <motion.div
                            initial={{ scale: 0, rotate: -30 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.25 }}
                          >
                            <CheckCircle className="text-green-600" size={40} />
                          </motion.div>
                        </motion.div>
                        <motion.h3
                          className="text-2xl font-bold text-gray-900 mb-2"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          프로젝트 준비 완료
                        </motion.h3>
                        <motion.p
                          className="text-gray-500"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                        >
                          생성될 내용을 확인해주세요
                        </motion.p>
                      </div>

                      <motion.div
                        className="bg-gradient-to-br from-orange-50 to-orange-50 rounded-xl p-6 border border-orange-200"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                      >
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Briefcase size={20} className="text-orange-600" />
                          생성될 내용
                        </h4>
                        <div className="space-y-3">
                          {startType === 'with-client' && clientOption !== 'skip' && (
                            <div className="flex items-start gap-3">
                              <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2" />
                              <div>
                                <span className="text-sm font-medium text-gray-700">클라이언트: </span>
                                <span className="text-sm text-gray-900">
                                  {clientOption === 'existing'
                                    ? clients.find(c => c.id === selectedClientId)?.name
                                    : newClientName
                                  }
                                  {clientOption === 'new' && ' (신규)'}
                                </span>
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2" />
                            <div>
                              <span className="text-sm font-medium text-gray-700">프로젝트: </span>
                              <span className="text-sm text-gray-900">
                                {projectTitle || <span className="text-gray-400 italic">나중에 추가 예정</span>}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2" />
                            <div>
                              <span className="text-sm font-medium text-gray-700">카테고리: </span>
                              <span className="text-sm text-gray-900">{projectCategory}</span>
                            </div>
                          </div>
                          {shouldCreateEpisodes && (
                            <div className="flex items-start gap-3">
                              <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2" />
                              <div>
                                <span className="text-sm font-medium text-gray-700">회차: </span>
                                <span className="text-sm text-gray-900">{episodeCount}개 (1~{episodeCount}회)</span>
                              </div>
                            </div>
                          )}
                          {selectedPartnerIds.length > 0 && (
                            <div className="flex items-start gap-3">
                              <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2" />
                              <div>
                                <span className="text-sm font-medium text-gray-700">파트너: </span>
                                <span className="text-sm text-gray-900">
                                  {selectedPartnerIds.map(id => partners.find(p => p.id === id)?.name).join(', ')}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 푸터 버튼 */}
            <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex justify-between">
              <motion.button
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                whileTap={currentStep > 1 ? { scale: 0.97 } : {}}
              >
                <ChevronLeft size={20} />
                이전
              </motion.button>

              {currentStep < 5 ? (
                <motion.button
                  onClick={handleNext}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-md font-medium flex items-center gap-2"
                  whileTap={{ scale: 0.97 }}
                >
                  다음
                  <ChevronRight size={20} />
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleComplete}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-md font-semibold flex items-center gap-2"
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Sparkles size={20} />
                  프로젝트 시작!
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* 클라이언트 드롭다운 (fixed position - overflow 무시) */}
    <AnimatePresence>
      {isClientDropdownOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsClientDropdownOpen(false)} />
          <motion.div
            className="fixed z-[61] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
            style={{ top: clientDropdownPos.top, left: clientDropdownPos.left, width: clientDropdownPos.width }}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* 검색 */}
            <div className="px-3 pt-3 pb-2">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="클라이언트 검색..."
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Escape' && setIsClientDropdownOpen(false)}
                  className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"
                />
                {clientSearch && (
                  <button onClick={() => setClientSearch('')} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
                )}
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto pb-1">
              {(() => {
                const filtered = clients.filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.company?.toLowerCase().includes(clientSearch.toLowerCase()));
                const currentId = clientDropdownTarget === 'step2' ? selectedClientId : projectOnlyClientId;
                return filtered.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">{clientSearch ? '검색 결과가 없습니다' : '등록된 클라이언트가 없습니다'}</p>
                ) : (
                  filtered.map((client, idx) => (
                    <motion.button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        if (clientDropdownTarget === 'step2') setSelectedClientId(client.id);
                        else setProjectOnlyClientId(client.id);
                        setIsClientDropdownOpen(false);
                        setClientSearch('');
                      }}
                      className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${currentId === client.id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.15 }}
                    >
                      <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building2 size={13} className="text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`font-medium text-sm ${currentId === client.id ? 'text-orange-700' : 'text-gray-800'}`}>{client.name}</span>
                        {client.company && <p className="text-xs text-gray-400 truncate">{client.company}</p>}
                      </div>
                      {currentId === client.id && <Check size={14} className="ml-auto text-orange-500 flex-shrink-0" />}
                    </motion.button>
                  ))
                );
              })()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* 카테고리 드롭다운 (fixed position - overflow 무시) */}
    <AnimatePresence>
      {isCategoryDropdownOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsCategoryDropdownOpen(false)} />
          <motion.div
            className="fixed z-[61] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
            style={{ top: categoryDropdownPos.top, left: categoryDropdownPos.left, width: categoryDropdownPos.width }}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="py-1">
              {CATEGORIES.map((cat, idx) => (
                <motion.button
                  key={cat.label}
                  type="button"
                  onClick={() => {
                    setProjectCategory(cat.label);
                    setIsCategoryDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${projectCategory === cat.label ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.15 }}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center ${cat.bg}`}>
                    <cat.icon size={14} className={cat.color} />
                  </div>
                  <span className={`font-medium text-sm ${projectCategory === cat.label ? 'text-orange-700' : 'text-gray-800'}`}>{cat.label}</span>
                  {projectCategory === cat.label && <Check size={14} className="ml-auto text-orange-500 flex-shrink-0" />}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* 파트너 드롭다운 (fixed position - overflow 무시) */}
    <AnimatePresence>
      {isPartnerDropdownOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsPartnerDropdownOpen(false)} />
          <motion.div
            className="fixed z-[61] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
            style={{ top: partnerDropdownPos.top, left: partnerDropdownPos.left, width: partnerDropdownPos.width }}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* 검색 */}
            <div className="px-3 pt-3 pb-2">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="파트너 검색..."
                  value={partnerSearch}
                  onChange={e => setPartnerSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Escape' && setIsPartnerDropdownOpen(false)}
                  className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"
                />
                {partnerSearch && (
                  <button onClick={() => setPartnerSearch('')} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
                )}
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto pb-1">
              {(() => {
                const activePartners = partners.filter(p =>
                  (!p.position || p.position === 'partner') && p.status === 'active' &&
                  (!partnerSearch || p.name.toLowerCase().includes(partnerSearch.toLowerCase()))
                );
                return activePartners.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">{partnerSearch ? '검색 결과가 없습니다' : '활성 파트너가 없습니다'}</p>
                ) : (
                  activePartners.map((partner, idx) => (
                    <motion.button
                      key={partner.id}
                      type="button"
                      onClick={() => togglePartner(partner.id)}
                      className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${selectedPartnerIds.includes(partner.id) ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.15 }}
                    >
                      <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User size={13} className="text-orange-500" />
                      </div>
                      <span className={`font-medium text-sm ${selectedPartnerIds.includes(partner.id) ? 'text-orange-700' : 'text-gray-800'}`}>{partner.name}</span>
                      {selectedPartnerIds.includes(partner.id) && <Check size={14} className="ml-auto text-orange-500 flex-shrink-0" />}
                    </motion.button>
                  ))
                );
              })()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
