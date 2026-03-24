'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, X, ChevronDown, ChevronUp, Sparkles, Wrench, Zap, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type UpdateType = 'feature' | 'fix' | 'improvement' | 'breaking';

interface ChangelogItem {
  id: string;
  version: string;
  date: string;
  title: string;
  description: string;
  type: UpdateType;
  details: string[];
}

const TYPE_CONFIG: Record<UpdateType, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  feature: { label: '새 기능', color: 'text-orange-700', bg: 'bg-orange-100', icon: <Sparkles size={14} /> },
  fix: { label: '버그 수정', color: 'text-red-700', bg: 'bg-red-100', icon: <Wrench size={14} /> },
  improvement: { label: '개선', color: 'text-green-700', bg: 'bg-green-100', icon: <Zap size={14} /> },
  breaking: { label: '주요 변경', color: 'text-orange-700', bg: 'bg-orange-100', icon: <AlertCircle size={14} /> },
};

const STORAGE_KEY = 'video-moment-changelog';

const defaultChangelogs: ChangelogItem[] = [
  {
    id: '5',
    version: 'v0.1.5',
    date: '2026-03-25',
    title: '회차 작업 체크리스트 개선 및 코드 품질 보완',
    description: '숏폼/OAP 작업 타입 추가, 드래그 앤 드롭 순서 변경, 매니저 정산 원천징수 적용 등',
    type: 'feature',
    details: [
      'OAP 작업 타입 추가 (고정 카테고리, OAP 제작 라벨)',
      '숏폼 개수 모달 — 콘텐츠 추가 및 작업 단계 추가 시 생성 개수 선택',
      '숏폼 카테고리 고정 (가편/종편 드롭다운 제거)',
      '작업 목록 타임라인 컴팩트 UI (한 줄 표시)',
      '작업 타입 드래그 앤 드롭 순서 변경',
      '매니저 정산 기본 3.3% 원천징수 적용',
      '재무 메뉴에 준비중 태그 추가',
      '메일 미리보기 모달 추가',
      '에러 바운더리 추가 (dashboard, mail, projects, strategy)',
      '타입 안전성 개선 (as any 캐스트 제거)',
      'dead code 정리 (storage.ts 삭제)',
      '에피소드 생성 시 clientId 누락 수정',
      '파트너 수정 시 updated_at 컬럼 오류 수정',
      '계약 관리 페이지 추가 (준비중)',
    ],
  },
  {
    id: '4',
    version: 'v0.1.3',
    date: '2026-03-08',
    title: '프로젝트 상태 자동 분류 체계 전환',
    description: '수동 상태 설정 대신 에피소드 completedAt 기준으로 active/standby/dormant/inactive 상태를 자동 계산',
    type: 'feature',
    details: [
      '에피소드 완료일 기준 프로젝트 상태 자동 계산 (active/standby/dormant/inactive)',
      '프로젝트 목록 탭을 진행 중/대기/휴면/비활성으로 변경',
      '진행 중 프로젝트는 마감일순, 나머지는 최신 완료일순 정렬',
      '프로젝트 상세 및 대시보드 StatusBadge 일괄 업데이트',
    ],
  },
  {
    id: '3',
    version: 'v0.1.2',
    date: '2026-02-24',
    title: '회원가입 제거 → 관리자 계정 생성 방식 전환',
    description: '사내 ERP 특성에 맞게 셀프 가입을 제거하고, 관리자가 직접 계정을 생성하는 방식으로 변경',
    type: 'breaking',
    details: [
      '회원가입 페이지(/signup) 제거 — 접근 시 로그인으로 리다이렉트',
      '계정 관리 페이지에 "새 계정 생성" 폼 추가 (이름, 이메일, 역할, 임시 비밀번호)',
      '임시 비밀번호 자동 생성 버튼 및 생성 완료 시 비밀번호 확인 모달 추가',
      '첫 로그인 시 비밀번호 변경 강제 (/change-password)',
      '미들웨어에서 needs_password_change 체크 → 비밀번호 미변경 시 다른 페이지 접근 차단',
      '설정 페이지에서 자유롭게 비밀번호 재변경 가능',
    ],
  },
  {
    id: '2',
    version: 'v0.1.1',
    date: '2026-02-23',
    title: '인증 보안 강화',
    description: '미승인 사용자 접근 차단 및 회원가입 오류 메시지 개선',
    type: 'fix',
    details: [
      '미들웨어에서 승인 여부 검증 추가 — 미승인 사용자 대시보드 접근 차단',
      '회원가입 시 "User already registered" 오류를 한글 안내 메시지로 개선',
      '로그인/회원가입 페이지 리다이렉트 시 승인 상태 확인 로직 추가',
    ],
  },
  {
    id: '1',
    version: 'v0.1.0',
    date: '2026-02-18',
    title: '초기 대시보드 출시',
    description: '프로젝트, 파트너, 클라이언트 관리 기능을 포함한 초기 버전 출시',
    type: 'feature',
    details: [
      '프로젝트 관리 페이지 추가',
      '파트너 관리 페이지 추가',
      '클라이언트 관리 페이지 추가',
      '대시보드 통계 카드 추가',
      '로그인 / 로그아웃 기능',
    ],
  },
];

