'use client';

import { useState, useEffect, useRef } from 'react';
import { Mail, Phone, Building2, UserCircle, X, Trash2, Edit, TrendingUp, Folder, Film, DollarSign, Calendar, Activity, ChevronDown, Search, Clock, ArrowRight, Plus, Users, UserCheck, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { Partner } from '@/types';
import { addToTrash } from '@/lib/trash';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { useToast } from '@/contexts/ToastContext';
import { EmptyPartners, EmptySearch } from '@/components/EmptyState';
import { getPartners, insertPartner, updatePartner, deletePartner } from '@/lib/supabase/db';

function getPartnerProjectCount(_id: string) { return 0; }
function getPartnerStats(_id: string) {
  return {
    projectCount: 0, episodeCount: 0, totalAmount: 0,
    totalProjects: 0, inProgressProjects: 0, completedProjects: 0,
    totalEpisodes: 0, completedEpisodes: 0, inProgressEpisodes: 0,
    thisMonthEpisodes: 0, lastActivity: null as string | null,
    totalRevenue: 0, thisMonthRevenue: 0, avgRevenuePerEpisode: 0,
    projects: [] as any[],
  };
}

export default function PartnersPage() {
  const toast = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    getPartners().then(setPartners);
  }, []);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [partnerToEdit, setPartnerToEdit] = useState<Partner | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: 'partner' as 'admin' | 'partner',
    status: 'active' as 'active' | 'inactive',
  });

  // 파트너 추가 모달 상태
  const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false);
  const [isPartnerSuccess, setIsPartnerSuccess] = useState(false);
  const [isGenerationDropdownOpen, setIsGenerationDropdownOpen] = useState(false);
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);

  const KR_BANKS = [
    { name: 'KB국민',    abbr: 'KB', bg: '#FFBC00', fg: '#2D2D2D' },
    { name: '신한',      abbr: '신',  bg: '#0046FF', fg: '#fff' },
    { name: '하나',      abbr: '하',  bg: '#009E60', fg: '#fff' },
    { name: '우리',      abbr: '우',  bg: '#0070C0', fg: '#fff' },
    { name: 'NH농협',    abbr: 'NH', bg: '#008751', fg: '#fff' },
    { name: 'IBK기업',   abbr: 'IB', bg: '#004B9B', fg: '#fff' },
    { name: 'KDB산업',   abbr: 'KD', bg: '#003087', fg: '#fff' },
    { name: 'SC제일',    abbr: 'SC', bg: '#00AA5E', fg: '#fff' },
    { name: '씨티',      abbr: 'C',  bg: '#003B8B', fg: '#fff' },
    { name: '대구',      abbr: '대',  bg: '#1B4F9A', fg: '#fff' },
    { name: '부산',      abbr: '부',  bg: '#005BAC', fg: '#fff' },
    { name: '광주',      abbr: '광',  bg: '#00833E', fg: '#fff' },
    { name: '제주',      abbr: '제',  bg: '#0068B7', fg: '#fff' },
    { name: '전북',      abbr: '전',  bg: '#003E8E', fg: '#fff' },
    { name: '경남',      abbr: '경',  bg: '#1D4B8E', fg: '#fff' },
    { name: '수협',      abbr: '수',  bg: '#005192', fg: '#fff' },
    { name: '카카오뱅크', abbr: 'K',  bg: '#FAE300', fg: '#2D2D2D' },
    { name: '토스뱅크',   abbr: 'T',  bg: '#0064FF', fg: '#fff' },
    { name: '케이뱅크',   abbr: 'K',  bg: '#7C4DFF', fg: '#fff' },
  ];
  const [newPartner, setNewPartner] = useState<Partial<Partner>>({
    name: '',
    phone: '',
    bank: '',
    bankAccount: '',
    partnerType: 'freelancer',
    role: 'partner',
    status: 'active',
    generation: 1,
  });
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'episodes' | 'projects'>('info');
  const [isTabSwitching, setIsTabSwitching] = useState(false);
  const [modalHeight, setModalHeight] = useState<number | null>(null);
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const tabSwitchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 이 useEffect를 제거했습니다 - localStorage 덮어쓰기 문제 해결

  const handleDeletePartner = (partnerId: string, partnerName: string) => {
    setPartnerToDelete({ id: partnerId, name: partnerName });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (partnerToDelete) {
      const partner = partners.find(p => p.id === partnerToDelete.id);
      if (partner) {
        await addToTrash('partner', partner);
        await deletePartner(partnerToDelete.id);
        setPartners(prev => prev.filter(p => p.id !== partnerToDelete.id));
        toast.success(`${partnerToDelete.name} 파트너가 휴지통으로 이동되었습니다.`);
      }
      setIsDeleteModalOpen(false);
      setPartnerToDelete(null);
    }
  };

  const handleDeactivatePartner = async () => {
    if (partnerToDelete) {
      await updatePartner(partnerToDelete.id, { status: 'inactive' });
      setPartners(prev => prev.map(p =>
        p.id === partnerToDelete.id ? { ...p, status: 'inactive' as const } : p
      ));
      toast.warning(`${partnerToDelete.name} 파트너가 비활성 상태로 변경되었습니다.`);
      setIsDeleteModalOpen(false);
      setPartnerToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setPartnerToDelete(null);
  };

  const handleEditPartner = (partner: Partner) => {
    setPartnerToEdit(partner);
    setEditForm({
      name: partner.name,
      email: partner.email || '',
      phone: partner.phone || '',
      company: partner.company || '',
      role: partner.role,
      status: partner.status,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!partnerToEdit) return;

    const updates = {
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone || undefined,
      company: editForm.company || undefined,
      role: editForm.role,
      status: editForm.status,
    };
    await updatePartner(partnerToEdit.id, updates);
    setPartners(prev => prev.map(p =>
      p.id === partnerToEdit.id ? { ...p, ...updates } : p
    ));

    toast.success(`${editForm.name} 파트너 정보가 수정되었습니다.`);
    setIsEditModalOpen(false);
    setPartnerToEdit(null);
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setPartnerToEdit(null);
  };

  // 파트너 추가 핸들러
  const handleAddPartner = async () => {
    if (!newPartner.name) {
      alert('파트너 이름을 입력해주세요.');
      return;
    }

    const saved = await insertPartner({
      name: newPartner.name,
      email: newPartner.email,
      phone: newPartner.phone,
      company: newPartner.company,
      partnerType: newPartner.partnerType,
      generation: newPartner.generation,
      bank: newPartner.bank,
      bankAccount: newPartner.bankAccount,
      role: newPartner.role || 'partner',
      status: newPartner.status || 'active',
    });

    if (saved) {
      setPartners(prev => [saved, ...prev]);
      setIsPartnerSuccess(true);
      setTimeout(() => {
        setIsAddPartnerModalOpen(false);
        setIsPartnerSuccess(false);
        setNewPartner({
          name: '',
          phone: '',
          bank: '',
          bankAccount: '',
          partnerType: 'freelancer',
          role: 'partner',
          status: 'active',
          generation: 1,
        });
      }, 1500);
    }
  };

  const handleViewDetail = (partner: Partner) => {
    setSelectedPartner(partner);
    setIsDetailModalOpen(true);
    setActiveTab('info');
  };

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedPartner(null);
    setActiveTab('info');
    setModalHeight(null);
  };

  // 탭 전환 함수 (부드러운 애니메이션)
  const switchTab = (newTab: 'info' | 'episodes' | 'projects') => {
    if (newTab === activeTab) return;
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
      setActiveTab(newTab);

      // 4. 높이를 auto로 임시 설정해서 진짜 높이 측정
      // 첫 번째 프레임: DOM 업데이트 대기
      requestAnimationFrame(() => {
        // 두 번째 프레임: 렌더링 완료 대기
        requestAnimationFrame(() => {
          if (modalContentRef.current) {
            // auto로 설정 (transition 없이)
            modalContentRef.current.style.transition = 'none';
            modalContentRef.current.style.height = 'auto';

            // 강제 reflow로 렌더링 완료 보장
            void modalContentRef.current.offsetHeight;

            // 진짜 높이 측정
            const newHeight = modalContentRef.current.offsetHeight;

            // 현재 높이로 다시 설정 (transition 없이)
            modalContentRef.current.style.height = `${currentHeight}px`;

            // 강제 reflow
            void modalContentRef.current.offsetHeight;

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
                      modalContentRef.current.style.height = '';
                    }
                  }, 600);
                }, 50);
              }
            });
          }
        });
      });
    }, 200);
  };

  // 검색 필터링
  const filteredPartners = partners.filter(partner => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      partner.name.toLowerCase().includes(query) ||
      partner.email?.toLowerCase().includes(query) ||
      partner.phone?.toLowerCase().includes(query) ||
      partner.company?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8">
      {/* 애니메이션 스타일 */}
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
        .modal-content {
          overflow: hidden;
          transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .modal-content.switching {
          opacity: 0;
        }
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
        .block-item {
          animation: fadeSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
      `}</style>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">파트너 관리</h1>
          <p className="text-gray-500 mt-2">비모 파트너 목록 및 관리</p>
        </div>
        <button
          onClick={() => setIsAddPartnerModalOpen(true)}
          className="px-5 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/30 font-semibold flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={18} />
          새 파트너 추가
        </button>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">전체 파트너</p>
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users size={18} className="text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{partners.length}</p>
          <p className="text-xs text-gray-400 mt-1">명 등록</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">활성 파트너</p>
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <UserCheck size={18} className="text-green-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {partners.filter(p => p.status === 'active').length}
          </p>
          <p className="text-xs text-gray-400 mt-1">현재 활동 중</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">비활성 파트너</p>
            <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">
              <UserCircle size={18} className="text-gray-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-400">
            {partners.filter(p => p.status === 'inactive').length}
          </p>
          <p className="text-xs text-gray-400 mt-1">비활성 상태</p>
        </div>
      </div>

      {/* 검색 바 */}
      <div className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3">
        <Search size={18} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="파트너 이름, 이메일, 전화번호, 회사로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent focus:outline-none text-sm text-gray-700 placeholder-gray-400"
        />
        {searchQuery && (
          <>
            <span className="text-xs text-gray-400 whitespace-nowrap">{filteredPartners.length}명</span>
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </>
        )}
      </div>

      {/* 파트너 목록 - 데스크톱 테이블 뷰 */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  파트너
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  연락처
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  프로젝트
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  담당 회차
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  최근 활동
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    {searchQuery ? (
                      <EmptySearch query={searchQuery} />
                    ) : (
                      <EmptyPartners />
                    )}
                  </td>
                </tr>
              ) : (
                filteredPartners.map((partner) => {
                const stats = getPartnerStats(partner.id);
                return (
                  <tr
                    key={partner.id}
                    onClick={() => handleViewDetail(partner)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {partner.name.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {partner.name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail size={12} className="mr-1" />
                            {partner.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {partner.phone ? (
                        <div className="text-sm text-gray-900 flex items-center">
                          <Phone size={14} className="mr-2 text-gray-400" />
                          {partner.phone}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          전체 {stats.totalProjects}개
                        </div>
                        <div className="text-xs text-gray-500">
                          진행중 {stats.inProgressProjects} / 완료 {stats.completedProjects}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {stats.totalEpisodes}개
                        </div>
                        <div className="text-xs text-gray-500">
                          완료 {stats.completedEpisodes}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          partner.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {partner.status === 'active' ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stats.lastActivity
                        ? new Date(stats.lastActivity).toLocaleDateString('ko-KR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditPartner(partner);
                          }}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                          title="수정"
                        >
                          <Edit size={16} className="text-gray-400 group-hover:text-blue-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePartner(partner.id, partner.name);
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                          title="삭제"
                        >
                          <Trash2 size={16} className="text-gray-400 group-hover:text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 파트너 목록 - 모바일 카드 뷰 */}
      <div className="md:hidden space-y-4">
        {filteredPartners.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            {searchQuery ? (
              <EmptySearch query={searchQuery} />
            ) : (
              <EmptyPartners />
            )}
          </div>
        ) : (
          filteredPartners.map((partner) => {
            const stats = getPartnerStats(partner.id);
            return (
              <div
                key={partner.id}
                onClick={() => handleViewDetail(partner)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:bg-gray-50 transition-colors"
              >
                {/* 헤더 - 파트너 정보 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {partner.name.charAt(0)}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {partner.name}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Mail size={12} className="mr-1 flex-shrink-0" />
                        <span className="truncate">{partner.email}</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`ml-2 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      partner.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {partner.status === 'active' ? '활성' : '비활성'}
                  </span>
                </div>

                {/* 연락처 정보 */}
                {partner.phone && (
                  <div className="flex items-center text-sm text-gray-600 mb-3">
                    <Phone size={14} className="mr-2 text-gray-400" />
                    {partner.phone}
                  </div>
                )}

                {/* 프로젝트 통계 */}
                <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-200">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center text-xs text-gray-500 mb-1">
                      <Folder size={12} className="mr-1" />
                      프로젝트
                    </div>
                    <div className="text-base font-semibold text-gray-900">
                      {stats.totalProjects}개
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      진행중 {stats.inProgressProjects} / 완료 {stats.completedProjects}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center text-xs text-gray-500 mb-1">
                      <Film size={12} className="mr-1" />
                      담당 회차
                    </div>
                    <div className="text-base font-semibold text-gray-900">
                      {stats.totalEpisodes}개
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      완료 {stats.completedEpisodes}
                    </div>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    최근 활동: {stats.lastActivity
                      ? new Date(stats.lastActivity).toLocaleDateString('ko-KR')
                      : '-'}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPartner(partner);
                      }}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      title="수정"
                    >
                      <Edit size={18} className="text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePartner(partner.id, partner.name);
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={18} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {isDeleteModalOpen && partnerToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={handleCancelDelete}
          />

          {/* 모달 */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-white rounded-lg shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">파트너 관리</h2>
              </div>

              {/* 내용 */}
              <div className="p-6">
                <p className="text-gray-700 text-center mb-2">
                  <span className="font-semibold text-gray-900">&quot;{partnerToDelete.name}&quot;</span> 파트너를<br />
                  정말 삭제하시겠습니까?
                </p>
                <p className="text-sm text-blue-600 text-center">
                  휴지통으로 이동되며, 30일 이내에 복구할 수 있습니다.
                </p>
              </div>

              {/* 푸터 */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleDeactivatePartner}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                >
                  비활성 등록
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 상세 정보 모달 */}
      {isDetailModalOpen && selectedPartner && (() => {
        const stats = getPartnerStats(selectedPartner.id);
        return (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* 배경 오버레이 */}
            <div
              className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
              onClick={handleCloseDetail}
            />

            {/* 모달 */}
            <div className="flex min-h-full items-center justify-center p-4">
              <div
                className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-all duration-300 ease-out"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 헤더 */}
                <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {selectedPartner.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedPartner.name}</h2>
                      <p className="text-sm text-gray-500">{selectedPartner.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseDetail}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                {/* 탭 메뉴 */}
                <div className="border-b border-gray-200">
                  <div className="flex space-x-1 px-6">
                    <button
                      onClick={() => switchTab('info')}
                      className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'info'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      기본정보
                    </button>
                    <button
                      onClick={() => switchTab('episodes')}
                      className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'episodes'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      진행 중인 회차
                    </button>
                    <button
                      onClick={() => switchTab('projects')}
                      className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'projects'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      담당 프로젝트
                    </button>
                  </div>
                </div>

                {/* 탭 내용 */}
                <div
                  ref={modalContentRef}
                  className={`modal-content p-6 space-y-6 ${isTabSwitching ? 'switching' : ''}`}
                  style={modalHeight !== null ? { height: `${modalHeight}px` } : undefined}
                >
                  {/* 기본정보 탭 */}
                  {activeTab === 'info' && (
                    <>
                      {/* 기본 정보 */}
                      <div className="block-item" style={{ animationDelay: '0ms' }}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">기본 정보</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <Phone size={16} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">전화번호</p>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedPartner.phone || '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Activity size={16} className="text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">상태</p>
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              selectedPartner.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {selectedPartner.status === 'active' ? '활성' : '비활성'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 통계 요약 */}
                  <div className="block-item" style={{ animationDelay: '60ms' }}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">통계 요약</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* 프로젝트 통계 */}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Folder size={20} className="text-blue-500" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalProjects}</p>
                        <p className="text-xs text-gray-600 mt-1">전체 프로젝트</p>
                        <div className="mt-2 text-xs text-gray-500">
                          진행중 {stats.inProgressProjects} · 완료 {stats.completedProjects}
                        </div>
                      </div>

                      {/* 회차 통계 */}
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Film size={20} className="text-purple-500" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalEpisodes}</p>
                        <p className="text-xs text-gray-600 mt-1">담당 회차</p>
                        <div className="mt-2 text-xs text-gray-500">
                          완료 {stats.completedEpisodes} · 진행중 {stats.inProgressEpisodes}
                        </div>
                      </div>

                      {/* 이번 달 회차 */}
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Calendar size={20} className="text-green-500" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.thisMonthEpisodes}</p>
                        <p className="text-xs text-gray-600 mt-1">이번 달 완료</p>
                        <div className="mt-2 text-xs text-gray-500">
                          {new Date().toLocaleDateString('ko-KR', { month: 'long' })}
                        </div>
                      </div>

                      {/* 최근 활동 */}
                      <div className="bg-orange-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Activity size={20} className="text-orange-500" />
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {stats.lastActivity
                            ? new Date(stats.lastActivity).toLocaleDateString('ko-KR')
                            : '-'}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">최근 활동일</p>
                      </div>
                    </div>
                  </div>

                  {/* 수익 정보 */}
                  <div className="block-item" style={{ animationDelay: '120ms' }}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">수익 정보</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <DollarSign size={16} className="text-gray-500" />
                          <p className="text-xs text-gray-600">총 수익</p>
                        </div>
                        <p className="text-xl font-bold text-gray-900">
                          ₩{stats.totalRevenue.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <TrendingUp size={16} className="text-gray-500" />
                          <p className="text-xs text-gray-600">이번 달 수익</p>
                        </div>
                        <p className="text-xl font-bold text-gray-900">
                          ₩{stats.thisMonthRevenue.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Film size={16} className="text-gray-500" />
                          <p className="text-xs text-gray-600">회차당 평균</p>
                        </div>
                        <p className="text-xl font-bold text-gray-900">
                          ₩{Math.round(stats.avgRevenuePerEpisode).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                    </>
                  )}

                  {/* 진행 중인 회차 탭 */}
                  {activeTab === 'episodes' && (() => {
                    // 파트너가 담당하는 진행 중인 에피소드 찾기
                    const partnerProjects = ([] as any[]).filter(p => p.partnerId === selectedPartner.id);
                    const inProgressEpisodes = partnerProjects.flatMap(project =>
                      (project.episodes || [])
                        .filter((ep: any) => ep.status === 'in_progress')
                        .map((ep: any) => ({ ...ep, project }))
                    );

                    return (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          진행 중인 회차 ({inProgressEpisodes.length})
                        </h3>
                        {inProgressEpisodes.length === 0 ? (
                          <div className="text-center py-12">
                            <Film size={48} className="text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">진행 중인 회차가 없습니다</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {inProgressEpisodes.map(({ project, ...episode }, index) => (
                              <Link
                                key={episode.id}
                                href={`/projects/${project.id}/episodes/${episode.id}`}
                                className="block-item block p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg hover:shadow-md transition-all border-l-4 border-blue-500"
                                style={{ animationDelay: `${index * 60}ms` }}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold text-gray-900">{project.title}</h4>
                                      <ArrowRight size={14} className="text-gray-400" />
                                      <span className="text-gray-700">{episode.episodeNumber}회차</span>
                                    </div>
                                    <p className="text-sm text-gray-600">{episode.title}</p>
                                  </div>
                                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium whitespace-nowrap">
                                    진행중
                                  </span>
                                </div>
                                {episode.deliveryDate && (
                                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                                    <Clock size={14} />
                                    <span>마감: {new Date(episode.deliveryDate).toLocaleDateString('ko-KR')}</span>
                                  </div>
                                )}
                                {episode.workContent && episode.workContent.length > 0 && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-gray-500">작업:</span>
                                    <div className="flex gap-1 flex-wrap">
                                      {episode.workContent.map((work: string) => (
                                        <span key={work} className="px-2 py-0.5 bg-white rounded text-xs text-gray-600">
                                          {work === 'filming' ? '촬영' : work === 'editing' ? '편집' : work === 'audio' ? '오디오' : work === 'color' ? '색보정' : work === 'graphics' ? '그래픽' : work}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* 담당 프로젝트 탭 */}
                  {activeTab === 'projects' && (
                    <>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        담당 프로젝트 ({stats.projects.length})
                      </h3>
                      {stats.projects.length === 0 ? (
                        <div className="text-center py-12">
                          <Folder size={48} className="text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">담당 프로젝트가 없습니다</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {stats.projects.map((project, index) => {
                            const projectDetail = ([] as any[]).find(p => p.id === project.id);
                            return (
                              <Link
                                key={project.id}
                                href={`/projects/${project.id}`}
                                className="block-item block p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all"
                                style={{ animationDelay: `${index * 60}ms` }}
                              >
                                {/* 프로젝트 헤더 */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 truncate">{project.title}</h4>
                                    <p className="text-sm text-gray-500 mt-1">{project.client}</p>
                                  </div>
                                  <span
                                    className={`ml-2 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                      project.status === 'completed'
                                        ? 'bg-green-100 text-green-800'
                                        : project.status === 'in_progress'
                                        ? 'bg-blue-100 text-blue-800'
                                        : project.status === 'on_hold'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {project.status === 'completed'
                                      ? '완료'
                                      : project.status === 'in_progress'
                                      ? '진행중'
                                      : project.status === 'on_hold'
                                      ? '보류'
                                      : '기획'}
                                  </span>
                                </div>

                                {/* 프로젝트 통계 */}
                                {projectDetail && projectDetail.episodes && (
                                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                                    <div className="bg-gray-50 rounded p-2">
                                      <p className="text-xs text-gray-500">총 회차</p>
                                      <p className="text-lg font-semibold text-gray-900">{projectDetail.episodes.length}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded p-2">
                                      <p className="text-xs text-gray-500">진행중</p>
                                      <p className="text-lg font-semibold text-blue-600">
                                        {projectDetail.episodes.filter((ep: any) => ep.status === 'in_progress').length}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* 예산 정보 */}
                                {projectDetail && (
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-500">예산</span>
                                      <span className="font-semibold text-gray-900">
                                        {(projectDetail.budget.totalAmount / 10000).toFixed(0)}만원
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 푸터 */}
                <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={handleCloseDetail}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 수정 모달 */}
      {isEditModalOpen && partnerToEdit && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={handleCancelEdit}
          />

          {/* 모달 */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-white rounded-lg shadow-xl max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">파트너 정보 수정</h2>
              </div>

              {/* 내용 */}
              <div className="p-6 space-y-4">
                <FloatingLabelInput
                  label="이름"
                  required
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />

                <FloatingLabelInput
                  label="이메일"
                  required
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />

                <FloatingLabelInput
                  label="전화번호"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />

                <FloatingLabelInput
                  label="회사"
                  type="text"
                  value={editForm.company}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                />

                {/* 권한 */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    권한 <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left flex items-center justify-between hover:border-gray-400 transition-colors"
                  >
                    <span className="text-gray-900">
                      {editForm.role === 'admin' ? '관리자' : '파트너'}
                    </span>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>

                  {isRoleDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm({ ...editForm, role: 'partner' });
                          setIsRoleDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left transition-colors ${
                          editForm.role === 'partner' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-900'
                        }`}
                      >
                        파트너
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm({ ...editForm, role: 'admin' });
                          setIsRoleDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left transition-colors ${
                          editForm.role === 'admin' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-900'
                        }`}
                      >
                        관리자
                      </button>
                    </div>
                  )}
                </div>

                {/* 상태 */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    상태 <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left flex items-center justify-between hover:border-gray-400 transition-colors"
                  >
                    <span className="text-gray-900">
                      {editForm.status === 'active' ? '활성' : '비활성'}
                    </span>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>

                  {isStatusDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm({ ...editForm, status: 'active' });
                          setIsStatusDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left transition-colors ${
                          editForm.status === 'active' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-900'
                        }`}
                      >
                        활성
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditForm({ ...editForm, status: 'inactive' });
                          setIsStatusDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left transition-colors ${
                          editForm.status === 'inactive' ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-900'
                        }`}
                      >
                        비활성
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 푸터 */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editForm.name || !editForm.email}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 파트너 추가 모달 - Toss Style */}
      {isAddPartnerModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-in fade-in duration-200">
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
                      {/* 은행 + 계좌번호 */}
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">계좌번호</label>
                        <div className="flex gap-2">
                          {/* 은행 선택 드롭다운 */}
                          <div className="relative flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                              className="h-14 px-3 border-2 border-gray-200 rounded-xl bg-white flex items-center gap-2 hover:border-gray-300 transition-all whitespace-nowrap min-w-[110px]"
                            >
                              {newPartner.bank ? (() => {
                                const b = KR_BANKS.find(b => b.name === newPartner.bank);
                                return b ? (
                                  <>
                                    <span
                                      className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                      style={{ background: b.bg, color: b.fg }}
                                    >
                                      {b.abbr}
                                    </span>
                                    <span className="text-sm font-medium text-gray-900 truncate max-w-[68px]">{b.name}</span>
                                  </>
                                ) : null;
                              })() : (
                                <span className="text-sm text-gray-400">은행 선택</span>
                              )}
                              <ChevronDown size={13} className="text-gray-400 flex-shrink-0 ml-auto" />
                            </button>

                            {isBankDropdownOpen && (
                              <div className="absolute z-30 left-0 top-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl p-3" style={{ width: '320px' }}>
                                <p className="text-xs text-gray-400 font-medium mb-2 px-1">은행 선택</p>
                                <div className="grid grid-cols-5 gap-1.5">
                                  {KR_BANKS.map((bank) => {
                                    const isSelected = newPartner.bank === bank.name;
                                    return (
                                      <button
                                        key={bank.name}
                                        type="button"
                                        onClick={() => {
                                          setNewPartner({ ...newPartner, bank: bank.name });
                                          setIsBankDropdownOpen(false);
                                        }}
                                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                                          isSelected
                                            ? 'bg-blue-50 ring-2 ring-blue-400'
                                            : 'hover:bg-gray-50'
                                        }`}
                                      >
                                        <span
                                          className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shadow-sm"
                                          style={{ background: bank.bg, color: bank.fg }}
                                        >
                                          {bank.abbr}
                                        </span>
                                        <span className="text-[10px] text-gray-700 font-medium leading-tight text-center w-full truncate">
                                          {bank.name}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          {/* 계좌번호 입력 */}
                          <input
                            type="text"
                            placeholder="계좌번호 입력"
                            value={newPartner.bankAccount || ''}
                            onChange={(e) => setNewPartner({ ...newPartner, bankAccount: e.target.value })}
                            className="flex-1 h-14 px-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm text-gray-900 placeholder-gray-400 transition-all"
                          />
                        </div>
                      </div>

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
                        disabled={!newPartner.name}
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
    </div>
  );
}
