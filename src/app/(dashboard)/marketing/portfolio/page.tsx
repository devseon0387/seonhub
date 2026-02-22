'use client';

import { useState, useEffect } from 'react';
import {
  Grid3x3,
  List,
  Eye,
  EyeOff,
  Search,
  Calendar,
  User,
  Tag,
  Download,
  Share2,
  CheckCircle,
  Plus,
  X,
  ChevronDown
} from 'lucide-react';
import { PortfolioItem, Partner } from '@/types';
import { FloatingLabelInput, FloatingLabelTextarea } from '@/components/FloatingLabelInput';
import {
  getPortfolioItems,
  insertPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  togglePortfolioPublished,
  getPartners,
} from '@/lib/supabase/db';
import { useToast } from '@/contexts/ToastContext';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'published' | 'unpublished';

// 유튜브 URL에서 비디오 ID 추출
const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
};

const getYouTubeThumbnail = (url: string): string | null => {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

export default function PortfolioPage() {
  const toast = useToast();
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<PortfolioItem>>({
    title: '',
    description: '',
    client: '',
    partnerId: '',
    completedAt: '',
    tags: [],
    youtubeUrl: '',
    isPublished: false,
  });
  const [tagInput, setTagInput] = useState('');
  const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState(false);

  // 수정 관련 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [editTagInput, setEditTagInput] = useState('');
  const [isEditPartnerDropdownOpen, setIsEditPartnerDropdownOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [items, partnersList] = await Promise.all([
        getPortfolioItems(),
        getPartners(),
      ]);
      setPortfolioItems(items);
      setPartners(partnersList);
      setNewItem(prev => ({
        ...prev,
        completedAt: new Date().toISOString().split('T')[0],
      }));
      setLoading(false);
    }
    load();
  }, []);

  const filteredItems = portfolioItems.filter(item => {
    if (filter === 'published' && !item.isPublished) return false;
    if (filter === 'unpublished' && item.isPublished) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        item.client.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const togglePublish = async (itemId: string) => {
    const item = portfolioItems.find(i => i.id === itemId);
    if (!item) return;
    const newPublished = !item.isPublished;
    const ok = await togglePortfolioPublished(itemId, newPublished);
    if (ok) {
      setPortfolioItems(items =>
        items.map(i => i.id === itemId ? { ...i, isPublished: newPublished } : i)
      );
    } else {
      toast.error('공개 상태 변경에 실패했습니다.');
    }
  };

  const handleEdit = (item: PortfolioItem) => {
    setEditingItem({ ...item });
    setEditTagInput('');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const ok = await updatePortfolioItem(editingItem.id, {
      title: editingItem.title,
      description: editingItem.description,
      client: editingItem.client,
      partnerId: editingItem.partnerId,
      completedAt: editingItem.completedAt,
      tags: editingItem.tags,
      youtubeUrl: editingItem.youtubeUrl,
      isPublished: editingItem.isPublished,
    });
    if (ok) {
      setPortfolioItems(items =>
        items.map(i => i.id === editingItem.id ? { ...editingItem } : i)
      );
      setIsEditModalOpen(false);
      setEditingItem(null);
      toast.success('수정되었습니다.');
    } else {
      toast.error('수정에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleShareItem = async (item: PortfolioItem) => {
    try {
      await navigator.clipboard.writeText(item.youtubeUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('링크가 복사되었습니다.');
    } catch {
      toast.error('복사에 실패했습니다.');
    }
  };

  const handleDownloadThumbnail = (item: PortfolioItem) => {
    const videoId = extractYouTubeId(item.youtubeUrl);
    if (!videoId) { toast.error('유효한 유튜브 URL이 없습니다.'); return; }
    const link = document.createElement('a');
    link.href = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    link.download = `${item.title}-thumbnail.jpg`;
    link.target = '_blank';
    link.click();
  };

  const handleAddItem = async () => {
    if (!newItem.title || !newItem.client) {
      alert('제목과 클라이언트는 필수 입력 항목입니다.');
      return;
    }
    if (!newItem.youtubeUrl) {
      alert('유튜브 URL을 입력해주세요.');
      return;
    }
    const videoId = extractYouTubeId(newItem.youtubeUrl);
    if (!videoId) {
      alert('올바른 유튜브 URL을 입력해주세요.\n예: https://www.youtube.com/watch?v=VIDEO_ID');
      return;
    }

    const itemToInsert: Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt'> = {
      title: newItem.title!,
      description: newItem.description || '',
      client: newItem.client!,
      partnerId: newItem.partnerId || undefined,
      completedAt: newItem.completedAt || new Date().toISOString().split('T')[0],
      tags: newItem.tags || [],
      youtubeUrl: newItem.youtubeUrl!,
      isPublished: newItem.isPublished || false,
    };

    const inserted = await insertPortfolioItem(itemToInsert);
    if (!inserted) {
      alert('포트폴리오 추가에 실패했습니다. 다시 시도해주세요.');
      return;
    }
    setPortfolioItems(prev => [inserted, ...prev]);

    setIsAddModalOpen(false);
    setNewItem({
      title: '',
      description: '',
      client: '',
      partnerId: '',
      completedAt: new Date().toISOString().split('T')[0],
      tags: [],
      youtubeUrl: '',
      isPublished: false,
    });
    setTagInput('');
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !newItem.tags?.includes(tagInput.trim())) {
      setNewItem({ ...newItem, tags: [...(newItem.tags || []), tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewItem({ ...newItem, tags: newItem.tags?.filter(tag => tag !== tagToRemove) || [] });
  };

  const handleDelete = async (itemId: string) => {
    if (confirm('이 포트폴리오를 삭제하시겠습니까?')) {
      const ok = await deletePortfolioItem(itemId);
      if (ok) {
        setPortfolioItems(items => items.filter(item => item.id !== itemId));
        toast.success('삭제되었습니다.');
      } else {
        toast.error('삭제에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  const stats = {
    total: portfolioItems.length,
    published: portfolioItems.filter(item => item.isPublished).length,
    unpublished: portfolioItems.filter(item => !item.isPublished).length,
  };

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @keyframes portfolio-modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-portfolio-modal { animation: portfolio-modal-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <a href="/marketing" className="text-gray-500 hover:text-gray-700 transition-colors">
              마케팅
            </a>
            <span className="text-gray-400">/</span>
            <h1 className="text-3xl font-bold text-gray-900">포트폴리오</h1>
          </div>
          <p className="text-gray-500 mt-2">작업물을 업로드하고 포트폴리오로 관리하세요</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const url = typeof window !== 'undefined' ? window.location.href : '';
              navigator.clipboard.writeText(url).then(() => toast.success('페이지 링크가 복사되었습니다.')).catch(() => toast.error('복사에 실패했습니다.'));
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors active:scale-[0.97] font-medium flex items-center gap-2"
          >
            <Share2 size={18} />
            공유하기
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors active:scale-[0.97] font-medium flex items-center gap-2"
          >
            <Plus size={18} />
            포트폴리오 추가
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">전체 포트폴리오</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Grid3x3 className="text-orange-500" size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">공개된 포트폴리오</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.published}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Eye className="text-green-500" size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">비공개 포트폴리오</p>
              <p className="text-3xl font-bold text-gray-600 mt-2">{stats.unpublished}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <EyeOff className="text-gray-500" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* 컨트롤 바 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="제목, 클라이언트, 태그 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1">
              {(['all', 'published', 'unpublished'] as FilterType[]).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filter === f ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {f === 'all' ? '전체' : f === 'published' ? '공개됨' : '비공개'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <Grid3x3 size={18} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 포트폴리오 목록 */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          로딩 중...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Grid3x3 className="mx-auto mb-4 text-gray-400" size={64} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">포트폴리오가 없습니다</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery
              ? '검색 조건에 맞는 포트폴리오가 없습니다'
              : filter === 'published'
              ? '공개된 포트폴리오가 없습니다'
              : filter === 'unpublished'
              ? '비공개 포트폴리오가 없습니다'
              : '포트폴리오 추가 버튼을 클릭하여 작업물을 업로드하세요'}
          </p>
          {!searchQuery && filter === 'all' && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium inline-flex items-center gap-2"
            >
              <Plus size={20} />
              첫 포트폴리오 추가하기
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const partner = partners.find(p => p.id === item.partnerId);
            return (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow hover:shadow-xl transition-all duration-200 overflow-hidden group"
              >
                <div className="h-48 bg-gray-900 relative overflow-hidden">
                  {getYouTubeThumbnail(item.youtubeUrl) && (
                    <img
                      src={getYouTubeThumbnail(item.youtubeUrl)!}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://img.youtube.com/vi/${extractYouTubeId(item.youtubeUrl)}/hqdefault.jpg`;
                      }}
                    />
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => togglePublish(item.id)}
                      className={`p-2 rounded-lg backdrop-blur-sm transition-colors ${
                        item.isPublished
                          ? 'bg-green-500/90 text-white'
                          : 'bg-gray-900/50 text-white hover:bg-gray-900/70'
                      }`}
                      title={item.isPublished ? '공개됨' : '비공개'}
                    >
                      {item.isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-lg bg-red-500/90 text-white hover:bg-red-600/90 backdrop-blur-sm transition-colors"
                      title="삭제"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={item.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </a>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 flex-1">{item.title}</h3>
                    {item.isPublished && (
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium flex-shrink-0">
                        공개
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-xs text-gray-500">
                      <User size={12} className="mr-1.5" />
                      <span>{item.client}</span>
                    </div>
                    {partner && (
                      <div className="flex items-center text-xs text-gray-700">
                        <div className="w-4 h-4 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mr-1.5">
                          <User size={8} className="text-orange-500" />
                        </div>
                        <span>{partner.name}</span>
                      </div>
                    )}
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar size={12} className="mr-1.5" />
                      <span>{item.completedAt ? new Date(item.completedAt).toLocaleDateString('ko-KR') : '-'}</span>
                    </div>
                  </div>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {item.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleEdit(item)} className="flex-1 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium">
                      수정
                    </button>
                    <button type="button" onClick={() => handleShareItem(item)} className="px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors" title="링크 복사">
                      {copiedId === item.id ? <CheckCircle size={16} className="text-green-500" /> : <Share2 size={16} />}
                    </button>
                    <button type="button" onClick={() => handleDownloadThumbnail(item)} className="px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors" title="썸네일 다운로드">
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
          {filteredItems.map((item) => {
            const partner = partners.find(p => p.id === item.partnerId);
            return (
              <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-6">
                  <div className="w-48 h-32 flex-shrink-0 bg-gray-900 rounded-lg relative overflow-hidden group/thumb">
                    {getYouTubeThumbnail(item.youtubeUrl) && (
                      <img
                        src={getYouTubeThumbnail(item.youtubeUrl)!}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = `https://img.youtube.com/vi/${extractYouTubeId(item.youtubeUrl)}/hqdefault.jpg`;
                        }}
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity bg-black/30">
                      <a
                        href={item.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                        {item.isPublished && (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                            <CheckCircle size={12} />
                            공개됨
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => togglePublish(item.id)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                            item.isPublished
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-orange-500 text-white hover:bg-orange-600'
                          }`}
                        >
                          {item.isPublished ? (
                            <><EyeOff size={16} />비공개로 전환</>
                          ) : (
                            <><Eye size={16} />공개하기</>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                    <div className="flex items-center gap-6 mb-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <User size={14} />
                        <span>{item.client}</span>
                      </div>
                      {partner && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User size={10} className="text-orange-500" />
                          </div>
                          <span>{partner.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        <span>{item.completedAt ? new Date(item.completedAt).toLocaleDateString('ko-KR') : '-'}</span>
                      </div>
                    </div>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 포트폴리오 수정 모달 */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full animate-portfolio-modal" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">포트폴리오 수정</h2>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
                  <input type="text" value={editingItem.title} onChange={e => setEditingItem({ ...editingItem, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">클라이언트 *</label>
                  <input type="text" value={editingItem.client} onChange={e => setEditingItem({ ...editingItem, client: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">유튜브 URL *</label>
                  <input type="url" value={editingItem.youtubeUrl} onChange={e => setEditingItem({ ...editingItem, youtubeUrl: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                  <textarea value={editingItem.description} onChange={e => setEditingItem({ ...editingItem, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">완료일</label>
                  <input type="date" value={editingItem.completedAt || ''} onChange={e => setEditingItem({ ...editingItem, completedAt: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">태그</label>
                  {editingItem.tags && editingItem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editingItem.tags.map((tag, i) => (
                        <span key={i} className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded text-sm">
                          #{tag}
                          <button type="button" onClick={() => setEditingItem({ ...editingItem, tags: editingItem.tags!.filter((_, j) => j !== i) })} className="hover:text-red-500"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input type="text" value={editTagInput} onChange={e => setEditTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && editTagInput.trim()) { setEditingItem({ ...editingItem, tags: [...(editingItem.tags || []), editTagInput.trim()] }); setEditTagInput(''); } }} placeholder="태그 입력 후 Enter" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="edit-publish" checked={editingItem.isPublished} onChange={e => setEditingItem({ ...editingItem, isPublished: e.target.checked })} className="w-4 h-4 text-orange-600 border-gray-300 rounded" />
                  <label htmlFor="edit-publish" className="text-sm text-gray-700">공개 상태</label>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">취소</button>
                <button type="button" onClick={handleSaveEdit} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">저장</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 포트폴리오 추가 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-modal-overlay">
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setIsAddModalOpen(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full animate-portfolio-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">새 포트폴리오 추가</h2>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <FloatingLabelInput
                  label="제목"
                  required
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                />
                <FloatingLabelTextarea
                  label="설명"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FloatingLabelInput
                    label="클라이언트"
                    required
                    type="text"
                    value={newItem.client}
                    onChange={(e) => setNewItem({ ...newItem, client: e.target.value })}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">담당 파트너</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsPartnerDropdownOpen(!isPartnerDropdownOpen)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {newItem.partnerId ? (
                            <>
                              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <User size={12} className="text-orange-500" />
                              </div>
                              <span className="text-gray-900">
                                {partners.find(p => p.id === newItem.partnerId)?.name}
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-500">선택 안 함</span>
                          )}
                        </div>
                        <ChevronDown size={16} className="text-gray-400" />
                      </button>
                      {isPartnerDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => { setNewItem({ ...newItem, partnerId: '' }); setIsPartnerDropdownOpen(false); }}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors ${newItem.partnerId === '' ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-700'}`}
                          >
                            선택 안 함
                          </button>
                          {partners.map((partner) => (
                            <button
                              key={partner.id}
                              type="button"
                              onClick={() => { setNewItem({ ...newItem, partnerId: partner.id }); setIsPartnerDropdownOpen(false); }}
                              className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${newItem.partnerId === partner.id ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-700'}`}
                            >
                              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <User size={12} className="text-orange-500" />
                              </div>
                              <span>{partner.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">완료일</label>
                  <input
                    type="date"
                    value={newItem.completedAt}
                    onChange={(e) => setNewItem({ ...newItem, completedAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <div className="flex gap-2 mb-2">
                    <FloatingLabelInput
                      label="태그"
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors h-[50px] mt-auto"
                    >
                      추가
                    </button>
                  </div>
                  {newItem.tags && newItem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newItem.tags.map((tag, index) => (
                        <span key={index} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm flex items-center gap-2">
                          #{tag}
                          <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-orange-900">
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <FloatingLabelInput
                    label="유튜브 URL"
                    required
                    id="youtube-url"
                    type="text"
                    value={newItem.youtubeUrl || ''}
                    onChange={(e) => setNewItem({ ...newItem, youtubeUrl: e.target.value })}
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    유튜브 영상 URL을 입력하거나 붙여넣기 하세요 (Ctrl+V 또는 Cmd+V)
                  </p>
                  {newItem.youtubeUrl && getYouTubeThumbnail(newItem.youtubeUrl) && (
                    <div className="mt-3 p-2 border border-gray-200 rounded-lg">
                      <p className="text-xs text-gray-600 mb-2">썸네일 미리보기:</p>
                      <img
                        src={getYouTubeThumbnail(newItem.youtubeUrl)!}
                        alt="YouTube Thumbnail"
                        className="w-full rounded max-w-md"
                        onError={(e) => {
                          const videoId = extractYouTubeId(newItem.youtubeUrl!);
                          if (videoId) e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="publish"
                    checked={newItem.isPublished}
                    onChange={(e) => setNewItem({ ...newItem, isPublished: e.target.checked })}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <label htmlFor="publish" className="ml-2 text-sm text-gray-700">바로 공개하기</label>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
