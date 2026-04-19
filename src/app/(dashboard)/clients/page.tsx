'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Building2, MapPin, X, Trash2, ChevronDown, Search, Folder, Plus, Users, CheckCircle, Pencil } from 'lucide-react';
import { Client, Project } from '@/types';
import { addToTrash } from '@/lib/trash';
import { formatPhoneNumber } from '@/lib/utils';
import { FloatingLabelInput, FloatingLabelTextarea } from '@/components/FloatingLabelInput';
import { EmptyClients, EmptySearch } from '@/components/EmptyState';
import { getClients, insertClient, updateClient, deleteClient, getProjects } from '@/lib/supabase/db';
import { useToast } from '@/contexts/ToastContext';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { getComputedProjectStatus } from '@/lib/utils';
import { Episode } from '@/types';
import { getAllEpisodes } from '@/lib/supabase/db';

// 클라이언트의 프로젝트 기반 활성/비활성 자동 판별
function getClientComputedStatus(
  clientName: string,
  projects: Project[],
  allEpisodes: (Episode & { projectId: string })[]
): 'active' | 'inactive' {
  const clientProjects = projects.filter(p => p.client === clientName);
  if (clientProjects.length === 0) return 'inactive';

  for (const proj of clientProjects) {
    const projEpisodes = allEpisodes.filter(e => e.projectId === proj.id);
    const status = getComputedProjectStatus(projEpisodes, proj.status);
    if (status === 'active' || status === 'standby') return 'active';
  }
  return 'inactive';
}

