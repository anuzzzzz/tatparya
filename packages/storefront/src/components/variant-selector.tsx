'use client';

import React from 'react';
import { useStore } from './store-provider';
import { cn } from '@/lib/utils';

interface Variant {
  id: string;
  attributes: Record<string, string>;
  price?: number | null;
  stock: number;
}

interface VariantSelectorProps {
  variants: Variant[];
  selected: string | null;
  onSelect: (variantId: string) => void;
}

export function VariantSelector({ variants, selected, onSelect }: VariantSelectorProps) {
  const { design } = useStore();

  if (!variants || variants.length === 0) return null;

  // Group variants by attribute keys (e.g., { size: ['S','M','L'], color: ['Red','Blue'] })
  const attrKeys = new Set<string>();
  variants.forEach((v) => {
    Object.keys(v.attributes).forEach((k) => attrKeys.add(k));
  });

  // For simple single-attribute variants, show buttons
  // For multi-attribute, show dropdowns
  const keys = Array.from(attrKeys);

  // Get unique values per attribute
  const attrValues: Record<string, string[]> = {};
  keys.forEach((key) => {
    const vals = new Set<string>();
    variants.forEach((v) => {
      const val = v.attributes[key];
      if (val) vals.add(val);
    });
    attrValues[key] = Array.from(vals);
  });

  // Track selection per attribute
  const selectedVariant = variants.find((v) => v.id === selected);
  const selectedAttrs = selectedVariant?.attributes || {};

  // Find matching variant for a given attribute change
  function findVariant(key: string, value: string): Variant | undefined {
    const newAttrs = { ...selectedAttrs, [key]: value };
    return variants.find((v) =>
      Object.entries(newAttrs).every(([k, val]) => v.attributes[k] === val)
    );
  }

  return (
    <div className="space-y-4">
      {keys.map((key) => (
        <div key={key}>
          <label
            className="block text-xs font-bold uppercase tracking-wider mb-2"
            style={{ color: design.palette.textMuted }}
          >
            {key}: <span style={{ color: design.palette.text }}>{selectedAttrs[key] || '—'}</span>
          </label>

          <div className="flex flex-wrap gap-2">
            {attrValues[key]!.map((value) => {
              const matchVariant = findVariant(key, value);
              const isSelected = selectedAttrs[key] === value;
              const outOfStock = matchVariant ? matchVariant.stock <= 0 : false;

              // Color swatches for "color" attribute
              if (key.toLowerCase() === 'color') {
                return (
                  <button
                    key={value}
                    onClick={() => matchVariant && onSelect(matchVariant.id)}
                    disabled={outOfStock}
                    className={cn(
                      'relative w-9 h-9 rounded-full border-2 transition-all',
                      isSelected ? 'ring-2 ring-offset-2' : 'hover:scale-110',
                      outOfStock && 'opacity-30 cursor-not-allowed',
                    )}
                    style={{
                      borderColor: isSelected ? design.palette.primary : 'transparent',
                      ringColor: design.palette.primary,
                    }}
                    title={value}
                  >
                    <span
                      className="block w-full h-full rounded-full"
                      style={{ backgroundColor: value.toLowerCase() }}
                    />
                    {outOfStock && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-full h-px bg-current rotate-45 absolute" />
                      </span>
                    )}
                  </button>
                );
              }

              // Regular button for size etc.
              return (
                <button
                  key={value}
                  onClick={() => matchVariant && onSelect(matchVariant.id)}
                  disabled={outOfStock}
                  className={cn(
                    'px-4 py-2 text-sm font-medium border transition-all',
                    isSelected ? 'border-2' : 'hover:opacity-80',
                    outOfStock && 'opacity-30 cursor-not-allowed line-through',
                  )}
                  style={{
                    borderRadius: 'var(--radius)',
                    borderColor: isSelected ? design.palette.primary : `color-mix(in srgb, ${design.palette.text} 15%, transparent)`,
                    backgroundColor: isSelected ? `color-mix(in srgb, ${design.palette.primary} 8%, transparent)` : 'transparent',
                    color: design.palette.text,
                  }}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
