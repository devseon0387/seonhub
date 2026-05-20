'use client';

import { useEffect, useRef, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI, AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import '@excalidraw/excalidraw/index.css';

interface Props {
  initial?: string;
  onChange: (json: string) => void;
  debounceMs?: number;
}

interface Scene {
  elements: readonly ExcalidrawElement[];
  appState?: Partial<AppState>;
  files?: BinaryFiles;
}

function parseScene(s?: string): Scene | null {
  if (!s) return null;
  try {
    const p = JSON.parse(s);
    if (Array.isArray(p.elements)) return p as Scene;
  } catch { /* ignore */ }
  return null;
}

export default function TheoryCanvas({ initial, onChange, debounceMs = 800 }: Props) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const initialScene = parseScene(initial);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastJsonRef = useRef<string>(initial ?? '');

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div style={{ height: 520, width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid #e7e5e4', background: '#fff' }}>
      <Excalidraw
        excalidrawAPI={(a) => setApi(a)}
        initialData={{
          elements: initialScene?.elements ?? [],
          appState: {
            ...(initialScene?.appState ?? {}),
            currentItemRoughness: 0,                       // 매끈
            currentItemStrokeWidth: 2,
            // 벤다이어그램 친화: 새 도형은 반투명 채움이 기본
            currentItemFillStyle: 'solid',
            currentItemBackgroundColor: '#3b82f6',         // blue-500
            currentItemOpacity: 35,                        // 35% 투명 → 겹치면 색 진해짐
            collaborators: new Map(),
          },
          files: initialScene?.files,
        }}
        onChange={(elements, appState, files) => {
          if (!api) return;
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            const scene: Scene = {
              elements,
              appState: {
                viewBackgroundColor: appState.viewBackgroundColor,
                gridSize: appState.gridSize,
              },
              files,
            };
            const json = JSON.stringify(scene);
            if (json === lastJsonRef.current) return;
            lastJsonRef.current = json;
            onChange(json);
          }, debounceMs);
        }}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: true,
            clearCanvas: true,
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
            saveAsImage: true,
          },
        }}
      />
    </div>
  );
}