function getChangelogs(): ChangelogItem[] {
  if (typeof window === 'undefined') return defaultChangelogs;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultChangelogs;
  } catch {
    return defaultChangelogs;
  }
}

function saveChangelogs(items: ChangelogItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function ChangelogPage() {
  const [changelogs, setChangelogs] = useState<ChangelogItem[]>(() => getChangelogs());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['1']));
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<Partial<ChangelogItem>>({
    type: 'feature',
    details: [],
  });
  const [newDetail, setNewDetail] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddDetail = () => {
    if (!newDetail.trim()) return;
    setNewItem(prev => ({ ...prev, details: [...(prev.details || []), newDetail.trim()] }));
    setNewDetail('');
  };

  const handleRemoveDetail = (index: number) => {
    setNewItem(prev => ({ ...prev, details: prev.details?.filter((_, i) => i !== index) }));
  };

  const handleSave = () => {
    if (!newItem.version || !newItem.title || !newItem.date) return;
    const item: ChangelogItem = {
      id: Date.now().toString(),
      version: newItem.version!,
      date: newItem.date!,
      title: newItem.title!,
      description: newItem.description || '',
      type: newItem.type as UpdateType,
      details: newItem.details || [],
    };
    const updated = [item, ...changelogs];
    setChangelogs(updated);
    saveChangelogs(updated);
    setIsAdding(false);
    setNewItem({ type: 'feature', details: [] });
    setExpandedIds(prev => new Set([item.id, ...prev]));
  };

  const handleDelete = (id: string) => {
    const updated = changelogs.filter(c => c.id !== id);
    setChangelogs(updated);
    saveChangelogs(updated);
  };

  return (
    <div className="space-y-8 pb-20 max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">업데이트 기록</h1>
            <p className="text-gray-500 mt-1">기능 추가 및 변경 이력</p>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
        >
          <Plus size={16} />
          업데이트 추가
        </button>
      </div>

      {/* 추가 폼 */}
      {isAdding && (
        <div className="bg-white border-2 border-green-200 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-900">새 업데이트 추가</h2>
            <button onClick={() => setIsAdding(false)} className="p-1 hover:bg-gray-100 rounded-full">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">버전</label>
              <input
                type="text"
                placeholder="예: v1.2.0"
                value={newItem.version || ''}
                onChange={e => setNewItem(prev => ({ ...prev, version: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">날짜</label>
              <input
                type="date"
                value={newItem.date || ''}
                onChange={e => setNewItem(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">유형</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(TYPE_CONFIG) as UpdateType[]).map(type => {
                const cfg = TYPE_CONFIG[type];
                const isSelected = newItem.type === type;
                return (
                  <button
                    key={type}
                    onClick={() => setNewItem(prev => ({ ...prev, type }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                      isSelected
                        ? `${cfg.bg} ${cfg.color} border-current`
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">제목</label>
            <input
              type="text"
              placeholder="업데이트 제목"
              value={newItem.title || ''}
              onChange={e => setNewItem(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">설명</label>
            <textarea
              placeholder="간단한 설명 (선택)"
              value={newItem.description || ''}
              onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">상세 항목</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="항목 입력 후 추가"
                value={newDetail}
                onChange={e => setNewDetail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddDetail()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                onClick={handleAddDetail}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                추가
              </button>
            </div>
            {(newItem.details || []).length > 0 && (
              <ul className="space-y-1 mt-2">
                {newItem.details!.map((detail, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="flex-1">{detail}</span>
                    <button onClick={() => handleRemoveDetail(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsAdding(false)}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!newItem.version || !newItem.title || !newItem.date}
              className="flex-1 py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors text-sm disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              저장
            </button>
          </div>
        </div>
      )}

      {/* 타임라인 */}
      <div className="space-y-4">
        {changelogs.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <ClipboardListIcon />
            <p className="mt-4 font-medium">업데이트 기록이 없습니다</p>
            <p className="text-sm mt-1">오른쪽 상단 버튼으로 추가해보세요</p>
          </div>
        )}
        {changelogs.map(item => {
          const cfg = TYPE_CONFIG[item.type];
          const isExpanded = expandedIds.has(item.id);
          return (
            <div key={item.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-start gap-4 hover:bg-gray-50 transition-colors">
                <div
                  className="flex-1 min-w-0 p-5 cursor-pointer"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-bold text-gray-400 font-mono">{item.version}</span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                    <span className="text-xs text-gray-400">{item.date}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 p-5">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <div className="cursor-pointer" onClick={() => toggleExpand(item.id)}>
                    {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </div>
              </div>

              {isExpanded && item.details.length > 0 && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <ul className="space-y-2 mt-4">
                    {item.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.bg.replace('bg-', 'bg-').replace('100', '500')}`} />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClipboardListIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}
