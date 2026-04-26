'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Network, Key, ArrowRight } from 'lucide-react';
import type { DevProject } from '@/lib/dev/scan-projects';
import type { EnvInfo } from '@/lib/dev/scan-env';
import { useAllProjectMetadata } from '@/lib/dev/project-metadata';
import { PROJECT_BLUEPRINTS } from '@/projects/registry';

interface Props {
  projects: DevProject[];
  env: EnvInfo[];
}

type Tab = 'graph' | 'resources';

interface Edge {
  from: string;
  to: string;
  via: string;   // env key
  port: number;
}

function mergedName(p: DevProject, allMeta: ReturnType<typeof useAllProjectMetadata>) {
  const defaults = PROJECT_BLUEPRINTS[p.id]?.defaults ?? {};
  const override = allMeta[p.id] ?? {};
  return override.displayName ?? defaults.displayName ?? p.name;
}

export default function RelationsClient({ projects, env }: Props) {
  const allMeta = useAllProjectMetadata();
  const [tab, setTab] = useState<Tab>('graph');
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const router = useRouter();

  const envById = useMemo(() => {
    const m = new Map<string, EnvInfo>();
    for (const e of env) m.set(e.projectId, e);
    return m;
  }, [env]);

  // 의존성 엣지: 프로젝트 A의 env에 `localhost:PORT` 참조가 있고, PORT가 다른 프로젝트 B의 devPort면 A→B
  const edges = useMemo<Edge[]>(() => {
    const portMap = new Map<number, string>();
    for (const p of projects) if (p.devPort) portMap.set(p.devPort, p.id);
    const out: Edge[] = [];
    for (const info of env) {
      for (const ref of info.localhostRefs) {
        const target = portMap.get(ref.port);
        if (target && target !== info.projectId) {
          out.push({ from: info.projectId, to: target, via: ref.key, port: ref.port });
        }
      }
    }
    return out;
  }, [projects, env]);

  // 그래프에 포함될 노드 = 엣지에 등장하는 프로젝트만
  const graphNodeIds = useMemo(() => {
    const set = new Set<string>();
    for (const e of edges) { set.add(e.from); set.add(e.to); }
    return Array.from(set);
  }, [edges]);

  const graphNodes = useMemo(
    () => graphNodeIds.map((id) => projects.find((p) => p.id === id)!).filter(Boolean),
    [graphNodeIds, projects],
  );

  // 원형 레이아웃
  const { width, height, cx, cy, radius } = { width: 720, height: 560, cx: 360, cy: 280, radius: 220 };
  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const n = graphNodes.length;
    graphNodes.forEach((p, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      map.set(p.id, { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
    });
    return map;
  }, [graphNodes]);

  // 공유 키 이름 (여러 프로젝트가 쓰는 환경 변수)
  const sharedKeys = useMemo(() => {
    const byKey = new Map<string, string[]>();
    for (const info of env) {
      for (const k of info.keys) {
        if (!byKey.has(k)) byKey.set(k, []);
        byKey.get(k)!.push(info.projectId);
      }
    }
    return Array.from(byKey.entries())
      .filter(([, ids]) => ids.length > 1)
      .sort((a, b) => b[1].length - a[1].length);
  }, [env]);

  // 공유 값 (해시 일치 = 실제 같은 비밀키를 복사해 쓰는 중)
  const sharedValues = useMemo(() => {
    const byHash = new Map<string, { key: string; projectId: string }[]>();
    for (const info of env) {
      for (const [k, h] of Object.entries(info.valueHashes)) {
        if (!byHash.has(h)) byHash.set(h, []);
        byHash.get(h)!.push({ key: k, projectId: info.projectId });
      }
    }
    return Array.from(byHash.entries())
      .filter(([, refs]) => new Set(refs.map((r) => r.projectId)).size > 1)
      .sort((a, b) => b[1].length - a[1].length);
  }, [env]);

  // 포트 충돌
  const portConflicts = useMemo(() => {
    const byPort = new Map<number, string[]>();
    for (const p of projects) {
      if (!p.devPort) continue;
      if (!byPort.has(p.devPort)) byPort.set(p.devPort, []);
      byPort.get(p.devPort)!.push(p.id);
    }
    return Array.from(byPort.entries()).filter(([, ids]) => ids.length > 1);
  }, [projects]);

  const nameOf = (id: string) => {
    const p = projects.find((x) => x.id === id);
    return p ? mergedName(p, allMeta) : id;
  };

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="inline-flex bg-gray-100 border border-gray-200 rounded-lg p-0.5">
        <button
          onClick={() => setTab('graph')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-md ${
            tab === 'graph' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-gray-500'
          }`}
        >
          <Network size={13} />
          의존성 그래프 <span className="text-gray-400">· {edges.length}</span>
        </button>
        <button
          onClick={() => setTab('resources')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-md ${
            tab === 'resources' ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-gray-500'
          }`}
        >
          <Key size={13} />
          공유 리소스 <span className="text-gray-400">· {sharedKeys.length + sharedValues.length}</span>
        </button>
      </div>

      {/* 포트 충돌 (항상 상단) */}
      {portConflicts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px]">
          <strong className="text-amber-900">⚠ 포트 충돌 감지</strong>
          <ul className="mt-1 space-y-0.5">
            {portConflicts.map(([port, ids]) => (
              <li key={port} className="text-amber-900">
                <span className="font-mono font-bold">:{port}</span> — {ids.map(nameOf).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'graph' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          {graphNodes.length === 0 ? (
            <div className="py-20 text-center text-[13px] text-gray-500">
              프로젝트 간 localhost 참조 없음 · .env 파일에 <code>localhost:PORT</code> 형식으로 적어두면 자동 감지돼요
            </div>
          ) : (
            <>
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ maxHeight: 640 }}>
                <defs>
                  <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#78716c" />
                  </marker>
                </defs>

                {/* 엣지 */}
                {edges.map((e, i) => {
                  const a = positions.get(e.from);
                  const b = positions.get(e.to);
                  if (!a || !b) return null;
                  const highlighted =
                    hoverNode && (e.from === hoverNode || e.to === hoverNode);
                  // 노드 반경만큼 줄이기
                  const dx = b.x - a.x, dy = b.y - a.y;
                  const d = Math.sqrt(dx * dx + dy * dy) || 1;
                  const r = 24;
                  const ax = a.x + (dx * r) / d;
                  const ay = a.y + (dy * r) / d;
                  const bx = b.x - (dx * r) / d;
                  const by = b.y - (dy * r) / d;
                  return (
                    <line
                      key={i}
                      x1={ax} y1={ay} x2={bx} y2={by}
                      stroke={highlighted ? '#1e3a8a' : '#d6d3d1'}
                      strokeWidth={highlighted ? 2 : 1.2}
                      markerEnd="url(#arr)"
                      opacity={!hoverNode || highlighted ? 1 : 0.25}
                    />
                  );
                })}

                {/* 노드 */}
                {graphNodes.map((p) => {
                  const pos = positions.get(p.id);
                  if (!pos) return null;
                  const isHover = hoverNode === p.id;
                  return (
                    <g
                      key={p.id}
                      onMouseEnter={() => setHoverNode(p.id)}
                      onMouseLeave={() => setHoverNode(null)}
                      onClick={() => router.push(`/dev/${encodeURIComponent(p.id)}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        cx={pos.x} cy={pos.y} r={20}
                        fill={p.isRunning ? '#10b981' : '#1e3a8a'}
                        stroke="white"
                        strokeWidth={2}
                        opacity={!hoverNode || isHover ? 1 : 0.4}
                      />
                      <text
                        x={pos.x} y={pos.y + 4}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={700}
                        fill="white"
                        style={{ pointerEvents: 'none' }}
                      >
                        {mergedName(p, allMeta).slice(0, 3)}
                      </text>
                      <text
                        x={pos.x} y={pos.y + 36}
                        textAnchor="middle"
                        fontSize={11}
                        fill="#44403c"
                        style={{ pointerEvents: 'none' }}
                      >
                        {mergedName(p, allMeta)}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* 엣지 상세 리스트 */}
              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  감지된 연결 · {edges.length}
                </div>
                <ul className="space-y-1.5">
                  {edges.map((e, i) => (
                    <li key={i} className="flex items-center gap-2 text-[12px]">
                      <span
                        className="font-semibold text-gray-900 hover:text-[#1e3a8a] cursor-pointer"
                        onMouseEnter={() => setHoverNode(e.from)}
                        onMouseLeave={() => setHoverNode(null)}
                        onClick={() => router.push(`/dev/${encodeURIComponent(e.from)}`)}
                      >
                        {nameOf(e.from)}
                      </span>
                      <ArrowRight size={11} className="text-gray-400" />
                      <span
                        className="font-semibold text-gray-900 hover:text-[#1e3a8a] cursor-pointer"
                        onMouseEnter={() => setHoverNode(e.to)}
                        onMouseLeave={() => setHoverNode(null)}
                        onClick={() => router.push(`/dev/${encodeURIComponent(e.to)}`)}
                      >
                        {nameOf(e.to)}
                      </span>
                      <span className="text-gray-400">via</span>
                      <code className="font-mono text-[10.5px] text-[#1e3a8a] bg-[#eff6ff] px-1.5 py-0.5 rounded">
                        {e.via}
                      </code>
                      <span className="text-gray-400 font-mono text-[10.5px]">:{e.port}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'resources' && (
        <div className="space-y-4">
          {/* 같은 키 이름 */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-[13px] font-bold text-gray-900 mb-1">
              같은 환경 변수 이름을 쓰는 프로젝트
            </h3>
            <p className="text-[11.5px] text-gray-500 mb-3">
              같은 서비스(API 키, 설정)를 여러 프로젝트가 참조 · 값은 다를 수 있음
            </p>
            {sharedKeys.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-gray-400">공유 키 없음</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {sharedKeys.map(([key, ids]) => (
                  <li key={key} className="py-2 flex items-start gap-3 text-[12px]">
                    <code className="font-mono text-[11.5px] font-bold text-[#1e3a8a] bg-[#eff6ff] px-2 py-0.5 rounded shrink-0">
                      {key}
                    </code>
                    <div className="flex flex-wrap gap-1.5 min-w-0">
                      {ids.map((id) => (
                        <button
                          key={id}
                          onClick={() => router.push(`/dev/${encodeURIComponent(id)}`)}
                          className="text-[11px] font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-0.5 hover:bg-gray-100"
                        >
                          {nameOf(id)}
                        </button>
                      ))}
                    </div>
                    <span className="text-gray-400 text-[10.5px] ml-auto shrink-0">· {ids.length}개</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 같은 값 복제 */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-[13px] font-bold text-gray-900 mb-1">
              동일 비밀값을 여러 프로젝트에 복사
            </h3>
            <p className="text-[11.5px] text-gray-500 mb-3">
              값 해시가 일치 · 실제 같은 API 키/토큰을 공유 중 (회전 시 모두 업데이트 필요)
            </p>
            {sharedValues.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-gray-400">중복 값 없음</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {sharedValues.map(([hash, refs]) => {
                  const projectIds = Array.from(new Set(refs.map((r) => r.projectId)));
                  const keys = Array.from(new Set(refs.map((r) => r.key)));
                  return (
                    <li key={hash} className="py-3 text-[12px]">
                      <div className="flex items-baseline gap-2 mb-1.5">
                        <code className="font-mono text-[10px] text-gray-400">hash: {hash}</code>
                        <span className="text-[11px] text-gray-500">
                          · {projectIds.length}개 프로젝트 · 키 {keys.length}종
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {keys.map((k) => (
                          <code
                            key={k}
                            className="font-mono text-[11px] font-bold text-[#1e3a8a] bg-[#eff6ff] px-2 py-0.5 rounded"
                          >
                            {k}
                          </code>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {projectIds.map((id) => (
                          <button
                            key={id}
                            onClick={() => router.push(`/dev/${encodeURIComponent(id)}`)}
                            className="text-[11px] font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-0.5 hover:bg-gray-100"
                          >
                            {nameOf(id)}
                          </button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
