'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Copy, Check, Landmark, Receipt, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Partner, Episode } from '@/types';
import { getProjects, getPartners, getAllEpisodes } from '@/lib/supabase/db';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import Link from 'next/link';

function calcNetAmount(amount: number, partnerType?: 'freelancer' | 'business') {
  if (partnerType === 'business') return Math.round(amount * 1.1);
  if (partnerType === 'freelancer') return Math.round(amount * (1 - 0.033));
  return amount;
}

function getNetLabel(partnerType?: 'freelancer' | 'business') {
  if (partnerType === 'business') return '부가세 10%';
  if (partnerType === 'freelancer') return '3.3%';
  return '';
}

function getDday(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return { label: 'D-day', urgent: true };
  if (diff < 0) return { label: `D+${Math.abs(diff)}`, urgent: true };
  if (diff <= 3) return { label: `D-${diff}`, urgent: false };
  return { label: `D-${diff}`, urgent: false };
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function PartnerSettlementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<(Episode & { projectId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => {
    const y = searchParams.get('year');
    const m = searchParams.get('month');
    const now = new Date();
    return {
      year: y ? parseInt(y) : now.getFullYear(),
      month: m ? parseInt(m) : now.getMonth() + 1,
    };
  });

  const prevMonth = () => setSelectedDate(prev => prev.month === 1 ? { year: prev.year - 1, month: 12 } : { year: prev.year, month: prev.month - 1 });
  const isMinMonth = selectedDate.year === 2026 && selectedDate.month === 3;
  const nextMonth = () => setSelectedDate(prev => prev.month === 12 ? { year: prev.year + 1, month: 1 } : { year: prev.year, month: prev.month + 1 });

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([getProjects(), getPartners(), getAllEpisodes()]).then(
      ([p, pa, ep]) => {
        setProjects(p);
        setPartner(pa.find(x => x.id === id) ?? null);
        setAllEpisodes(ep);
        setLoading(false);
      }
    ).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);
  useSupabaseRealtime(['episodes', 'projects', 'partners'], loadData);

  const selectedYM = `${selectedDate.year}-${String(selectedDate.month).padStart(2, '0')}`;

  const episodesMap = useMemo(() => {
    const map: Record<string, (Episode & { projectId: string })[]> = {};
    allEpisodes.forEach(ep => { if (!map[ep.projectId]) map[ep.projectId] = []; map[ep.projectId].push(ep); });
    return map;
  }, [allEpisodes]);

  // 정산 대상 에피소드
  const allItems = useMemo(() => {
    if (!partner) return [];
    const items: { episode: Episode & { projectId: string }; project: Project }[] = [];
    projects.forEach(project => {
      const episodes = (episodesMap[project.id] || []).filter(
        ep => (ep.assignee === partner.id || ep.assignee === partner.name || ep.manager === partner.id || ep.manager === partner.name) && ep.paymentDueDate?.slice(0, 7) === selectedYM
      );
      episodes.forEach(ep => items.push({ episode: ep, project }));
    });
    return items.sort((a, b) => (a.episode.paymentDueDate ?? '').localeCompare(b.episode.paymentDueDate ?? ''));
  }, [partner, projects, episodesMap, selectedYM]);

  const totalAmount = allItems.reduce((s, i) => s + (i.episode.budget?.partnerPayment ?? 0) + (i.episode.budget?.managementFee ?? 0), 0);
  const paidAmount = allItems.filter(i => i.episode.paymentStatus === 'completed').reduce((s, i) => s + (i.episode.budget?.partnerPayment ?? 0) + (i.episode.budget?.managementFee ?? 0), 0);
  const unpaidAmount = totalAmount - paidAmount;
  const totalNetAmount = calcNetAmount(totalAmount, partner?.partnerType);
  const paidPct = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  const copyAccount = () => {
    if (partner?.bank && partner?.bankAccount) {
      navigator.clipboard.writeText(`${partner.bank} ${partner.bankAccount}`);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>;
  if (!partner) return <div className="flex flex-col items-center justify-center h-64 gap-4"><p className="text-gray-500">파트너를 찾을 수 없습니다.</p><Link href="/finance/partner-settlement" className="text-sm text-orange-500">← 목록으로</Link></div>;

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/finance/partner-settlement" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft size={18} className="text-[#a8a29e]" />
          </Link>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${partner.position === 'executive' ? 'bg-purple-500' : 'bg-orange-500'}`}>
            {partner.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold">{partner.name}</h1>
              {partner.partnerType && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  partner.partnerType === 'business' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                }`}>
                  {partner.partnerType === 'business' ? '사업자' : '프리랜서'} · {getNetLabel(partner.partnerType)}
                </span>
              )}
            </div>
            <p className="text-[12px] text-[#a8a29e] mt-0.5">{selectedDate.year}년 {selectedDate.month}월 · {allItems.length}건</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white border border-[#ede9e6] rounded-[10px] px-1 py-1">
          <button onClick={prevMonth} disabled={isMinMonth} className={`p-1.5 rounded-lg transition-colors ${isMinMonth ? 'invisible' : 'hover:bg-gray-100'}`}>
            <ChevronLeft size={14} className="text-[#a8a29e]" />
          </button>
          <div className="px-2.5 py-1 min-w-[90px] text-center overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={`${selectedDate.year}-${selectedDate.month}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="block text-[13px] font-semibold text-gray-800 tabular-nums">
                {String(selectedDate.year).slice(2)}년 {String(selectedDate.month).padStart(2, '0')}월
              </motion.span>
            </AnimatePresence>
          </div>
          <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={14} className="text-[#a8a29e]" />
          </button>
        </div>
      </div>

      {/* 통합 카드: 통계 + 테이블 */}
      <div className="bg-white rounded-2xl border border-gray-100" style={{ overflow: 'clip' }}>
        {/* 통계 바 */}
        <div className="px-5 py-4 border-b border-[#f0ece9]">
          <div className="flex items-baseline justify-between mb-1.5">
            <motion.span key={`label-${selectedYM}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="text-[13px] text-[#a8a29e]">
              총 정산 · 실 지급 <b className="text-blue-600">{calcNetAmount(totalAmount, partner.partnerType).toLocaleString()}원</b>
            </motion.span>
            <motion.span key={`total-${selectedYM}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-[22px] font-extrabold tracking-tight">
              {totalAmount.toLocaleString()}<span className="text-[13px] text-[#78716c] font-medium ml-0.5">원</span>
            </motion.span>
          </div>
          <div className="h-[6px] bg-[#f0ece9] rounded-full overflow-hidden flex gap-0.5 mb-1.5">
            <motion.div initial={false} animate={{ width: `${paidPct}%` }} transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }} className="h-full bg-green-500 rounded-full" />
            <motion.div initial={false} animate={{ width: `${100 - paidPct}%` }} transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }} className="h-full bg-orange-500 rounded-full" />
          </div>
          <motion.div key={`legend-${selectedYM}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }} className="flex justify-between text-[12px]">
            <div className="flex items-center gap-1.5"><div className="w-2 h-1 bg-green-500 rounded-sm" /><span className="text-green-600 font-semibold">완료 {paidAmount.toLocaleString()}</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-1 bg-orange-500 rounded-sm" /><span className="text-orange-500 font-semibold">대기 {unpaidAmount.toLocaleString()}</span></div>
          </motion.div>
        </div>

        {/* 테이블 */}
        <div style={{ overflowX: 'clip' }}>
          <div className="min-w-[700px]">
            <div className="grid grid-cols-[1fr_80px_90px_80px_90px] gap-2 px-5 py-2.5 text-[11px] font-semibold text-[#a8a29e] border-b border-[#f0ece9]">
              <span>프로젝트 · 회차</span>
              <span className="text-right">정산일</span>
              <span className="text-right">금액</span>
              <span className="text-right">{partner.partnerType === 'business' ? '부가세' : '원천징수'}</span>
              <span className="text-right">실 수령</span>
            </div>
            {allItems.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <Receipt className="mx-auto mb-3 text-gray-200" size={36} />
                <p className="font-medium text-gray-500">정산 내역이 없어요</p>
                <p className="text-xs mt-1">{selectedDate.year}년 {selectedDate.month}월에 해당하는 내역이 없습니다</p>
              </div>
            ) : (
              <div className="divide-y divide-[#f8f7f6]">
                {allItems.map(({ episode: ep, project }, idx) => {
                  const epAmount = (ep.budget?.partnerPayment ?? 0) + (ep.budget?.managementFee ?? 0);
                  const epNet = calcNetAmount(epAmount, partner.partnerType);
                  const taxAmount = Math.abs(epNet - epAmount);
                  const dday = ep.paymentDueDate ? getDday(ep.paymentDueDate) : null;
                  return (
                    <motion.div
                      key={ep.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.03 }}
                    >
                      <div className="grid grid-cols-[1fr_80px_90px_80px_90px] gap-2 px-5 py-3 items-center hover:bg-[#fafaf9] transition-colors">
                        <div className="min-w-0">
                          <span className="text-[13px] font-semibold">{project.title}</span>
                          <span className="text-[12px] text-[#a8a29e] ml-1.5">{ep.episodeNumber}편 {ep.title || ''}</span>
                        </div>
                        <div className="text-right">
                          {ep.paymentDueDate ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-[12px] tabular-nums">{fmtDate(ep.paymentDueDate)}</span>
                              {dday && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                                  dday.urgent ? 'bg-red-100 text-red-600' : 'text-[#a8a29e]'
                                }`}>{dday.label}</span>
                              )}
                            </div>
                          ) : <span className="text-[12px] text-[#d6d3d1]">-</span>}
                        </div>
                        <span className="text-[14px] font-semibold text-right tabular-nums">{epAmount.toLocaleString()}</span>
                        <span className="text-[12px] text-[#a8a29e] text-right tabular-nums">{partner.partnerType === 'business' ? '+' : '−'}{taxAmount.toLocaleString()}</span>
                        <span className="text-[14px] font-bold text-blue-600 text-right tabular-nums">{epNet.toLocaleString()}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 합계 */}
        {allItems.length > 0 && (
          <div className="px-5 py-3.5 border-t border-[#f0ece9] bg-[#fafaf9] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[#78716c]">합계</span>
              {partner.bank && partner.bankAccount ? (
                <button onClick={copyAccount} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 bg-white border border-[#ede9e6] rounded-lg hover:border-[#d6d3d1] transition-colors">
                  <Landmark size={11} className="text-[#a8a29e]" />
                  <span className="text-[#78716c]">{partner.bank} {partner.bankAccount}</span>
                  {copiedId ? <Check size={11} className="text-green-500" /> : <Copy size={11} className="text-[#d6d3d1]" />}
                </button>
              ) : (
                <Link href="/partners" className="text-[11px] px-2.5 py-1 bg-orange-50 text-orange-500 rounded-lg hover:bg-orange-100 transition-colors">
                  계좌 미등록
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2 tabular-nums">
              <span className="text-[15px] font-bold">{totalAmount.toLocaleString()}</span>
              <span className="text-[#d6d3d1]">{partner.partnerType === 'business' ? '+' : '−'}</span>
              <span className="text-[13px] text-[#a8a29e]">{Math.abs(totalNetAmount - totalAmount).toLocaleString()}</span>
              <span className="text-[#d6d3d1]">=</span>
              <span className="text-[18px] font-extrabold text-blue-600">{totalNetAmount.toLocaleString()}<span className="text-[12px] font-medium ml-0.5">원</span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
