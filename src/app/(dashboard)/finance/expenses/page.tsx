'use client';

import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Plus, Trash2, ChevronLeft, ChevronRight, X, Pencil } from 'lucide-react';
import { Expense, ExpenseCategory, Project } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { getExpenses, insertExpense, updateExpense, deleteExpense, getProjects } from '@/lib/supabase/db';

const CATEGORIES: ExpenseCategory[] = ['운영비', '장비', '교통', '식비', '숙박', '소프트웨어', '기타'];

const CATEGORY_COLORS: Record<ExpenseCategory, { bg: string; text: string; bar: string }> = {
  '운영비': { bg: 'bg-blue-50', text: 'text-blue-700', bar: '#3b82f6' },
  '장비': { bg: 'bg-purple-50', text: 'text-purple-700', bar: '#a855f7' },
  '교통': { bg: 'bg-green-50', text: 'text-green-700', bar: '#22c55e' },
  '식비': { bg: 'bg-orange-50', text: 'text-orange-700', bar: '#f97316' },
  '숙박': { bg: 'bg-pink-50', text: 'text-pink-700', bar: '#ec4899' },
  '소프트웨어': { bg: 'bg-cyan-50', text: 'text-cyan-700', bar: '#06b6d4' },
  '기타': { bg: 'bg-gray-100', text: 'text-gray-700', bar: '#a8a29e' },
};

type ModalMode = null | 'add' | 'edit';

interface FormData {
  title: string;
  amount: string;
  category: ExpenseCategory;
  expenseDate: string;
  description: string;
  projectId: string;
  spenderName: string;
}

