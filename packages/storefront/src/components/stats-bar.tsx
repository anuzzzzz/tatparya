'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from './store-provider';
import { useReveal } from '@/hooks/use-reveal';
import { cn } from '@/lib/utils';

interface StatItem {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
}

const DEFAULT_STATS: StatItem[] = [
  { value: 5000, suffix: '+', label: 'Happy Customers' },
  { value: 150, suffix: '+', label: 'Products' },
  { value: 4.8, label: 'Customer Rating' },
  { value: 10, suffix: '+', label: 'Years of Craft' },
];

export function StatsBar() {
  const { design, config } = useStore();
  const stats = (config as any)?.stats || DEFAULT_STATS;
  const [ref, visible] = useReveal(0.2);

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={cn('py-10 md:py-14 transition-all duration-700', visible ? 'reveal-visible' : 'reveal-hidden')}
      style={{ backgroundColor: design.palette.surface }}
    >
      <div className="container-store">
        <div className="flex items-center justify-center gap-10 md:gap-20 flex-wrap">
          {stats.map((stat: StatItem, i: number) => (
            <div key={i} className="text-center">
              <AnimatedNumber
                value={stat.value}
                suffix={stat.suffix}
                prefix={stat.prefix}
                active={visible}
                delay={i * 150}
                color={design.palette.text}
                displayFont={true}
              />
              <p className="text-[11px] md:text-xs mt-1 font-medium tracking-wide uppercase"
                style={{ color: design.palette.textMuted, letterSpacing: '0.08em' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AnimatedNumber({ value, suffix, prefix, active, delay, color, displayFont }: {
  value: number;
  suffix?: string;
  prefix?: string;
  active: boolean;
  delay: number;
  color: string;
  displayFont?: boolean;
}) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (!active) return;

    const timeout = setTimeout(() => {
      const duration = 1200;
      const start = performance.now();
      const isFloat = value % 1 !== 0;

      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = eased * value;
        setDisplay(isFloat ? parseFloat(current.toFixed(1)) : Math.floor(current));
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        }
      };

      frameRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [active, value, delay]);

  return (
    <span
      className="text-2xl md:text-3xl font-bold tabular-nums"
      style={{
        color,
        fontFamily: displayFont ? 'var(--font-display)' : undefined,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {prefix}{active ? display : 0}{suffix}
    </span>
  );
}
