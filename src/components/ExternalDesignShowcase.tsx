'use client';

import { ExternalLink } from 'lucide-react';
import ShadowHtmlFrame from './ShadowHtmlFrame';

interface Props {
  projectId: string;
  file: string;
  label?: string;
}

export default function ExternalDesignShowcase({ projectId, file, label }: Props) {
  const src = `/api/dev/static/${encodeURIComponent(projectId)}/${file
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;

  return (
    <div className="bg-white border border-ink-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink-200">
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-ink-900 truncate">
            {label ?? '디자인 시스템'}
          </div>
          <div className="text-[10px] font-mono text-ink-500 truncate">{file}</div>
        </div>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          title="새 탭에서 열기"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-ink-600 hover:text-ink-900 rounded-lg hover:bg-ink-50 transition-colors"
        >
          <ExternalLink size={12} />
          새 탭
        </a>
      </div>
      <div className="bg-ink-900" style={{ height: 'clamp(500px, 75vh, 1000px)' }}>
        <ShadowHtmlFrame src={src} />
      </div>
    </div>
  );
}
