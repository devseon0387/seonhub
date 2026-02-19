'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getProjects, getPartners, getClients, getAllEpisodes,
  getMyChecklists, insertChecklist, updateChecklist, deleteChecklist, clearCompletedChecklists,
  insertProject, insertClient, upsertEpisodes,
  ChecklistRow,
} from '@/lib/supabase/db';
import { Calendar, Clock, AlertCircle, CheckCircle, Users, Sparkles, Plus, Trash2, Bell, BellOff, X, Link2, Search, Repeat2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Project, Episode, Partner, Client, WorkContentType } from '@/types';
import ProjectWizardModal from '@/components/ProjectWizardModal';
import DateTimePicker, { RepeatType } from '@/components/DateTimePicker';

type LinkPickerType = 'episode' | 'project' | 'client' | 'partner' | null;

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  reminderTime?: string;
  notified?: boolean;
  repeatType?: RepeatType;
  repeatDays?: number[];
  createdAt: string;
  // 연결 정보
  linkedEpisodeId?: string;
  linkedEpisodeTitle?: string;
  linkedEpisodeNumber?: number;
  linkedProjectId?: string;
  linkedProjectTitle?: string;
  linkedClientName?: string;
  linkedPartnerId?: string;
  linkedPartnerName?: string;
}

// snake_case DB 행 → camelCase UI 아이템 변환
function rowToItem(row: ChecklistRow): ChecklistItem {
  return {
    id: row.id,
    text: row.text,
    completed: row.completed,
    reminderTime: row.reminder_time ?? undefined,
    notified: row.notified,
    repeatType: (row.repeat_type as RepeatType) ?? undefined,
    repeatDays: row.repeat_days ?? undefined,
    createdAt: row.created_at,
    linkedEpisodeId: row.linked_episode_id ?? undefined,
    linkedEpisodeTitle: row.linked_episode_title ?? undefined,
    linkedEpisodeNumber: row.linked_episode_number ?? undefined,
    linkedProjectId: row.linked_project_id ?? undefined,
    linkedProjectTitle: row.linked_project_title ?? undefined,
    linkedClientName: row.linked_client_name ?? undefined,
    linkedPartnerId: row.linked_partner_id ?? undefined,
    linkedPartnerName: row.linked_partner_name ?? undefined,
  };
}

// camelCase UI 아이템 → snake_case DB 행 변환 (insert/update용)
function itemToRow(item: ChecklistItem): Omit<ChecklistRow, 'id' | 'user_id' | 'created_at'> {
  return {
    text: item.text,
    completed: item.completed,
    reminder_time: item.reminderTime ?? null,
    notified: item.notified ?? false,
    repeat_type: item.repeatType ?? null,
    repeat_days: item.repeatDays ?? null,
    linked_episode_id: item.linkedEpisodeId ?? null,
    linked_episode_title: item.linkedEpisodeTitle ?? null,
    linked_episode_number: item.linkedEpisodeNumber ?? null,
    linked_project_id: item.linkedProjectId ?? null,
    linked_project_title: item.linkedProjectTitle ?? null,
    linked_client_name: item.linkedClientName ?? null,
    linked_partner_id: item.linkedPartnerId ?? null,
    linked_partner_name: item.linkedPartnerName ?? null,
  };
}