export default function ClientsPage() {
  const router = useRouter();
  const toast = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allEpisodes, setAllEpisodes] = useState<(Episode & { projectId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(() => {
    setError(false);
    setLoading(true);
    Promise.all([getClients(), getProjects(), getAllEpisodes()]).then(([c, p, e]) => {
      setClients(c);
      setAllProjects(p);
      setAllEpisodes(e);
      setLoading(false);
    }).catch(() => { setError(true); setLoading(false); });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useSupabaseRealtime(['clients'], loadData);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'new-client') setIsAddModalOpen(true);
    };
    window.addEventListener('fab:action', handler);
    return () => window.removeEventListener('fab:action', handler);
  }, []);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isClientSuccess, setIsClientSuccess] = useState(false);
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

  // 이 useEffect를 제거했습니다 - localStorage 덮어쓰기 문제 해결

  const handleAddClient = async () => {
    if (!newClient.name) {
      toast.error('클라이언트 이름을 입력해주세요.');
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
      setIsClientSuccess(true);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setIsClientSuccess(false);
        setNewClient({ name: '', contactPerson: '', email: '', phone: '', company: '', address: '', notes: '', status: 'active' });
      }, 1500);
    } else {
      toast.error('클라이언트 추가에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
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

  const handleEditClient = (client: Client) => {
    setEditingClient({ ...client });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingClient) return;
    const ok = await updateClient(editingClient.id, {
      name: editingClient.name,
      contactPerson: editingClient.contactPerson,
      email: editingClient.email,
      phone: editingClient.phone,
      company: editingClient.company,
      address: editingClient.address,
      notes: editingClient.notes,
      status: editingClient.status,
    });
    if (ok) {
      setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...editingClient, updatedAt: new Date().toISOString() } : c));
      setIsEditModalOpen(false);
      setEditingClient(null);
      toast.success('클라이언트 정보가 수정되었습니다.');
    } else {
      toast.error('수정에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleDeleteClient = (clientId: string, clientName: string) => {
    setClientToDelete({ id: clientId, name: clientName });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (clientToDelete) {
      const client = clients.find(c => c.id === clientToDelete.id);
      if (client) {
        await addToTrash('client', client);
        const deleted = await deleteClient(clientToDelete.id);
        if (deleted) {
          setClients(prev => prev.filter(c => c.id !== clientToDelete.id));
        } else {
          toast.error('삭제에 실패했습니다. 다시 시도해주세요.');
        }
      }
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
    }
  };

  const handleDeactivateClient = async () => {
    if (clientToDelete) {
      const ok = await updateClient(clientToDelete.id, { status: 'inactive' });
      if (ok) {
        setClients(prev => prev.map(c =>
          c.id === clientToDelete.id
            ? { ...c, status: 'inactive' as const, updatedAt: new Date().toISOString() }
            : c
        ));
      } else {
        toast.error('상태 변경에 실패했습니다. 다시 시도해주세요.');
      }
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setClientToDelete(null);
  };

  // 프로젝트 기반 클라이언트 상태 맵
  const clientStatusMap = new Map<string, 'active' | 'inactive'>();
  clients.forEach(c => {
    clientStatusMap.set(c.id, getClientComputedStatus(c.name, allProjects, allEpisodes));
  });

  const activeCount = clients.filter(c => clientStatusMap.get(c.id) === 'active').length;
  const inactiveCount = clients.filter(c => clientStatusMap.get(c.id) === 'inactive').length;

  // 검색 필터링 + 활성 먼저 정렬
  const filteredClients = clients.filter(client => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      client.name.toLowerCase().includes(query) ||
      client.contactPerson?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.toLowerCase().includes(query) ||
      client.company?.toLowerCase().includes(query) ||
      client.address?.toLowerCase().includes(query)
    );
  }).sort((a, b) => {
    const aStatus = clientStatusMap.get(a.id) || 'inactive';
    const bStatus = clientStatusMap.get(b.id) || 'inactive';
    if (aStatus !== bStatus) return aStatus === 'active' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">데이터를 불러오는데 실패했습니다.</p>
        <button onClick={loadData} className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-800 transition-colors text-sm font-medium">
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 애니메이션 스타일 */}
      <style jsx global>{`
        @keyframes clients-modal-content-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes clients-modal-sheet-in {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-clients-modal { animation: clients-modal-content-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-clients-sheet { animation: clients-modal-sheet-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">클라이언트 관리</h1>
          <p className="text-gray-500 mt-1 sm:mt-2 text-sm">클라이언트 목록 및 관리</p>
        </div>
        <button
          data-tour="tour-client-new"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-800 transition-colors text-sm font-semibold flex-shrink-0"
        >
          + 새 클라이언트
        </button>
      </div>

      {/* 통계 */}
      <div data-tour="tour-client-stats" className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <p className="text-[11px] sm:text-sm font-medium text-gray-500">전체</p>
            <div className="w-7 h-7 sm:w-9 sm:h-9 bg-blue-50 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Building2 size={14} className="text-blue-500 sm:w-[18px] sm:h-[18px]" />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-gray-900">{clients.length}</p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">개사 등록</p>
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <p className="text-[11px] sm:text-sm font-medium text-gray-500">활성</p>
            <div className="w-7 h-7 sm:w-9 sm:h-9 bg-green-50 rounded-lg sm:rounded-xl flex items-center justify-center">
              <CheckCircle size={14} className="text-green-500 sm:w-[18px] sm:h-[18px]" />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-green-600">{activeCount}</p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">현재 거래 중</p>
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <p className="text-[11px] sm:text-sm font-medium text-gray-500">비활성</p>
            <div className="w-7 h-7 sm:w-9 sm:h-9 bg-gray-50 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Users size={14} className="text-gray-400 sm:w-[18px] sm:h-[18px]" />
            </div>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-gray-400">{inactiveCount}</p>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">비활성 상태</p>
        </div>
      </div>

      {/* 검색 바 */}
      <div data-tour="tour-client-search" className="flex items-center gap-2 sm:gap-3 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 px-3 sm:px-4 py-2.5 sm:py-3">
        <Search size={16} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="클라이언트 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent focus:outline-none text-sm text-gray-700 placeholder-gray-400"
        />
        {searchQuery && (
          <>
            <span className="text-xs text-gray-400 whitespace-nowrap">{filteredClients.length}개사</span>
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </>
        )}
      </div>

      {/* 클라이언트 목록 - 데스크톱 테이블 뷰 */}
      <div data-tour="tour-client-table" className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  클라이언트
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  담당자
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  연락처
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  주소
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  프로젝트 수
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    {searchQuery ? (
                      <EmptySearch query={searchQuery} />
                    ) : (
                      <EmptyClients />
                    )}
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/clients/${client.id}`)}
                  >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building2 size={18} className="text-blue-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{client.name}</div>
                        {client.company && client.company !== client.name && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <Building2 size={12} className="mr-1" />
                            {client.company}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {client.contactPerson ? (
                      <div className="text-sm text-gray-900">{client.contactPerson}</div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {client.email && (
                        <div className="text-sm text-gray-900 flex items-center">
                          <Mail size={12} className="mr-2 text-gray-400" />
                          {client.email}
                        </div>
                      )}
                      {client.phone && (
                        <div className="text-sm text-gray-900 flex items-center">
                          <Phone size={12} className="mr-2 text-gray-400" />
                          {formatPhoneNumber(client.phone)}
                        </div>
                      )}
                      {!client.email && !client.phone && (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {client.address ? (
                      <div className="text-sm text-gray-900 flex items-start max-w-xs">
                        <MapPin size={14} className="mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{client.address}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {allProjects.filter(p => p.clientId === client.id || p.client === client.name).length}개
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        clientStatusMap.get(client.id) === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {clientStatusMap.get(client.id) === 'active' ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClient(client);
                        }}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                        title="수정"
                      >
                        <Pencil size={16} className="text-gray-400 group-hover:text-blue-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClient(client.id, client.name);
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                        title="삭제"
                      >
                        <Trash2 size={16} className="text-gray-400 group-hover:text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 클라이언트 목록 - 모바일 카드 뷰 */}
      <div className="md:hidden space-y-2.5">
        {filteredClients.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            {searchQuery ? (
              <EmptySearch query={searchQuery} />
            ) : (
              <EmptyClients />
            )}
          </div>
        ) : (
          filteredClients.map((client) => (
            <div
              key={client.id}
              onClick={() => router.push(`/clients/${client.id}`)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-3.5 active:bg-gray-50 transition-colors"
            >
              {/* 헤더 - 클라이언트 정보 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center flex-1 min-w-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-blue-500" />
                  </div>
                  <div className="ml-2.5 flex-1 min-w-0">
                    <h3 className="text-[14px] font-semibold text-gray-900 truncate">
                      {client.name}
                    </h3>
                    {client.company && client.company !== client.name && (
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Building2 size={12} className="mr-1 flex-shrink-0" />
                        <span className="truncate">{client.company}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-2 flex-shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      client.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {client.status === 'active' ? '활성' : '비활성'}
                  </span>
                </div>
              </div>

              {/* 담당자 */}
              {client.contactPerson && (
                <div className="mb-2.5 pb-2.5 border-b border-gray-100">
                  <div className="text-[10px] text-gray-400 mb-0.5">담당자</div>
                  <div className="text-[13px] font-medium text-gray-900">{client.contactPerson}</div>
                </div>
              )}

              {/* 연락처 정보 */}
              <div className="space-y-1.5 mb-2.5 pb-2.5 border-b border-gray-100">
                {client.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail size={14} className="mr-2 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone size={14} className="mr-2 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{formatPhoneNumber(client.phone)}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start text-sm text-gray-600">
                    <MapPin size={14} className="mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{client.address}</span>
                  </div>
                )}
              </div>

              {/* 프로젝트 수 & 등록일 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm">
                  <Folder size={14} className="mr-1 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {allProjects.filter(p => p.clientId === client.id || p.client === client.name).length}개 프로젝트
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClient(client);
                    }}
                    className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                    title="수정"
                  >
                    <Pencil size={16} className="text-gray-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClient(client.id, client.name);
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="삭제"
                  >
                    <Trash2 size={16} className="text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 클라이언트 추가 모달 - Toss Style */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !isClientSuccess && handleCloseModal()}
          />
          <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
            <div
              className="relative bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl max-w-2xl w-full animate-clients-sheet"
              onClick={(e) => e.stopPropagation()}
            >
              {isClientSuccess ? (
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">클라이언트 추가 완료</h2>
                  <p className="text-gray-500">새로운 클라이언트가 등록되었습니다</p>
                </div>
              ) : (
                <>
                  {/* 헤더 */}
                  <div className="px-6 sm:px-8 pt-8 pb-6">
                    <button
                      onClick={handleCloseModal}
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
                          value={formatPhoneNumber(newClient.phone)}
                          onChange={(e) => setNewClient({ ...newClient, phone: formatPhoneNumber(e.target.value) })}
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
                        onClick={handleCloseModal}
                        className="flex-1 h-14 text-gray-700 font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-all active:scale-[0.98]"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleAddClient}
                        disabled={!newClient.name}
                        className="flex-1 h-14 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-800 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98] shadow-lg shadow-blue-700/30"
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

      {/* 클라이언트 수정 모달 */}
      {isEditModalOpen && editingClient && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setIsEditModalOpen(false); setEditingClient(null); }}
          />
          <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
            <div
              className="relative bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl max-w-2xl w-full animate-clients-sheet"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 sm:px-8 pt-8 pb-6">
                <button
                  onClick={() => { setIsEditModalOpen(false); setEditingClient(null); }}
                  className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-gray-400" />
                </button>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">클라이언트 수정</h2>
                <p className="text-sm text-gray-500">클라이언트 정보를 수정합니다</p>
              </div>

              <div className="px-6 sm:px-8 pb-8 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">기본 정보</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FloatingLabelInput
                      label="클라이언트 이름"
                      required
                      type="text"
                      value={editingClient.name}
                      onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                    />
                    <FloatingLabelInput
                      label="담당자 이름"
                      type="text"
                      value={editingClient.contactPerson || ''}
                      onChange={(e) => setEditingClient({ ...editingClient, contactPerson: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">연락처 정보</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FloatingLabelInput
                      label="이메일"
                      type="email"
                      value={editingClient.email || ''}
                      onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                    />
                    <FloatingLabelInput
                      label="전화번호"
                      type="tel"
                      value={formatPhoneNumber(editingClient.phone || '')}
                      onChange={(e) => setEditingClient({ ...editingClient, phone: formatPhoneNumber(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">추가 정보</h3>
                  <FloatingLabelInput
                    label="회사명"
                    type="text"
                    value={editingClient.company || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, company: e.target.value })}
                  />
                  <FloatingLabelInput
                    label="주소"
                    type="text"
                    value={editingClient.address || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
                  />
                  <FloatingLabelTextarea
                    label="메모"
                    value={editingClient.notes || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white px-6 sm:px-8 py-6 border-t border-gray-100 rounded-b-[28px]">
                <div className="flex gap-3">
                  <button
                    onClick={() => { setIsEditModalOpen(false); setEditingClient(null); }}
                    className="flex-1 h-14 text-gray-700 font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-all active:scale-[0.98]"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editingClient.name}
                    className="flex-1 h-14 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-800 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-blue-700/30"
                  >
                    저장하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {isDeleteModalOpen && clientToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={handleCancelDelete}
          />

          {/* 모달 */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-white rounded-lg shadow-xl max-w-md w-full animate-clients-modal"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">클라이언트 관리</h2>
              </div>

              {/* 내용 */}
              <div className="p-6">
                <p className="text-gray-700 text-center mb-2">
                  <span className="font-semibold text-gray-900">&quot;{clientToDelete.name}&quot;</span> 클라이언트를<br />
                  정말 삭제하시겠습니까?
                </p>
                <p className="text-sm text-blue-800 text-center">
                  휴지통으로 이동되며, 30일 이내에 복구할 수 있습니다.
                </p>
              </div>

              {/* 푸터 */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors active:scale-[0.97]"
                >
                  취소
                </button>
                <button
                  onClick={handleDeactivateClient}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors active:scale-[0.97]"
                >
                  비활성 등록
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors active:scale-[0.97]"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
