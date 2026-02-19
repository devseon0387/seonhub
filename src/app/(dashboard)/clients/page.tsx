'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Building2, MapPin, X, Trash2, ChevronDown, Search, Folder, Plus, Users, CheckCircle } from 'lucide-react';
import { Client, Project } from '@/types';
import { addToTrash } from '@/lib/trash';
import { FloatingLabelInput, FloatingLabelTextarea } from '@/components/FloatingLabelInput';
import { EmptyClients, EmptySearch } from '@/components/EmptyState';
import { getClients, insertClient, updateClient, deleteClient, getProjects } from '@/lib/supabase/db';
import { useToast } from '@/contexts/ToastContext';

export default function ClientsPage() {
  const router = useRouter();
  const toast = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getClients(), getProjects()]).then(([c, p]) => {
      setClients(c);
      setAllProjects(p);
      setLoading(false);
    });
  }, []);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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
          alert('삭제에 실패했습니다. 다시 시도해주세요.');
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
        alert('상태 변경에 실패했습니다. 다시 시도해주세요.');
      }
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setClientToDelete(null);
  };

  // 검색 필터링
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
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

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
      `}</style>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">클라이언트 관리</h1>
          <p className="text-gray-500 mt-2">클라이언트 목록 및 관리</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/30 font-semibold flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={18} />
          새 클라이언트 추가
        </button>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">전체 클라이언트</p>
            <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
              <Building2 size={18} className="text-purple-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{clients.length}</p>
          <p className="text-xs text-gray-400 mt-1">개사 등록</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">활성 클라이언트</p>
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle size={18} className="text-green-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {clients.filter(c => c.status === 'active').length}
          </p>
          <p className="text-xs text-gray-400 mt-1">현재 거래 중</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">비활성 클라이언트</p>
            <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">
              <Users size={18} className="text-gray-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-400">
            {clients.filter(c => c.status === 'inactive').length}
          </p>
          <p className="text-xs text-gray-400 mt-1">비활성 상태</p>
        </div>
      </div>

      {/* 검색 바 */}
      <div className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3">
        <Search size={18} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="클라이언트 이름, 담당자, 이메일, 전화번호, 회사, 주소로 검색..."
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
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                  등록일
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
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {client.name.charAt(0)}
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
                          {client.phone}
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
                    {allProjects.filter(p => p.client === client.name).length}개
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        client.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {client.status === 'active' ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(client.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 클라이언트 목록 - 모바일 카드 뷰 */}
      <div className="md:hidden space-y-4">
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
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:bg-gray-50 transition-colors"
            >
              {/* 헤더 - 클라이언트 정보 */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center flex-1 min-w-0">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {client.name.charAt(0)}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">
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
                <span
                  className={`ml-2 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    client.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {client.status === 'active' ? '활성' : '비활성'}
                </span>
              </div>

              {/* 담당자 */}
              {client.contactPerson && (
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">담당자</div>
                  <div className="text-sm font-medium text-gray-900">{client.contactPerson}</div>
                </div>
              )}

              {/* 연락처 정보 */}
              <div className="space-y-2 mb-3 pb-3 border-b border-gray-200">
                {client.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail size={14} className="mr-2 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone size={14} className="mr-2 text-gray-400 flex-shrink-0" />
                    {client.phone}
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
                    {allProjects.filter(p => p.client === client.name).length}개 프로젝트
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-500">
                    {new Date(client.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClient(client.id, client.name);
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="삭제"
                  >
                    <Trash2 size={18} className="text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 클라이언트 추가 모달 - Toss Style */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !isClientSuccess && handleCloseModal()}
          />
          <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
            <div
              className="relative bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl max-w-2xl w-full animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300"
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
                        onClick={handleCloseModal}
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
              className="relative bg-white rounded-lg shadow-xl max-w-md w-full"
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
                  onClick={handleDeactivateClient}
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
    </div>
  );
}
