'use client';

import { useState, useEffect } from 'react';
import { mockProjects as initialProjects, mockPartners } from '@/lib/mock-data';
import {
  Megaphone,
  TrendingUp,
  Eye,
  Share2,
  BarChart3,
  FileText,
  Image as ImageIcon,
  Video,
  Download,
  ExternalLink,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { Project } from '@/types';

const PROJECTS_STORAGE_KEY = 'video-moment-projects';

export default function MarketingPage() {
  // localStorage에서 프로젝트 데이터 로드
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  useEffect(() => {
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (stored) {
      try {
        setProjects(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored projects:', e);
      }
    }
  }, []);

  // 완료된 프로젝트만 필터링 (포트폴리오용)
  const completedProjects = projects.filter(p => p.status === 'completed');

  // 마케팅 통계
  const stats = {
    totalPortfolio: completedProjects.length,
    totalViews: 12540, // 목 데이터
    shareCount: 328, // 목 데이터
    avgEngagement: 8.5, // 목 데이터 (%)
  };

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">마케팅</h1>
          <p className="text-gray-500 mt-2">포트폴리오 관리 및 마케팅 자료</p>
        </div>
        <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center gap-2">
          <Plus size={20} />
          마케팅 자료 추가
        </button>
      </div>

      {/* 마케팅 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="포트폴리오"
          value={stats.totalPortfolio}
          icon={<Video className="text-blue-500" size={24} />}
          color="blue"
          suffix="개"
        />
        <StatCard
          title="총 조회수"
          value={stats.totalViews.toLocaleString()}
          icon={<Eye className="text-purple-500" size={24} />}
          color="purple"
          suffix="회"
        />
        <StatCard
          title="공유 횟수"
          value={stats.shareCount}
          icon={<Share2 className="text-green-500" size={24} />}
          color="green"
          suffix="회"
        />
        <StatCard
          title="평균 참여율"
          value={stats.avgEngagement}
          icon={<TrendingUp className="text-orange-500" size={24} />}
          color="orange"
          suffix="%"
        />
      </div>

      {/* 포트폴리오 섹션 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">완료된 프로젝트 포트폴리오</h2>
            <p className="text-sm text-gray-500 mt-1">마케팅에 활용 가능한 완료된 프로젝트</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {completedProjects.length}개
            </span>
            <Link
              href="/marketing/portfolio"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-2"
            >
              포트폴리오 관리
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {completedProjects.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Video className="mx-auto mb-3 text-gray-400" size={48} />
              <p className="text-lg font-medium">완료된 프로젝트가 없습니다</p>
              <p className="text-sm mt-1">프로젝트를 완료하면 여기에 포트폴리오로 표시됩니다</p>
            </div>
          ) : (
            completedProjects.map((project) => {
              const partner = mockPartners.find(p => p.id === project.partnerId);
              return (
                <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          완료
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>

                      <div className="flex items-center gap-6 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Briefcase size={12} />
                          <span>클라이언트: {project.client}</span>
                        </div>
                        {partner && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[9px] font-semibold">
                              {partner.name.charAt(0)}
                            </div>
                            <span>파트너: {partner.name}</span>
                          </div>
                        )}
                        {project.completedAt && (
                          <span>완료일: {new Date(project.completedAt).toLocaleDateString('ko-KR')}</span>
                        )}
                      </div>

                      {/* 태그 */}
                      {project.tags && project.tags.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {project.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 액션 버튼 */}
                    <div className="ml-6 flex flex-col gap-2">
                      <Link
                        href={`/projects/${project.id}`}
                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <ExternalLink size={14} />
                        상세보기
                      </Link>
                      <button className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium flex items-center gap-2">
                        <Download size={14} />
                        자료 다운로드
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 마케팅 자료 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 이미지 자료 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="text-purple-500" size={20} />
              <h2 className="text-lg font-semibold text-gray-900">이미지 자료</h2>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              + 추가
            </button>
          </div>
          <div className="p-6">
            <div className="text-center text-gray-500 py-8">
              <ImageIcon className="mx-auto mb-2 text-gray-400" size={32} />
              <p className="text-sm">이미지 자료가 없습니다</p>
              <p className="text-xs mt-1">썸네일, 포스터 등을 업로드하세요</p>
            </div>
          </div>
        </div>

        {/* 문서 자료 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="text-green-500" size={20} />
              <h2 className="text-lg font-semibold text-gray-900">문서 자료</h2>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              + 추가
            </button>
          </div>
          <div className="p-6">
            <div className="text-center text-gray-500 py-8">
              <FileText className="mx-auto mb-2 text-gray-400" size={32} />
              <p className="text-sm">문서 자료가 없습니다</p>
              <p className="text-xs mt-1">제안서, 기획서 등을 업로드하세요</p>
            </div>
          </div>
        </div>
      </div>

      {/* 성과 분석 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-blue-500" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">성과 분석</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500 py-12">
            <BarChart3 className="mx-auto mb-3 text-gray-400" size={48} />
            <p className="text-lg font-medium">성과 데이터 준비 중</p>
            <p className="text-sm mt-1">SNS 연동 및 분석 도구를 설정하세요</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 통계 카드 컴포넌트
function StatCard({
  title,
  value,
  icon,
  color,
  suffix,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  suffix: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className={`p-2 bg-${color}-100 rounded-full`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-gray-900">
        {value}
        <span className="text-lg font-normal text-gray-600 ml-1">{suffix}</span>
      </p>
    </div>
  );
}

function Briefcase({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
    </svg>
  );
}
