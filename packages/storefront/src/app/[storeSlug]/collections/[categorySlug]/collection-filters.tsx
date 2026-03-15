'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, X, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollectionFiltersProps {
  categories: any[];
  currentSlug: string;
  storeUrl: string;
  searchParams: Record<string, string | undefined>;
}

export function CollectionFilters({ currentSlug, storeUrl, searchParams }: CollectionFiltersProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(searchParams.minPrice || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.maxPrice || '');
  const [searchInput, setSearchInput] = useState(searchParams.search || '');

  // Debounced search — navigate after 300ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only navigate if the value differs from the current URL param
      if (searchInput === (searchParams.search || '')) return;
      const params = new URLSearchParams();
      if (searchInput) params.set('search', searchInput);
      if (searchParams.minPrice) params.set('minPrice', searchParams.minPrice);
      if (searchParams.maxPrice) params.set('maxPrice', searchParams.maxPrice);
      if (searchParams.sort) params.set('sort', searchParams.sort);
      const qs = params.toString();
      router.push(`${storeUrl}/collections/${currentSlug}${qs ? `?${qs}` : ''}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const merged = {
      search: searchParams.search,
      minPrice: searchParams.minPrice,
      maxPrice: searchParams.maxPrice,
      sort: searchParams.sort,
      ...overrides,
    };
    const params = new URLSearchParams();
    if (merged.search) params.set('search', merged.search);
    if (merged.minPrice) params.set('minPrice', merged.minPrice);
    if (merged.maxPrice) params.set('maxPrice', merged.maxPrice);
    if (merged.sort) params.set('sort', merged.sort);
    const qs = params.toString();
    return `${storeUrl}/collections/${currentSlug}${qs ? `?${qs}` : ''}`;
  };

  const applyFilters = () => {
    router.push(buildUrl({ minPrice: minPrice || undefined, maxPrice: maxPrice || undefined }));
    setOpen(false);
  };

  const clearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    router.push(buildUrl({ minPrice: undefined, maxPrice: undefined }));
    setOpen(false);
  };

  const handleSort = (value: string) => {
    router.push(buildUrl({ sort: value || undefined }));
  };

  const hasFilters = !!searchParams.minPrice || !!searchParams.maxPrice;

  return (
    <div className="flex flex-col gap-3 w-full md:w-auto">
      {/* Search bar — full width on mobile, fixed width on desktop */}
      <div className="relative w-full md:w-64">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--color-text-muted)' }}
        />
        <input
          type="text"
          placeholder="Search products..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="input-field !pl-8 !py-2 text-xs w-full"
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 opacity-50 hover:opacity-100"
            aria-label="Clear search"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Sort + Filter row */}
      <div className="flex items-center gap-2">
        {/* Sort dropdown */}
        <div className="relative flex-1 md:flex-none">
          <select
            value={searchParams.sort || ''}
            onChange={(e) => handleSort(e.target.value)}
            className="appearance-none w-full pl-3 pr-8 py-2 text-xs font-medium border bg-transparent cursor-pointer"
            style={{
              borderRadius: 'var(--radius)',
              borderColor: 'color-mix(in srgb, var(--color-text) 15%, transparent)',
              color: 'var(--color-text)',
            }}
          >
            <option value="">Sort by</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Name: A–Z</option>
            <option value="name-desc">Name: Z–A</option>
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }}
          />
        </div>

        {/* Price filter button */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-xs font-medium border transition-colors',
              hasFilters && 'border-[var(--color-primary)]',
            )}
            style={{
              borderRadius: 'var(--radius)',
              borderColor: hasFilters ? undefined : 'color-mix(in srgb, var(--color-text) 15%, transparent)',
            }}
          >
            <SlidersHorizontal size={14} />
            Filters
            {hasFilters && (
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
            )}
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
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
                    <button onClick={clearFilters} className="btn-secondary flex-1 text-xs !py-2">
                      Clear
                    </button>
                  )}
                  <button onClick={applyFilters} className="btn-primary flex-1 text-xs !py-2">
                    Apply
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
