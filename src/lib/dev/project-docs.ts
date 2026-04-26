'use client';

import { useEffect, useState } from 'react';

export type DocKind = 'design' | 'wireframes' | 'roadmap' | 'erd';

const STORAGE_KEY = 'dev-project-docs';
const EVENT_NAME = 'dev-docs-changed';

type AllDocs = Record<string, Partial<Record<DocKind, string>>>;

function readAll(): AllDocs {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AllDocs) : {};
  } catch {
    return {};
  }
}

function writeAll(map: AllDocs): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event(EVENT_NAME));
}

/**
 * 프로젝트 블루프린트 문서 훅 (design/wireframes/roadmap/erd 각각).
 * 구조화된 blueprint(registry.erd 등)가 없는 프로젝트에서 자유 서식 메모로 사용.
 */
export function useProjectDoc(
  id: string,
  kind: DocKind,
): [string, (value: string) => void] {
  const [value, setValue] = useState('');

  useEffect(() => {
    const sync = () => {
      const all = readAll();
      setValue(all[id]?.[kind] ?? '');
    };
    sync();
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener('storage', sync);
    };
  }, [id, kind]);

  const update = (next: string) => {
    const all = readAll();
    const current = all[id] ?? {};
    if (next.trim()) {
      current[kind] = next;
      all[id] = current;
    } else {
      delete current[kind];
      if (Object.keys(current).length === 0) delete all[id];
      else all[id] = current;
    }
    writeAll(all);
  };

  return [value, update];
}
