import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_URL || '';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Resolve an image URL for the storefront.
 *
 * Handles:
 * - null/undefined → placeholder
 * - http(s):// URLs → pass through
 * - /uploads/... paths → pass through (served by Next.js static)
 * - base64 data URIs → pass through (legacy, will render but slowly)
 * - R2 keys (stores/xxx/...) → prepend R2 public URL or dev API URL
 */
export function imageUrl(url: string | null | undefined): string {
  if (!url) return '/placeholder-product.svg';

  // Already a full URL
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  // Local upload path (served by Next.js public/)
  if (url.startsWith('/uploads/')) return url;

  // Base64 data URI (legacy — still works but large)
  if (url.startsWith('data:image/')) return url;

  // R2 key — needs base URL
  if (R2_PUBLIC_URL) return `${R2_PUBLIC_URL}/${url}`;

  // Dev fallback: serve via API dev endpoint
  return `${API_URL}/dev/media/${encodeURIComponent(url)}`;
}

/**
 * Format price in INR.
 */
export function formatPrice(amount: number | null | undefined): string {
  if (amount == null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate discount percentage.
 */
export function discountPercent(price: number, compareAt: number): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
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