export default function ManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'checklist'>('today');
  const [tabDirection, setTabDirection] = useState(1);

  const TAB_ORDER = ['checklist', 'today', 'week'] as const;
  const switchTab = (tab: 'today' | 'week' | 'checklist') => {
    setTabDirection(TAB_ORDER.indexOf(tab) > TAB_ORDER.indexOf(activeTab) ? 1 : -1);
    setActiveTab(tab);
  };
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const handleProjectWizardComplete = async (data: {
    startType: 'with-client' | 'project-only';
    client?: { isNew: boolean; id?: string; name?: string; contact?: string; email?: string };
    project: { title: string; category: string; description?: string; partnerIds: string[] };
    episodes: { shouldCreate: boolean; count?: number; dates?: Array<{ startDate: string; endDate: string }> };
  }) => {
    if (!data.project.title) {
      setIsWizardOpen(false);
      return;
    }

    // 1. 신규 클라이언트 생성
    let clientName = '';
    if (data.client?.isNew && data.client.name) {
      const saved = await insertClient({ name: data.client.name, contactPerson: data.client.contact, email: data.client.email, status: 'active' });
      clientName = saved?.name || data.client.name;
      if (saved) setClients(prev => [saved, ...prev]);
    } else if (data.client?.id) {
      clientName = clients.find(c => c.id === data.client!.id)?.name || '';
    }

    // 2. 프로젝트 생성
    const savedProject = await insertProject({
      title: data.project.title,
      description: data.project.description || '',
      client: clientName,
      partnerId: data.project.partnerIds[0] || '',
      status: 'planning',
      budget: { totalAmount: 0, partnerPayment: 0, managementFee: 0, marginRate: 0 },
      workContent: [],
      tags: data.project.category ? [data.project.category] : [],
    });

    if (!savedProject) { setIsWizardOpen(false); return; }
    setProjects(prev => [savedProject, ...prev]);

    // 3. 회차 생성
    if (data.episodes.shouldCreate && data.episodes.count) {
      const now = new Date().toISOString();
      const episodes: (Episode & { projectId: string })[] = Array.from({ length: data.episodes.count }, (_, i) => ({
        id: crypto.randomUUID(),
        projectId: savedProject.id,
        episodeNumber: i + 1,
        title: `${i + 1}회차`,
        workContent: [] as WorkContentType[],
        status: 'waiting' as const,
        assignee: '',
        manager: '',
        startDate: data.episodes.dates?.[i]?.startDate || '',
        endDate: data.episodes.dates?.[i]?.endDate || '',
        createdAt: now,
        updatedAt: now,
      }));
      await upsertEpisodes(episodes);
      setAllEpisodes(prev => [...prev, ...episodes]);
    }

    setIsWizardOpen(false);
  };

  // 체크리스트 상태
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [newItemReminder, setNewItemReminder] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showReminderInput, setShowReminderInput] = useState(false);
  const [repeatType, setRepeatType] = useState<RepeatType>('none');
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [activeLinkPicker, setActiveLinkPicker] = useState<LinkPickerType>(null);
  const [linkSearch, setLinkSearch] = useState('');
  // 달력 블록 상태
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);
  // 현재 작성 중인 항목의 링크 상태
  const [formLink, setFormLink] = useState<{
    episodeId?: string; episodeTitle?: string; episodeNumber?: number;
    projectId?: string; projectTitle?: string;
    clientName?: string;
    partnerId?: string; partnerName?: string;
  }>({});
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const linkPickerRef = useRef<HTMLDivElement>(null);
  const notificationPermission = useRef<NotificationPermission>('default');

  // 체크리스트 새로고침
  const refreshChecklists = async () => {
    const rows = await getMyChecklists();
    setChecklistItems(rows.map(rowToItem));
  };

  const addChecklistItem = async () => {
    if (!newItemText.trim()) return;
    const newItem: ChecklistItem = {
      id: '',
      text: newItemText.trim(),
      completed: false,
      reminderTime: newItemReminder || undefined,
      notified: false,
      repeatType: repeatType !== 'none' ? repeatType : undefined,
      repeatDays: repeatType === 'days' ? repeatDays : undefined,
      createdAt: new Date().toISOString(),
      linkedEpisodeId: formLink.episodeId,
      linkedEpisodeTitle: formLink.episodeTitle,
      linkedEpisodeNumber: formLink.episodeNumber,
      linkedProjectId: formLink.projectId,
      linkedProjectTitle: formLink.projectTitle,
      linkedClientName: formLink.clientName,
      linkedPartnerId: formLink.partnerId,
      linkedPartnerName: formLink.partnerName,
    };
    await insertChecklist(itemToRow(newItem));
    await refreshChecklists();
    setNewItemText('');
    setNewItemReminder('');
    setShowAddForm(false);
    setShowReminderInput(false);
    setFormLink({});
    setActiveLinkPicker(null);
  };

  const resetInlineForm = () => {
    setShowAddForm(false);
    setNewItemText('');
    setNewItemReminder('');
    setShowReminderInput(false);
    setRepeatType('none');
    setRepeatDays([]);
    setFormLink({});
    setActiveLinkPicker(null);
    setLinkSearch('');
  };

  // 회차 선택 → 프로젝트/클라이언트/파트너 자동 연결
  const selectEpisode = (episode: Episode & { projectId?: string }) => {
    const project = projects.find(p => p.id === episode.projectId);
    const partner = project ? partners.find(p => p.id === project.partnerId) : undefined;
    setFormLink({
      episodeId: episode.id,
      episodeTitle: episode.title,
      episodeNumber: episode.episodeNumber,
      projectId: project?.id,
      projectTitle: project?.title,
      clientName: project?.client,
      partnerId: partner?.id,
      partnerName: partner?.name,
    });
    setActiveLinkPicker(null);
    setLinkSearch('');
  };

  // 프로젝트 선택 → 클라이언트/파트너 자동 연결
  const selectProject = (project: Project) => {
    const partner = partners.find(p => p.id === project.partnerId);
    setFormLink(prev => ({
      ...prev,
      episodeId: undefined, episodeTitle: undefined, episodeNumber: undefined,
      projectId: project.id,
      projectTitle: project.title,
      clientName: project.client,
      partnerId: partner?.id,
      partnerName: partner?.name,
    }));
    setActiveLinkPicker(null);
    setLinkSearch('');
  };

  const selectClient = (name: string) => {
    setFormLink(prev => ({ ...prev, clientName: name }));
    setActiveLinkPicker(null);
    setLinkSearch('');
  };

  const selectPartner = (partner: Partner) => {
    setFormLink(prev => ({ ...prev, partnerId: partner.id, partnerName: partner.name }));
    setActiveLinkPicker(null);
    setLinkSearch('');
  };

  const clearLink = (type: 'episode' | 'project' | 'client' | 'partner') => {
    if (type === 'episode') {
      setFormLink({});
    } else if (type === 'project') {
      setFormLink(prev => ({ ...prev, projectId: undefined, projectTitle: undefined, clientName: undefined, partnerId: undefined, partnerName: undefined }));
    } else if (type === 'client') {
      setFormLink(prev => ({ ...prev, clientName: undefined }));
    } else if (type === 'partner') {
      setFormLink(prev => ({ ...prev, partnerId: undefined, partnerName: undefined }));
    }
  };

  // 특정 날짜의 체크리스트 아이템 가져오기
  const getItemsForDate = (dateStr: string): ChecklistItem[] => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();
    return checklistItems.filter(item => {
      if (item.repeatType && item.repeatType !== 'none') {
        if (item.repeatType === 'daily') return true;
        if (item.repeatType === 'weekly') {
          const base = item.reminderTime ? new Date(item.reminderTime) : new Date(item.createdAt);
          return base.getDay() === dayOfWeek;
        }
        if (item.repeatType === 'days') return item.repeatDays?.includes(dayOfWeek) ?? false;
      } else {
        if (item.reminderTime) return item.reminderTime.startsWith(dateStr);
      }
      return false;
    });
  };

  const toggleChecklistItem = async (id: string) => {
    const item = checklistItems.find(i => i.id === id);
    if (!item) return;
    await updateChecklist(id, { completed: !item.completed });
    await refreshChecklists();
  };

  const deleteChecklistItem = async (id: string) => {
    await deleteChecklist(id);
    await refreshChecklists();
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    notificationPermission.current = permission;
  };

  useEffect(() => {
    const loadData = async () => {
      const [projectsData, partnersData, clientsData, episodesData, checklistRows] = await Promise.all([
        getProjects(),
        getPartners(),
        getClients(),
        getAllEpisodes(),
        getMyChecklists(),
      ]);
      setProjects(projectsData);
      setPartners(partnersData);
      setClients(clientsData);
      setAllEpisodes(episodesData);
      setChecklistItems(checklistRows.map(rowToItem));
    };
    loadData();

    // 알림 권한 상태 초기화
    if ('Notification' in window) {
      notificationPermission.current = Notification.permission;
    }
  }, []);

  // 알림 체크 (30초마다)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const now = new Date();
      const itemsToNotify = checklistItems.filter(
        item => !item.completed && !item.notified && !!item.reminderTime && new Date(item.reminderTime) <= now
      );
      if (itemsToNotify.length === 0) return;
      await Promise.all(itemsToNotify.map(item => {
        new Notification('📋 Video Moment 체크리스트', {
          body: item.text,
          icon: '/favicon.ico',
        });
        return updateChecklist(item.id, { notified: true });
      }));
      await refreshChecklists();
    }, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklistItems]);

  // 현재 날짜 및 시간 계산
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // 이번 주 시작일과 종료일 (월요일 시작)
  const currentDay = now.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
  thisWeekEnd.setHours(23, 59, 59);

  // 오늘 마감인 에피소드
  const todayDeadlines = allEpisodes.filter(ep => {
    if (!ep.dueDate || ep.status === 'completed') return false;
    const dueDate = new Date(ep.dueDate);
    return dueDate >= todayStart && dueDate <= todayEnd;
  }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  // 오늘 검수 대기 중인 에피소드
  const todayReviews = allEpisodes.filter(ep => ep.status === 'review');

  // 긴급 이슈 (마감일 지난 에피소드)
  const overdueEpisodes = allEpisodes.filter(ep => {
    if (!ep.dueDate || ep.status === 'completed') return false;
    const dueDate = new Date(ep.dueDate);
    return dueDate < todayStart;
  }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  // 이번 주 마감 예정 에피소드
  const thisWeekDeadlines = allEpisodes.filter(ep => {
    if (!ep.dueDate || ep.status === 'completed') return false;
    const dueDate = new Date(ep.dueDate);
    return dueDate >= thisWeekStart && dueDate <= thisWeekEnd && dueDate > todayEnd;
  }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  // 이번 주 완료된 에피소드
  const thisWeekCompleted = allEpisodes.filter(ep => {
    if (ep.status !== 'completed' || !ep.completedAt) return false;
    const completedDate = new Date(ep.completedAt);
    return completedDate >= thisWeekStart && completedDate <= thisWeekEnd;
  });

  // 진행 중인 프로젝트
  const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'planning');

  // 체크리스트 분류
  const oneTimeItems = checklistItems.filter(i => !i.repeatType || i.repeatType === 'none');
  const recurringItems = checklistItems.filter(i => i.repeatType && i.repeatType !== 'none');

  // 파트너별 이번 주 작업 현황
  const partnerWeeklyWorkload = partners.map(partner => {
    const partnerEpisodes = allEpisodes.filter(ep => ep.assignee === partner.id);
    const thisWeekEpisodes = partnerEpisodes.filter(ep => {
      if (!ep.dueDate) return false;
      const dueDate = new Date(ep.dueDate);
      return dueDate >= thisWeekStart && dueDate <= thisWeekEnd;
    });
    const completed = thisWeekEpisodes.filter(ep => ep.status === 'completed').length;
    const inProgress = thisWeekEpisodes.filter(ep => ep.status === 'in_progress').length;
    const waiting = thisWeekEpisodes.filter(ep => ep.status === 'waiting').length;

    return {
      partner,
      total: thisWeekEpisodes.length,
      completed,
      inProgress,
      waiting,
    };
  }).filter(pw => pw.total > 0).sort((a, b) => b.total - a.total);

  // 헬퍼 함수: 에피소드의 프로젝트와 파트너 찾기
  const getEpisodeDetails = (episode: Episode) => {
    const project = projects.find(p => p.id === (episode as any).projectId);
    const partner = partners.find(p => p.id === episode.assignee);
    return { project, partner };
  };

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">매니지먼트</h1>
        <p className="text-gray-500 mt-2">오늘과 이번 주의 업무를 한눈에 관리하세요</p>
      </div>

      {/* 탭 네비게이션 + 새 프로젝트 버튼 */}
      <div className="flex items-center gap-3">
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-200 inline-flex gap-2">
        {([
          {
            key: 'checklist' as const,
            icon: CheckCircle,
            label: '체크리스트',
            badge: checklistItems.filter(i => !i.completed).length,
            badgeClass: 'bg-blue-100 text-blue-600',
          },
          {
            key: 'today' as const,
            icon: Clock,
            label: '오늘의 업무',
            badge: todayDeadlines.length + todayReviews.length + overdueEpisodes.length,
            badgeClass: 'bg-red-100 text-red-600',
          },
          {
            key: 'week' as const,
            icon: Calendar,
            label: '이번 주 업무',
            badge: thisWeekDeadlines.length,
            badgeClass: 'bg-green-100 text-green-600',
          },
        ] as const).map(({ key, icon: Icon, label, badge, badgeClass }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className="relative px-6 py-3 rounded-xl font-semibold"
          >
            {activeTab === key && (
              <motion.div
                layoutId="tab-pill"
                className="absolute inset-0 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/30"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <div className={`relative flex items-center gap-2 transition-colors duration-200 ${
              activeTab === key ? 'text-white' : 'text-gray-600 hover:text-gray-900'
            }`}>
              <Icon size={18} />
              <span>{label}</span>
              {badge > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors duration-200 ${
                  activeTab === key ? 'bg-white/20 text-white' : badgeClass
                }`}>
                  {badge}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={() => setIsWizardOpen(true)}
        className="px-5 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/30 font-semibold flex items-center gap-2 whitespace-nowrap"
      >
        <Sparkles size={18} />
        새 프로젝트 시작
      </button>
      </div>

      {/* 탭 콘텐츠 */}
      <div style={{ overflowX: 'clip' }}>
      <AnimatePresence mode="wait" custom={tabDirection}>
      <motion.div
        key={activeTab}
        custom={tabDirection}
        variants={{
          initial: (dir: number) => ({ opacity: 0, x: dir > 0 ? 48 : -48 }),
          animate: { opacity: 1, x: 0 },
          exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -48 : 48 }),
        }}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
      >

      {/* 오늘의 업무 탭 */}
      {activeTab === 'today' && (
      <div className="space-y-6">
        {/* 오늘의 통계 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">오늘의 현황</h2>
            <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
              {now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 오늘 마감 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">오늘 마감</p>
                <AlertCircle className="text-red-500" size={20} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{todayDeadlines.length}</p>
              <p className="text-xs text-gray-500 mt-1">개의 에피소드</p>
            </div>

            {/* 검수 대기 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">검수 대기</p>
                <CheckCircle className="text-purple-500" size={20} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{todayReviews.length}</p>
              <p className="text-xs text-gray-500 mt-1">개의 에피소드</p>
            </div>

            {/* 긴급 이슈 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">긴급 이슈</p>
                <Clock className="text-orange-500" size={20} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{overdueEpisodes.length}</p>
              <p className="text-xs text-gray-500 mt-1">마감일 지남</p>
            </div>
          </div>
        </div>

        {/* 오늘의 상세 업무 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 오늘 마감 상세 */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">오늘 마감 에피소드</h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {todayDeadlines.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <AlertCircle className="mx-auto mb-2 text-gray-400" size={32} />
                  <p>오늘 마감인 에피소드가 없습니다</p>
                </div>
              ) : (
                todayDeadlines.map((episode) => {
                  const { project, partner } = getEpisodeDetails(episode);
                  return (
                    <div key={episode.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{episode.title}</h4>
                          {project && (
                            <p className="text-xs text-gray-500 mt-1">프로젝트: {project.title}</p>
                          )}
                          {partner && (
                            <div className="flex items-center mt-2">
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-semibold mr-1.5">
                                {partner.name.charAt(0)}
                              </div>
                              <span className="text-xs text-gray-600">{partner.name}</span>
                            </div>
                          )}
                        </div>
                        <span className="ml-3 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium whitespace-nowrap">
                          {new Date(episode.dueDate!).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 마감
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 검수 대기 & 긴급 이슈 */}
          <div className="space-y-6">
            {/* 검수 대기 */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">검수 대기 중</h3>
              </div>
              <div className="divide-y divide-gray-200 max-h-48 overflow-y-auto">
                {todayReviews.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <CheckCircle className="mx-auto mb-2 text-gray-400" size={24} />
                    <p className="text-sm">검수 대기 중인 에피소드가 없습니다</p>
                  </div>
                ) : (
                  todayReviews.slice(0, 3).map((episode) => {
                    const { project, partner } = getEpisodeDetails(episode);
                    return (
                      <div key={episode.id} className="p-3 hover:bg-gray-50 transition-colors">
                        <h4 className="text-sm font-medium text-gray-900">{episode.title}</h4>
                        {project && <p className="text-xs text-gray-500 mt-1">{project.title}</p>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 긴급 이슈 */}
            {overdueEpisodes.length > 0 && (
              <div className="bg-white rounded-lg shadow border-l-4 border-l-orange-500">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="text-orange-500" size={20} />
                    <h3 className="text-lg font-semibold text-gray-900">긴급 이슈</h3>
                  </div>
                </div>
                <div className="divide-y divide-gray-200 max-h-48 overflow-y-auto">
                  {overdueEpisodes.slice(0, 3).map((episode) => {
                    const { project, partner } = getEpisodeDetails(episode);
                    const daysOverdue = Math.ceil((now.getTime() - new Date(episode.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={episode.id} className="p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">{episode.title}</h4>
                            {project && <p className="text-xs text-gray-500 mt-1">{project.title}</p>}
                          </div>
                          <span className="ml-2 text-xs font-semibold text-orange-600">
                            {daysOverdue}일 지남
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* 이번 주 업무 탭 */}
      {activeTab === 'week' && (
      <div className="space-y-6">

        {/* 주간 통계 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">이번 주 현황</h2>
            <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
              {thisWeekStart.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} - {thisWeekEnd.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">이번 주 마감</p>
              <p className="text-3xl font-bold text-gray-800">{thisWeekDeadlines.length}</p>
              <p className="text-xs text-gray-500 mt-1">에피소드</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">완료</p>
              <p className="text-3xl font-bold text-gray-800">{thisWeekCompleted.length}</p>
              <p className="text-xs text-gray-500 mt-1">에피소드</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">진행 중</p>
              <p className="text-3xl font-bold text-gray-800">{activeProjects.length}</p>
              <p className="text-xs text-gray-500 mt-1">프로젝트</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">완료율</p>
              <p className="text-3xl font-bold text-gray-800">
                {thisWeekDeadlines.length + thisWeekCompleted.length > 0
                  ? Math.round((thisWeekCompleted.length / (thisWeekDeadlines.length + thisWeekCompleted.length)) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">이번 주</p>
            </div>
          </div>
        </div>

        {/* 주간 상세 업무 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 이번 주 마감 예정 */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">이번 주 마감 예정</h3>
              <Calendar className="text-gray-400" size={20} />
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {thisWeekDeadlines.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Calendar className="mx-auto mb-2 text-gray-400" size={32} />
                  <p>이번 주 마감 예정인 에피소드가 없습니다</p>
                </div>
              ) : (
                thisWeekDeadlines.slice(0, 10).map((episode) => {
                  const { project, partner } = getEpisodeDetails(episode);
                  const dueDate = new Date(episode.dueDate!);
                  const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={episode.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{episode.title}</h4>
                          {project && (
                            <p className="text-xs text-gray-500 mt-1">프로젝트: {project.title}</p>
                          )}
                          {partner && (
                            <div className="flex items-center mt-2">
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-semibold mr-1.5">
                                {partner.name.charAt(0)}
                              </div>
                              <span className="text-xs text-gray-600">{partner.name}</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-3 text-right">
                          <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                            {daysUntil}일 남음
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {dueDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 오른쪽: 파트너 현황 + 체크리스트 */}
          <div className="space-y-6">

          {/* 파트너별 이번 주 작업 현황 */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">파트너별 주간 현황</h3>
              <Users className="text-gray-400" size={20} />
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {partnerWeeklyWorkload.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="mx-auto mb-2 text-gray-400" size={32} />
                  <p>이번 주 작업 중인 파트너가 없습니다</p>
                </div>
              ) : (
                partnerWeeklyWorkload.map(({ partner, total, completed, inProgress, waiting }) => (
                  <div key={partner.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
                          {partner.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{partner.name}</p>
                          <p className="text-xs text-gray-500">이번 주 {total}개 에피소드</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-600">
                          {total > 0 ? Math.round((completed / total) * 100) : 0}%
                        </p>
                        <p className="text-xs text-gray-500">완료율</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {completed > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          완료 {completed}
                        </span>
                      )}
                      {inProgress > 0 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                          진행 중 {inProgress}
                        </span>
                      )}
                      {waiting > 0 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                          대기 {waiting}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          </div>{/* end 오른쪽 column */}
        </div>
      </div>
      )}

      {/* 체크리스트 탭 */}
      {activeTab === 'checklist' && (
      <div className="space-y-3">

        {/* 상단 메타 */}
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-gray-400">
            {checklistItems.filter(i => !i.completed).length > 0
              ? `${checklistItems.filter(i => !i.completed).length}개 남음`
              : checklistItems.length > 0 ? '모두 완료!' : ''}
          </p>
          {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
            <button
              onClick={requestNotificationPermission}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-500 transition-colors"
            >
              <BellOff size={13} />
              알림 허용
            </button>
          )}
        </div>

        {/* 체크리스트 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">

          {/* 빈 상태 (항목도 없고 인라인도 닫혀있을 때) */}
          {checklistItems.length === 0 && !showAddForm && (
            <div className="py-16 text-center text-gray-400">
              <CheckCircle className="mx-auto mb-3 text-gray-200" size={44} />
              <p className="font-medium text-gray-500">오늘 할 일을 적어보세요</p>
              <p className="text-xs mt-1 text-gray-400">아래 + 버튼을 눌러 추가할 수 있어요</p>
            </div>
          )}

          {/* 일반 아이템 목록 */}
          <AnimatePresence initial={false}>
            {oneTimeItems.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0, y: -6 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="border-b border-gray-100 last:border-b-0"
              >
                <div className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group ${item.completed ? 'opacity-50' : ''}`}>
                  <button
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {item.completed && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {item.text}
                    </p>
                    {(item.linkedEpisodeId || item.linkedProjectId || item.linkedClientName || item.linkedPartnerId) && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {item.linkedEpisodeId && (
                          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[11px] border border-purple-100">
                            {item.linkedEpisodeNumber}회차 {item.linkedEpisodeTitle}
                          </span>
                        )}
                        {item.linkedProjectId && (
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[11px] border border-blue-100">
                            📁 {item.linkedProjectTitle}
                          </span>
                        )}
                        {item.linkedClientName && (
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[11px] border border-emerald-100">
                            🏢 {item.linkedClientName}
                          </span>
                        )}
                        {item.linkedPartnerId && (
                          <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-[11px] border border-orange-100">
                            👤 {item.linkedPartnerName}
                          </span>
                        )}
                      </div>
                    )}
                    {item.reminderTime && (
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Bell size={11} className={item.notified ? 'text-gray-300' : 'text-blue-400'} />
                        <span className="text-xs text-gray-400">
                          {new Date(item.reminderTime).toLocaleString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {item.notified && <span className="text-xs text-gray-300">· 완료</span>}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteChecklistItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 반복 중인 체크리스트 섹션 */}
          <>
            <div className="mx-5 border-t-2 border-dashed border-blue-100 my-1" />
            <div className="flex items-center gap-2 px-5 py-2.5">
              <Repeat2 size={13} className="text-blue-400" />
              <span className="text-xs font-semibold text-blue-400 tracking-wide">반복 중인 체크리스트</span>
            </div>
            {recurringItems.length === 0 && (
              <div className="px-5 py-3 text-xs text-gray-300 text-center pb-4">비어 있음</div>
            )}
            <AnimatePresence initial={false}>
              {recurringItems.map(item => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, height: 0, y: -6 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="border-b border-blue-50 last:border-b-0"
                    >
                      <div className={`flex items-start gap-4 px-5 py-4 hover:bg-blue-50/50 transition-colors group ${item.completed ? 'opacity-50' : ''}`}>
                        <button
                          onClick={() => toggleChecklistItem(item.id)}
                          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            item.completed ? 'bg-green-500 border-green-500' : 'border-blue-200 hover:border-blue-400'
                          }`}
                        >
                          {item.completed && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            {item.text}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {item.reminderTime && (
                              <>
                                <Bell size={11} className="text-blue-400" />
                                <span className="text-xs text-gray-400">
                                  {new Date(item.reminderTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </>
                            )}
                            <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100">
                              {item.repeatType === 'daily' && '매일'}
                              {item.repeatType === 'weekly' && '매주'}
                              {item.repeatType === 'days' && item.repeatDays && ['일','월','화','수','목','금','토'].filter((_, i) => item.repeatDays!.includes(i)).join('·')}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteChecklistItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
            </AnimatePresence>
          </>

          {/* 항목 추가 트리거 */}
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center gap-3 px-5 py-4 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors group/add border-t border-gray-100"
          >
            <div className="w-5 h-5 rounded-full border-2 border-dashed border-gray-200 group-hover/add:border-gray-400 flex items-center justify-center flex-shrink-0 transition-colors">
              <Plus size={11} />
            </div>
            <span className="text-sm">항목 추가</span>
          </button>
        </div>

        {/* 완료 항목 정리 */}
        {checklistItems.some(i => i.completed) && (
          <button
            onClick={async () => { await clearCompletedChecklists(); await refreshChecklists(); }}
            className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors py-2"
          >
            완료된 항목 모두 지우기
          </button>
        )}

        {/* 달력 블록 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-2">
          {/* 달력 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">
              {calYear}년 {calMonth + 1}월
            </h3>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => {
                  if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                  else setCalMonth(m => m - 1);
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => { setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()); }}
                className="px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors text-xs text-gray-400 hover:text-gray-700"
              >
                오늘
              </button>
              <button
                onClick={() => {
                  if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                  else setCalMonth(m => m + 1);
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-1">
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div key={d} className={`text-center text-[11px] font-medium pb-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          {(() => {
            const firstDay = new Date(calYear, calMonth, 1).getDay();
            const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const cells = [];
            for (let i = 0; i < firstDay; i++) {
              cells.push(<div key={`e-${i}`} />);
            }
            for (let day = 1; day <= daysInMonth; day++) {
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const items = getItemsForDate(dateStr);
              const hasItems = items.length > 0;
              const isToday = dateStr === todayStr;
              const dow = new Date(calYear, calMonth, day).getDay();
              cells.push(
                <div key={day} className="flex flex-col items-center gap-0.5 py-0.5">
                  <button
                    onClick={() => hasItems && setSelectedCalendarDay(dateStr)}
                    disabled={!hasItems}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      isToday
                        ? 'bg-blue-500 text-white font-bold shadow-sm'
                        : hasItems
                          ? `hover:bg-blue-50 cursor-pointer ${dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-gray-800'}`
                          : `cursor-default ${dow === 0 ? 'text-red-300' : dow === 6 ? 'text-blue-300' : 'text-gray-400'}`
                    }`}
                  >
                    {day}
                  </button>
                  {hasItems && (
                    <div className={`w-1 h-1 rounded-full ${isToday ? 'bg-blue-300' : 'bg-blue-400'}`} />
                  )}
                </div>
              );
            }
            return <div className="grid grid-cols-7">{cells}</div>;
          })()}
        </div>
      </div>
      )}

      </motion.div>
      </AnimatePresence>
      </div>

      {/* 항목 추가 모달 */}
      <AnimatePresence>
        {showAddForm && (
          <>
            <motion.div
              key="add-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]"
              onClick={resetInlineForm}
            />
            <motion.div
              key="add-modal"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden"
              style={{ boxShadow: '0 24px 64px -8px rgba(0,0,0,0.18), 0 4px 16px -4px rgba(0,0,0,0.08)' }}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <h3 className="text-base font-bold text-gray-900">할 일 추가</h3>
                <button onClick={resetInlineForm} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                  <X size={16} />
                </button>
              </div>

              {/* 텍스트 입력 */}
              <div className="px-5 pb-4">
                <input
                  ref={inlineInputRef}
                  autoFocus
                  type="text"
                  placeholder="무엇을 해야 하나요?"
                  value={newItemText}
                  onChange={e => setNewItemText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !activeLinkPicker) addChecklistItem();
                    if (e.key === 'Escape') resetInlineForm();
                  }}
                  className="w-full text-base text-gray-900 placeholder-gray-300 focus:outline-none bg-transparent border-b-2 border-gray-100 focus:border-blue-400 pb-2 transition-colors"
                />
              </div>

              {/* 알림 설정 */}
              <div className="px-5 pb-3">
                <DateTimePicker
                  value={newItemReminder}
                  onChange={setNewItemReminder}
                  repeat={repeatType}
                  repeatDays={repeatDays}
                  onRepeatChange={setRepeatType}
                  onRepeatDaysChange={setRepeatDays}
                >
                  <div className={`inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${newItemReminder ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
                    <Bell size={14} />
                    {newItemReminder
                      ? new Date(newItemReminder).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '알림 설정'}
                    {newItemReminder && (
                      <span
                        onClick={e => { e.stopPropagation(); setNewItemReminder(''); }}
                        className="ml-1 text-blue-400 hover:text-blue-600"
                      >
                        <X size={12} />
                      </span>
                    )}
                  </div>
                </DateTimePicker>
              </div>

              {/* 구분선 */}
              <div className="border-t border-gray-100 mx-5" />

              {/* 연결 영역 */}
              <div className="px-5 py-4 space-y-3">
                {/* 선택된 링크 칩 */}
                {(formLink.episodeId || formLink.projectId || formLink.clientName || formLink.partnerId) && (
                  <div className="flex flex-wrap gap-2">
                    {formLink.episodeId && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium border border-purple-200">
                        <Link2 size={11} /> {formLink.episodeNumber}회차 {formLink.episodeTitle}
                        <button onClick={() => clearLink('episode')} className="ml-0.5 hover:text-purple-900"><X size={11} /></button>
                      </span>
                    )}
                    {formLink.projectId && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                        📁 {formLink.projectTitle}
                        {!formLink.episodeId && <button onClick={() => clearLink('project')} className="ml-0.5 hover:text-blue-900"><X size={11} /></button>}
                      </span>
                    )}
                    {formLink.clientName && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200">
                        🏢 {formLink.clientName}
                        {!formLink.projectId && <button onClick={() => clearLink('client')} className="ml-0.5 hover:text-emerald-900"><X size={11} /></button>}
                      </span>
                    )}
                    {formLink.partnerId && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-xs font-medium border border-orange-200">
                        👤 {formLink.partnerName}
                        {!formLink.projectId && <button onClick={() => clearLink('partner')} className="ml-0.5 hover:text-orange-900"><X size={11} /></button>}
                      </span>
                    )}
                  </div>
                )}

                {/* 링크 버튼들 */}
                <div className="flex items-center gap-2 flex-wrap">
                  {!formLink.episodeId && (
                    <button onClick={() => { setActiveLinkPicker('episode'); setLinkSearch(''); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-all">
                      <Plus size={11} /> 회차 연결
                    </button>
                  )}
                  {!formLink.projectId && !formLink.episodeId && (
                    <button onClick={() => { setActiveLinkPicker('project'); setLinkSearch(''); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all">
                      <Plus size={11} /> 프로젝트 연결
                    </button>
                  )}
                  {!formLink.clientName && !formLink.projectId && (
                    <button onClick={() => { setActiveLinkPicker('client'); setLinkSearch(''); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all">
                      <Plus size={11} /> 클라이언트 연결
                    </button>
                  )}
                  {!formLink.partnerId && !formLink.projectId && (
                    <button onClick={() => { setActiveLinkPicker('partner'); setLinkSearch(''); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-all">
                      <Plus size={11} /> 파트너 연결
                    </button>
                  )}
                </div>
              </div>

              {/* 하단 버튼 */}
              <div className="flex gap-3 px-5 pb-5">
                <button onClick={resetInlineForm}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                  취소
                </button>
                <button onClick={addChecklistItem} disabled={!newItemText.trim()}
                  className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">
                  추가
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 링크 선택 모달 */}
      <AnimatePresence>
        {activeLinkPicker && (
          <>
            {/* 백드롭 */}
            <motion.div
              key="link-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/20 z-60"
              style={{ zIndex: 60 }}
              onClick={() => { setActiveLinkPicker(null); setLinkSearch(''); }}
            />
            {/* 모달 */}
            <motion.div
              key="link-modal"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 bg-white rounded-2xl shadow-2xl overflow-hidden"
              style={{ zIndex: 61, boxShadow: '0 24px 64px -8px rgba(0,0,0,0.18), 0 4px 16px -4px rgba(0,0,0,0.08)' }}
            >
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                  {activeLinkPicker === 'episode' && <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center"><span className="text-[10px] font-bold text-purple-600">EP</span></div>}
                  {activeLinkPicker === 'project' && <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center"><span className="text-[10px] font-bold text-blue-600">P</span></div>}
                  {activeLinkPicker === 'client' && <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center"><span className="text-[10px] font-bold text-emerald-600">C</span></div>}
                  {activeLinkPicker === 'partner' && <div className="w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center"><span className="text-[10px] font-bold text-orange-600">P</span></div>}
                  <h3 className="text-sm font-bold text-gray-900">
                    {activeLinkPicker === 'episode' && '회차 연결'}
                    {activeLinkPicker === 'project' && '프로젝트 연결'}
                    {activeLinkPicker === 'client' && '클라이언트 연결'}
                    {activeLinkPicker === 'partner' && '파트너 연결'}
                  </h3>
                </div>
                <button
                  onClick={() => { setActiveLinkPicker(null); setLinkSearch(''); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 검색 */}
              <div className="px-4 pb-3">
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                  <Search size={14} className="text-gray-400 flex-shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    placeholder={
                      activeLinkPicker === 'episode' ? '회차 제목 또는 번호로 검색...' :
                      activeLinkPicker === 'project' ? '프로젝트명으로 검색...' :
                      activeLinkPicker === 'client' ? '클라이언트명으로 검색...' :
                      '파트너명으로 검색...'
                    }
                    value={linkSearch}
                    onChange={e => setLinkSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Escape' && (setActiveLinkPicker(null), setLinkSearch(''))}
                    className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"
                  />
                  {linkSearch && (
                    <button onClick={() => setLinkSearch('')} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
                  )}
                </div>
              </div>

              {/* 목록 */}
              <div className="max-h-72 overflow-y-auto border-t border-gray-50 pb-2">
                {activeLinkPicker === 'episode' && (() => {
                  const filtered = allEpisodes.filter(ep => !linkSearch || ep.title.includes(linkSearch) || String(ep.episodeNumber).includes(linkSearch)).slice(0, 12);
                  return filtered.length > 0 ? filtered.map(ep => {
                    const proj = projects.find(p => p.id === (ep as any).projectId);
                    return (
                      <button key={ep.id} onClick={() => selectEpisode(ep as any)}
                        className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors flex items-center gap-3">
                        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-purple-600">{ep.episodeNumber}화</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{ep.title}</p>
                          {proj && <p className="text-xs text-gray-400 mt-0.5 truncate">{proj.title}</p>}
                        </div>
                      </button>
                    );
                  }) : (
                    <div className="py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <Search size={18} className="text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">{linkSearch ? '검색 결과가 없습니다' : '등록된 회차가 없습니다'}</p>
                      <p className="text-xs text-gray-400 mt-1">{linkSearch ? '다른 검색어를 입력해보세요' : '프로젝트에서 회차를 먼저 추가해주세요'}</p>
                    </div>
                  );
                })()}

                {activeLinkPicker === 'project' && (() => {
                  const filtered = projects.filter(p => !linkSearch || p.title.toLowerCase().includes(linkSearch.toLowerCase())).slice(0, 12);
                  return filtered.length > 0 ? filtered.map(p => (
                    <button key={p.id} onClick={() => selectProject(p)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">{p.title.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{p.client}</p>
                      </div>
                    </button>
                  )) : (
                    <div className="py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <Search size={18} className="text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">{linkSearch ? '검색 결과가 없습니다' : '등록된 프로젝트가 없습니다'}</p>
                    </div>
                  );
                })()}

                {activeLinkPicker === 'client' && (() => {
                  const filtered = clients.filter(c => !linkSearch || c.name.includes(linkSearch)).slice(0, 12);
                  return filtered.length > 0 ? filtered.map(c => (
                    <button key={c.id} onClick={() => selectClient(c.name)}
                      className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors flex items-center gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-emerald-600">{c.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                        {c.company && <p className="text-xs text-gray-400 mt-0.5 truncate">{c.company}</p>}
                      </div>
                    </button>
                  )) : (
                    <div className="py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <Search size={18} className="text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">{linkSearch ? '검색 결과가 없습니다' : '등록된 클라이언트가 없습니다'}</p>
                    </div>
                  );
                })()}

                {activeLinkPicker === 'partner' && (() => {
                  const filtered = partners.filter(p => !linkSearch || p.name.includes(linkSearch)).slice(0, 12);
                  return filtered.length > 0 ? filtered.map(p => (
                    <button key={p.id} onClick={() => selectPartner(p)}
                      className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors flex items-center gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-orange-600">{p.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{p.email}</p>
                      </div>
                    </button>
                  )) : (
                    <div className="py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <Search size={18} className="text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">{linkSearch ? '검색 결과가 없습니다' : '등록된 파트너가 없습니다'}</p>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 달력 일정 모달 */}
      <AnimatePresence>
        {selectedCalendarDay && (
          <>
            <motion.div
              key="cal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
              style={{ zIndex: 40 }}
              onClick={() => setSelectedCalendarDay(null)}
            />
            <motion.div
              key="cal-modal"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 bg-white rounded-2xl shadow-2xl overflow-hidden"
              style={{ zIndex: 50, boxShadow: '0 24px 64px -8px rgba(0,0,0,0.18), 0 4px 16px -4px rgba(0,0,0,0.08)' }}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {new Date(selectedCalendarDay + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {getItemsForDate(selectedCalendarDay).length}개의 일정
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCalendarDay(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 아이템 목록 */}
              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto pb-4">
                {getItemsForDate(selectedCalendarDay).map(item => (
                  <div key={item.id} className={`px-5 py-3.5 ${item.repeatType && item.repeatType !== 'none' ? 'bg-blue-50/60' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`}>
                        {item.completed && (
                          <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {item.text}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {item.reminderTime && (
                            <>
                              <Bell size={10} className="text-blue-400" />
                              <span className="text-xs text-gray-400">
                                {new Date(item.reminderTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </>
                          )}
                          {item.repeatType && item.repeatType !== 'none' && (
                            <span className="text-[10px] text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded-full">
                              {item.repeatType === 'daily' && '매일'}
                              {item.repeatType === 'weekly' && '매주'}
                              {item.repeatType === 'days' && item.repeatDays && ['일','월','화','수','목','금','토'].filter((_, i) => item.repeatDays!.includes(i)).join('·')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 프로젝트 마법사 모달 */}
      <ProjectWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={handleProjectWizardComplete}
        clients={clients}
        partners={partners}
      />
    </div>
  );
}
