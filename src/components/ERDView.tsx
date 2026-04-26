'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import {
  TransformWrapper,
  TransformComponent,
  useControls,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';
import {
  Users, Briefcase, Play, UserPlus, Receipt, CreditCard,
  Database, FileText, Calendar, UserCog, Tag, Bell,
  Key, Link2,
  ZoomIn as ZoomInIcon, ZoomOut as ZoomOutIcon,
  Maximize2, RotateCcw, GraduationCap, Code2,
} from 'lucide-react';
import type { ERD, Entity, Field, Relationship, EntityGroup, RelationType } from '@/erd/types';
import { lookupVerb } from '@/erd/glossary';

type ViewMode = 'tech' | 'beginner';

const TYPE_KO: Record<string, string> = {
  uuid: '고유키',
  text: '글자',
  int: '숫자',
  float: '소수',
  enum: '선택값',
  date: '날짜',
  timestamp: '시각',
  bool: '참/거짓',
  boolean: '참/거짓',
  json: 'JSON',
};

function toKoType(type: string): string {
  return TYPE_KO[type.toLowerCase()] ?? type;
}

function relSymbol(type: RelationType): string {
  if (type === 'one-to-many') return '1 → 여러';
  if (type === 'one-to-one') return '1 → 1';
  return '여러 ↔ 여러';
}

function defaultExplanation(rel: Relationship, entities: Entity[]): string {
  const from = entities.find((e) => e.id === rel.from)?.label ?? rel.from;
  const to = entities.find((e) => e.id === rel.to)?.label ?? rel.to;
  if (rel.type === 'one-to-many') return `하나의 ${from}가 여러 ${to}를 가질 수 있어요.`;
  if (rel.type === 'one-to-one') return `${from}와 ${to}는 1:1로 짝을 이뤄요.`;
  return `${from}와 ${to}는 서로 여러 개로 연결될 수 있어요.`;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties }>> = {
  Users, Briefcase, Play, UserPlus, Receipt, CreditCard,
  Database, FileText, Calendar, UserCog, Tag, Bell,
};

function colorId(color: string) {
  return 'c' + color.replace('#', '');
}

function FieldRow({
  field,
  mode,
  entityLabelById,
}: {
  field: Field;
  mode: ViewMode;
  entityLabelById: Map<string, string>;
}) {
  const isFk = !!field.fk;
  const fkEntityLabel = field.fk ? entityLabelById.get(field.fk.entity) ?? field.fk.entity : '';
  return (
    <li className={`relative px-4 py-1.5 flex items-center gap-2 ${isFk ? 'bg-brand-50/60' : ''}`}>
      {isFk && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand-600/60" />}
      {field.pk ? (
        <Key size={11} className="text-amber-600 shrink-0" fill="#fde68a" strokeWidth={2.2} />
      ) : isFk ? (
        <Link2 size={11} className="text-brand-600 shrink-0" strokeWidth={2.2} />
      ) : (
        <span className="w-[11px] shrink-0" />
      )}
      <span className={`font-mono text-[11px] flex-1 truncate ${
        field.pk ? 'font-bold text-ink-900' : isFk ? 'text-brand-600 font-semibold' : 'text-ink-700'
      }`}>
        {field.name}
      </span>
      {isFk ? (
        <span className="font-mono text-[9px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded font-semibold shrink-0">
          →{mode === 'beginner' ? fkEntityLabel : field.fk!.entity}
        </span>
      ) : (
        <span className="font-mono text-[9px] text-ink-400 bg-ink-50 px-1.5 py-0.5 rounded shrink-0">
          {mode === 'beginner' ? toKoType(field.type) : field.type}
        </span>
      )}
    </li>
  );
}

function EntityCard({
  entity,
  group,
  mode,
  entityLabelById,
}: {
  entity: Entity;
  group?: EntityGroup;
  mode: ViewMode;
  entityLabelById: Map<string, string>;
}) {
  const Icon = (entity.icon && ICON_MAP[entity.icon]) || Database;
  const width = entity.width ?? 240;
  const groupColor = group?.color ?? '#1e3a8a';
  const accentBg = group?.accentBg ?? '#eff6ff';

  const primary = mode === 'beginner' ? entity.label : entity.name;
  const secondary = mode === 'beginner' ? entity.name : entity.label;

  return (
    <div
      className="absolute bg-white rounded-2xl overflow-hidden"
      style={{
        left: entity.x,
        top: entity.y,
        width,
        boxShadow: `0 4px 12px ${groupColor}14, 0 1px 2px rgba(0,0,0,0.05)`,
      }}
    >
      <div className="px-4 py-3 border-b border-ink-200">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: accentBg }}
          >
            <Icon size={14} style={{ color: groupColor }} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`${mode === 'beginner' ? 'text-[13px] font-bold text-ink-900 truncate' : 'font-mono text-[13px] font-bold text-ink-900 truncate'}`}>
              {primary}
            </div>
            <div className={`${mode === 'beginner' ? 'font-mono text-[10px] text-ink-500 truncate' : 'text-[10px] text-ink-500 truncate'}`}>
              {secondary}{group ? ` · ${group.name}` : ''}
            </div>
          </div>
          <span className="font-mono text-[9px] text-ink-400 bg-ink-50 border border-ink-200 rounded px-1.5 py-0.5 shrink-0">
            {entity.fields.length}
          </span>
        </div>
        {mode === 'beginner' && entity.description && (
          <div className="text-[10.5px] text-ink-500 mt-2 leading-snug">{entity.description}</div>
        )}
      </div>
      <ul className="divide-y divide-ink-100">
        {entity.fields.map((f) => (
          <FieldRow key={f.name} field={f} mode={mode} entityLabelById={entityLabelById} />
        ))}
      </ul>
    </div>
  );
}

