'use client';

import React, { useState } from 'react';
import { MapPin, Check, Truck } from 'lucide-react';
import { useStore } from './store-provider';

export function PincodeCheck() {
  const { design } = useStore();
  const [pincode, setPincode] = useState('');
  const [result, setResult] = useState<null | { deliveryDays: string; cod: boolean; express: boolean }>(null);
  const [error, setError] = useState('');

  const check = () => {
    const clean = pincode.replace(/\s/g, '');
    if (!/^\d{6}$/.test(clean)) {
      setError('Enter a valid 6-digit pincode');
      setResult(null);
      return;
    }
    setError('');
    const first = parseInt(clean[0]!);
    const days = first <= 4 ? '3-5' : '5-7';
    const express = first <= 3;
    setResult({ deliveryDays: days, cod: true, express });
  };

  return (
    <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${design.palette.text}11` }}>
      <div className="flex items-center gap-2 mb-2">
        <MapPin size={13} style={{ color: design.palette.textMuted }} />
        <span className="text-xs font-medium" style={{ color: design.palette.textMuted }}>
          Delivery Options
        </span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter pincode"
          value={pincode}
          onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && check()}
          className="flex-1 px-3 py-2 text-xs border outline-none transition-colors focus:border-current"
          style={{
            borderColor: `${design.palette.text}20`,
            borderRadius: 'var(--radius-sm)',
            color: design.palette.text,
            backgroundColor: 'transparent',
          }}
        />
        <button
          onClick={check}
          className="px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{
            backgroundColor: design.palette.primary,
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          Check
        </button>
      </div>

      {error && <p className="text-xs mt-1.5" style={{ color: '#E24B4A' }}>{error}</p>}

      {result && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs" style={{ color: design.palette.text }}>
            <Truck size={13} style={{ color: design.palette.primary }} />
            <span>Standard Delivery: <strong>{result.deliveryDays} business days</strong></span>
          </div>
          {result.express && (
            <div className="flex items-center gap-2 text-xs" style={{ color: design.palette.text }}>
              <Check size={13} style={{ color: '#16a34a' }} />
              <span>Express Delivery available</span>
            </div>
          )}
          {result.cod && (
            <div className="flex items-center gap-2 text-xs" style={{ color: design.palette.text }}>
              <Check size={13} style={{ color: '#16a34a' }} />
              <span>Cash on Delivery available</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
