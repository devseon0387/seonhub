'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, FileText, Trash2 } from 'lucide-react';
import { strategyApi, type StrategyGroup, type StrategyDoc } from '@/lib/strategy-api';

export default function GroupPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<StrategyGroup | null>(null);
  const [docs, setDocs] = useState<StrategyDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      strategyApi.getGroup(groupId),
      strategyApi.getDocs(groupId),
    ]).then(([g, ds]) => {
      setGroup(g);
      setDocs(ds);
    }).finally(() => setLoading(false));
  }, [groupId]);

  const addDoc = async () => {
    const doc = await strategyApi.createDoc(groupId);
    router.push(`/strategy/${groupId}/${doc.id}`);
  };

  const deleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDocs(p => p.filter(d => d.id !== id));
    await strategyApi.deleteDoc(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-400">그룹을 찾을 수 없어요</p>
        <button onClick={() => router.push('/strategy')} className="mt-4 text-sm text-blue-500 hover:text-blue-700 transition-colors">
          전략으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <button
          onClick={() => router.push('/strategy')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-4 transition-colors text-sm font-medium active:scale-[0.97]"
        >
          <ArrowLeft size={18} />
          전략으로 돌아가기
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{group.emoji}</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
              <p className="text-gray-500 mt-1">{docs.length}개 페이지</p>
            </div>
          </div>
          <button
            onClick={addDoc}
            className="px-5 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-all active:scale-[0.97] font-semibold flex items-center gap-2"
          >
            <Plus size={18} />
            새 페이지
          </button>
        </div>
      </div>

      {/* 페이지 목록 */}
      {docs.length === 0 ? (
        <div className="text-center py-24">
          <FileText size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-5">아직 페이지가 없어요</p>
          <button
            onClick={addDoc}
            className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors active:scale-[0.97]"
          >
            첫 번째 페이지 만들기
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {docs.map((doc, i) => (
            <div
              key={doc.id}
              onClick={() => router.push(`/strategy/${groupId}/${doc.id}`)}
              className={`group flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                i !== 0 ? 'border-t border-gray-100' : ''
              }`}
            >
              <span className="text-xl flex-shrink-0">{doc.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{doc.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(doc.updatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 수정
                </p>
              </div>
              <button
                onClick={e => deleteDoc(doc.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
              >
                <Trash2 size={14} className="text-gray-300 hover:text-red-400 transition-colors" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
