'use client';

import { useState } from 'react';
import {
  CheckCircle2, Circle, CircleDot, PauseCircle, Check, XCircle,
  AlertTriangle, HelpCircle, Calendar, Target, ArrowRight, ChevronDown,
  List as ListIcon, GitBranch,
} from 'lucide-react';
import type {
  Roadmap, Phase, Item, PhaseStatus, ItemStatus, Risk,
} from '@/roadmap/types';
import RoadmapFlowView from './RoadmapFlowView';

type PhaseTone = {
  border: string;
  badge: string;
  dot: string;
  label: string;
};

const PHASE_TONE: Record<PhaseStatus, PhaseTone> = {
  'done':        { border: 'border-l-emerald-500', badge: 'bg-emerald-50 text-emerald-700',  dot: 'text-emerald-600', label: '완료' },
  'in-progress': { border: 'border-l-brand-600',   badge: 'bg-brand-50 text-brand-600',       dot: 'text-brand-600',   label: '진행 중' },
  'planned':     { border: 'border-l-ink-300',     badge: 'bg-ink-100 text-ink-600',          dot: 'text-ink-400',     label: '예정' },
  'deferred':    { border: 'border-l-amber-500',   badge: 'bg-amber-50 text-amber-700',       dot: 'text-amber-600',   label: '보류' },
};

function PhaseStatusIcon({ status }: { status: PhaseStatus }) {
  const cls = PHASE_TONE[status].dot;
  if (status === 'done') return <CheckCircle2 size={16} className={cls} />;
  if (status === 'in-progress') return <CircleDot size={16} className={cls} />;
  if (status === 'deferred') return <PauseCircle size={16} className={cls} />;
  return <Circle size={16} className={cls} />;
}

function ItemStatusIcon({ status }: { status: ItemStatus }) {
  if (status === 'done') return <Check size={12} className="text-emerald-600" strokeWidth={3} />;
  if (status === 'blocked') return <XCircle size={12} className="text-red-500" />;
  if (status === 'skipped') return <XCircle size={12} className="text-ink-300" />;
  return <Circle size={12} className="text-ink-300" />;
}

