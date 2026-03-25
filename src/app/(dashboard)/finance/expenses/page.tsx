'use client';

import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Plus, Trash2, ChevronLeft, ChevronRight, X, Pencil } from 'lucide-react';
import { Expense, ExpenseCategory, Project } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { getExpenses, insertExpense, updateExpense, deleteExpense, getProjects } from '@/lib/supabase/db';

const CATEGORIES: ExpenseCategory[] = ['운영비', '장비', '교통', '식비', '숙박', '소프트웨어', '기타'];

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  '운영비': 'bg-blue-50 text-blue-700',
  '장비': 'bg-purple-50 text-purple-700',
  '교통': 'bg-green-50 text-green-700',
  '식비': 'bg-orange-50 text-orange-700',
  '숙박': 'bg-pink-50 text-pink-700',
  '소프트웨어': 'bg-cyan-50 text-cyan-700',
  '기타': 'bg-gray-100 text-gray-700',
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
  title: '',
  amount: '',
  category: '운영비',
  expenseDate: new Date().toISOString().slice(0, 10),
  description: '',
  projectId: '',
  spenderName: '',
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

  // 월 선택
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const viewYM = `${viewYear}-${String(viewMonth).padStart(2, '0')}`;

  const load = useCallback(async () => {
    const [e, p] = await Promise.all([getExpenses(), getProjects()]);
    setExpenses(e);
    setProjects(p);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(viewYear - 1); setViewMonth(12); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(viewYear + 1); setViewMonth(1); }
    else setViewMonth(viewMonth + 1);
  };

  // 이번 달 지출 필터
  const monthExpenses = expenses.filter(e => e.expenseDate.slice(0, 7) === viewYM);
  const filtered = catFilter === 'all' ? monthExpenses : monthExpenses.filter(e => e.category === catFilter);

  // KPI
  const totalMonthExpense = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const categoryTotals = CATEGORIES.map(cat => ({
    category: cat,
    total: monthExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).sort((a, b) => b.total - a.total);
  const topCategory = categoryTotals[0];

  const projectMap = new Map(projects.map(p => [p.id, p]));

  const openAdd = () => {
    setForm({ ...emptyForm, expenseDate: `${viewYM}-01` });
    setEditId(null);
    setModalMode('add');
  };

  const openEdit = (expense: Expense) => {
    setForm({
      title: expense.title,
      amount: String(expense.amount),
      category: expense.category,
      expenseDate: expense.expenseDate,
      description: expense.description ?? '',
      projectId: expense.projectId ?? '',
      spenderName: expense.spenderName ?? '',
    });
    setEditId(expense.id);
    setModalMode('edit');
  };

  const handleSubmit = async () => {
    if (!form.title || !form.amount) return;
    setSaving(true);
    if (modalMode === 'add') {
      await insertExpense({
        id: crypto.randomUUID(),
        title: form.title,
        amount: Number(form.amount),
        category: form.category,
        expenseDate: form.expenseDate,
        description: form.description || undefined,
        projectId: form.projectId || undefined,
        spenderName: form.spenderName || undefined,
      });
    } else if (modalMode === 'edit' && editId) {
      await updateExpense(editId, {
        title: form.title,
        amount: Number(form.amount),
        category: form.category,
        expenseDate: form.expenseDate,
        description: form.description || undefined,
        projectId: form.projectId || undefined,
        spenderName: form.spenderName || undefined,
      });
    }
    setModalMode(null);
    setSaving(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 지출을 삭제하시겠습니까?')) return;
    await deleteExpense(id);
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">지출 관리</h1>
          <p className="text-gray-500 mt-2">지출 내역을 기록하고 관리하세요</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors">
          <Plus size={16} />
          지출 추가
        </button>
      </div>

      {/* 월 선택기 */}
      <div className="flex items-center gap-4">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <span className="text-lg font-bold text-gray-900 min-w-[140px] text-center">
          {viewYear}년 {viewMonth}월
        </span>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-red-50 rounded-xl"><CreditCard size={16} className="text-red-500" /></div>
            <span className="text-sm text-gray-500 font-medium">이번 달 총 지출</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{(totalMonthExpense / 10000).toFixed(0)}<span className="text-base font-medium text-gray-400 ml-0.5">만</span></p>
          <p className="text-xs text-gray-400 mt-1">{monthExpenses.length}건</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-50 rounded-xl"><CreditCard size={16} className="text-purple-500" /></div>
            <span className="text-sm text-gray-500 font-medium">최대 지출 카테고리</span>
          </div>
          {topCategory && topCategory.total > 0 ? (
            <>
              <p className="text-3xl font-bold text-gray-900">{topCategory.category}</p>
              <p className="text-xs text-gray-400 mt-1">{(topCategory.total / 10000).toFixed(0)}만원</p>
            </>
          ) : (
            <p className="text-xl font-bold text-gray-300">-</p>
          )}
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCatFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            catFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          전체
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              catFilter === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="px-6 py-3 bg-gray-50 grid grid-cols-[90px_1fr_80px_90px_120px_80px_40px] gap-4 text-xs font-semibold text-gray-400 uppercase tracking-wide items-center">
              <span>날짜</span>
              <span>제목</span>
              <span>카테고리</span>
              <span className="text-right">금액</span>
              <span>프로젝트</span>
              <span>지출자</span>
              <span></span>
            </div>
            <div className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <CreditCard className="mx-auto mb-3 text-gray-200" size={36} />
                  <p className="font-medium text-gray-500">지출 내역이 없습니다</p>
                </div>
              ) : (
                filtered.map(expense => (
                  <div key={expense.id} className="px-6 py-4 hover:bg-gray-50 transition-colors grid grid-cols-[90px_1fr_80px_90px_120px_80px_40px] gap-4 items-center">
                    <p className="text-sm text-gray-500">{expense.expenseDate.slice(5)}</p>
                    <button onClick={() => openEdit(expense)} className="text-left">
                      <p className="font-medium text-gray-900 truncate hover:text-orange-600 transition-colors">{expense.title}</p>
                      {expense.description && <p className="text-xs text-gray-400 truncate mt-0.5">{expense.description}</p>}
                    </button>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_COLORS[expense.category]}`}>
                      {expense.category}
                    </span>
                    <p className="text-sm font-semibold text-gray-900 text-right">{(expense.amount / 10000).toFixed(1)}만</p>
                    <p className="text-sm text-gray-500 truncate">{expense.projectId ? (projectMap.get(expense.projectId)?.title ?? '-') : '-'}</p>
                    <p className="text-sm text-gray-500">{expense.spenderName ?? '-'}</p>
                    <button onClick={() => handleDelete(expense.id)} className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 추가/수정 모달 */}
      <AnimatePresence>
        {modalMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setModalMode(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalMode === 'add' ? '지출 추가' : '지출 수정'}
                </h2>
                <button onClick={() => setModalMode(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} className="text-gray-400" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    placeholder="지출 내역을 입력하세요"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">금액 *</label>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={e => setForm({ ...form, amount: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                    <select
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value as ExpenseCategory })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">지출일</label>
                    <input
                      type="date"
                      value={form.expenseDate}
                      onChange={e => setForm({ ...form, expenseDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">지출자</label>
                    <input
                      value={form.spenderName}
                      onChange={e => setForm({ ...form, spenderName: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      placeholder="이름"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트 (선택)</label>
                  <select
                    value={form.projectId}
                    onChange={e => setForm({ ...form, projectId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                  >
                    <option value="">선택 안 함</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                    rows={2}
                    placeholder="메모 (선택)"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setModalMode(null)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">취소</button>
                <button
                  onClick={handleSubmit}
                  disabled={saving || !form.title || !form.amount}
                  className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {saving ? '저장 중...' : modalMode === 'add' ? '추가' : '수정'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
