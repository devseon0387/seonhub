'use client';

import { useRef, useState } from 'react';
import { GitBranch } from 'lucide-react';

interface Commit {
  hash: string;
  author: string;
  subject: string;
  relativeDate: string;
}

interface Props {
  projectId: string;
  branch: string | null;
}

/** 브랜치 뱃지 호버 시 최근 5개 커밋을 lazy-load 해서 보여주는 팝오버 */
export default function GitLogPopover({ projectId, branch }: Props) {
  const [open, setOpen] = useState(false);
  const [commits, setCommits] = useState<Commit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/dev/git-log/${encodeURIComponent(projectId)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        setCommits(json.commits ?? []);
      }
    } catch {
      setCommits([]);
    } finally {
      setLoading(false);
    }
  };

  const show = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setOpen(true);
    load();
  };
  const hide = () => {
    hideTimer.current = setTimeout(() => setOpen(false), 120);
  };

  if (!branch) return null;

  return (
    <span
      className="relative inline-flex items-center gap-0.5"
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="font-mono text-[11px] inline-flex items-center gap-1 text-gray-500">
        <GitBranch size={10} />
        {branch}
      </span>
      {open && (
        <div
          onMouseEnter={show}
          onMouseLeave={hide}
          className="absolute z-20 bottom-full left-0 mb-1.5 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-2.5"
        >
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              최근 커밋
            </div>
            <div className="text-[10px] text-gray-400 font-mono">{branch}</div>
          </div>
          {loading && <div className="text-[11px] text-gray-400 py-2">불러오는 중…</div>}
          {!loading && commits && commits.length === 0 && (
            <div className="text-[11px] text-gray-400 py-2">커밋 기록 없음</div>
          )}
          {commits && commits.length > 0 && (
            <ul className="space-y-1.5">
              {commits.map((c) => (
                <li key={c.hash} className="text-[11.5px] leading-snug">
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-[#1e3a8a] font-semibold shrink-0 pt-0.5">
                      {c.hash}
                    </span>
                    <span className="text-gray-800 flex-1 min-w-0 break-words">{c.subject}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-[3.5rem] text-[10px] text-gray-400">
                    <span>{c.author}</span>
                    <span>·</span>
                    <span>{c.relativeDate}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </span>
  );
}
