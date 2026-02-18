'use client';

import { InputHTMLAttributes, TextareaHTMLAttributes, useState } from 'react';

interface FloatingLabelInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
}

interface FloatingLabelTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  required?: boolean;
}

export function FloatingLabelInput({ label, required, className = '', ...props }: FloatingLabelInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = props.value !== undefined && props.value !== '';

  const isFloating = isFocused || hasValue;

  return (
    <div className="relative">
      <input
        {...props}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        className={`
          w-full px-4 pt-6 pb-2 border border-gray-300 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-all duration-200
          ${className}
        `}
        placeholder=""
      />
      <label
        className={`
          absolute left-4 transition-all duration-200 pointer-events-none
          ${isFloating
            ? 'top-1.5 text-xs text-blue-600 font-medium'
            : 'top-1/2 -translate-y-1/2 text-base text-gray-500'
          }
        `}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    </div>
  );
}

export function FloatingLabelTextarea({ label, required, className = '', rows = 3, ...props }: FloatingLabelTextareaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = props.value !== undefined && props.value !== '';

  const isFloating = isFocused || hasValue;

  return (
    <div className="relative">
      <textarea
        {...props}
        rows={rows}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        className={`
          w-full px-4 pt-6 pb-2 border border-gray-300 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-all duration-200 resize-none
          ${className}
        `}
        placeholder=""
      />
      <label
        className={`
          absolute left-4 transition-all duration-200 pointer-events-none
          ${isFloating
            ? 'top-1.5 text-xs text-blue-600 font-medium'
            : 'top-4 text-base text-gray-500'
          }
        `}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    </div>
  );
}