const emptyForm: FormData = {
  title: '', amount: '', category: '운영비',
  expenseDate: new Date().toISOString().slice(0, 10),
  description: '', projectId: '', spenderName: '',
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState<ExpenseCategory | 'all'>('all');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const viewYM = `${viewYear}-${String(viewMonth).padStart(2, '0')}`;

  const load = useCallback(async () => {
    const [e, p] = await Promise.all([getExpenses(), getProjects()]);
    setExpenses(e); setProjects(p); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => { if (viewMonth === 1) { setViewYear(viewYear - 1); setViewMonth(12); } else setViewMonth(viewMonth - 1); };
  const nextMonth = () => { if (viewMonth === 12) { setViewYear(viewYear + 1); setViewMonth(1); } else setViewMonth(viewMonth + 1); };

  const monthExpenses = expenses.filter(e => e.expenseDate.slice(0, 7) === viewYM);
  const filtered = catFilter === 'all' ? monthExpenses : monthExpenses.filter(e => e.category === catFilter);
  const totalMonthExpense = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const categoryTotals = CATEGORIES.map(cat => ({
    category: cat,
    total: monthExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const projectMap = new Map(projects.map(p => [p.id, p]));

  const openAdd = () => { setForm({ ...emptyForm, expenseDate: `${viewYM}-01` }); setEditId(null); setModalMode('add'); };
  const openEdit = (expense: Expense) => {
    setForm({ title: expense.title, amount: String(expense.amount), category: expense.category, expenseDate: expense.expenseDate, description: expense.description ?? '', projectId: expense.projectId ?? '', spenderName: expense.spenderName ?? '' });
    setEditId(expense.id); setModalMode('edit');
  };

  const handleSubmit = async () => {
    if (!form.title || !form.amount) return;
    setSaving(true);
    if (modalMode === 'add') {
      await insertExpense({ id: crypto.randomUUID(), title: form.title, amount: Number(form.amount), category: form.category, expenseDate: form.expenseDate, description: form.description || undefined, projectId: form.projectId || undefined, spenderName: form.spenderName || undefined });
    } else if (modalMode === 'edit' && editId) {
      await updateExpense(editId, { title: form.title, amount: Number(form.amount), category: form.category, expenseDate: form.expenseDate, description: form.description || undefined, projectId: form.projectId || undefined, spenderName: form.spenderName || undefined });
    }
    setModalMode(null); setSaving(false); await load();
  };

  const handleDelete = async (id: string) => { if (!confirm('이 지출을 삭제하시겠습니까?')) return; await deleteExpense(id); await load(); };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" /></div>;

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">지출 관리</h1>
          <p className="text-gray-500 mt-1 text-sm">{viewYear}년 {viewMonth}월</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-[#ede9e6] rounded-[10px] px-1 py-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><ChevronLeft size={14} className="text-[#a8a29e]" /></button>
            <div className="px-2.5 py-1 min-w-[90px] text-center overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={`${viewYear}-${viewMonth}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="block text-[13px] font-semibold text-gray-800 tabular-nums">
                  {String(viewYear).slice(2)}년 {String(viewMonth).padStart(2, '0')}월
                </motion.span>
              </AnimatePresence>
            </div>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><ChevronRight size={14} className="text-[#a8a29e]" /></button>
          </div>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors">
            <Plus size={14} /> 지출 추가
          </button>
        </div>
      </div>

      {/* 통합 카드 */}
      <div className="bg-white rounded-2xl border border-gray-100" style={{ overflow: 'clip' }}>
        {/* 통계 바 */}
        <div className="px-5 py-4 border-b border-[#f0ece9]">
          <div className="flex items-baseline justify-between mb-2">
            <motion.span key={`label-${viewYM}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[13px] text-[#a8a29e]">이번 달 총 지출 · {monthExpenses.length}건</motion.span>
            <motion.span key={`total-${viewYM}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-[22px] font-extrabold tracking-tight">
              {totalMonthExpense.toLocaleString()}<span className="text-[13px] text-[#78716c] font-medium ml-0.5">원</span>
            </motion.span>
          </div>
          {/* 카테고리 분포 바 */}
          {totalMonthExpense > 0 && (
            <>
              <div className="h-2 rounded-full overflow-hidden flex gap-0.5 mb-2">
                {categoryTotals.map(ct => (
                  <motion.div
                    key={ct.category}
                    initial={false}
                    animate={{ width: `${(ct.total / totalMonthExpense) * 100}%` }}
                    transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[ct.category].bar }}
                  />
                ))}
              </div>
              <div className="flex gap-3 flex-wrap text-[11px]">
                {categoryTotals.map(ct => (
                  <span key={ct.category} className="flex items-center gap-1">
                    <span className="w-1.5 h-[3px] rounded-sm" style={{ backgroundColor: CATEGORY_COLORS[ct.category].bar }} />
                    <span className="text-[#78716c]">{ct.category} {ct.total.toLocaleString()}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 카테고리 필터 */}
        <div className="px-5 py-2.5 border-b border-[#f0ece9] flex gap-1.5 flex-wrap">
          <button onClick={() => setCatFilter('all')} className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${catFilter === 'all' ? 'bg-[#1c1917] text-white' : 'bg-[#f5f5f4] text-[#78716c] hover:bg-[#ede9e6]'}`}>전체</button>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)} className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${catFilter === cat ? 'bg-[#1c1917] text-white' : 'bg-[#f5f5f4] text-[#78716c] hover:bg-[#ede9e6]'}`}>{cat}</button>
          ))}
        </div>

        {/* 테이블 */}
        <div style={{ overflowX: 'clip' }}>
          <div className="min-w-[600px]">
            <div className="grid grid-cols-[60px_1fr_70px_100px_100px_28px] gap-2 px-5 py-2 text-[10px] font-semibold text-[#a8a29e] border-b border-[#f0ece9]">
              <span>날짜</span><span>내용</span><span>카테고리</span><span className="text-right">금액</span><span>프로젝트</span><span />
            </div>
            {filtered.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <CreditCard className="mx-auto mb-3 text-gray-200" size={36} />
                <p className="font-medium text-gray-500">지출 내역이 없습니다</p>
              </div>
            ) : (
              <div className="divide-y divide-[#f8f7f6]">
                {filtered.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate)).map((expense, idx) => (
                  <motion.div key={expense.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: idx * 0.03 }}>
                    <div className="grid grid-cols-[60px_1fr_70px_100px_100px_28px] gap-2 px-5 py-3 items-center hover:bg-[#fafaf9] transition-colors cursor-pointer" onClick={() => openEdit(expense)}>
                      <span className="text-[12px] text-[#a8a29e] tabular-nums">{expense.expenseDate.slice(5).replace('-', '/')}</span>
                      <div className="min-w-0">
                        <span className="text-[13px] font-semibold block truncate">{expense.title}</span>
                        {(expense.spenderName || expense.description) && (
                          <span className="text-[11px] text-[#a8a29e] block truncate mt-0.5">{expense.spenderName}{expense.spenderName && expense.description ? ' · ' : ''}{expense.description}</span>
                        )}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${CATEGORY_COLORS[expense.category].bg} ${CATEGORY_COLORS[expense.category].text}`}>{expense.category}</span>
                      <span className="text-[14px] font-semibold text-right tabular-nums">{expense.amount.toLocaleString()}</span>
                      <span className="text-[12px] text-[#a8a29e] truncate">{expense.projectId ? (projectMap.get(expense.projectId)?.title ?? '-') : '-'}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(expense.id); }} className="p-1 rounded-lg hover:bg-red-50 text-[#d6d3d1] hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 추가/수정 모달 */}
      <AnimatePresence>
        {modalMode && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40" onClick={() => setModalMode(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] sm:w-[440px] bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#f0ece9]">
                <h3 className="text-[15px] font-extrabold">{modalMode === 'add' ? '지출 추가' : '지출 수정'}</h3>
                <button onClick={() => setModalMode(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#a8a29e]"><X size={16} /></button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#a8a29e] block mb-1">제목 *</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="지출 내용" className="w-full px-3 py-2 border-[1.5px] border-[#ede9e6] rounded-[10px] text-[14px] font-medium focus:border-[#ea580c] focus:outline-none transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#a8a29e] block mb-1">금액 *</label>
                    <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" className="w-full px-3 py-2 border-[1.5px] border-[#ede9e6] rounded-[10px] text-[14px] font-medium focus:border-[#ea580c] focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#a8a29e] block mb-1">날짜</label>
                    <input type="date" value={form.expenseDate} onChange={e => setForm({ ...form, expenseDate: e.target.value })} className="w-full px-3 py-2 border-[1.5px] border-[#ede9e6] rounded-[10px] text-[14px] font-medium focus:border-[#ea580c] focus:outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#a8a29e] block mb-1">카테고리</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => setForm({ ...form, category: cat })} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${form.category === cat ? 'bg-[#1c1917] text-white' : 'bg-[#f5f5f4] text-[#78716c]'}`}>{cat}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#a8a29e] block mb-1">지출자</label>
                    <input value={form.spenderName} onChange={e => setForm({ ...form, spenderName: e.target.value })} placeholder="이름" className="w-full px-3 py-2 border-[1.5px] border-[#ede9e6] rounded-[10px] text-[13px] focus:border-[#ea580c] focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#a8a29e] block mb-1">프로젝트</label>
                    <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="w-full px-3 py-2 border-[1.5px] border-[#ede9e6] rounded-[10px] text-[13px] focus:border-[#ea580c] focus:outline-none transition-colors bg-white">
                      <option value="">선택 안함</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#a8a29e] block mb-1">메모</label>
                  <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="선택사항" className="w-full px-3 py-2 border-[1.5px] border-[#ede9e6] rounded-[10px] text-[13px] focus:border-[#ea580c] focus:outline-none transition-colors" />
                </div>
              </div>
              <div className="px-5 pb-5">
                <button onClick={handleSubmit} disabled={saving || !form.title || !form.amount} className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-[13px] font-semibold hover:bg-orange-600 transition-colors disabled:bg-gray-200 disabled:text-gray-400">
                  {saving ? '저장 중...' : modalMode === 'add' ? '추가' : '저장'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
