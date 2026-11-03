'use client';

import { motion, useScroll, useSpring } from 'framer-motion';

/** A thin aurora progress line that tracks scroll position. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    mass: 0.25,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-gradient-to-r from-brand-500 via-cyan-300 to-signal-300"
    />
  );
}

export default ScrollProgress;
