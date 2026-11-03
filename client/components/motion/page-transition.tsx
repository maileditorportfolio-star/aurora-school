'use client';

import { motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

const pageVariants: Variants = {
  initial: { opacity: 0, y: 18 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  },
};

/** Wraps every route in a soft enter/exit transition. Mounted from `app/template.tsx`. */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn('min-h-[60vh]', className)}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
