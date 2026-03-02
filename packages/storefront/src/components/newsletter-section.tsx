'use client';

import React, { useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { useStore } from './store-provider';
import { cn } from '@/lib/utils';

export function NewsletterSection() {
  const { store, design } = useStore();
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to actual WhatsApp opt-in when engine is built
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <section
      style={{
        backgroundColor: design.palette.surface,
        paddingTop: 'var(--spacing-section)',
        paddingBottom: 'var(--spacing-section)',
      }}
    >
      <div className="container-store">
        <div className="max-w-md mx-auto text-center">
          <div
            className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full"
            style={{
              backgroundColor: `color-mix(in srgb, ${design.palette.primary} 12%, transparent)`,
              color: design.palette.primary,
            }}
          >
            <MessageCircle size={22} />
          </div>
          <h3
            className="font-display text-lg md:text-xl font-bold mb-2"
            style={{ color: design.palette.text }}
          >
            Get Updates on WhatsApp
          </h3>
          <p className="text-xs md:text-sm mb-5 leading-relaxed" style={{ color: design.palette.textMuted }}>
            Be the first to know about new arrivals, exclusive offers &amp; restocks.
          </p>

          {submitted ? (
            <div
              className="py-3 px-4 text-sm font-medium"
              style={{
                backgroundColor: `color-mix(in srgb, ${design.palette.primary} 10%, transparent)`,
                color: design.palette.primary,
                borderRadius: 'var(--radius)',
              }}
            >
              You&apos;re in! We&apos;ll send you updates soon.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="tel"
                placeholder="+91 XXXXX XXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field flex-1 text-sm"
                required
              />
              <button
                type="submit"
                className="btn-primary !px-5 text-sm flex-shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
