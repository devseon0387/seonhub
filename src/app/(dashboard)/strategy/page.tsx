'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FolderOpen, Trash2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { strategyApi, type StrategyGroup } from '@/lib/strategy-api';

const GROUP_EMOJIS = ['📁','🎯','💡','🚀','📊','🔥','⭐','💎','🎨','🌟','📌','📋','🗓️','💼','🧠','⚡'];

export default function StrategyPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<StrategyGroup[]>([]);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📁');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    strategyApi.getGroups().then(async gs => {
      setGroups(gs);
      // 각 그룹의 페이지 수 계산
      const counts: Record<string, number> = {};
      await Promise.all(
        gs.map(async g => {
          const docs = await strategyApi.getDocs(g.id);
          counts[g.id] = docs.length;
        })
      );
      setDocCounts(counts);
    }).finally(() => setLoading(false));
  }, []);

  const addGroup = async () => {
    if (!newName.trim()) return;
    const g = await strategyApi.createGroup(newName.trim(), selectedEmoji);
    setGroups(p => [...p, g]);
    setDocCounts(p => ({ ...p, [g.id]: 0 }));
    setIsAdding(false);
    setNewName('');
    setSelectedEmoji('📁');
    router.push(`/strategy/${g.id}`);
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setNewName('');
    setSelectedEmoji('📁');
    setShowEmojiPicker(false);
  };

  const deleteGroup = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGroups(p => p.filter(g => g.id !== id));
    await strategyApi.deleteGroup(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">전략</h1>
          <p className="text-gray-500 mt-2">비모의 전략과 방향을 기록하고 관리해요</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-5 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-all active:scale-[0.97] font-semibold flex items-center gap-2"
        >
          <Plus size={18} />
          새 그룹
        </button>
      </div>

      {/* 새 그룹 만들기 폼 */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <p className="text-sm font-semibold text-gray-900 mb-4">새 그룹 만들기</p>
            <div className="flex items-center gap-3 mb-4">
              {/* 이모지 선택 */}
              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker(p => !p)}
                  className="w-12 h-12 text-2xl bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-[0.95]"
                >
                  {selectedEmoji}
                </button>
                <AnimatePresence>
                  {showEmojiPicker && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-14 left-0 z-20 bg-white rounded-2xl shadow-xl border border-gray-200 p-3 grid grid-cols-8 gap-1"
                      >
                        {GROUP_EMOJIS.map(em => (
                          <button
                            key={em}
                            onClick={() => { setSelectedEmoji(em); setShowEmojiPicker(false); }}
                            className="text-xl w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors active:scale-90"
                          >
                            {em}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addGroup();
                  if (e.key === 'Escape') cancelAdd();
                }}
                placeholder="그룹 이름 입력..."
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400 transition-colors"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelAdd}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors active:scale-[0.97]"
              >
                취소
              </button>
              <button
                onClick={addGroup}
                disabled={!newName.trim()}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors active:scale-[0.97] disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                만들기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 그룹 목록 */}
      {groups.length === 0 && !isAdding ? (
        <div className="text-center py-24">
          <FolderOpen size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-5">아직 그룹이 없어요</p>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors active:scale-[0.97]"
          >
            첫 번째 그룹 만들기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groups.map(group => (
            <div key={group.id} className="group relative">
              <button
                onClick={() => router.push(`/strategy/${group.id}`)}
                className="w-full bg-white rounded-2xl border border-gray-200 p-6 text-left hover:border-gray-300 hover:shadow-md transition-all active:scale-[0.98] duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{group.emoji}</span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors mt-1" />
                </div>
                <p className="font-semibold text-gray-900 truncate">{group.name}</p>
                <p className="text-sm text-gray-400 mt-1">{docCounts[group.id] ?? 0}개 페이지</p>
              </button>
              <button
                onClick={e => deleteGroup(group.id, e)}
                className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 size={13} className="text-gray-300 hover:text-red-400 transition-colors" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
