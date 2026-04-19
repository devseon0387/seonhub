import { AppShell, PageHeader, WfBtn, StatusDot } from '../shell';
import { Search, LayoutGrid, List, RefreshCw, Pencil, ExternalLink, Palette, Frame as FrameIcon, FolderOpen } from 'lucide-react';

export default function DevWorkspaceWireframe() {
  return (
    <AppShell active="Dev Workspace">
      <PageHeader
        title="Dev Workspace"
        subtitle={<span className="font-mono text-[11px] text-ink-400">~/Desktop/Dev</span>}
        right={
          <>
            <div className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-white border border-ink-200 text-[12px] text-ink-400 w-52">
              <Search size={13} />검색 (⌘K)
            </div>
            <div className="inline-flex gap-0.5 bg-ink-100 border border-ink-200 rounded-lg p-0.5">
              <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-white text-[12px] font-semibold text-brand-600 shadow-sm">
                <LayoutGrid size={12} />카드
              </span>
              <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[12px] font-medium text-ink-500">
                <List size={12} />표
              </span>
            </div>
            <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white border border-ink-200 text-ink-600">
              <RefreshCw size={13} />
            </div>
          </>
        }
      />

      {/* 통계 */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        {[
          { k: 'Total', v: '24', h: '~/Desktop/Dev', tone: 'ink' },
          { k: 'Running', v: '4', h: ':3100 :3000 :4200 :5050', tone: 'ok' },
          { k: 'This Week', v: '8', h: 'updated', tone: 'brand' },
          { k: 'Stack', v: 'Next.js 14', h: '3 Python · 1 C++', tone: 'ink' },
          { k: 'Filter', v: '24', h: 'of 24', tone: 'warn' },
        ].map((m) => (
          <div key={m.k} className="bg-white border border-ink-200 rounded-xl p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">{m.k}</div>
            <div className={`text-[20px] font-bold tracking-tight mt-1 ${
              m.tone === 'brand' ? 'text-brand-600' :
              m.tone === 'ok' ? 'text-emerald-600' :
              m.tone === 'warn' ? 'text-amber-700' :
              'text-ink-900'
            }`}>
              {m.v}
            </div>
            <div className="text-[11px] text-ink-500 mt-0.5 truncate">{m.h}</div>
          </div>
        ))}
      </div>

      {/* 필터 칩 */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {[
          { l: '전체 · 24', active: true },
          { l: '실행 중 · 4', dot: true },
          { l: '7일 이내 · 8' },
          { l: 'Next.js · 14' },
          { l: 'Python · 3' },
          { l: 'C++ · 1' },
        ].map((c, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium border ${
              c.active
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-ink-500 border-ink-200'
            }`}
          >
            {c.dot && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            {c.l}
          </span>
        ))}
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { name: 'SEON Hub', path: '~/Desktop/Dev/hype5-erp', running: true, port: 3100, tech: ['Next.js 16', 'TS', 'Supabase'], br: 'main', grad: 'linear-gradient(135deg,#1e3a8a,#3b82f6)' },
          { name: '비모 ERP', path: '~/Desktop/Dev/video-moment', running: true, port: 3000, tech: ['Next.js 16', 'TS'], br: 'main', grad: 'linear-gradient(135deg,#7c3aed,#a78bfa)' },
          { name: 'Plick', path: '~/Desktop/Dev/Plick', running: false, tech: ['Next.js 16', 'Tailwind'], br: 'dev', grad: 'linear-gradient(135deg,#166534,#22c55e)' },
          { name: 'music-assist', path: '~/Desktop/Dev/music-assist', running: false, tech: ['Next.js 16', 'Dexie'], br: 'main', grad: 'linear-gradient(135deg,#9f1239,#e11d48)' },
          { name: 'Krit', path: '~/Desktop/Dev/krit', running: false, tech: ['Tauri', 'C++'], br: 'main', grad: 'linear-gradient(135deg,#0f172a,#64748b)' },
          { name: 'maple-bot', path: '~/Desktop/Dev/maple-bot', running: true, port: 5050, tech: ['Python', 'Flask'], br: 'main', grad: 'linear-gradient(135deg,#a16207,#eab308)' },
        ].map((p) => (
          <div key={p.name} className="bg-white border border-ink-200 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-[10px] shrink-0 flex items-center justify-center text-white text-[13px] font-bold" style={{ background: p.grad }}>
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <strong className="text-[13px] font-bold text-ink-900 truncate">{p.name}</strong>
                  {p.running ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.05em] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                      <StatusDot tone="running" />
                      running
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.05em] px-1.5 py-0.5 rounded bg-ink-100 text-ink-500">
                      idle
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-ink-400 font-mono mt-0.5 truncate">{p.path}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {p.tech.map((t) => (
                <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 bg-ink-50 border border-ink-200 rounded text-ink-600">
                  {t}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-ink-100 text-[11px] text-ink-400">
              <div className="flex items-center gap-2">
                {p.port && <span className="text-brand-600 font-semibold font-mono">:{p.port}</span>}
                {p.port && <span>·</span>}
                <span className="font-mono">{p.br}</span>
              </div>
              <div className="flex gap-0.5">
                {[Pencil, ExternalLink, Palette, FrameIcon, FolderOpen].map((I, i) => (
                  <div key={i} className="w-6 h-6 rounded flex items-center justify-center text-ink-400">
                    <I size={12} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
