'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Wallet, Users, Clock, FolderOpen } from 'lucide-react';
import { Project } from '@/types';
import { motion } from 'framer-motion';
import { getProjects } from '@/lib/supabase/db';

export default function FinancePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'month' | 'all'>('month');
  const [tabDirection, setTabDirection] = useState(1);

  const TAB_ORDER = ['month', 'all'] as const;
  const switchTab = (tab: 'month' | 'all') => {
    setTabDirection(TAB_ORDER.indexOf(tab) > TAB_ORDER.indexOf(activeTab) ? 1 : -1);
    setActiveTab(tab);
  };

  useEffect(() => {
    getProjects().then(data => { setProjects(data); setLoading(false); });
  }, []);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const thisMonthProjects = projects.filter(p => {
    if (!p.completedAt) return false;
    const d = new Date(p.completedAt);
    return d >= thisMonthStart && d <= thisMonthEnd;
  });

  const displayProjects = activeTab === 'month' ? thisMonthProjects : projects;

  const totalRevenue = displayProjects.reduce((s, p) => s + p.budget.totalAmount, 0);
  const totalPartnerPayment = displayProjects.reduce((s, p) => s + p.budget.partnerPayment, 0);
  const totalManagementFee = displayProjects.reduce((s, p) => s + p.budget.managementFee, 0);
  const totalMargin = totalRevenue - totalPartnerPayment - totalManagementFee;
  const avgMarginRate = displayProjects.length > 0
    ? (displayProjects.reduce((s, p) => s + p.budget.marginRate, 0) / displayProjects.length).toFixed(1)
    : '0';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">재무</h1>
        <p className="text-gray-500 mt-2">매출, 지급, 유보금 현황을 관리하세요</p>
      </div>

      {/* 탭 */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-200 inline-flex gap-2">
        {([
          { key: 'month' as const, label: '이번 달' },
          { key: 'all' as const, label: '전체 기간' },
        ]).map(({ key, label }) => (
          <button key={key} onClick={() => switchTab(key)} className="relative px-6 py-3 rounded-xl font-semibold">
            {activeTab === key && (
              <motion.div
                layoutId="finance-tab-pill"
                className="absolute inset-0 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/30"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className={`relative transition-colors duration-200 ${activeTab === key ? 'text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-green-50 rounded-xl"><TrendingUp size={16} className="text-green-500" /></div>
            <span className="text-sm text-gray-500 font-medium">총 매출</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{(totalRevenue / 10000).toFixed(0)}<span className="text-base font-medium text-gray-400 ml-0.5">만</span></p>
          <p className="text-xs text-gray-400 mt-1">{displayProjects.length}개 프로젝트</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-50 rounded-xl"><Users size={16} className="text-purple-500" /></div>
            <span className="text-sm text-gray-500 font-medium">파트너 지급</span>
          </div>
          <p className="text-3xl font-bold text-purple-600">{(totalPartnerPayment / 10000).toFixed(0)}<span className="text-base font-medium text-purple-300 ml-0.5">만</span></p>
          <p className="text-xs text-gray-400 mt-1">&nbsp;</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-orange-50 rounded-xl"><Clock size={16} className="text-orange-500" /></div>
            <span className="text-sm text-gray-500 font-medium">매니징 비용</span>
          </div>
          <p className="text-3xl font-bold text-orange-500">{(totalManagementFee / 10000).toFixed(0)}<span className="text-base font-medium text-orange-300 ml-0.5">만</span></p>
          <p className="text-xs text-gray-400 mt-1">&nbsp;</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-emerald-50 rounded-xl"><Wallet size={16} className="text-emerald-500" /></div>
            <span className="text-sm text-gray-500 font-medium">유보금</span>
          </div>
          <p className="text-3xl font-bold text-emerald-600">{(totalMargin / 10000).toFixed(0)}<span className="text-base font-medium text-emerald-300 ml-0.5">만</span></p>
          <p className="text-xs text-gray-400 mt-1">평균 마진율 {avgMarginRate}%</p>
        </div>
      </div>

      {/* 프로젝트별 재무 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <FolderOpen size={16} className="text-blue-500" />
          <h2 className="font-semibold text-gray-900">프로젝트별 재무</h2>
        </div>
        {displayProjects.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Wallet className="mx-auto mb-3 text-gray-200" size={36} />
            <p className="font-medium text-gray-500">등록된 프로젝트가 없어요</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[480px]">
              <div className="px-6 py-3 bg-gray-50 grid grid-cols-[1fr_80px_80px_80px_80px] gap-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <span>프로젝트</span>
                <span className="text-right">총 매출</span>
                <span className="text-right">파트너</span>
                <span className="text-right">매니징</span>
                <span className="text-right">유보금</span>
              </div>
              <div className="divide-y divide-gray-50">
                {displayProjects.map((project) => {
                  const margin = project.budget.totalAmount - project.budget.partnerPayment - project.budget.managementFee;
                  return (
                    <div key={project.id} className="px-6 py-4 hover:bg-gray-50 transition-colors grid grid-cols-[1fr_80px_80px_80px_80px] gap-4 items-center">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{project.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{project.client}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 text-right">{(project.budget.totalAmount / 10000).toFixed(0)}만</p>
                      <p className="text-sm font-semibold text-purple-600 text-right">{(project.budget.partnerPayment / 10000).toFixed(0)}만</p>
                      <p className="text-sm font-semibold text-orange-500 text-right">{(project.budget.managementFee / 10000).toFixed(0)}만</p>
                      <p className="text-sm font-semibold text-emerald-600 text-right">{(margin / 10000).toFixed(0)}만</p>
                    </div>
                  );
                })}
              </div>
              {/* 합계 행 */}
              <div className="px-6 py-4 bg-gray-50 grid grid-cols-[1fr_80px_80px_80px_80px] gap-4 items-center border-t border-gray-100">
                <p className="text-sm font-bold text-gray-700">합계</p>
                <p className="text-sm font-bold text-gray-900 text-right">{(totalRevenue / 10000).toFixed(0)}만</p>
                <p className="text-sm font-bold text-purple-600 text-right">{(totalPartnerPayment / 10000).toFixed(0)}만</p>
                <p className="text-sm font-bold text-orange-500 text-right">{(totalManagementFee / 10000).toFixed(0)}만</p>
                <p className="text-sm font-bold text-emerald-600 text-right">{(totalMargin / 10000).toFixed(0)}만</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
