'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, AlignLeft, Hash, List, ListOrdered, CheckSquare, Minus, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { strategyApi } from '@/lib/strategy-api';

// ─── Types ───────────────────────────────────────────────────────────────────
type BlockType =
  | 'paragraph' | 'heading1' | 'heading2' | 'heading3'
  | 'bullet' | 'numbered' | 'todo' | 'divider' | 'callout';

interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
}

interface StrategyDoc {
  id: string;
  groupId: string;
  title: string;
  emoji: string;
  blocks: Block[];
  createdAt: string;
  updatedAt: string;
}

interface StrategyGroup {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const BLOCK_MENU = [
  { type: 'paragraph'  as BlockType, label: '텍스트',    desc: '일반 텍스트',    icon: AlignLeft   },
  { type: 'heading1'   as BlockType, label: '제목 1',    desc: '큰 제목',        icon: Hash        },
  { type: 'heading2'   as BlockType, label: '제목 2',    desc: '중간 제목',      icon: Hash        },
  { type: 'heading3'   as BlockType, label: '제목 3',    desc: '작은 제목',      icon: Hash        },
  { type: 'bullet'     as BlockType, label: '글머리',    desc: '순서 없는 목록', icon: List        },
  { type: 'numbered'   as BlockType, label: '번호 목록', desc: '순서 있는 목록', icon: ListOrdered },
  { type: 'todo'       as BlockType, label: '할 일',     desc: '체크박스',       icon: CheckSquare },
  { type: 'divider'    as BlockType, label: '구분선',    desc: '수평선 삽입',    icon: Minus       },
  { type: 'callout'    as BlockType, label: '콜아웃',    desc: '강조 블록',      icon: Lightbulb   },
];

const DOC_EMOJIS = ['📝','🎯','💡','🚀','📊','🔥','⭐','💎','🎨','🌟','📌','📋','🗓️','💼','🧠','⚡','🎪','🏆','🔑','🌈'];

const MD_SHORTCUTS: Record<string, BlockType> = {
  '#': 'heading1', '##': 'heading2', '###': 'heading3',
  '-': 'bullet', '1.': 'numbered', '[]': 'todo', '---': 'divider', '>': 'callout',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const mkBlock = (type: BlockType = 'paragraph'): Block => ({ id: uid(), type, content: '', checked: false });

// ─── Block Component ─────────────────────────────────────────────────────────
interface BlockElProps {
  block: Block;
  focused: boolean;
  numberedIdx: number;
  onUpdate(id: string, u: Partial<Block>): void;
  onEnter(id: string): void;
  onBackspace(id: string): void;
  onFocus(id: string): void;
  onSlash(id: string, el: HTMLElement): void;
  onArrowUp(id: string): void;
  onArrowDown(id: string): void;
}

function BlockEl({
  block, focused, numberedIdx,
  onUpdate, onEnter, onBackspace, onFocus, onSlash, onArrowUp, onArrowDown,
}: BlockElProps) {
  const ref = useRef<HTMLDivElement>(null);
  const composing = useRef(false);

  useEffect(() => {
    if (ref.current) ref.current.textContent = block.content;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  useEffect(() => {
    if (!focused || !ref.current) return;
    ref.current.focus();
    try {
      const range = document.createRange();
      const sel = window.getSelection();
      const node = ref.current;
      const last = node.lastChild;
      if (last) range.setStart(last, last.textContent?.length ?? 0);
      else range.setStart(node, 0);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch {}
  }, [focused, block.id, block.type]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (composing.current) return;
    const text = ref.current?.textContent ?? '';
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnter(block.id);
    } else if (e.key === 'Backspace' && text === '') {
      e.preventDefault();
      if (block.type !== 'paragraph' && block.type !== 'divider') {
        onUpdate(block.id, { type: 'paragraph' });
        requestAnimationFrame(() => ref.current?.focus());
      } else {
        onBackspace(block.id);
      }
    } else if (e.key === 'ArrowUp') {
      try { if (window.getSelection()?.getRangeAt(0).startOffset === 0) { e.preventDefault(); onArrowUp(block.id); } } catch {}
    } else if (e.key === 'ArrowDown') {
      try { if ((window.getSelection()?.getRangeAt(0).startOffset ?? 0) >= text.length) { e.preventDefault(); onArrowDown(block.id); } } catch {}
    } else if (e.key === ' ' && !e.shiftKey && MD_SHORTCUTS[text]) {
      e.preventDefault();
      if (ref.current) ref.current.textContent = '';
      onUpdate(block.id, { type: MD_SHORTCUTS[text], content: '' });
    }
  };

  const handleInput = () => {
    const text = ref.current?.textContent ?? '';
    onUpdate(block.id, { content: text });
    if (text === '/') onSlash(block.id, ref.current!);
  };

  const placeholder = focused
    ? (block.type === 'paragraph' ? "내용을 입력하거나 '/'로 명령어를 사용하세요" : '내용 입력...')
    : '';

  const shared = {
    ref,
    contentEditable: true as const,
    suppressContentEditableWarning: true,
    onKeyDown: handleKeyDown,
    onInput: handleInput,
    onFocus: () => onFocus(block.id),
    onCompositionStart: () => { composing.current = true; },
    onCompositionEnd: () => { composing.current = false; },
    'data-placeholder': placeholder,
    className: 'st-page-edit outline-none w-full break-words min-h-[1.5em]',
  };

  if (block.type === 'divider') return (
    <div className="py-2 cursor-default select-none" onClick={() => onFocus(block.id)}>
      <hr className="border-gray-200" />
    </div>
  );
  if (block.type === 'heading1') return (
    <div {...shared} className={`${shared.className} text-[1.9rem] font-bold text-gray-900 leading-tight pt-6 pb-1`} />
  );
  if (block.type === 'heading2') return (
    <div {...shared} className={`${shared.className} text-2xl font-semibold text-gray-900 pt-4 pb-0.5`} />
  );
  if (block.type === 'heading3') return (
    <div {...shared} className={`${shared.className} text-lg font-semibold text-gray-800 pt-3`} />
  );
  if (block.type === 'bullet') return (
    <div className="flex items-start gap-2.5">
      <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0 select-none" />
      <div {...shared} className={`${shared.className} text-gray-700 leading-relaxed flex-1`} />
    </div>
  );
  if (block.type === 'numbered') return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 text-sm mt-0.5 flex-shrink-0 w-5 text-right select-none">{numberedIdx}.</span>
      <div {...shared} className={`${shared.className} text-gray-700 leading-relaxed flex-1`} />
    </div>
  );
  if (block.type === 'todo') return (
    <div className="flex items-start gap-2.5">
      <button
        onClick={() => onUpdate(block.id, { checked: !block.checked })}
        className={`mt-[3px] w-[18px] h-[18px] rounded-[4px] border-2 flex-shrink-0 flex items-center justify-center transition-all active:scale-90 ${
          block.checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        {block.checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div
        {...shared}
        className={`${shared.className} leading-relaxed flex-1 ${block.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}
      />
    </div>
  );
  if (block.type === 'callout') return (
    <div className="flex items-start gap-3 bg-blue-50 rounded-xl px-4 py-3 border border-blue-100 my-1">
      <span className="text-base flex-shrink-0 select-none">💡</span>
      <div {...shared} className={`${shared.className} text-gray-700 leading-relaxed flex-1`} />
    </div>
  );
  return <div {...shared} className={`${shared.className} text-gray-700 leading-relaxed`} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PageEditor() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const pageId = params.pageId as string;

  const [doc, setDoc] = useState<StrategyDoc | null>(null);
  const [group, setGroup] = useState<StrategyGroup | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [slash, setSlash] = useState<{ blockId: string; top: number; left: number } | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const titleRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      strategyApi.getGroup(groupId),
      strategyApi.getDoc(pageId),
    ]).then(([g, d]) => {
      setGroup(g);
      setDoc(d as unknown as StrategyDoc | null);
      if (d && titleRef.current) titleRef.current.textContent = d.title;
    }).finally(() => setLoading(false));
  }, [groupId, pageId]);

