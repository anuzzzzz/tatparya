'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, Share2, MessageCircle, Minus, Plus, Check, Loader2, Truck } from 'lucide-react';
import { useStore } from '@/components/store-provider';
import { useToast } from '@/components/toast';
import { VariantSelector } from '@/components/variant-selector';
import { ProductTrustBadges } from '@/components/product-trust-badges';
import { SizeChartModal } from '@/components/size-chart-modal';
import { PincodeCheck } from '@/components/pincode-check';
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
  const { toast } = useToast();
  const [selectedVariant, setSelectedVariant] = useState<string | null>(
    variants.length > 0 ? variants[0]?.id ?? null : null
  );
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const addToCartRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = addToCartRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry!.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
      toast('Added to cart!', 'cart');
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

  const inquireOnWhatsApp = () => {
    const whatsappPhone = (store.whatsappConfig as any)?.businessPhone;
    if (!whatsappPhone) return;
    const url = `${window.location.origin}/${storeSlug}/products/${product.slug}`;
    const text = `Hi! I'm interested in "${product.name}" (${formatPrice(displayPrice)}). ${url}`;
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="flex flex-col">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[11px] mb-4" style={{ color: design.palette.textMuted }}>
        <a href={`/${storeSlug}`} className="hover:opacity-70 transition-opacity">Home</a>
        <span>/</span>
        <a href={`/${storeSlug}/collections/all`} className="hover:opacity-70 transition-opacity">Shop</a>
        <span>/</span>
        <span style={{ color: design.palette.text }}>{product.name}</span>
      </nav>

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

      {/* Name + Wishlist */}
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-2xl md:text-3xl font-bold leading-tight" style={{ color: design.palette.text }}>
          {product.name}
        </h1>
        <button
          onClick={() => setWishlisted(!wishlisted)}
          className="mt-1 p-2 transition-all hover:scale-110 flex-shrink-0"
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={wishlisted ? design.palette.primary : 'none'} stroke={design.palette.primary} strokeWidth="1.8">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

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

      {/* Stock urgency */}
      {(() => {
        const stockSeed = product.id.charCodeAt(0) + product.id.charCodeAt(product.id.length - 1);
        const stock = activeVariant?.stock ?? (stockSeed % 7) + 2;
        if (stock <= 8) {
          return (
            <p className="text-xs font-semibold mt-2 flex items-center gap-1.5" style={{ color: '#E97B24' }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              Only {stock} left in stock — order soon!
            </p>
          );
        }
        return null;
      })()}

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
          <div className="mt-2">
            <SizeChartModal vertical={(store as any).vertical} productTags={product.tags} />
          </div>
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
          ref={addToCartRef}
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

        {/* Delivery estimate */}
        <div className="flex items-center gap-2 text-xs" style={{ color: design.palette.textMuted }}>
          <Truck size={14} />
          <span>Estimated delivery: 3–7 business days</span>
        </div>

        {/* WhatsApp Inquiry + Share */}
        <div className="flex gap-2">
          {(store.whatsappConfig as any)?.businessPhone ? (
            <button
              onClick={inquireOnWhatsApp}
              className="btn-secondary flex-1 text-xs !py-2.5"
              style={{ color: '#25D366', borderColor: '#25D366' }}
            >
              <MessageCircle size={14} />
              Ask about this product
            </button>
          ) : (
            <button
              onClick={shareOnWhatsApp}
              className="btn-secondary flex-1 text-xs !py-2.5"
              style={{ color: '#25D366', borderColor: '#25D366' }}
            >
              <MessageCircle size={14} />
              Share on WhatsApp
            </button>
          )}
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

      {/* Pincode delivery check */}
      <PincodeCheck />

      {/* Trust Badges */}
      <ProductTrustBadges />

      {/* Sticky mobile add-to-cart bar */}
      {showStickyBar && (
        <div
          className="fixed bottom-14 left-0 right-0 z-40 md:hidden flex items-center gap-3 px-4 py-3 border-t shadow-sm"
          style={{ backgroundColor: design.palette.background }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: design.palette.text }}>
              {product.name}
            </p>
            <p className="text-sm font-bold" style={{ color: design.palette.primary }}>
              {formatPrice(displayPrice)}
            </p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={adding || outOfStock}
            className={cn(
              'btn-primary text-sm whitespace-nowrap !py-2.5 !px-5',
              outOfStock && 'opacity-50 cursor-not-allowed',
            )}
          >
            {adding ? 'Adding...' : outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      )}
    </div>
  );
}
