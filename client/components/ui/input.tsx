'use client';

import { forwardRef, useId, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, hint, icon, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink-700">
          {label}
        </label>
      )}

      <motion.div
        animate={{
          boxShadow: focused ? '0 0 0 4px rgb(20 184 166 / 0.16)' : '0 0 0 0px rgb(20 184 166 / 0)',
        }}
        transition={{ duration: 0.2 }}
        className={cn(
          'relative flex items-center rounded-2xl border bg-white transition-colors duration-200',
          error
            ? 'border-rose-300'
            : focused
              ? 'border-brand-400'
              : 'border-ink-200 hover:border-ink-300',
        )}
      >
        {icon && <span className="absolute left-4 text-ink-400">{icon}</span>}
        <input
          id={inputId}
          ref={ref}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          className={cn(
            'h-12 w-full rounded-2xl bg-transparent px-4 text-sm text-ink-900 outline-none placeholder:text-ink-400',
            icon ? 'pl-11' : '',
            className,
          )}
          {...props}
        />
      </motion.div>

      {error ? (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-medium text-rose-600"
        >
          {error}
        </motion.p>
      ) : hint ? (
        <p className="text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, error, id, ...props },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={fieldId} className="text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        ref={ref}
        className={cn(
          'min-h-[120px] w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition-shadow placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10',
          error && 'border-rose-300',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
});

export default Input;
