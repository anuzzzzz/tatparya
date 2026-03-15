'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, CreditCard, Banknote } from 'lucide-react';
import { useStore } from './store-provider';
import { getCartId, clearCartId, cn } from '@/lib/utils';

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Indian states for dropdown
const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' }, { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' }, { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' }, { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' }, { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' }, { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' }, { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' }, { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' }, { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' }, { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' }, { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' }, { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' }, { code: '28', name: 'Andhra Pradesh' },
  { code: '29', name: 'Karnataka' }, { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' }, { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' }, { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar' }, { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh (new)' }, { code: '38', name: 'Ladakh' },
];

let razorpayScriptPromise: Promise<boolean> | null = null;

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

export function CheckoutForm() {
  const { store, design, trpc, setCartCount } = useStore();
  const router = useRouter();
  const storeUrl = `/${store.slug}`;

  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('cod');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    stateCode: '',
    pincode: '',
    landmark: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const update = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const handleStateChange = (stateCode: string) => {
    const state = INDIAN_STATES.find((s) => s.code === stateCode);
    setForm((f) => ({ ...f, stateCode, state: state?.name || '' }));
    setErrors((e) => ({ ...e, state: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e['name'] = 'Name is required';
    if (!/^\+91[6-9]\d{9}$/.test(form.phone)) e['phone'] = 'Enter valid Indian phone (+91XXXXXXXXXX)';
    if (!form.line1.trim()) e['line1'] = 'Address is required';
    if (!form.city.trim()) e['city'] = 'City is required';
    if (!form.stateCode) e['state'] = 'State is required';
    if (!/^[1-9]\d{5}$/.test(form.pincode)) e['pincode'] = 'Enter valid 6-digit pincode';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildShippingAddress = () => ({
    name: form.name.trim(),
    phone: form.phone,
    line1: form.line1.trim(),
    line2: form.line2.trim() || undefined,
    city: form.city.trim(),
    state: form.state,
    stateCode: form.stateCode,
    pincode: form.pincode,
    country: 'IN' as const,
    landmark: form.landmark.trim() || undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const cartId = getCartId();
      const cart = await trpc.cart.get.query({ storeId: store.id, cartId });
      if (!cart || !cart.items || cart.items.length === 0) {
        setErrors({ form: 'Your cart is empty' });
        setSubmitting(false);
        return;
      }

      const lineItems = cart.items.map((item: any) => ({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        imageUrl: item.imageUrl,
        attributes: item.attributes,
      }));

      if (paymentMethod === 'cod') {
        // ── COD flow (unchanged) ──
        const order = await trpc.order.publicCheckout.mutate({
          storeId: store.id,
          buyerName: form.name.trim(),
          buyerPhone: form.phone,
          buyerEmail: form.email || undefined,
          shippingAddress: buildShippingAddress(),
          lineItems,
          paymentMethod: 'cod',
          discountCode: (cart as any).discountCode || undefined,
          notes: form.notes.trim() || undefined,
        });

        await trpc.cart.clear.mutate({ storeId: store.id, cartId });
        clearCartId();
        setCartCount(0);
        router.push(`${storeUrl}/order/${(order as any).id}`);
      } else {
        // ── Online payment flow ──
        const initiated = await trpc.order.initiatePayment.mutate({
          storeId: store.id,
          buyerName: form.name.trim(),
          buyerPhone: form.phone,
          buyerEmail: form.email || undefined,
          shippingAddress: buildShippingAddress(),
          lineItems,
          discountCode: (cart as any).discountCode || undefined,
          notes: form.notes.trim() || undefined,
        });

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          setErrors({ form: 'Failed to load payment gateway. Please try again.' });
          setSubmitting(false);
          return;
        }

        const modal = new window.Razorpay({
          key: initiated.razorpayKeyId,
          amount: initiated.amount,
          currency: initiated.currency,
          order_id: initiated.razorpayOrderId,
          name: store.name,
          description: `Order ${initiated.orderNumber}`,
          prefill: {
            name: form.name.trim(),
            email: form.email || undefined,
            contact: form.phone,
          },
          theme: { color: design.palette.primary },
          modal: {
            ondismiss: () => setSubmitting(false),
          },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              await trpc.order.verifyPayment.mutate({
                storeId: store.id,
                orderId: initiated.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              await trpc.cart.clear.mutate({ storeId: store.id, cartId });
              clearCartId();
              setCartCount(0);
              router.push(`${storeUrl}/order/${initiated.orderId}`);
            } catch {
              setErrors({
                form: 'Payment received but verification pending. Your order will be confirmed shortly.',
              });
              setSubmitting(false);
              router.push(`${storeUrl}/order/${initiated.orderId}`);
            }
          },
        });

        modal.on('payment.failed', (response: any) => {
          setErrors({ form: `Payment failed: ${response?.error?.description || 'Please try again or choose Cash on Delivery.'}` });
          setSubmitting(false);
        });

        modal.open();
        // Keep submitting=true — ondismiss/handler/payment.failed will reset it
        return;
      }
    } catch (err: any) {
      setErrors({ form: err?.message || 'Failed to place order. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h3 className="font-display text-lg font-bold" style={{ color: design.palette.text }}>
        Shipping Details
      </h3>

      {errors['form'] && (
        <div className="p-3 text-sm text-red-600 bg-red-50" style={{ borderRadius: 'var(--radius)' }}>
          {errors['form']}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <input
            type="text"
            placeholder="Full Name *"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className={cn('input-field', errors['name'] && 'border-red-400')}
          />
          {errors['name'] && <p className="text-xs text-red-500 mt-1">{errors['name']}</p>}
        </div>
        <div>
          <input
            type="tel"
            placeholder="Phone (+91XXXXXXXXXX) *"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            className={cn('input-field', errors['phone'] && 'border-red-400')}
          />
          {errors['phone'] && <p className="text-xs text-red-500 mt-1">{errors['phone']}</p>}
        </div>
      </div>

      <input
        type="email"
        placeholder="Email (optional)"
        value={form.email}
        onChange={(e) => update('email', e.target.value)}
        className="input-field"
      />

      <input
        type="text"
        placeholder="Address Line 1 *"
        value={form.line1}
        onChange={(e) => update('line1', e.target.value)}
        className={cn('input-field', errors['line1'] && 'border-red-400')}
      />
      {errors['line1'] && <p className="text-xs text-red-500 mt-1">{errors['line1']}</p>}

      <input
        type="text"
        placeholder="Address Line 2 (optional)"
        value={form.line2}
        onChange={(e) => update('line2', e.target.value)}
        className="input-field"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <input
            type="text"
            placeholder="City *"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            className={cn('input-field', errors['city'] && 'border-red-400')}
          />
          {errors['city'] && <p className="text-xs text-red-500 mt-1">{errors['city']}</p>}
        </div>
        <div>
          <select
            value={form.stateCode}
            onChange={(e) => handleStateChange(e.target.value)}
            className={cn('input-field', !form.stateCode && 'text-gray-400', errors['state'] && 'border-red-400')}
          >
            <option value="">State *</option>
            {INDIAN_STATES.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
          {errors['state'] && <p className="text-xs text-red-500 mt-1">{errors['state']}</p>}
        </div>
        <div>
          <input
            type="text"
            placeholder="Pincode *"
            value={form.pincode}
            onChange={(e) => update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
            className={cn('input-field', errors['pincode'] && 'border-red-400')}
            inputMode="numeric"
          />
          {errors['pincode'] && <p className="text-xs text-red-500 mt-1">{errors['pincode']}</p>}
        </div>
      </div>

      <input
        type="text"
        placeholder="Landmark (optional)"
        value={form.landmark}
        onChange={(e) => update('landmark', e.target.value)}
        className="input-field"
      />

      <textarea
        placeholder="Order notes (optional)"
        value={form.notes}
        onChange={(e) => update('notes', e.target.value)}
        className="input-field min-h-[80px] resize-none"
        rows={3}
      />

      {/* Payment method selector */}
      <div className="space-y-2">
        <p className="text-sm font-semibold" style={{ color: design.palette.text }}>
          Payment Method
        </p>

        {/* Online payment card */}
        <button
          type="button"
          onClick={() => setPaymentMethod('online')}
          className="w-full flex items-center gap-3 p-4 border text-left transition-all"
          style={{
            borderRadius: 'var(--radius)',
            borderColor: paymentMethod === 'online' ? design.palette.primary : `${design.palette.text}18`,
            backgroundColor: paymentMethod === 'online'
              ? `color-mix(in srgb, ${design.palette.primary} 6%, transparent)`
              : 'transparent',
          }}
        >
          <div
            className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
            style={{ borderColor: paymentMethod === 'online' ? design.palette.primary : `${design.palette.text}40` }}
          >
            {paymentMethod === 'online' && (
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: design.palette.primary }} />
            )}
          </div>
          <CreditCard size={16} style={{ color: paymentMethod === 'online' ? design.palette.primary : design.palette.textMuted }} />
          <div>
            <p className="text-sm font-medium" style={{ color: design.palette.text }}>
              Online Payment
            </p>
            <p className="text-xs" style={{ color: design.palette.textMuted }}>
              UPI, Credit/Debit Card, Net Banking, Wallets
            </p>
          </div>
        </button>

        {/* COD card */}
        <button
          type="button"
          onClick={() => setPaymentMethod('cod')}
          className="w-full flex items-center gap-3 p-4 border text-left transition-all"
          style={{
            borderRadius: 'var(--radius)',
            borderColor: paymentMethod === 'cod' ? design.palette.primary : `${design.palette.text}18`,
            backgroundColor: paymentMethod === 'cod'
              ? `color-mix(in srgb, ${design.palette.primary} 6%, transparent)`
              : 'transparent',
          }}
        >
          <div
            className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
            style={{ borderColor: paymentMethod === 'cod' ? design.palette.primary : `${design.palette.text}40` }}
          >
            {paymentMethod === 'cod' && (
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: design.palette.primary }} />
            )}
          </div>
          <Banknote size={16} style={{ color: paymentMethod === 'cod' ? design.palette.primary : design.palette.textMuted }} />
          <div>
            <p className="text-sm font-medium" style={{ color: design.palette.text }}>
              Cash on Delivery (COD)
            </p>
            <p className="text-xs" style={{ color: design.palette.textMuted }}>
              Pay when your order arrives
            </p>
          </div>
        </button>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={cn('btn-primary w-full text-sm', submitting && 'opacity-70 cursor-wait')}
      >
        {submitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {paymentMethod === 'online' ? 'Opening Payment...' : 'Placing Order...'}
          </>
        ) : paymentMethod === 'online' ? (
          <>
            <CreditCard size={16} />
            Pay Now
          </>
        ) : (
          <>
            <CheckCircle size={16} />
            Place Order (COD)
          </>
        )}
      </button>
    </form>
  );
}
