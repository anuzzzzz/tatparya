'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle } from 'lucide-react';
import { useStore } from './store-provider';
import { getCartId, clearCartId, cn } from '@/lib/utils';

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

export function CheckoutForm() {
  const { store, design, trpc, setCartCount } = useStore();
  const router = useRouter();
  const storeUrl = `/${store.slug}`;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const cartId = getCartId();
      // Get cart data first to build line items
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

      const order = await trpc.order.publicCheckout.mutate({
        storeId: store.id,
        buyerName: form.name.trim(),
        buyerPhone: form.phone,
        buyerEmail: form.email || undefined,
        shippingAddress: {
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
        },
        lineItems,
        paymentMethod: 'cod',
        discountCode: (cart as any).discountCode || undefined,
        notes: form.notes.trim() || undefined,
      });

      // Clear cart
      await trpc.cart.clear.mutate({ storeId: store.id, cartId });
      clearCartId();
      setCartCount(0);

      // Redirect to order confirmation
      router.push(`${storeUrl}/order/${(order as any).id}`);
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

      {/* Payment method — COD only for MVP */}
      <div
        className="flex items-center gap-3 p-4 border"
        style={{
          borderRadius: 'var(--radius)',
          borderColor: design.palette.primary,
          backgroundColor: `color-mix(in srgb, ${design.palette.primary} 5%, transparent)`,
        }}
      >
        <CheckCircle size={18} style={{ color: design.palette.primary }} />
        <div>
          <p className="text-sm font-medium" style={{ color: design.palette.text }}>
            Cash on Delivery (COD)
          </p>
          <p className="text-xs" style={{ color: design.palette.textMuted }}>
            Pay when your order arrives
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={cn('btn-primary w-full text-sm', submitting && 'opacity-70 cursor-wait')}
      >
        {submitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Placing Order...
          </>
        ) : (
          'Place Order (COD)'
        )}
      </button>
    </form>
  );
}
