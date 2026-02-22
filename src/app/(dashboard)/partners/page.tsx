'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, User, X, Trash2, Edit, Folder, Film, DollarSign, Calendar, ChevronDown, Search, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Partner, Project, Episode } from '@/types';
import { addToTrash } from '@/lib/trash';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { useToast } from '@/contexts/ToastContext';
import { EmptyPartners, EmptySearch } from '@/components/EmptyState';
import { getPartners, insertPartner, updatePartner, deletePartner, getProjects, getAllEpisodes } from '@/lib/supabase/db';
import PartnerEditModal from './PartnerEditModal';

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
] as const;

function computePartnerStats(
  partnerId: string,
  projects: Project[],
  allEpisodes: (Episode & { projectId: string })[]
) {
  const partnerProjects = projects.filter(p => p.partnerIds?.includes(partnerId) || p.partnerId === partnerId);
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const partnerEpisodes = allEpisodes.filter(e => e.assignee === partnerId);
  const completedEpisodes = partnerEpisodes.filter(e => e.status === 'completed');
  const inProgressEpisodes = partnerEpisodes.filter(e => e.status === 'in_progress');
  const thisMonthEpisodes = completedEpisodes.filter(e =>
    e.updatedAt && new Date(e.updatedAt) >= thisMonthStart
  );

  const totalRevenue = partnerEpisodes.reduce((sum, e) => sum + (e.budget?.partnerPayment || 0), 0);
  const thisMonthRevenue = thisMonthEpisodes.reduce((sum, e) => sum + (e.budget?.partnerPayment || 0), 0);

  const lastActivityDate = partnerEpisodes.length > 0
    ? partnerEpisodes.reduce((latest, e) => {
        const d = new Date(e.updatedAt || e.createdAt);
        return d > latest ? d : latest;
      }, new Date(0))
    : null;

  return {
    totalProjects: partnerProjects.length,
    inProgressProjects: partnerProjects.filter(p => p.status === 'in_progress').length,
    completedProjects: partnerProjects.filter(p => p.status === 'completed').length,
    totalEpisodes: partnerEpisodes.length,
    completedEpisodes: completedEpisodes.length,
    inProgressEpisodes: inProgressEpisodes.length,
    thisMonthEpisodes: thisMonthEpisodes.length,
    totalRevenue,
    thisMonthRevenue,
    avgRevenuePerEpisode: partnerEpisodes.length > 0 ? totalRevenue / partnerEpisodes.length : 0,
    lastActivity: lastActivityDate && lastActivityDate.getTime() > 0 ? lastActivityDate.toISOString() : null,
    projects: partnerProjects,
    projectCount: partnerProjects.length,
    episodeCount: partnerEpisodes.length,
    totalAmount: totalRevenue,
  };
}

