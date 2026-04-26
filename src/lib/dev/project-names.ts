'use client';

import { useProjectMetadata } from './project-metadata';

/**
 * 프로젝트 표시 이름 훅 (하위 호환). 내부적으로 useProjectMetadata를 사용.
 */
export function useProjectName(
  id: string,
  fallback: string,
): [string, (value: string | null) => void, boolean] {
  const [meta, setMeta] = useProjectMetadata(id);
  const displayName = meta.displayName ?? fallback;
  const isCustom = !!meta.displayName;

  const update = (value: string | null) => {
    if (value === null || value.trim() === '' || value.trim() === fallback) {
      setMeta({ displayName: undefined });
    } else {
      setMeta({ displayName: value.trim() });
    }
  };

  return [displayName, update, isCustom];
}
