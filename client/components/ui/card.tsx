'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLMotionProps<'div'> {
  interactive?: boolean;
  glow?: boolean;
  children?: React.ReactNode;
}

const baseClasses =
  'relative overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft transition-colors duration-300';

export function Card({
  className,
  interactive = false,
  glow = false,
  children,
  ...props
}: CardProps) {
  return (
    <motion.div
      className={cn(
        baseClasses,
        interactive && 'hover:border-brand-200 hover:shadow-card',
        className,
      )}
      whileHover={interactive ? { y: -6 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      {...props}
    >
      {glow && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl"
          initial={{ opacity: 0, scale: 0.6 }}
          whileHover={{ opacity: 1, scale: 1.15 }}
          transition={{ duration: 0.6 }}
        />
      )}
      {children}
    </motion.div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLMotionProps<'div'>) {
  return (
    <motion.div className={cn('flex flex-col gap-1.5 p-6', className)} {...props}>
      {children}
    </motion.div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLMotionProps<'h3'>) {
  return (
    <motion.h3
      className={cn('text-lg font-semibold tracking-tight text-ink-900', className)}
      {...props}
    >
      {children}
    </motion.h3>
  );
}

export function CardDescription({ className, children, ...props }: HTMLMotionProps<'p'>) {
  return (
    <motion.p className={cn('text-sm leading-relaxed text-ink-500', className)} {...props}>
      {children}
    </motion.p>
  );
}

export function CardContent({ className, children, ...props }: HTMLMotionProps<'div'>) {
  return (
    <motion.div className={cn('p-6 pt-0', className)} {...props}>
      {children}
    </motion.div>
  );
}

export function CardFooter({ className, children, ...props }: HTMLMotionProps<'div'>) {
  return (
    <motion.div className={cn('flex items-center gap-3 p-6 pt-0', className)} {...props}>
      {children}
    </motion.div>
  );
}

export default Card;
