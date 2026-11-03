'use client';

import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

type Variant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'glass'
  | 'signal'
  | 'ink'
  | 'outlineLight';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-soft hover:bg-brand-500 hover:shadow-glow disabled:hover:bg-brand-600',
  secondary: 'bg-ink-900 text-white hover:bg-brand-700 hover:shadow-glow disabled:hover:bg-ink-900',
  outline:
    'border border-brand-200 bg-white text-brand-700 hover:border-brand-400 hover:bg-brand-50',
  ghost: 'text-ink-600 hover:bg-brand-50 hover:text-brand-700',
  danger: 'bg-rose-600 text-white hover:bg-rose-500 hover:shadow-glow',
  glass: 'glass text-brand-700 hover:bg-white/90',
  signal:
    'bg-signal-300 text-ink-950 shadow-soft hover:bg-signal-200 hover:shadow-glow disabled:hover:bg-signal-300',
  ink: 'bg-ink-950 text-white hover:bg-brand-700 disabled:hover:bg-ink-950',
  outlineLight: 'border border-white/15 bg-white/5 text-white hover:bg-white/10',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
  icon: 'h-10 w-10 p-0',
};

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: Variant;
  size?: Size;
  href?: string;
  loading?: boolean;
  children?: React.ReactNode;
}

const baseClasses =
  'inline-flex select-none items-center justify-center rounded-full font-medium tracking-tight transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    href,
    loading = false,
    children,
    disabled,
    ...props
  },
  ref,
) {
  const classes = cn(baseClasses, variants[variant], sizes[size], className);

  const content = (
    <>
      {loading && (
        <motion.span
          aria-hidden
          className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      )}
      {children}
    </>
  );

  if (href) {
    return (
      <motion.a
        href={href}
        className={classes}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 24 }}
        {...(props as React.ComponentProps<typeof motion.a>)}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      {...props}
    >
      {content}
    </motion.button>
  );
});

export default Button;