export default function PartnersPage() {
  const toast = useToast();
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [allProjectsData, setAllProjectsData] = useState<Project[]>([]);
  const [allEpisodesData, setAllEpisodesData] = useState<(Episode & { projectId: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPartners(), getProjects(), getAllEpisodes()]).then(
      ([p, proj, eps]) => {
        setPartners(p);
        setAllProjectsData(proj);
        setAllEpisodesData(eps);
        setLoading(false);
      }
    );
  }, []);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [partnerToEdit, setPartnerToEdit] = useState<Partner | null>(null);

  // ESC 키로 삭제 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDeleteModalOpen) {
        setIsDeleteModalOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDeleteModalOpen]);

  // GlobalFAB 이벤트 리스너
  useEffect(() => {
    const handleFabAction = (e: CustomEvent) => {
      if (e.detail === 'new-partner') {
        setIsAddPartnerModalOpen(true);
      }
    };
    window.addEventListener('fab:action', handleFabAction as EventListener);
    return () => window.removeEventListener('fab:action', handleFabAction as EventListener);
  }, []);

  // 파트너 추가 모달 상태
  const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false);
  const [isGenerationDropdownOpen, setIsGenerationDropdownOpen] = useState(false);
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const handleDeletePartner = (partnerId: string, partnerName: string) => {
    setPartnerToDelete({ id: partnerId, name: partnerName });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (partnerToDelete) {
      const partner = partners.find(p => p.id === partnerToDelete.id);
      if (partner) {
        await addToTrash('partner', partner);
        const deleted = await deletePartner(partnerToDelete.id);
        if (deleted) {
          setPartners(prev => prev.filter(p => p.id !== partnerToDelete.id));
          toast.success(`${partnerToDelete.name} 파트너가 휴지통으로 이동되었습니다.`);
        } else {
          toast.error(`삭제에 실패했습니다. 다시 시도해주세요.`);
        }
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
    setIsEditModalOpen(true);
  };

  const handleToggleStatus = async (partner: Partner, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = partner.status === 'active' ? 'inactive' : 'active';
    const ok = await updatePartner(partner.id, { status: newStatus });
    if (ok) {
      setPartners(prev => prev.map(p =>
        p.id === partner.id ? { ...p, status: newStatus as 'active' | 'inactive' } : p
      ));
      toast.success(`${partner.name} 파트너가 ${newStatus === 'active' ? '활성' : '비활성'} 상태로 변경되었습니다.`);
    } else {
      toast.error('상태 변경에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleCloseEdit = () => {
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
      setIsAddPartnerModalOpen(false);
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
      toast.success(`${saved.name} 파트너가 추가되었습니다!`);
    } else {
      toast.error('파트너 추가에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 모든 파트너 stats를 한 번만 계산
  const partnerStatsMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof computePartnerStats>> = {};
    partners.forEach(p => {
      map[p.id] = computePartnerStats(p.id, allProjectsData, allEpisodesData);
    });
    return map;
  }, [partners, allProjectsData, allEpisodesData]);

  const activeCount = useMemo(() => partners.filter(p => p.status === 'active').length, [partners]);
  const inactiveCount = partners.length - activeCount;

  // 통계 카드용 합산 데이터
  const summaryStats = useMemo(() => {
    const vals = Object.values(partnerStatsMap);
    return {
      totalInProgressEpisodes: vals.reduce((s, v) => s + v.inProgressEpisodes, 0),
      totalThisMonthCompleted: vals.reduce((s, v) => s + v.thisMonthEpisodes, 0),
      totalThisMonthRevenue: vals.reduce((s, v) => s + v.thisMonthRevenue, 0),
    };
  }, [partnerStatsMap]);

  // 상태 + 검색 필터링
  const filteredPartners = useMemo(() => partners.filter(partner => {
    if (statusFilter !== 'all' && partner.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      partner.name.toLowerCase().includes(query) ||
      partner.email?.toLowerCase().includes(query) ||
      partner.phone?.toLowerCase().includes(query) ||
      partner.company?.toLowerCase().includes(query)
    );
  }), [partners, statusFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">파트너 관리</h1>
          <p className="text-gray-500 mt-1 sm:mt-2 text-sm sm:text-base">비모 파트너 목록 및 관리</p>
        </div>
        <button
          data-tour="tour-partner-new"
          onClick={() => setIsAddPartnerModalOpen(true)}
          className="px-4 py-2.5 sm:px-5 sm:py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-colors shadow-lg shadow-orange-500/30 font-semibold flex items-center justify-center gap-2 whitespace-nowrap text-sm sm:text-base self-start sm:self-auto"
        >
          <Plus size={18} />
          새 파트너 추가
        </button>
      </div>

      {/* 상태 필터 탭 */}
      <div data-tour="tour-partner-filters" className="bg-white rounded-xl sm:rounded-2xl p-1.5 sm:p-2 shadow-sm border border-gray-200 inline-flex gap-1 sm:gap-2">
        {([
          { key: 'all', label: '전체', count: partners.length },
          { key: 'active', label: '활성', count: activeCount },
          { key: 'inactive', label: '비활성', count: inactiveCount },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className="relative px-3 py-2.5 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl font-semibold flex-shrink-0"
          >
            {statusFilter === tab.key && (
              <motion.div
                layoutId="partner-filter-pill"
                className="absolute inset-0 bg-orange-500 rounded-lg sm:rounded-xl shadow-lg shadow-orange-500/30"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <div className={`relative flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base transition-colors duration-200 ${
              statusFilter === tab.key ? 'text-white' : 'text-gray-600 hover:text-gray-900'
            }`}>
              <span>{tab.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold transition-colors duration-200 ${
                statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {tab.count}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* 통계 */}
      <div data-tour="tour-partner-stats" className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <p className="text-xs sm:text-sm font-medium text-gray-500">진행중 회차</p>
            <div className="w-7 h-7 sm:w-9 sm:h-9 bg-orange-50 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Film size={14} className="text-orange-500 sm:hidden" />
              <Film size={18} className="text-orange-500 hidden sm:block" />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-gray-900">{summaryStats.totalInProgressEpisodes}</p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1">전체 파트너 기준</p>
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <p className="text-xs sm:text-sm font-medium text-gray-500">이번 달 완료</p>
            <div className="w-7 h-7 sm:w-9 sm:h-9 bg-green-50 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Calendar size={14} className="text-green-500 sm:hidden" />
              <Calendar size={18} className="text-green-500 hidden sm:block" />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-green-600">{summaryStats.totalThisMonthCompleted}</p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1">회차 완료 건수</p>
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <p className="text-xs sm:text-sm font-medium text-gray-500">이번 달 지출</p>
            <div className="w-7 h-7 sm:w-9 sm:h-9 bg-orange-50 rounded-lg sm:rounded-xl flex items-center justify-center">
              <DollarSign size={14} className="text-orange-500 sm:hidden" />
              <DollarSign size={18} className="text-orange-500 hidden sm:block" />
            </div>
          </div>
          <p className="text-lg sm:text-3xl font-bold text-gray-900">₩{summaryStats.totalThisMonthRevenue.toLocaleString()}</p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1">파트너 정산 합계</p>
        </div>
      </div>

      <div data-tour="tour-partner-search" className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3">
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
      <div data-tour="tour-partner-table" className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  파트너
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  프로젝트 / 회차
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
                  <td colSpan={5}>
                    {searchQuery ? (
                      <EmptySearch query={searchQuery} />
                    ) : (
                      <EmptyPartners />
                    )}
                  </td>
                </tr>
              ) : (
                filteredPartners.map((partner) => {
                const stats = partnerStatsMap[partner.id];
                return (
                  <tr
                    key={partner.id}
                    onClick={() => router.push(`/partners/${partner.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-orange-500">
                            {partner.name.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-3 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {partner.name}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {[partner.email, partner.phone].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">{stats.totalProjects}개 프로젝트</span>
                        <span className="text-gray-300 mx-1.5">·</span>
                        <span className="text-gray-500">{stats.totalEpisodes}개 회차</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        진행중 {stats.inProgressProjects} · 완료 {stats.completedEpisodes}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => handleToggleStatus(partner, e)}
                        className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          partner.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                        title={partner.status === 'active' ? '클릭하여 비활성으로 변경' : '클릭하여 활성으로 변경'}
                      >
                        {partner.status === 'active' ? '활성' : '비활성'}
                      </button>
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
                          className="p-2 hover:bg-orange-50 rounded-lg transition-colors group"
                          title="수정"
                        >
                          <Edit size={16} className="text-gray-400 group-hover:text-orange-500" />
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
            const stats = partnerStatsMap[partner.id];
            return (
              <div
                key={partner.id}
                onClick={() => router.push(`/partners/${partner.id}`)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:bg-gray-50 transition-colors"
              >
                {/* 헤더 - 파트너 정보 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User size={26} className="text-orange-500" />
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
                  <button
                    onClick={(e) => handleToggleStatus(partner, e)}
                    className={`ml-2 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                      partner.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {partner.status === 'active' ? '활성' : '비활성'}
                  </button>
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
                      className="p-2 hover:bg-orange-50 rounded-lg transition-colors"
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
          <div
            className="fixed inset-0 bg-gray-900/60"
            onClick={handleCancelDelete}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-white rounded-lg shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">파트너 관리</h2>
              </div>
              <div className="p-6">
                <p className="text-gray-700 text-center mb-2">
                  <span className="font-semibold text-gray-900">&quot;{partnerToDelete.name}&quot;</span> 파트너를<br />
                  정말 삭제하시겠습니까?
                </p>
                <p className="text-sm text-orange-600 text-center">
                  휴지통으로 이동되며, 30일 이내에 복구할 수 있습니다.
                </p>
              </div>
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2.5 sm:py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors active:scale-[0.97] text-sm font-medium"
                >
                  취소
                </button>
                <button
                  onClick={handleDeactivatePartner}
                  className="px-4 py-2.5 sm:py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors active:scale-[0.97] text-sm font-medium"
                >
                  비활성 등록
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2.5 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors active:scale-[0.97] text-sm font-medium"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 - 공유 컴포넌트 */}
      {isEditModalOpen && partnerToEdit && (
        <PartnerEditModal
          partner={partnerToEdit}
          onClose={handleCloseEdit}
          onSaved={(updates) => {
            setPartners(prev => prev.map(p =>
              p.id === partnerToEdit.id ? { ...p, ...updates } : p
            ));
            handleCloseEdit();
          }}
        />
      )}

      {/* 파트너 추가 모달 - Toss Style */}
      {isAddPartnerModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsAddPartnerModalOpen(false)}
          />
          <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
            <div
              className="relative bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
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
                              className="h-14 px-3 border-2 border-gray-200 rounded-xl bg-white flex items-center gap-2 hover:border-gray-300 transition-colors whitespace-nowrap min-w-[110px]"
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
                                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors ${
                                          isSelected
                                            ? 'bg-orange-50 ring-2 ring-orange-400'
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
                            className="flex-1 h-14 px-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm text-gray-900 placeholder-gray-400 transition-colors"
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
                            className={`h-14 rounded-xl font-semibold transition-colors ${
                              newPartner.partnerType === 'freelancer'
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            프리랜서
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewPartner({ ...newPartner, partnerType: 'business' })}
                            className={`h-14 rounded-xl font-semibold transition-colors ${
                              newPartner.partnerType === 'business'
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
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
                            className="w-full h-14 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-left flex items-center justify-between transition-colors"
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
                                  className="w-full px-4 py-3 hover:bg-orange-50 text-left transition-colors first:rounded-t-xl last:rounded-b-xl"
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
                        className="flex-1 h-14 text-gray-700 font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleAddPartner}
                        disabled={!newPartner.name}
                        className="flex-1 h-14 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none shadow-lg shadow-orange-500/30"
                      >
                        파트너 추가하기
                      </button>
                    </div>
                  </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
