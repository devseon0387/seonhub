'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Maximize2 } from 'lucide-react';
import type { ExternalWireframe } from '@/projects/plick/wireframes';
import ShadowHtmlFrame from './ShadowHtmlFrame';

interface Props {
  projectId: string;
  wireframes: ExternalWireframe[];
}

export default function ExternalWireframesGallery({ projectId, wireframes }: Props) {
  const [active, setActive] = useState<string>(wireframes[0]?.slug ?? '');

  const grouped = useMemo(() => {
    const map = new Map<string, ExternalWireframe[]>();
    for (const w of wireframes) {
      const arr = map.get(w.category) ?? [];
      arr.push(w);
      map.set(w.category, arr);
    }
    return Array.from(map.entries());
  }, [wireframes]);

  const current = wireframes.find((w) => w.slug === active);
  const iframeSrc = current
    ? `/api/dev/static/${encodeURIComponent(projectId)}/${current.file
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-4">
      {/* 좌측: 목록 */}
      <aside className="bg-white border border-ink-200 rounded-xl overflow-hidden">
        <div className="px-3 py-2.5 border-b border-ink-200">
          <h3 className="text-[11px] font-bold text-ink-500 uppercase tracking-[0.08em]">
            목업 ({wireframes.length})
          </h3>
        </div>
        <div className="max-h-[68vh] overflow-y-auto">
          {grouped.map(([cat, items]) => (
            <div key={cat} className="border-b border-ink-100 last:border-b-0">
              <div className="px-3 py-1.5 bg-ink-50/60 text-[10px] font-bold text-ink-600 uppercase tracking-wider">
                {cat}
              </div>
              <ul>
                {items.map((w) => {
                  const isActive = active === w.slug;
                  return (
                    <li key={w.slug}>
                      <button
                        onClick={() => setActive(w.slug)}
                        className={`w-full text-left px-3 py-2 text-[12px] border-l-2 transition-colors ${
                          isActive
                            ? 'bg-brand-50/60 border-brand-600 text-ink-900 font-semibold'
                            : 'border-transparent text-ink-700 hover:bg-ink-50'
                        }`}
                      >
                        {w.label}
                        <div className="font-mono text-[10px] text-ink-400 mt-0.5 truncate">
                          {w.file}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {/* 우측: 프리뷰 */}
      <div className="bg-white border border-ink-200 rounded-xl overflow-hidden">
        {current && iframeSrc ? (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink-200">
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-ink-900 truncate">{current.label}</div>
                <div className="text-[10px] font-mono text-ink-500 truncate">{current.file}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={iframeSrc}
                  target="_blank"
                  rel="noreferrer"
                  title="새 탭에서 열기"
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ink-50 text-ink-500 hover:text-ink-900 transition-colors"
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => {
                    const win = window.open(iframeSrc, '_blank');
                    win?.focus();
                  }}
                  title="풀스크린"
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ink-50 text-ink-500 hover:text-ink-900 transition-colors"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>
            <div className="bg-ink-900" style={{ height: 'clamp(500px, 72vh, 900px)' }}>
              <ShadowHtmlFrame key={current.slug} src={iframeSrc} />
            </div>
          </>
        ) : (
          <div className="py-20 text-center text-[13px] text-ink-400">
            좌측에서 목업을 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}