function phaseProgress(phase: Phase): { done: number; total: number; pct: number } {
  const total = phase.items.length;
  const done = phase.items.filter((i) => i.status === 'done').length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

function overallProgress(phases: Phase[]): { done: number; total: number; pct: number } {
  let done = 0;
  let total = 0;
  for (const p of phases) {
    done += p.items.filter((i) => i.status === 'done').length;
    total += p.items.length;
  }
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

function PhaseCard({
  phase,
  isCurrent,
  defaultOpen,
}: {
  phase: Phase;
  isCurrent: boolean;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const tone = PHASE_TONE[phase.status];
  const prog = phaseProgress(phase);
  const firstTodoIdx = phase.items.findIndex((i) => i.status === 'todo');

  return (
    <div className={`bg-white border border-ink-200 border-l-4 rounded-xl overflow-hidden ${tone.border}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-ink-50 transition-colors"
      >
        <PhaseStatusIcon status={phase.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[14px] font-bold text-ink-900">{phase.title}</h3>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${tone.badge}`}>
              {tone.label}
            </span>
            {isCurrent && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-brand-600 text-white">
                현재
              </span>
            )}
          </div>
          <p className="text-[12px] text-ink-600 mt-1">{phase.summary}</p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-ink-500">
            {phase.start && (
              <span className="inline-flex items-center gap-1">
                <Calendar size={11} />
                {phase.start}{phase.end ? ` → ${phase.end}` : ''}
              </span>
            )}
            {phase.target && !phase.end && (
              <span className="inline-flex items-center gap-1">
                <Target size={11} />
                target {phase.target}
              </span>
            )}
            {prog.total > 0 && (
              <span className="tabular-nums">
                {prog.done}/{prog.total} · {prog.pct}%
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          size={14}
          className={`text-ink-400 shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-ink-100 px-4 py-3 space-y-3 bg-ink-50/40">
          <div>
            <div className="text-kicker text-ink-400">완료 기준</div>
            <div className="text-[12px] text-ink-700 mt-0.5">{phase.goal}</div>
          </div>

          {prog.total > 0 && (
            <div>
              <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    phase.status === 'done'
                      ? 'bg-emerald-500'
                      : phase.status === 'in-progress'
                        ? 'bg-brand-600'
                        : 'bg-ink-300'
                  }`}
                  style={{ width: `${prog.pct}%` }}
                />
              </div>
            </div>
          )}

          <ul className="space-y-1">
            {phase.items.map((item, i) => (
              <ItemRow
                key={i}
                item={item}
                next={isCurrent && i === firstTodoIdx}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, next }: { item: Item; next: boolean }) {
  const strike = item.status === 'done' || item.status === 'skipped';
  return (
    <li
      className={`flex items-start gap-2 py-1.5 px-2 rounded-md ${
        next ? 'bg-brand-50 border border-brand-200' : ''
      }`}
    >
      <span className="inline-flex items-center justify-center w-4 h-4 mt-0.5 shrink-0">
        <ItemStatusIcon status={item.status} />
      </span>
      <div className="flex-1 min-w-0">
        <div
          className={`text-[12px] ${
            strike ? 'line-through text-ink-400' : item.status === 'blocked' ? 'text-red-700' : 'text-ink-900'
          }`}
        >
          {item.title}
        </div>
        {item.note && (
          <div className="text-[10px] text-ink-500 mt-0.5">{item.note}</div>
        )}
      </div>
      {next && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 shrink-0 ml-2">
          다음 <ArrowRight size={10} />
        </span>
      )}
    </li>
  );
}

function RiskCard({ risk }: { risk: Risk }) {
  const sev = risk.severity ?? 'low';
  const tone =
    sev === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
    sev === 'med' ? 'bg-amber-50 text-amber-700 border-amber-200' :
    'bg-ink-50 text-ink-700 border-ink-200';
  return (
    <div className={`border rounded-lg p-3 ${tone}`}>
      <div className="flex items-center gap-1.5">
        <AlertTriangle size={12} />
        <div className="text-[12px] font-bold">{risk.title}</div>
        <span className="text-[9px] font-semibold uppercase tracking-wider ml-auto opacity-60">{sev}</span>
      </div>
      <div className="text-[11px] mt-1 opacity-80">{risk.mitigation}</div>
    </div>
  );
}

export default function RoadmapView({
  roadmap,
  showHeader = true,
}: {
  roadmap: Roadmap;
  showHeader?: boolean;
}) {
  const [mode, setMode] = useState<'list' | 'flow'>('flow');
  const overall = overallProgress(roadmap.phases);
  const current = roadmap.phases.find((p) => p.id === roadmap.currentPhaseId);
  const phaseDoneCount = roadmap.phases.filter((p) => p.status === 'done').length;
  const phaseTotal = roadmap.phases.length;

  return (
    <div className="space-y-6 pb-12">
      {showHeader && (
        <header>
          <div className="text-kicker mb-2">Roadmap</div>
          <h1 className="text-page">{roadmap.project} 로드맵</h1>
          <p className="text-body text-ink-500 mt-2 whitespace-pre-line">{roadmap.vision.trim()}</p>
          <div className="text-meta mt-2">업데이트 {roadmap.updated} · 스키마 v{roadmap.version}</div>
        </header>
      )}

      {/* 뷰 토글 */}
      <div className="flex items-center justify-between">
        <div className="inline-flex gap-0.5 bg-ink-100 border border-ink-200 rounded-lg p-0.5">
          <button
            onClick={() => setMode('flow')}
            className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[12px] font-medium transition-colors ${
              mode === 'flow' ? 'bg-white text-brand-600 shadow-sm font-semibold' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            <GitBranch size={12} /> 플로우
          </button>
          <button
            onClick={() => setMode('list')}
            className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[12px] font-medium transition-colors ${
              mode === 'list' ? 'bg-white text-brand-600 shadow-sm font-semibold' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            <ListIcon size={12} /> 리스트
          </button>
        </div>
      </div>

      {mode === 'flow' && <RoadmapFlowView roadmap={roadmap} />}

      {mode === 'list' && (
        <>
      {/* 요약 스트립 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-ink-200 rounded-xl p-4">
          <div className="text-kicker">현재 페이즈</div>
          <div className="text-[16px] font-bold text-ink-900 mt-1">{current?.title ?? '—'}</div>
          <div className="text-[11px] text-ink-500 mt-0.5">
            {current?.target ? `target ${current.target}` : current?.start ? `시작 ${current.start}` : ''}
          </div>
        </div>
        <div className="bg-white border border-ink-200 rounded-xl p-4">
          <div className="text-kicker">페이즈 진행</div>
          <div className="text-[16px] font-bold text-ink-900 mt-1 tabular-nums">
            {phaseDoneCount} / {phaseTotal}
          </div>
          <div className="text-[11px] text-ink-500 mt-0.5">완료된 페이즈 / 전체</div>
        </div>
        <div className="bg-white border border-ink-200 rounded-xl p-4">
          <div className="text-kicker">전체 작업 진행률</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[16px] font-bold text-ink-900 tabular-nums">{overall.pct}%</span>
            <span className="text-[11px] text-ink-500 tabular-nums">{overall.done} / {overall.total}</span>
          </div>
          <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-brand-600 rounded-full" style={{ width: `${overall.pct}%` }} />
          </div>
        </div>
      </div>

      {/* 페이즈 타임라인 */}
      <section className="space-y-3">
        <h2 className="text-section">페이즈</h2>
        <div className="space-y-3">
          {roadmap.phases.map((p) => (
            <PhaseCard
              key={p.id}
              phase={p}
              isCurrent={p.id === roadmap.currentPhaseId}
              defaultOpen={p.status === 'in-progress'}
            />
          ))}
        </div>
      </section>

      {/* 의사결정 로그 */}
      {roadmap.decisions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-section">의사결정 로그</h2>
          <div className="bg-white border border-ink-200 rounded-xl divide-y divide-ink-100">
            {roadmap.decisions.map((d, i) => (
              <div key={i} className="p-4">
                <div className="flex items-center gap-2 text-[11px] text-ink-500 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
                  {d.date}
                </div>
                <div className="text-[13px] font-semibold text-ink-900 mt-1">{d.title}</div>
                <div className="text-[12px] text-ink-700 mt-1.5">
                  <span className="text-ink-500 font-semibold">Why.</span> {d.why}
                </div>
                {d.alt && (
                  <div className="text-[12px] text-ink-500 mt-1">
                    <span className="text-ink-400 font-semibold">Alt.</span> {d.alt}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 오픈 질문 */}
      {roadmap.openQuestions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-section">오픈 질문</h2>
          <div className="bg-white border border-ink-200 rounded-xl p-4 space-y-2">
            {roadmap.openQuestions.map((q, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px] text-ink-700">
                <HelpCircle size={12} className="text-ink-400 mt-0.5 shrink-0" />
                <span>{q}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 리스크 */}
      {roadmap.risks && roadmap.risks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-section">리스크</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {roadmap.risks.map((r, i) => (
              <RiskCard key={i} risk={r} />
            ))}
          </div>
        </section>
      )}
        </>
      )}
    </div>
  );
}
