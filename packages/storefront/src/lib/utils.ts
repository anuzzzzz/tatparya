/**
 * Format price in INR with ₹ symbol.
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format price with decimals when needed.
 */
export function formatPriceExact(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: amount % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Build R2 CDN image URL.
 * Falls back to original URL if no R2 public URL configured.
 */
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';

export function imageUrl(url: string | null | undefined): string {
  if (!url) return '/placeholder-product.svg';
  if (url.startsWith('http')) return url;
  return `${R2_PUBLIC_URL}/${url}`;
}

/**
 * Get or create a cart ID from localStorage.
 */
export function getCartId(): string {
  if (typeof window === 'undefined') return '';
  let cartId = localStorage.getItem('tatparya_cart_id');
  if (!cartId) {
    cartId = crypto.randomUUID();
    localStorage.setItem('tatparya_cart_id', cartId);
  }
  return cartId;
}

/**
 * Clear cart ID (after order placed).
 */
export function clearCartId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('tatparya_cart_id');
}

/**
 * Calculate discount percentage.
 */
export function discountPercent(price: number, compareAt: number): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/**
 * cn — class name utility (lighter than clsx for simple cases).
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