function RelationshipPath({
  rel,
}: {
  rel: Relationship;
}) {
  const cid = colorId(rel.color);
  const displayLabel = rel.label;
  const labelW = displayLabel ? displayLabel.length * 7 + 20 : 0;
  return (
    <>
      <path
        d={rel.path}
        stroke={rel.color}
        strokeWidth={2}
        fill="none"
        markerStart={`url(#one-${cid})`}
        markerEnd={`url(#crow-${cid})`}
      />
      {displayLabel && rel.labelPos && (
        <g transform={`translate(${rel.labelPos.x}, ${rel.labelPos.y})`}>
          <rect x={-labelW / 2} y={-10} width={labelW} height={20} rx={10} fill={rel.color} />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            fontSize={10}
            fill="white"
            fontFamily="JetBrains Mono, monospace"
            fontWeight={600}
          >
            {displayLabel}
          </text>
        </g>
      )}
    </>
  );
}

function ModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors';
  return (
    <div className="absolute top-3 left-3 z-10 inline-flex gap-0.5 bg-white/95 backdrop-blur border border-ink-200 rounded-xl shadow-sm p-1">
      <button
        onClick={() => onChange('tech')}
        title="기술 뷰 (원본 필드명·타입)"
        className={`${base} ${mode === 'tech' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900'}`}
      >
        <Code2 size={12} />
        기술
      </button>
      <button
        onClick={() => onChange('beginner')}
        title="초보자 뷰 (한글 설명·관계 해설)"
        className={`${base} ${mode === 'beginner' ? 'bg-blue-600 text-white' : 'text-ink-500 hover:text-ink-900'}`}
      >
        <GraduationCap size={12} />
        초보자
      </button>
    </div>
  );
}

