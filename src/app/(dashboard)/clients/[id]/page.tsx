'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Client, Project, Partner } from '@/types';
import { ArrowLeft, Mail, Phone, Building2, MapPin, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { calculateReserve } from '@/lib/utils';
import { getClients, getProjects, getPartners } from '@/lib/supabase/db';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [clientProjects, setClientProjects] = useState<Project[]>([]);
  const [allPartners, setAllPartners] = useState<Partner[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'in_progress' | 'completed' | 'planning'>('all');

  useEffect(() => {
    const loadData = async () => {
      const [clients, projects, partners] = await Promise.all([
        getClients(),
        getProjects(),
        getPartners(),
      ]);
      const foundClient = clients.find(c => c.id === clientId);
      if (foundClient) {
        setClient(foundClient);
        setClientProjects(projects.filter(p => p.client === foundClient.name));
      }
      setAllPartners(partners);
    };
    loadData();
  }, [clientId]);

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 필터링된 프로젝트
  const filteredProjects = clientProjects.filter(project => {
    if (activeFilter === 'all') return true;
    return project.status === activeFilter;
  });

  // 통계 계산
  const totalProjects = clientProjects.length;
  const inProgressProjects = clientProjects.filter(p => p.status === 'in_progress').length;
  const completedProjects = clientProjects.filter(p => p.status === 'completed').length;
  const totalBudget = clientProjects.reduce((sum, p) => sum + p.budget.totalAmount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            {/* 뒤로가기 버튼 */}
            <button
              onClick={() => router.push('/clients')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">클라이언트 관리로 돌아가기</span>
            </button>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                  {client.name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                  {client.company && client.company !== client.name && (
                    <p className="text-gray-500 flex items-center gap-1 mt-1">
                      <Building2 size={14} />
                      {client.company}
                    </p>
                  )}
                  <span
                    className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                      client.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {client.status === 'active' ? '활성' : '비활성'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 클라이언트 정보 */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {client.contactPerson && (
                <div>
                  <p className="text-sm text-gray-500">담당자</p>
                  <p className="text-base font-medium text-gray-900 mt-1">{client.contactPerson}</p>
                </div>
              )}
              {client.email && (
                <div>
                  <p className="text-sm text-gray-500">이메일</p>
                  <p className="text-base text-gray-900 mt-1 flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" />
                    {client.email}
                  </p>
                </div>
              )}
              {client.phone && (
                <div>
                  <p className="text-sm text-gray-500">전화번호</p>
                  <p className="text-base text-gray-900 mt-1 flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" />
                    {client.phone}
                  </p>
                </div>
              )}
              {client.address && (
                <div>
                  <p className="text-sm text-gray-500">주소</p>
                  <p className="text-base text-gray-900 mt-1 flex items-start gap-2">
                    <MapPin size={14} className="text-gray-400 mt-1" />
                    {client.address}
                  </p>
                </div>
              )}
            </div>
            {client.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">메모</p>
                <p className="text-base text-gray-700 mt-1">{client.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">전체 프로젝트</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{totalProjects}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">진행 중</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{inProgressProjects}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">완료</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{completedProjects}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">총 금액</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {totalBudget.toLocaleString()}
              <span className="text-sm text-gray-500">원</span>
            </p>
          </div>
        </div>

        {/* 프로젝트 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">프로젝트 목록</h2>
          </div>

          {/* 필터 탭 */}
          <div className="px-6 py-3 border-b border-gray-200 flex space-x-2">
            <TabButton active={activeFilter === 'all'} onClick={() => setActiveFilter('all')}>
              전체 ({clientProjects.length})
            </TabButton>
            <TabButton active={activeFilter === 'in_progress'} onClick={() => setActiveFilter('in_progress')}>
              진행 중 ({inProgressProjects})
            </TabButton>
            <TabButton active={activeFilter === 'completed'} onClick={() => setActiveFilter('completed')}>
              완료 ({completedProjects})
            </TabButton>
            <TabButton active={activeFilter === 'planning'} onClick={() => setActiveFilter('planning')}>
              기획 중 ({clientProjects.filter(p => p.status === 'planning').length})
            </TabButton>
          </div>

          {/* 프로젝트 그리드 */}
          <div className="p-6">
            {filteredProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project) => {
                  const partner = allPartners.find(p => p.id === project.partnerId);
                  const isInProgress = project.status === 'in_progress';
                  const bgColor = isInProgress ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-red-400 to-red-600';

                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="bg-white rounded-lg shadow hover:shadow-xl transition-all duration-200 overflow-hidden group block hover:scale-[1.02] hover:border-blue-200 border border-gray-200"
                    >
                      {/* 썸네일 영역 */}
                      <div className={`h-12 ${bgColor} relative`}>
                        <div className="absolute top-2 right-2">
                          <StatusBadge status={project.status} />
                        </div>
                      </div>

                      {/* 프로젝트 정보 */}
                      <div className="p-4">
                        <h3 className="text-base font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {project.title}
                        </h3>

                        {/* 메타 정보 */}
                        <div className="space-y-2 mb-3">
                          {partner && (
                            <div className="flex items-center text-xs text-gray-700">
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-semibold mr-1.5">
                                {partner.name.charAt(0)}
                              </div>
                              <span className="truncate font-medium">{partner.name}</span>
                            </div>
                          )}
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar size={12} className="mr-1" />
                            <span>{new Date(project.createdAt).toLocaleDateString('ko-KR')}</span>
                          </div>
                        </div>

                        {/* 금액 정보 */}
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-gray-500">총 금액</span>
                            <span className="text-sm font-bold text-gray-900">
                              {project.budget.totalAmount.toLocaleString()}원
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-xs text-gray-500">유보금</span>
                            <span className="text-xs font-semibold text-green-600">
                              {calculateReserve(project.budget).toLocaleString()}원
                            </span>
                          </div>
                        </div>

                        {/* 태그 */}
                        {project.tags && project.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {project.tags.slice(0, 2).map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                            {project.tags.length > 2 && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                +{project.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-base">해당 필터에 맞는 프로젝트가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 탭 버튼 컴포넌트
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
        active
          ? 'bg-white text-blue-600 border-b-2 border-blue-600'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

// 상태 배지 컴포넌트
function StatusBadge({ status }: { status: string }) {
  const statusStyles = {
    planning: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    on_hold: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    planning: '기획',
    in_progress: '진행중',
    completed: '완료',
    on_hold: '보류',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || statusStyles.planning}`}>
      {statusLabels[status as keyof typeof statusLabels] || status}
    </span>
  );
}
