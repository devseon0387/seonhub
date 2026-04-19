'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { WIREFRAMES } from '@/wireframes/registry';

export default function WireframesGallery({
  showHeader = true,
  initialSlug,
}: {
  showHeader?: boolean;
  initialSlug?: string;
}) {
  const fallback = WIREFRAMES[0]?.slug ?? '';
  const [selected, setSelected] = useState<string>(initialSlug ?? fallback);
  const current = WIREFRAMES.find((w) => w.slug === selected) ?? WIREFRAMES[0];
  const Frame = current?.component;

  return (
    <div className="space-y-5 pb-12">
      {showHeader && (
        <header>
          <div className="text-kicker mb-2">Wireframes</div>
          <h1 className="text-page">와이어프레임</h1>
          <p className="text-body text-ink-500 mt-2">
            색·이미지 없이 레이아웃과 정보 계층만 검증. 구현 전 구조 고정, 구현 후 일치 리뷰.
          </p>
        </header>
      )}

      <div className="flex gap-5">
        {/* 좌측 메뉴 */}
        <aside className="w-60 shrink-0 sticky top-4 self-start">
          <div className="text-kicker mb-3">Screens · {WIREFRAMES.length}</div>
          <nav className="space-y-1">
            {WIREFRAMES.map((w) => {
              const active = w.slug === selected;
              return (
                <button
                  key={w.slug}
                  onClick={() => setSelected(w.slug)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    active
                      ? 'bg-brand-50 border-brand-200'
                      : 'bg-white border-ink-200 hover:bg-ink-50'
                  }`}
                >
                  <div className={`text-[12px] font-semibold ${active ? 'text-brand-700' : 'text-ink-900'}`}>
                    {w.title}
                  </div>
                  <div className="text-[10px] text-ink-500 mt-0.5 line-clamp-2 leading-snug">
                    {w.description}
                  </div>
                  {w.relatedRoute && (
                    <div className="text-[9px] font-mono text-ink-400 mt-1 truncate">
                      {w.relatedRoute}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* 우측 프리뷰 */}
        <div className="flex-1 min-w-0">
          {current && (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-kicker">Wireframe · {current.slug}</div>
                  <h2 className="text-[16px] font-bold text-ink-900 mt-1">{current.title}</h2>
                  <p className="text-caption text-ink-500 mt-1">{current.description}</p>
                </div>
                {current.relatedRoute && (
                  <Link
                    href={current.relatedRoute}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-ink-200 text-[12px] text-ink-700 hover:bg-ink-50 shrink-0"
                  >
                    <ExternalLink size={12} />
                    실제 화면
                    <span className="font-mono text-ink-400">{current.relatedRoute}</span>
                  </Link>
                )}
              </div>
              <div className="bg-ink-50 border border-ink-200 rounded-xl p-6 overflow-auto">
                {Frame && <Frame />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