function ZoomControls({ onFit, scale }: { onFit: () => void; scale: number }) {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const btn = 'w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ink-50 text-ink-600 hover:text-ink-900 transition-colors';
  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col gap-0.5 bg-white/95 backdrop-blur border border-ink-200 rounded-xl shadow-sm p-1">
      <button onClick={() => zoomIn()} title="확대 (+)" className={btn}>
        <ZoomInIcon size={14} />
      </button>
      <button onClick={() => zoomOut()} title="축소 (−)" className={btn}>
        <ZoomOutIcon size={14} />
      </button>
      <div className="h-px bg-ink-100 my-0.5" />
      <button onClick={onFit} title="전체 보기 (F)" className={btn}>
        <Maximize2 size={14} />
      </button>
      <button onClick={() => resetTransform()} title="100% (0)" className={btn}>
        <RotateCcw size={14} />
      </button>
      <div className="h-px bg-ink-100 my-0.5" />
      <div className="text-[9px] text-center text-ink-500 font-mono font-semibold py-0.5">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}

function Minimap({
  canvas,
  entities,
  groups,
  transform,
  viewSize,
  onJump,
}: {
  canvas: { width: number; height: number };
  entities: Entity[];
  groups: EntityGroup[];
  transform: { scale: number; x: number; y: number };
  viewSize: { w: number; h: number };
  onJump: (cx: number, cy: number) => void;
}) {
  const mmW = 200;
  const mmH = Math.max(80, Math.round((canvas.height / canvas.width) * mmW));
  const sx = mmW / canvas.width;
  const sy = mmH / canvas.height;
  const groupColor = new Map(groups.map((g) => [g.id, g.color]));

  const viewX = transform.scale > 0 ? (-transform.x / transform.scale) * sx : 0;
  const viewY = transform.scale > 0 ? (-transform.y / transform.scale) * sy : 0;
  const viewW = transform.scale > 0 ? (viewSize.w / transform.scale) * sx : mmW;
  const viewH = transform.scale > 0 ? (viewSize.h / transform.scale) * sy : mmH;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // 클릭 좌표 → 캔버스 좌표
    const cx = mx / sx;
    const cy = my / sy;
    onJump(cx, cy);
  };

  return (
    <div className="absolute bottom-3 right-3 z-10 bg-white/95 backdrop-blur border border-ink-200 rounded-xl shadow-sm p-2">
      <div
        onClick={handleClick}
        className="relative cursor-crosshair"
        style={{ width: mmW, height: mmH, background: '#fafaf9' }}
      >
        {entities.map((e) => {
          const entW = e.width ?? 240;
          const entH = 55 + e.fields.length * 28;
          return (
            <div
              key={e.id}
              className="absolute rounded-sm"
              style={{
                left: e.x * sx,
                top: e.y * sy,
                width: Math.max(2, entW * sx),
                height: Math.max(2, entH * sy),
                background: groupColor.get(e.groupId) ?? '#1e3a8a',
                opacity: 0.55,
              }}
            />
          );
        })}
        <div
          className="absolute border-2 border-blue-500 rounded-sm pointer-events-none"
          style={{
            left: Math.max(0, Math.min(mmW - 4, viewX)),
            top: Math.max(0, Math.min(mmH - 4, viewY)),
            width: Math.max(6, Math.min(mmW, viewW)),
            height: Math.max(6, Math.min(mmH, viewH)),
            background: 'rgba(59, 130, 246, 0.08)',
          }}
        />
      </div>
    </div>
  );
}

