'use client';

import Link from 'next/link';
import type { Roadmap, Phase, PhaseStatus } from '@/roadmap/types';
import { WIREFRAMES } from '@/wireframes/registry';

type Tone = {
  nodeBg: string;
  nodeBorder: string;
  cardBg: string;
  cardBorder: string;
  accentText: string;
  statusBadge: string;
  statusLabel: string;
  ring?: string;
};

const TONE: Record<PhaseStatus, Tone> = {
  'done': {
    nodeBg: 'bg-emerald-500',
    nodeBorder: '',
    cardBg: 'bg-[#fafaf9]',
    cardBorder: 'border-ink-200',
    accentText: 'text-emerald-600',
    statusBadge: 'bg-emerald-50 text-emerald-700',
    statusLabel: '완료',
  },
  'in-progress': {
    nodeBg: 'bg-brand-600',
    nodeBorder: '',
    cardBg: 'bg-brand-50',
    cardBorder: 'border-brand-600 border-2',
    accentText: 'text-brand-600',
    statusBadge: 'bg-brand-600 text-white',
    statusLabel: 'NOW',
    ring: 'ring-4 ring-brand-500/20',
  },
  'planned': {
    nodeBg: 'bg-white',
    nodeBorder: 'border-2 border-ink-300',
    cardBg: 'bg-[#fafaf9]',
    cardBorder: 'border-ink-200',
    accentText: 'text-ink-500',
    statusBadge: 'bg-ink-100 text-ink-600',
    statusLabel: '예정',
  },
  'deferred': {
    nodeBg: 'bg-white',
    nodeBorder: 'border-2 border-dashed border-amber-400',
    cardBg: 'bg-amber-50',
    cardBorder: 'border border-dashed border-amber-300',
    accentText: 'text-amber-700',
    statusBadge: 'bg-amber-50 text-amber-700',
    statusLabel: '보류',
  },
};

function WireframeChip({ slug, align }: { slug: string; align: 'left' | 'right' }) {
  const wf = WIREFRAMES.find((w) => w.slug === slug);
  if (!wf) return null;
  return (
    <Link
      href={`/wireframes/${slug}`}
      className="text-[10px] font-medium bg-white text-ink-600 px-1.5 py-0.5 rounded border border-ink-200 hover:border-brand-500 hover:text-brand-600 transition-colors font-mono"
    >
      {wf.title}
    </Link>
  );
}

function PhaseCard({
  phase,
  index,
  isCurrent,
  side,
}: {
  phase: Phase;
  index: number;
  isCurrent: boolean;
  side: 'left' | 'right';
}) {
  const tone = TONE[phase.status];
  const total = phase.items.length;
  const done = phase.items.filter((i) => i.status === 'done').length;
  const textAlign = side === 'left' ? 'text-right' : 'text-left';
  const justify = side === 'left' ? 'justify-end' : 'justify-start';

  return (
    <div className={side === 'left' ? 'flex justify-end' : 'flex justify-start'}>
      <div className={`inline-block max-w-xs ${tone.cardBg} ${tone.cardBorder} ${!tone.cardBorder.includes('border-2') && !tone.cardBorder.includes('border ') ? 'border ' : ''}rounded-xl p-4`}>
        <div className={`flex items-center gap-2 flex-wrap ${justify}`}>
          {side === 'right' && (
            <span className={`text-[10px] font-bold font-mono ${tone.accentText}`}>P{index + 1}</span>
          )}
          <h3 className={`text-[14px] font-bold ${phase.status === 'deferred' || phase.status === 'planned' ? 'text-ink-700' : 'text-ink-900'}`}>
            {phase.title}
          </h3>
          {side === 'left' && (
            <span className={`text-[10px] font-bold font-mono ${tone.accentText}`}>P{index + 1}</span>
          )}
          {isCurrent && (
            <span className="text-[9px] font-bold bg-brand-600 text-white px-1.5 py-0.5 rounded">◆ 현재</span>
          )}
        </div>
        <p className={`text-[11px] mt-1 ${textAlign} ${phase.status === 'deferred' || phase.status === 'planned' ? 'text-ink-500' : 'text-ink-600'}`}>
          {phase.summary}
        </p>
        {phase.wireframes && phase.wireframes.length > 0 && (
          <div className={`flex gap-1 mt-2 flex-wrap ${justify}`}>
            {phase.wireframes.map((slug) => (
              <WireframeChip key={slug} slug={slug} align={side} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseMeta({
  phase,
  side,
}: {
  phase: Phase;
  side: 'left' | 'right';
}) {
  const tone = TONE[phase.status];
  const total = phase.items.length;
  const done = phase.items.filter((i) => i.status === 'done').length;
  const dateStr =
    phase.start && (phase.end || phase.target)
      ? `${phase.start} → ${phase.end || `target ${phase.target}`}`
      : phase.start
        ? phase.start
        : phase.target
          ? `target ${phase.target}`
          : '미정';

  return (
    <div className={side === 'left' ? 'text-right' : 'text-left'}>
      <div className="text-[11px] text-ink-500 font-mono">{dateStr}</div>
      <div className={`text-[11px] mt-1 font-semibold ${tone.accentText}`}>
        {tone.statusLabel} · {done}/{total}
      </div>
    </div>
  );
}

function PhaseNode({ phase, isCurrent }: { phase: Phase; isCurrent: boolean }) {
  const tone = TONE[phase.status];
  const size = isCurrent ? 'w-6 h-6' : 'w-4 h-4';
  return (
    <div
      className={`${size} rounded-full ${tone.nodeBg} ${tone.nodeBorder} border-4 border-white shadow-md z-10 ${isCurrent ? tone.ring : ''}`}
    />
  );
}

export default function RoadmapFlowView({ roadmap }: { roadmap: Roadmap }) {
  return (
    <div className="space-y-4">
      {/* 범례 */}
      <div className="flex items-center gap-4 text-[11px] text-ink-500 flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />완료
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-600" />진행 중
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white border-2 border-ink-300" />예정
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white border-2 border-dashed border-amber-400" />보류
        </span>
      </div>

      {/* 교차 타임라인 */}
      <div className="bg-white border border-ink-200 rounded-xl p-8">
        <div className="relative">
          {/* 중앙 라인 */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-ink-300 -translate-x-1/2" />

          <div className="space-y-6">
            {roadmap.phases.map((phase, i) => {
              const isCurrent = phase.id === roadmap.currentPhaseId;
              const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
              return (
                <div key={phase.id} className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
                  {/* 왼쪽 */}
                  <div>
                    {side === 'left' ? (
                      <PhaseCard phase={phase} index={i} isCurrent={isCurrent} side="left" />
                    ) : (
                      <div className="flex justify-end">
                        <PhaseMeta phase={phase} side="left" />
                      </div>
                    )}
                  </div>

                  {/* 중앙 노드 */}
                  <PhaseNode phase={phase} isCurrent={isCurrent} />

                  {/* 오른쪽 */}
                  <div>
                    {side === 'right' ? (
                      <PhaseCard phase={phase} index={i} isCurrent={isCurrent} side="right" />
                    ) : (
                      <div>
                        <PhaseMeta phase={phase} side="right" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="text-[11px] text-ink-400">
        ◆ 중앙 도트는 페이즈 마일스톤 · 카드 측에 제목·요약·와이어프레임 · 반대 측에 날짜·진행률
      </div>
    </div>
  );
}
