'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Film, Code2, Smartphone, ChevronDown, Plus } from 'lucide-react';
import { Client, ProjectType, ProjectMeta } from '@/types';

interface ProjectWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: WizardData) => void;
  clients: Client[];
  defaultClientId?: string;
}

interface WizardData {
  startType: 'with-client' | 'project-only';
  client?: {
    isNew: boolean;
    id?: string;
    name?: string;
    contact?: string;
    email?: string;
  };
  project: {
    title: string;
    category: string;
    description?: string;
    partnerIds: string[];
    type: ProjectType;
    meta?: ProjectMeta;
  };
  episodes: {
    shouldCreate: boolean;
    count?: number;
    dates?: Array<{ startDate: string; endDate: string }>;
  };
}

const VIDEO_CATEGORIES = ['유튜브', '브이로그', '기업 홍보', '교육', '기타'];
const CONTENT_PLATFORMS: Array<{ value: 'youtube' | 'instagram' | 'blog' | 'threads' | 'x' | 'other'; label: string }> = [
  { value: 'youtube',   label: '유튜브'     },
  { value: 'instagram', label: '인스타그램' },
  { value: 'blog',      label: '블로그'     },
  { value: 'threads',   label: '쓰레드'     },
  { value: 'x',         label: 'X'          },
  { value: 'other',     label: '기타'       },
];

export default function ProjectWizardModal({
  isOpen,
  onClose,
  onComplete,
  clients,
  defaultClientId,
}: ProjectWizardModalProps) {
  const titleRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<ProjectType>('video');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // 클라이언트
  const [clientId, setClientId] = useState<string>(defaultClientId ?? '');
  const [newClientName, setNewClientName] = useState('');
  const [isClientNew, setIsClientNew] = useState(false);

  // 영상 메타
  const [videoCategory, setVideoCategory] = useState('기타');

  // 개발 메타
  const [repoUrl, setRepoUrl] = useState('');
  const [stack, setStack] = useState('');
  const [deployUrl, setDeployUrl] = useState('');

  // 콘텐츠 메타
  const [primaryPlatform, setPrimaryPlatform] = useState<'youtube' | 'instagram' | 'blog' | 'threads' | 'x' | 'other'>('youtube');
  const [publishCycle, setPublishCycle] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // 열릴 때 초기화 + 타이틀 포커스
  useEffect(() => {
    if (!isOpen) return;
    setType('video');
    setTitle('');
    setDescription('');
    setClientId(defaultClientId ?? '');
    setNewClientName('');
    setIsClientNew(false);
    setVideoCategory('기타');
    setRepoUrl('');
    setStack('');
    setDeployUrl('');
    setPrimaryPlatform('youtube');
    setPublishCycle('');
    setSubmitting(false);
    setTimeout(() => titleRef.current?.focus(), 50);
  }, [isOpen, defaultClientId]);

  if (!isOpen) return null;

  const canSubmit = title.trim().length > 0 && !submitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitting(true);

    const meta: ProjectMeta = {};
    if (type === 'video') {
      meta.video = { category: videoCategory };
    } else if (type === 'dev') {
      meta.dev = {
        repoUrl: repoUrl.trim() || undefined,
        stack: stack.trim() ? stack.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        deployUrl: deployUrl.trim() || undefined,
      };
    } else if (type === 'content') {
      meta.content = {
        primaryPlatform,
        publishCycle: publishCycle.trim() || undefined,
      };
    }

    const data: WizardData = {
      startType: clientId || isClientNew ? 'with-client' : 'project-only',
      client: isClientNew && newClientName.trim()
        ? { isNew: true, name: newClientName.trim() }
        : clientId
          ? { isNew: false, id: clientId }
          : undefined,
      project: {
        title: title.trim(),
        category: type === 'video' ? videoCategory : '',
        description: description.trim() || undefined,
        partnerIds: [],
        type,
        meta,
      },
      episodes: { shouldCreate: false },
    };

    onComplete(data);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const TYPE_TABS: Array<{ value: ProjectType; label: string; icon: React.ElementType }> = [
    { value: 'video',   label: '영상',   icon: Film       },
    { value: 'dev',     label: '개발',   icon: Code2      },
    { value: 'content', label: '콘텐츠', icon: Smartphone },
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-stone-900/40" />
        <motion.div
          className="relative bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
          initial={{ y: 16, scale: 0.98, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 16, scale: 0.98, opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={e => e.stopPropagation()}
          onKeyDown={handleKey}
        >
          <div className="p-6 pb-0">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-xl font-bold text-gray-900">새 프로젝트</h2>
                <p className="text-sm text-gray-500 mt-1">유형을 선택하고 정보를 입력하세요</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* 타입 탭 */}
            <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-gray-100 rounded-xl">
              {TYPE_TABS.map(t => {
                const Icon = t.icon;
                const active = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                      active
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Icon size={14} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* 프로젝트명 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                프로젝트명 <span className="text-red-500">*</span>
              </label>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="예: 하이브 신사업 브랜딩"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* 클라이언트 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">클라이언트</label>
              {!isClientNew ? (
                <div className="relative">
                  <select
                    value={clientId}
                    onChange={e => {
                      if (e.target.value === '__new__') {
                        setIsClientNew(true);
                        setClientId('');
                      } else {
                        setClientId(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all appearance-none bg-white pr-10"
                  >
                    <option value="">선택 안 함</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="__new__">+ 새 클라이언트 추가</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newClientName}
                    onChange={e => setNewClientName(e.target.value)}
                    placeholder="새 클라이언트 이름"
                    className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => { setIsClientNew(false); setNewClientName(''); }}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>

            {/* 타입별 메타 필드 */}
            {type === 'video' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">카테고리</label>
                <div className="flex flex-wrap gap-1.5">
                  {VIDEO_CATEGORIES.map(c => {
                    const active = videoCategory === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setVideoCategory(c)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          active
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {type === 'dev' && (
              <div className="space-y-3 p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">개발 정보</div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">리포지토리</label>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={e => setRepoUrl(e.target.value)}
                    placeholder="owner/repo 또는 URL"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">스택</label>
                    <input
                      type="text"
                      value={stack}
                      onChange={e => setStack(e.target.value)}
                      placeholder="Next, Supabase"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">배포 URL</label>
                    <input
                      type="text"
                      value={deployUrl}
                      onChange={e => setDeployUrl(e.target.value)}
                      placeholder="erp.hype5.co.kr"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {type === 'content' && (
              <div className="space-y-3 p-3.5 bg-fuchsia-50/40 border border-fuchsia-100 rounded-xl">
                <div className="text-[11px] font-bold text-fuchsia-700 uppercase tracking-wide">콘텐츠 정보</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">주 플랫폼</label>
                    <select
                      value={primaryPlatform}
                      onChange={e => setPrimaryPlatform(e.target.value as typeof primaryPlatform)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
                    >
                      {CONTENT_PLATFORMS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">발행 주기</label>
                    <input
                      type="text"
                      value={publishCycle}
                      onChange={e => setPublishCycle(e.target.value)}
                      placeholder="주 2회"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 설명 (선택) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                설명 <span className="text-gray-400 font-normal">(선택)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="프로젝트 개요"
                rows={2}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
              />
            </div>
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <div className="text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">⌘</kbd>
              <span className="mx-1">+</span>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">Enter</kbd>
              <span className="ml-1.5">바로 생성</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                <Plus size={14} />
                프로젝트 생성
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
