import { forwardRef, type InputHTMLAttributes } from 'react';

type Size = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  inputSize?: Size;
  invalid?: boolean;
}

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[12px] rounded-md',
  md: 'h-9 px-3 text-[13px] rounded-lg',
  lg: 'h-10 px-3.5 text-[14px] rounded-lg',
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { inputSize = 'md', invalid = false, className = '', ...rest },
  ref,
) {
  const border = invalid ? 'border-bad-500' : 'border-ink-200 focus:border-brand-500';
  return (
    <input
      ref={ref}
      className={`w-full bg-white text-ink-900 border ${border} placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-ink-50 disabled:text-ink-400 transition-colors ${SIZE[inputSize]} ${className}`}
      {...rest}
    />
  );
});

export default Input;
