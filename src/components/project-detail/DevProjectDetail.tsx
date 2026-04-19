'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit, GitBranch, Package, Globe, Users, TrendingUp, CircleDot, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import type { Project, Sprint } from '@/types';
import { getSprintsByProjectId, insertSprint, deleteSprint, deleteProject } from '@/lib/supabase/db';

interface Props {
  project: Project;
}

const STATUS_LABELS: Record<Sprint['status'], string> = {
  planning: '계획',
  in_progress: '진행중',
  completed: '완료',
};

const STATUS_COLORS: Record<Sprint['status'], string> = {
  planning: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
};

function formatDateRange(start?: string, end?: string) {
  if (!start && !end) return '-';
  const s = start ? start.slice(0, 10) : '';
  const e = end ? end.slice(0, 10) : '';
  if (s && e) return `${s} ~ ${e}`;
  return s || e || '-';
}

export default function DevProjectDetail({ project }: Props) {
  const router = useRouter();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDelete = async () => {
    if (!window.confirm(`"${project.title}" 프로젝트를 삭제하시겠습니까?\n스프린트도 함께 삭제됩니다.`)) return;
    const currentSprints = await getSprintsByProjectId(project.id);
    for (const s of currentSprints) await deleteSprint(s.id);
    const ok = await deleteProject(project.id);
    if (ok) router.push('/projects');
    else window.alert('프로젝트 삭제에 실패했습니다.');
  };

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await getSprintsByProjectId(project.id);
    setSprints(rows);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const devMeta = project.meta?.dev;

  const totalIssues = sprints.reduce((sum, s) => sum + (s.issueCount ?? 0), 0);
  const completedIssues = sprints.reduce((sum, s) => sum + (s.completedIssueCount ?? 0), 0);
  const openIssues = totalIssues - completedIssues;
  const activeSprint = sprints.find(s => s.status === 'in_progress');
  const progressPct = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

  const handleAddSprint = async () => {
    const title = window.prompt('스프린트 이름을 입력하세요');
    if (!title) return;
    const nextNumber = sprints.length > 0 ? Math.max(...sprints.map(s => s.sprintNumber ?? 0)) + 1 : 1;
    const now = new Date().toISOString();
    const newSprint: Sprint = {
      id: `sprint_${Date.now()}`,
      projectId: project.id,
      sprintNumber: nextNumber,
      title,
      status: 'planning',
      startDate: now.slice(0, 10),
      issueCount: 0,
      completedIssueCount: 0,
      assigneeIds: [],
      budget: { totalAmount: 0, partnerPayment: 0, managementFee: 0 },
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await insertSprint(newSprint);
    if (inserted) {
      await load();
    } else {
      window.alert('스프린트 생성에 실패했습니다.');
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
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
              <span>💻</span> 개발
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
        <MetaCard icon={<GitBranch size={16} />} label="리포지토리" value={devMeta?.repoUrl ? (
          <a href={devMeta.repoUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate block">
            {devMeta.repoUrl.replace(/^https?:\/\//, '')}
          </a>
        ) : '-'} />
        <MetaCard icon={<Package size={16} />} label="스택" value={devMeta?.stack?.length ? devMeta.stack.join(', ') : '-'} />
        <MetaCard icon={<Globe size={16} />} label="배포 URL" value={devMeta?.deployUrl ? (
          <a href={devMeta.deployUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate block">
            {devMeta.deployUrl.replace(/^https?:\/\//, '')}
          </a>
        ) : '-'} />
        <MetaCard icon={<Users size={16} />} label="담당 개발" value={devMeta?.developers?.length ? devMeta.developers.join(', ') : '-'} />
        <MetaCard icon={<TrendingUp size={16} />} label="진행률" value={`${progressPct}%`} />
        <MetaCard icon={<CircleDot size={16} />} label="이번 스프린트" value={activeSprint ? `S-${activeSprint.sprintNumber} ${activeSprint.title}` : '-'} />
        <MetaCard icon={<CircleDot size={16} />} label="총 이슈" value={String(totalIssues)} />
        <MetaCard icon={<CheckCircle2 size={16} />} label="오픈 이슈" value={String(openIssues)} />
      </div>

      {/* 스프린트 섹션 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: '#1e3a8a' }}>스프린트</h2>
          <button onClick={handleAddSprint} className="text-sm font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
            <Plus size={16} /> 스프린트 추가
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-800" />
          </div>
        ) : sprints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-500 mb-4">아직 스프린트가 없습니다</p>
            <button
              onClick={handleAddSprint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: '#2563eb' }}
            >
              <Plus size={16} /> 첫 스프린트 만들기
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sprints.map(s => (
              <li key={s.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">
                    S-{s.sprintNumber} · {s.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatDateRange(s.startDate, s.endDate)} · 이슈 {s.issueCount}개 ({s.completedIssueCount} 완료)
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s.status]}`}>
                  {STATUS_LABELS[s.status]}
                </span>
              </li>
            ))}
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