function VerbGlossaryPanel({ relationships }: { relationships: Relationship[] }) {
  // 현재 ERD에 사용된 verb만 중복 제거하여 수집
  const usedVerbs = Array.from(
    new Set(
      relationships
        .map((r) => r.label?.trim())
        .filter((v): v is string => !!v)
        .map((v) => v.toLowerCase()),
    ),
  ).sort();

  if (usedVerbs.length === 0) return null;

  return (
    <div className="bg-ink-50/60 border border-ink-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <FileText size={16} className="text-ink-700" />
        <h3 className="text-[13px] font-bold text-ink-900">용어 사전</h3>
        <span className="text-[11px] text-ink-500">
          · 현재 ERD에 쓰인 관계 동사 {usedVerbs.length}개 (자동 수집)
        </span>
      </div>
      <p className="text-[11px] text-ink-500 mb-3">
        새 관계가 추가될 때마다 이 목록도 자동으로 업데이트됩니다. 설명은{' '}
        <code className="font-mono bg-white border border-ink-200 rounded px-1 py-0.5 text-[10px]">src/erd/glossary.ts</code>{' '}
        에서 관리하세요.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {usedVerbs.map((verb) => {
          const entry = lookupVerb(verb);
          return (
            <div
              key={verb}
              className={`bg-white rounded-xl border p-3 ${
                entry ? 'border-ink-200' : 'border-amber-300 bg-amber-50/60'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[11px] font-bold bg-ink-900 text-white px-1.5 py-0.5 rounded">
                  {verb}
                </span>
                {entry ? (
                  <span className="text-[12px] font-bold text-ink-900">= {entry.ko}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 rounded px-1.5 py-0.5">
                    등록 필요
                  </span>
                )}
              </div>
              {entry ? (
                <>
                  <div className="text-[11.5px] text-ink-700 leading-snug">{entry.description}</div>
                  {entry.example && (
                    <div className="text-[10.5px] text-ink-500 mt-1.5 italic">예: {entry.example}</div>
                  )}
                </>
              ) : (
                <div className="text-[11px] text-amber-900 leading-snug">
                  <code className="font-mono bg-white border border-amber-300 rounded px-1 py-0.5 text-[10px]">{verb}</code>
                  의 의미가 아직 사전에 없어요.{' '}
                  <code className="font-mono bg-white border border-amber-300 rounded px-1 py-0.5 text-[10px]">src/erd/glossary.ts</code>{' '}
                  의 <code className="font-mono text-[10px]">RELATION_VERBS</code>에 추가해 주세요.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ERDView({
  erd,
  showHeader = true,
}: {
  erd: ERD;
  showHeader?: boolean;
}) {
  const canvas = erd.canvas ?? { width: 1280, height: 600 };
  const uniqueColors = Array.from(new Set(erd.relationships.map((r) => r.color)));
  const groupById = new Map(erd.groups.map((g) => [g.id, g]));
  const entityLabelById = new Map(erd.entities.map((e) => [e.id, e.label]));

  const [mode, setMode] = useState<ViewMode>('tech');

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<ReactZoomPanPinchRef>(null);
  const [viewSize, setViewSize] = useState({ w: 0, h: 0 });
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const didInitialFit = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setViewSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitToView = useCallback(
    (animate = true) => {
      if (!wrapperRef.current) return;
      if (viewSize.w === 0 || viewSize.h === 0) return;
      const scaleX = viewSize.w / canvas.width;
      const scaleY = viewSize.h / canvas.height;
      const fitScale = Math.min(scaleX, scaleY) * 0.95;
      const x = (viewSize.w - canvas.width * fitScale) / 2;
      const y = (viewSize.h - canvas.height * fitScale) / 2;
      wrapperRef.current.setTransform(x, y, fitScale, animate ? 280 : 0);
    },
    [viewSize, canvas.width, canvas.height],
  );

  // 최초 로드 시 자동 Fit
  useEffect(() => {
    if (!didInitialFit.current && viewSize.w > 0 && viewSize.h > 0) {
      didInitialFit.current = true;
      fitToView(false);
    }
  }, [viewSize.w, viewSize.h, fitToView]);

  // 키보드 단축키
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        fitToView();
      } else if (e.key === '0') {
        e.preventDefault();
        wrapperRef.current?.resetTransform(280);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fitToView]);

  const jumpTo = useCallback(
    (cx: number, cy: number) => {
      if (!wrapperRef.current) return;
      const s = transform.scale;
      const x = viewSize.w / 2 - cx * s;
      const y = viewSize.h / 2 - cy * s;
      wrapperRef.current.setTransform(x, y, s, 200);
    },
    [transform.scale, viewSize.w, viewSize.h],
  );

  return (
    <div className="space-y-4 pb-12">
      {showHeader && (
        <header>
          <div className="text-kicker mb-2">ERD</div>
          <h1 className="text-page">{erd.project} 데이터 모델</h1>
          {erd.vision && (
            <p className="text-body text-ink-500 mt-2">{erd.vision}</p>
          )}
          <div className="text-meta mt-2">
            업데이트 {erd.updated} · 스키마 v{erd.version} · {erd.entities.length} 엔티티 · {erd.relationships.length} 관계
          </div>
        </header>
      )}

      {/* 초보자 뷰 상단: 1분 가이드 + 용어 사전 */}
      {mode === 'beginner' && (
        <div className="space-y-4">
          <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap size={16} className="text-amber-700" />
              <h3 className="text-[13px] font-bold text-ink-900">1분 가이드 · ERD란?</h3>
            </div>
            <p className="text-[12px] text-ink-700 leading-relaxed mb-3">
              ERD는 <strong>데이터가 어떻게 연결되어 있는지</strong> 그린 지도예요.
              박스 하나 = 하나의 &quot;표(테이블)&quot;이고, 박스를 잇는 선은 표끼리의 관계를 나타내요.
              선 위의 <code className="font-mono text-[11px] bg-white border border-amber-100 rounded px-1">has</code>,{' '}
              <code className="font-mono text-[11px] bg-white border border-amber-100 rounded px-1">contains</code>{' '}
              같은 단어가 무슨 뜻인지는 아래 &quot;용어 사전&quot;을 참고하세요.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-3 border border-amber-100">
                <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">관계선 읽는 법</div>
                <div className="text-[11px] text-ink-700 leading-snug">
                  선 끝이 <strong>까마귀 발(crow&apos;s foot)</strong> 모양 = 그 쪽이 &quot;여러 개&quot;.{' '}
                  <br />선 끝이 <strong>단일선</strong> = 그 쪽이 &quot;1개&quot;.
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-amber-100">
                <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">외래키 (FK)</div>
                <div className="text-[11px] text-ink-700 leading-snug">
                  파란 배경의 필드. 다른 표를 가리키는 <strong>연결 고리</strong>예요.
                  <br />예: projects의 client_id → clients
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-amber-100">
                <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">기본키 (PK)</div>
                <div className="text-[11px] text-ink-700 leading-snug">
                  노란 열쇠 아이콘이 있는 필드. 해당 표에서 <strong>고유한 식별자</strong>.
                  <br />보통 `id` 필드 하나.
                </div>
              </div>
            </div>
          </div>

          <VerbGlossaryPanel relationships={erd.relationships} />
        </div>
      )}

      {/* 캔버스 */}
      <div
        ref={containerRef}
        className="relative bg-white border border-ink-200 rounded-2xl overflow-hidden shadow-sm"
        style={{ height: 'clamp(520px, 72vh, 860px)' }}
      >
        <TransformWrapper
          ref={wrapperRef}
          minScale={0.2}
          maxScale={2.5}
          initialScale={1}
          wheel={{ step: 0.12, activationKeys: ['Meta', 'Control'] }}
          pinch={{ step: 5 }}
          doubleClick={{ disabled: true }}
          limitToBounds={false}
          centerZoomedOut={false}
          onTransformed={(_, state) =>
            setTransform({ scale: state.scale, x: state.positionX, y: state.positionY })
          }
        >
          <ModeToggle mode={mode} onChange={setMode} />
          <ZoomControls onFit={() => fitToView(true)} scale={transform.scale} />
          <Minimap
            canvas={canvas}
            entities={erd.entities}
            groups={erd.groups}
            transform={transform}
            viewSize={viewSize}
            onJump={jumpTo}
          />
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{ width: canvas.width, height: canvas.height }}
          >
            <div
              className="relative"
              style={{
                width: canvas.width,
                height: canvas.height,
                background: 'linear-gradient(135deg, #fafaf9 0%, #f5f4f2 100%)',
              }}
            >
              {/* 도트 그리드 + 마커 정의 */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <pattern id="erd-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="#d6d3d1" opacity={0.35} />
                  </pattern>
                  {uniqueColors.map((color) => {
                    const cid = colorId(color);
                    return (
                      <Fragment key={cid}>
                        <marker
                          id={`crow-${cid}`}
                          viewBox="0 0 16 16"
                          refX={14}
                          refY={8}
                          markerWidth={14}
                          markerHeight={14}
                          orient="auto"
                        >
                          <path
                            d="M 0 8 L 14 2 M 0 8 L 14 8 M 0 8 L 14 14"
                            stroke={color}
                            strokeWidth={2}
                            fill="none"
                            strokeLinecap="round"
                          />
                        </marker>
                        <marker
                          id={`one-${cid}`}
                          viewBox="0 0 16 16"
                          refX={4}
                          refY={8}
                          markerWidth={10}
                          markerHeight={14}
                          orient="auto"
                        >
                          <path
                            d="M 4 2 L 4 14"
                            stroke={color}
                            strokeWidth={2.25}
                            strokeLinecap="round"
                          />
                        </marker>
                      </Fragment>
                    );
                  })}
                </defs>
                <rect width="100%" height="100%" fill="url(#erd-dots)" />
              </svg>

              {/* 관계선 */}
              <svg
                className="absolute inset-0 pointer-events-none"
                width={canvas.width}
                height={canvas.height}
              >
                {erd.relationships.map((rel, i) => (
                  <RelationshipPath key={i} rel={rel} />
                ))}
              </svg>

              {/* 엔티티 카드 */}
              {erd.entities.map((e) => (
                <EntityCard
                  key={e.id}
                  entity={e}
                  group={groupById.get(e.groupId)}
                  mode={mode}
                  entityLabelById={entityLabelById}
                />
              ))}
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>

      {/* 범례 + 단축키 */}
      <div className="flex items-center gap-4 text-[11px] text-ink-500 flex-wrap">
        {erd.groups.map((g) => (
          <span key={g.id} className="inline-flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full" style={{ background: g.color }} />
            {g.name}
          </span>
        ))}
        <span className="text-ink-400">· crow&apos;s foot = 1..N · 단일선 = 1</span>
        <span className="text-ink-400 ml-auto">
          <kbd className="px-1.5 py-0.5 border border-[#d6d3d1] rounded bg-white font-mono text-[10px]">F</kbd> 전체 보기 ·{' '}
          <kbd className="px-1.5 py-0.5 border border-[#d6d3d1] rounded bg-white font-mono text-[10px]">0</kbd> 리셋 ·{' '}
          <kbd className="px-1.5 py-0.5 border border-[#d6d3d1] rounded bg-white font-mono text-[10px]">⌘</kbd>/
          <kbd className="px-1.5 py-0.5 border border-[#d6d3d1] rounded bg-white font-mono text-[10px]">Ctrl</kbd> + 휠 줌 · 드래그 팬
        </span>
      </div>

      {/* 초보자 뷰 하단: 관계 해설 */}
      {mode === 'beginner' && (
        <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap size={16} className="text-blue-600" />
            <h3 className="text-[13px] font-bold text-ink-900">관계 해설</h3>
            <span className="text-[11px] text-ink-500">· 박스끼리 어떻게 이어져 있는지</span>
          </div>
          <ul className="space-y-2.5">
            {erd.relationships.map((rel, i) => {
              const fromLabel = entityLabelById.get(rel.from) ?? rel.from;
              const toLabel = entityLabelById.get(rel.to) ?? rel.to;
              const text = rel.explanation ?? defaultExplanation(rel, erd.entities);
              const verbEntry = lookupVerb(rel.label);
              return (
                <li key={i} className="flex items-start gap-3 text-[12px]">
                  <span
                    className="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-white text-[10px] font-bold shrink-0"
                    style={{ background: rel.color }}
                  >
                    {rel.label ?? relSymbol(rel.type)}
                  </span>
                  <span className="font-semibold text-ink-900 shrink-0">
                    {fromLabel} <span className="text-ink-400 mx-1">→</span> {toLabel}
                  </span>
                  <span className="text-ink-600 leading-snug">
                    {verbEntry && <span className="text-ink-900 font-semibold">({verbEntry.ko}) </span>}
                    {text}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
