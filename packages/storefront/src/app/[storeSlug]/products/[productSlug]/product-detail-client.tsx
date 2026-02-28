'use client';

import React, { useState } from 'react';
import { ShoppingBag, Share2, MessageCircle, Minus, Plus, Check, Loader2 } from 'lucide-react';
import { useStore } from '@/components/store-provider';
import { VariantSelector } from '@/components/variant-selector';
import { formatPrice, getCartId, cn } from '@/lib/utils';

interface Variant {
  id: string;
  attributes: Record<string, string>;
  price?: number | null;
  stock: number;
}

interface ProductDetailClientProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice?: number | null;
    description?: string;
    tags?: string[];
    hsnCode?: string;
    gstRate?: number;
  };
  variants: Variant[];
  storeId: string;
  storeSlug: string;
  discount: number;
}

export function ProductDetailClient({
  product,
  variants,
  storeId,
  storeSlug,
  discount,
}: ProductDetailClientProps) {
  const { store, design, trpc, setCartCount } = useStore();
  const [selectedVariant, setSelectedVariant] = useState<string | null>(
    variants.length > 0 ? variants[0]?.id ?? null : null
  );
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const activeVariant = variants.find((v) => v.id === selectedVariant);
  const displayPrice = activeVariant?.price ?? product.price;
  const outOfStock = variants.length > 0 && activeVariant ? activeVariant.stock <= 0 : false;

  const handleAddToCart = async () => {
    if (adding || outOfStock) return;
    setAdding(true);
    try {
      const cartId = getCartId();
      const result = await trpc.cart.addItem.mutate({
        storeId,
        cartId,
        productId: product.id,
        variantId: selectedVariant || undefined,
        quantity,
      });
      setCartCount((result as any).items?.length || 0);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      console.error('Add to cart failed:', err);
    } finally {
      setAdding(false);
    }
  };

  const shareOnWhatsApp = () => {
    const url = `${window.location.origin}/${storeSlug}/products/${product.slug}`;
    const text = `Check out ${product.name} - ${formatPrice(displayPrice)}\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="flex flex-col">
      {/* Tags */}
      {product.tags && product.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {product.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] uppercase tracking-wider px-2 py-0.5 font-medium"
              style={{
                color: design.palette.textMuted,
                backgroundColor: design.palette.surface,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Name */}
      <h1 className="font-display text-2xl md:text-3xl font-bold leading-tight" style={{ color: design.palette.text }}>
        {product.name}
      </h1>

      {/* Price */}
      <div className="flex items-center gap-3 mt-3">
        <span className="text-xl md:text-2xl font-bold" style={{ color: design.palette.primary }}>
          {formatPrice(displayPrice)}
        </span>
        {product.compareAtPrice && product.compareAtPrice > displayPrice && (
          <>
            <span className="text-base line-through" style={{ color: design.palette.textMuted }}>
              {formatPrice(product.compareAtPrice)}
            </span>
            <span className="badge-discount">{discount}% off</span>
          </>
        )}
      </div>

      {/* GST info */}
      {product.gstRate !== undefined && (
        <p className="text-xs mt-1" style={{ color: design.palette.textMuted }}>
          Inclusive of {product.gstRate}% GST
        </p>
      )}

      {/* Short description */}
      {product.description && (
        <p
          className="text-sm leading-relaxed mt-4 line-clamp-3"
          style={{ color: design.palette.textMuted }}
        >
          {product.description.slice(0, 200)}
        </p>
      )}

      {/* Variants */}
      {variants.length > 0 && (
        <div className="mt-6">
          <VariantSelector
            variants={variants}
            selected={selectedVariant}
            onSelect={setSelectedVariant}
          />
        </div>
      )}

      {/* Quantity + Add to Cart */}
      <div className="mt-6 space-y-3">
        {/* Quantity */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: design.palette.textMuted }}>
            Qty
          </span>
          <div
            className="flex items-center border"
            style={{ borderRadius: 'var(--radius)', borderColor: `color-mix(in srgb, ${design.palette.text} 15%, transparent)` }}
          >
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-2 hover:opacity-60 transition-opacity"
            >
              <Minus size={14} />
            </button>
            <span className="px-4 text-sm font-medium min-w-[40px] text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="p-2 hover:opacity-60 transition-opacity"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Add to cart button */}
        <button
          onClick={handleAddToCart}
          disabled={adding || outOfStock}
          className={cn(
            'btn-primary w-full text-sm',
            outOfStock && 'opacity-50 cursor-not-allowed',
            added && '!bg-green-600',
          )}
        >
          {adding ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Adding...
            </>
          ) : added ? (
            <>
              <Check size={16} />
              Added to Cart!
            </>
          ) : outOfStock ? (
            'Out of Stock'
          ) : (
            <>
              <ShoppingBag size={16} />
              Add to Cart — {formatPrice(displayPrice * quantity)}
            </>
          )}
        </button>

        {/* Share buttons */}
        <div className="flex gap-2">
          <button
            onClick={shareOnWhatsApp}
            className="btn-secondary flex-1 text-xs !py-2.5"
            style={{ color: '#25D366', borderColor: '#25D366' }}
          >
            <MessageCircle size={14} />
            Share on WhatsApp
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: product.name,
                  text: `${product.name} - ${formatPrice(displayPrice)}`,
                  url: window.location.href,
                });
              }
            }}
            className="btn-secondary text-xs !py-2.5 !px-3"
          >
            <Share2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