  // 타이틀 sync
  useEffect(() => {
    if (titleRef.current && doc && titleRef.current.textContent !== doc.title)
      titleRef.current.textContent = doc.title;
  }, [doc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveDoc = useCallback((updated: StrategyDoc) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      strategyApi.updateDoc(updated.id, updated).catch(() => {});
    }, 300);
  }, []);

  const patchDoc = useCallback((u: Partial<StrategyDoc>) => {
    setDoc(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...u, updatedAt: new Date().toISOString() };
      saveDoc(next);
      return next;
    });
  }, [saveDoc]);

  const patchBlock = useCallback((blockId: string, u: Partial<Block>) => {
    setDoc(prev => {
      if (!prev) return prev;
      const next = {
        ...prev,
        blocks: prev.blocks.map(b => b.id === blockId ? { ...b, ...u } : b),
        updatedAt: new Date().toISOString(),
      };
      saveDoc(next);
      return next;
    });
  }, [saveDoc]);

  const insertBlock = useCallback((afterId: string) => {
    const nb = mkBlock();
    setDoc(prev => {
      if (!prev) return prev;
      const i = prev.blocks.findIndex(b => b.id === afterId);
      const arr = [...prev.blocks];
      arr.splice(i + 1, 0, nb);
      const next = { ...prev, blocks: arr, updatedAt: new Date().toISOString() };
      saveDoc(next);
      return next;
    });
    setFocusId(nb.id);
  }, [saveDoc]);

  const removeBlock = useCallback((blockId: string) => {
    setDoc(prev => {
      if (!prev || prev.blocks.length <= 1) return prev;
      const i = prev.blocks.findIndex(b => b.id === blockId);
      const prevBlock = prev.blocks[i - 1];
      if (prevBlock) setTimeout(() => setFocusId(prevBlock.id), 0);
      const next = {
        ...prev,
        blocks: prev.blocks.filter(b => b.id !== blockId),
        updatedAt: new Date().toISOString(),
      };
      saveDoc(next);
      return next;
    });
  }, [saveDoc]);

  const navBlock = useCallback((blockId: string, dir: 1 | -1) => {
    setDoc(prev => {
      if (!prev) return prev;
      const i = prev.blocks.findIndex(b => b.id === blockId);
      const t = prev.blocks[i + dir];
      if (t) setFocusId(t.id);
      return prev;
    });
  }, []);

  const handleSlash = useCallback((blockId: string, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setSlash({ blockId, top: rect.bottom + 8, left: rect.left });
  }, []);

  const applySlash = useCallback((type: BlockType) => {
    if (!slash) return;
    patchBlock(slash.blockId, { type, content: '' });
    const sid = slash.blockId;
    setSlash(null);
    setTimeout(() => setFocusId(sid), 0);
  }, [slash, patchBlock]);

  const getNumbIdx = (blocks: Block[], idx: number) => {
    let n = 0;
    for (let i = idx; i >= 0; i--) { if (blocks[i].type === 'numbered') n++; else break; }
    return n;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-400">페이지를 찾을 수 없어요</p>
        <button onClick={() => router.push(`/strategy/${groupId}`)} className="mt-4 text-sm text-blue-500 hover:text-blue-700 transition-colors">
          그룹으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <style jsx global>{`
        .st-page-edit { caret-color: #1f2937; }
        .st-page-edit:empty::before {
          content: attr(data-placeholder);
          color: #d1d5db;
          pointer-events: none;
        }
      `}</style>

      {/* 뒤로가기 */}
      <button
        onClick={() => router.push(`/strategy/${groupId}`)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors text-sm font-medium active:scale-[0.97]"
      >
        <ArrowLeft size={18} />
        {group ? `${group.emoji} ${group.name}` : '그룹으로 돌아가기'}
      </button>

      {/* 에디터 */}
      <div className="max-w-2xl">
        {/* 이모지 */}
        <div className="relative mb-4">
          <button
            onClick={() => setEmojiOpen(p => !p)}
            className="text-5xl hover:bg-gray-100 rounded-xl p-1 -ml-1 transition-colors active:scale-[0.95]"
          >
            {doc.emoji}
          </button>
          <AnimatePresence>
            {emojiOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setEmojiOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-14 left-0 z-30 bg-white rounded-2xl shadow-xl border border-gray-200 p-3 grid grid-cols-10 gap-1"
                >
                  {DOC_EMOJIS.map(em => (
                    <button
                      key={em}
                      onClick={() => { patchDoc({ emoji: em }); setEmojiOpen(false); }}
                      className="text-xl w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors active:scale-90"
                    >
                      {em}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* 제목 */}
        <div
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="제목 없음"
          onInput={() => patchDoc({ title: titleRef.current?.textContent?.trim() || '새 페이지' })}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (doc.blocks.length) setFocusId(doc.blocks[0].id);
            }
          }}
          className="st-page-edit text-[2.5rem] font-bold text-gray-900 outline-none w-full break-words leading-tight mb-6"
        />

        <hr className="border-gray-100 mb-6" />

        {/* 블록들 */}
        <div className="space-y-px">
          {doc.blocks.map((block, idx) => (
            <div key={block.id} className="py-[3px]">
              <BlockEl
                block={block}
                focused={focusId === block.id}
                numberedIdx={getNumbIdx(doc.blocks, idx)}
                onUpdate={patchBlock}
                onEnter={insertBlock}
                onBackspace={removeBlock}
                onFocus={setFocusId}
                onSlash={handleSlash}
                onArrowUp={id => navBlock(id, -1)}
                onArrowDown={id => navBlock(id, 1)}
              />
            </div>
          ))}
          <div
            className="h-32 cursor-text"
            onClick={() => {
              const last = doc.blocks[doc.blocks.length - 1];
              if (!last) return;
              if (last.content) insertBlock(last.id);
              else setFocusId(last.id);
            }}
          />
        </div>
      </div>

      {/* / 명령어 메뉴 (fixed 포지션) */}
      <AnimatePresence>
        {slash && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setSlash(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{ position: 'fixed', top: slash.top, left: slash.left }}
              className="z-30 w-60 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
            >
              <div className="p-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-2 py-1.5">블록 유형</p>
                {BLOCK_MENU.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      onClick={() => applySlash(item.type)}
                      className="w-full flex items-center gap-2.5 px-2 py-2 hover:bg-gray-50 rounded-xl transition-colors text-left active:scale-[0.98]"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon size={14} className="text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 leading-tight">{item.label}</p>
                        <p className="text-[11px] text-gray-400">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
