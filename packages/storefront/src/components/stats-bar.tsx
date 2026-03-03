'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from './store-provider';
import { useReveal } from '@/hooks/use-reveal';
import { cn } from '@/lib/utils';

interface Stat {
  label: string;
  value: string;
  /** Numeric part for animation (e.g. 10000 from "10,000+") */
  numericValue?: number;
}

const DEFAULT_STATS: Stat[] = [
  { label: 'Happy Customers', value: '10,000+', numericValue: 10000 },
  { label: 'Products', value: '500+', numericValue: 500 },
  { label: 'Cities Delivered', value: '100+', numericValue: 100 },
  { label: 'Years in Business', value: '5+', numericValue: 5 },
];

interface StatsBarProps {
  stats?: Stat[];
}

export function StatsBar({ stats = DEFAULT_STATS }: StatsBarProps) {
  const { design } = useStore();
  const p = design.palette;
  const [revRef, visible] = useReveal(0.2);

  return (
    <section
      ref={revRef as React.RefObject<HTMLElement>}
      className={cn('py-8 md:py-10 transition-all duration-600', visible ? 'reveal-visible' : 'reveal-hidden')}
      style={{ backgroundColor: p.surface }}
    >
      <div className="container-store">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((stat, i) => (
            <AnimatedStat key={i} stat={stat} visible={visible} index={i} palette={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AnimatedStat({ stat, visible, index, palette }: { stat: Stat; visible: boolean; index: number; palette: any }) {
  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    if (!visible || !stat.numericValue) {
      if (visible) setDisplayValue(stat.value);
      return;
    }

    const target = stat.numericValue;
    const duration = 1200;
    const startTime = Date.now() + index * 150; // stagger start

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      if (elapsed < 0) {
        requestAnimationFrame(animate);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);

      if (target >= 1000) {
        setDisplayValue(current.toLocaleString('en-IN') + (stat.value.includes('+') ? '+' : ''));
      } else {
        setDisplayValue(current + (stat.value.includes('+') ? '+' : ''));
      }

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [visible, stat, index]);

  return (
    <div style={{ animationDelay: `${index * 60}ms` }}>
      <div
        className="text-2xl md:text-3xl font-bold font-display tabular-nums"
        style={{ color: palette.primary }}
      >
        {visible ? displayValue : '0'}
      </div>
      <div className="text-xs mt-1" style={{ color: palette.textMuted }}>
        {stat.label}
      </div>
    </div>
  );
}
