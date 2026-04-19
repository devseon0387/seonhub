import { type ReactNode } from 'react';
import {
  LayoutDashboard, ClipboardCheck, FolderOpen, CreditCard, Briefcase,
  Code2, Palette, Frame, Megaphone, Settings, Trash2,
} from 'lucide-react';

/**
 * 실제 SEON Hub 레이아웃(아이콘 레일 + 섹션 패널 + 본문)의 시각 목업.
 * 토큰/primitive 사용. 실제 앱과 톤 일치.
 */

type NavItem =
  | { kind: 'link'; label: string; icon: React.ElementType; active?: boolean }
  | { kind: 'divider' };

const MAIN_ITEMS: NavItem[] = [
  { kind: 'link', label: '매니지먼트', icon: ClipboardCheck },
  { kind: 'link', label: '프로젝트', icon: FolderOpen },
  { kind: 'divider' },
  { kind: 'link', label: '지출 관리', icon: CreditCard },
  { kind: 'divider' },
  { kind: 'link', label: '클라이언트 관리', icon: Briefcase },
  { kind: 'divider' },
  { kind: 'link', label: 'Dev Workspace', icon: Code2 },
  { kind: 'link', label: '디자인 시스템', icon: Palette },
  { kind: 'link', label: '와이어프레임', icon: Frame },
  { kind: 'link', label: '업데이트', icon: Megaphone },
];

export function AppShell({
  active,
  children,
}: {
  active: string; // 현재 활성 메뉴 라벨
  children: ReactNode;
}) {
  const items = MAIN_ITEMS.map((i) =>
    i.kind === 'link' ? { ...i, active: i.label === active } : i,
  );

  return (
    <div className="flex bg-white border border-ink-200 rounded-xl overflow-hidden shadow-sm min-h-[640px]">
      {/* 아이콘 레일 */}
      <div className="w-[52px] shrink-0 bg-white border-r border-ink-200 flex flex-col items-center py-3 gap-1">
        <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-[13px] tracking-tight">
          SH
        </div>
        <div className="w-6 h-px bg-ink-200 my-2" />
        <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
          <LayoutDashboard size={16} />
        </div>
        <div className="flex-1" />
        <div className="w-9 h-9 rounded-lg text-ink-500 flex items-center justify-center hover:bg-ink-100">
          <Settings size={16} />
        </div>
        <div className="w-9 h-9 rounded-lg text-ink-500 flex items-center justify-center hover:bg-ink-100">
          <Trash2 size={16} />
        </div>
      </div>

      {/* 섹션 패널 */}
      <div className="w-[180px] shrink-0 bg-white border-r border-ink-200 py-3 px-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400 px-2 mb-2">
          메인
        </div>
        <nav className="space-y-0.5">
          {items.map((i, idx) => {
            if (i.kind === 'divider') {
              return <div key={idx} className="h-px bg-ink-100 my-1 mx-2" />;
            }
            const Icon = i.icon;
            return (
              <div
                key={idx}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium ${
                  i.active
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-ink-600 hover:bg-ink-50'
                }`}
              >
                <Icon size={14} className={i.active ? 'text-brand-600' : 'text-ink-400'} />
                <span>{i.label}</span>
              </div>
            );
          })}
        </nav>
      </div>

      {/* 본문 */}
      <div className="flex-1 min-w-0 p-6" style={{ background: '#f5f4f2' }}>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="text-[22px] font-bold text-ink-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-[12px] text-ink-500 mt-1">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2 flex-wrap">{right}</div>}
    </div>
  );
}

export function WfBtn({
  children,
  primary = false,
  icon: Icon,
}: {
  children: ReactNode;
  primary?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium ${
        primary
          ? 'bg-brand-600 text-white'
          : 'bg-white text-ink-700 border border-ink-200'
      }`}
    >
      {Icon && <Icon size={13} />}
      {children}
    </span>
  );
}

export function StatusDot({ tone }: { tone: 'running' | 'idle' | 'warn' | 'bad' }) {
  const cls =
    tone === 'running'
      ? 'bg-emerald-500 animate-pulse'
      : tone === 'warn'
        ? 'bg-amber-500'
        : tone === 'bad'
          ? 'bg-red-500'
          : 'bg-ink-300';
  return <span className={`w-1.5 h-1.5 rounded-full ${cls}`} />;
}
