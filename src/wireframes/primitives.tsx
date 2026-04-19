import { type HTMLAttributes, type ReactNode } from 'react';

/**
 * 와이어프레임 전용 저가공 프리미티브.
 * 색/이미지 금지 — 점선·회색 박스·mono 텍스트만 사용.
 */

export function WFrame({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-white border border-dashed border-ink-300 rounded-lg font-mono text-[11px] text-ink-500 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function WBox({
  label,
  h = 40,
  className = '',
}: {
  label?: string;
  h?: number;
  className?: string;
}) {
  return (
    <div
      className={`bg-ink-100 border border-dashed border-ink-300 rounded flex items-center justify-center text-[10px] font-mono text-ink-400 uppercase tracking-wider ${className}`}
      style={{ minHeight: h }}
    >
      {label}
    </div>
  );
}

export function WLine({ w = '100%', thick = false }: { w?: string; thick?: boolean }) {
  return (
    <div
      className={`bg-ink-200 rounded ${thick ? 'h-2' : 'h-1'}`}
      style={{ width: w }}
    />
  );
}

export function WLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-mono text-ink-400 uppercase tracking-wider">
      {children}
    </span>
  );
}

export function WHeading({ size = 'lg', w = '40%' }: { size?: 'sm' | 'md' | 'lg'; w?: string }) {
  const h = size === 'sm' ? 'h-2' : size === 'md' ? 'h-3' : 'h-4';
  return <div className={`bg-ink-300 rounded ${h}`} style={{ width: w }} />;
}

export function WText({ lines = 3, lastShort = true }: { lines?: number; lastShort?: boolean }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: lines }).map((_, i) => {
        const isLast = i === lines - 1;
        const width = isLast && lastShort ? '65%' : '100%';
        return <WLine key={i} w={width} />;
      })}
    </div>
  );
}

export function WStack({ children, gap = 3 }: { children: ReactNode; gap?: number }) {
  return <div className="flex flex-col" style={{ gap: gap * 4 }}>{children}</div>;
}

export function WRow({ children, gap = 3 }: { children: ReactNode; gap?: number }) {
  return <div className="flex" style={{ gap: gap * 4 }}>{children}</div>;
}
