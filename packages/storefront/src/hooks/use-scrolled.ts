'use client';

import { useState, useEffect } from 'react';

/**
 * useScrolled — Detects if user has scrolled past a threshold.
 * Used for glassmorphism navbar: transparent at top, frosted-glass after scroll.
 */
export function useScrolled(threshold = 60): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > threshold);
    };

    // Check initial state
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return scrolled;
}
