'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollectionFiltersProps {
  categories: any[];
  currentSlug: string;
  storeUrl: string;
  searchParams: Record<string, string | undefined>;
}

export function CollectionFilters({ categories, currentSlug, storeUrl, searchParams }: CollectionFiltersProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(searchParams.minPrice || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.maxPrice || '');

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (searchParams.search) params.set('search', searchParams.search);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    const qs = params.toString();
    router.push(`${storeUrl}/collections/${currentSlug}${qs ? `?${qs}` : ''}`);
    setOpen(false);
  };

  const clearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    const params = new URLSearchParams();
    if (searchParams.search) params.set('search', searchParams.search);
    const qs = params.toString();
    router.push(`${storeUrl}/collections/${currentSlug}${qs ? `?${qs}` : ''}`);
    setOpen(false);
  };

  const hasFilters = !!searchParams.minPrice || !!searchParams.maxPrice;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-xs font-medium border transition-colors',
          hasFilters && 'border-[var(--color-primary)]',
        )}
        style={{ borderRadius: 'var(--radius)', borderColor: hasFilters ? undefined : 'color-mix(in srgb, var(--color-text) 15%, transparent)' }}
      >
        <SlidersHorizontal size={14} />
        Filters
        {hasFilters && (
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--color-primary)' }}
          />
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div
            className="absolute right-0 top-full mt-2 z-50 w-64 p-4 shadow-lg border"
            style={{
              backgroundColor: 'var(--color-background)',
              borderRadius: 'var(--radius-lg)',
              borderColor: 'color-mix(in srgb, var(--color-text) 8%, transparent)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                Price Range
              </h4>
              <button onClick={() => setOpen(false)} className="p-1 hover:opacity-60">
                <X size={14} />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="number"
                placeholder="Min ₹"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="input-field !py-2 text-xs w-full"
                inputMode="numeric"
              />
              <span className="text-sm self-center" style={{ color: 'var(--color-text-muted)' }}>—</span>
              <input
                type="number"
                placeholder="Max ₹"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="input-field !py-2 text-xs w-full"
                inputMode="numeric"
              />
            </div>

            <div className="flex gap-2">
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="btn-secondary flex-1 text-xs !py-2"
                >
                  Clear
                </button>
              )}
              <button
                onClick={applyFilters}
                className="btn-primary flex-1 text-xs !py-2"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
