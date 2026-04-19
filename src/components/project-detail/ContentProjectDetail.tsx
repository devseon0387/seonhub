'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Share2, Calendar, Eye, Hash, Plus, Trash2 } from 'lucide-react';
import type { Project, ContentItem, ContentPlatform } from '@/types';
import { getContentItemsByProjectId, insertContentItem, deleteContentItem, deleteProject } from '@/lib/supabase/db';

interface Props {
  project: Project;
}

const STATUS_LABELS: Record<ContentItem['status'], string> = {
  draft: '초안',
  scheduled: '예약됨',
  published: '발행됨',
};

const STATUS_COLORS: Record<ContentItem['status'], string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
};

const PLATFORM_LABELS: Record<ContentPlatform, string> = {
  youtube: '유튜브',
  instagram: '인스타그램',
  blog: '블로그',
  threads: '쓰레드',
  x: 'X',
  other: '기타',
};

function formatDate(date?: string) {
  if (!date) return '-';
  return date.slice(0, 10);
}

export default function ContentProjectDetail({ project }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDelete = async () => {
    if (!window.confirm(`"${project.title}" 프로젝트를 삭제하시겠습니까?\n콘텐츠 아이템도 함께 삭제됩니다.`)) return;
    const currentItems = await getContentItemsByProjectId(project.id);
    for (const i of currentItems) await deleteContentItem(i.id);
    const ok = await deleteProject(project.id);
    if (ok) router.push('/projects');
    else window.alert('프로젝트 삭제에 실패했습니다.');
  };

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await getContentItemsByProjectId(project.id);
    setItems(rows);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const contentMeta = project.meta?.content;

  const publishedCount = items.filter(i => i.status === 'published').length;
  const totalViews = items.reduce((sum, i) => sum + (i.viewCount ?? 0), 0);

  const handleAddItem = async () => {
    const title = window.prompt('콘텐츠 제목을 입력하세요');
    if (!title) return;
    const nextNumber = items.length > 0 ? Math.max(...items.map(i => i.itemNumber ?? 0)) + 1 : 1;
    const now = new Date().toISOString();
    const newItem: ContentItem = {
      id: `content_${Date.now()}`,
      projectId: project.id,
      itemNumber: nextNumber,
      title,
      status: 'draft',
      platform: contentMeta?.primaryPlatform ?? 'youtube',
      viewCount: 0,
      assigneeIds: [],
      budget: { totalAmount: 0, partnerPayment: 0, managementFee: 0 },
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await insertContentItem(newItem);
    if (inserted) {
      await load();
    } else {
      window.alert('콘텐츠 아이템 생성에 실패했습니다.');
    }
  };

  const statusLabelMap: Record<string, string> = {
    planning: '계획',
    in_progress: '진행중',
    completed: '완료',
    on_hold: '보류',
    archived: '보관됨',
  };
  const statusLabel = statusLabelMap[project.status] ?? project.status;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold" style={{ color: '#1e3a8a' }}>{project.title}</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-pink-50 text-pink-700">
              <span>📱</span> 콘텐츠
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {statusLabel}
            </span>
          </div>
          <div className="text-sm text-gray-500">{project.client || '클라이언트 미지정'}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: '#1e3a8a' }}
          >
            <Edit size={16} /> 편집
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors"
            aria-label="프로젝트 삭제"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* 메타 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetaCard icon={<Share2 size={16} />} label="주 플랫폼" value={contentMeta?.primaryPlatform ? PLATFORM_LABELS[contentMeta.primaryPlatform] : '-'} />
        <MetaCard icon={<Calendar size={16} />} label="발행 주기" value={contentMeta?.publishCycle || '-'} />
        <MetaCard icon={<Hash size={16} />} label="총 발행 수" value={`${publishedCount}건`} />
        <MetaCard icon={<Eye size={16} />} label="누적 조회수" value={totalViews.toLocaleString()} />
      </div>

      {/* 콘텐츠 아이템 섹션 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: '#1e3a8a' }}>콘텐츠 아이템</h2>
          <button onClick={handleAddItem} className="text-sm font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
            <Plus size={16} /> 아이템 추가
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-800" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-500 mb-4">아직 콘텐츠 아이템이 없습니다</p>
            <button
              onClick={handleAddItem}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: '#2563eb' }}
            >
              <Plus size={16} /> 첫 아이템 만들기
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map(item => {
              const date = item.publishedAt || item.publishDate;
              const dateLabel = item.status === 'published' ? '발행' : item.status === 'scheduled' ? '예약' : '작성';
              return (
                <li key={item.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 truncate">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {PLATFORM_LABELS[item.platform]} · {dateLabel} {formatDate(date)}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function MetaCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium text-gray-900 truncate">{value}</div>
    </div>
  );
}
