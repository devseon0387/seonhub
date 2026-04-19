import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode;
  description?: ReactNode;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className = '', disabled, checked, ...rest },
  ref,
) {
  return (
    <label
      className={`inline-flex items-start gap-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className}`}
    >
      <span className="relative inline-flex items-center justify-center h-4 w-4 mt-0.5 shrink-0">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className="peer absolute inset-0 opacity-0"
          {...rest}
        />
        <span
          className={`h-4 w-4 rounded border border-ink-300 bg-white transition-colors peer-checked:bg-brand-600 peer-checked:border-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/30`}
        />
        <Check
          size={12}
          strokeWidth={3}
          className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
        />
      </span>
      {(label || description) && (
        <span className="flex flex-col gap-0.5">
          {label && <span className="text-[13px] text-ink-900">{label}</span>}
          {description && <span className="text-[11px] text-ink-500">{description}</span>}
        </span>
      )}
    </label>
  );
});

export default Checkbox;
