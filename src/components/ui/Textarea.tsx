import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid = false, className = '', rows = 4, ...rest },
  ref,
) {
  const border = invalid ? 'border-bad-500' : 'border-ink-200 focus:border-brand-500';
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`w-full bg-white text-ink-900 text-[13px] leading-relaxed border ${border} rounded-lg px-3 py-2.5 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-ink-50 disabled:text-ink-400 resize-y transition-colors ${className}`}
      {...rest}
    />
  );
});

export default Textarea;
