import { type ReactNode } from 'react';

interface TabItem {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  count?: number | string;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE = {
  sm: { tab: 'h-7 px-2.5 text-[11px] gap-1', indicator: 'h-[2px]' },
  md: { tab: 'h-9 px-3 text-[13px] gap-1.5', indicator: 'h-[2px]' },
};

export default function Tabs({ items, value, onChange, size = 'md', className = '' }: TabsProps) {
  const cfg = SIZE[size];
  return (
    <div className={`inline-flex items-center border-b border-ink-200 ${className}`}>
      {items.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            disabled={t.disabled}
            onClick={() => onChange(t.value)}
            className={`relative inline-flex items-center font-medium transition-colors ${cfg.tab} ${
              active
                ? 'text-ink-900'
                : 'text-ink-500 hover:text-ink-700 disabled:text-ink-300'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span className="ml-1 text-[10px] bg-ink-100 text-ink-600 px-1.5 py-0.5 rounded-md font-semibold tabular-nums">
                {t.count}
              </span>
            )}
            {active && (
              <span
                className={`absolute left-0 right-0 -bottom-px bg-brand-600 ${cfg.indicator}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
