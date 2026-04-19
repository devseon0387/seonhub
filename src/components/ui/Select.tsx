import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

type Size = 'sm' | 'md' | 'lg';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: Option[];
  selectSize?: Size;
  invalid?: boolean;
  placeholder?: string;
}

const SIZE: Record<Size, string> = {
  sm: 'h-8 pl-2.5 pr-8 text-[12px] rounded-md',
  md: 'h-9 pl-3 pr-9 text-[13px] rounded-lg',
  lg: 'h-10 pl-3.5 pr-10 text-[14px] rounded-lg',
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, selectSize = 'md', invalid = false, placeholder, className = '', ...rest },
  ref,
) {
  const border = invalid ? 'border-bad-500' : 'border-ink-200 focus:border-brand-500';
  return (
    <div className="relative inline-block w-full">
      <select
        ref={ref}
        className={`appearance-none w-full bg-white text-ink-900 border ${border} focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-ink-50 disabled:text-ink-400 transition-colors ${SIZE[selectSize]} ${className}`}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400"
      />
    </div>
  );
});

export default Select;
