'use client';

import { Fragment } from 'react';
import {
  Users, Briefcase, Play, UserPlus, Receipt, CreditCard,
  Database, FileText, Calendar, UserCog, Tag, Bell,
  Key, Link2,
} from 'lucide-react';
import type { ERD, Entity, Field, Relationship, EntityGroup } from '@/erd/types';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties }>> = {
  Users, Briefcase, Play, UserPlus, Receipt, CreditCard,
  Database, FileText, Calendar, UserCog, Tag, Bell,
};

function colorId(color: string) {
  return 'c' + color.replace('#', '');
}

function FieldRow({ field }: { field: Field }) {
  const isFk = !!field.fk;
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
          →{field.fk!.entity}
        </span>
      ) : (
        <span className="font-mono text-[9px] text-ink-400 bg-ink-50 px-1.5 py-0.5 rounded shrink-0">
          {field.type}
        </span>
      )}
    </li>
  );
}

function EntityCard({ entity, group }: { entity: Entity; group?: EntityGroup }) {
  const Icon = (entity.icon && ICON_MAP[entity.icon]) || Database;
  const width = entity.width ?? 240;
  const groupColor = group?.color ?? '#1e3a8a';
  const accentBg = group?.accentBg ?? '#eff6ff';
  return (
    <div
      className="absolute bg-white rounded-2xl overflow-hidden transition-transform hover:-translate-y-0.5"
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
            <div className="font-mono text-[13px] font-bold text-ink-900 truncate">{entity.name}</div>
            <div className="text-[10px] text-ink-500 truncate">
              {entity.label}{group ? ` · ${group.name}` : ''}
            </div>
          </div>
          <span className="font-mono text-[9px] text-ink-400 bg-ink-50 border border-ink-200 rounded px-1.5 py-0.5 shrink-0">
            {entity.fields.length}
          </span>
        </div>
      </div>
      <ul className="divide-y divide-ink-100">
        {entity.fields.map((f) => (
          <FieldRow key={f.name} field={f} />
        ))}
      </ul>
    </div>
  );
}

function RelationshipPath({ rel }: { rel: Relationship }) {
  const cid = colorId(rel.color);
  const labelW = rel.label ? rel.label.length * 7 + 20 : 0;
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
      {rel.label && rel.labelPos && (
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
            {rel.label}
          </text>
        </g>
      )}
    </>
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

      {/* 캔버스 */}
      <div className="bg-white border border-ink-200 rounded-2xl overflow-auto shadow-sm">
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
            <EntityCard key={e.id} entity={e} group={groupById.get(e.groupId)} />
          ))}
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 text-[11px] text-ink-500 flex-wrap">
        {erd.groups.map((g) => (
          <span key={g.id} className="inline-flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full" style={{ background: g.color }} />
            {g.name}
          </span>
        ))}
        <span className="text-ink-400">· crow's foot = 1..N · 단일선 = 1</span>
      </div>
    </div>
  );
}
