'use client';

import { useRef, useState, useEffect } from 'react';

/**
 * useReveal — Scroll-triggered reveal using IntersectionObserver.
 * Fires once, then disconnects. Used for fade-up / stagger entrance animations.
 *
 * @param threshold — How much of the element must be visible (0-1). Default 0.15.
 * @returns [ref, isVisible] — Attach ref to the section wrapper.
 */
export function useReveal(threshold = 0.15): [React.RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
}
