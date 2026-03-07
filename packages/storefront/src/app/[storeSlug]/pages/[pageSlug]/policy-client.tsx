'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/components/store-provider';
import { Phone, Mail, Clock, ChevronDown, MessageCircle } from 'lucide-react';

interface PolicyPageClientProps {
  store: any;
  pageSlug: string;
  pageTitle: string;
  storeSlug: string;
}

export function PolicyPageClient({ store, pageSlug, pageTitle, storeSlug }: PolicyPageClientProps) {
  const { design } = useStore();
  const p = design.palette;
  const storeUrl = `/${storeSlug}`;
  const whatsappPhone = (store.whatsappConfig as any)?.businessPhone;
  const vertical = store.vertical as string;

  return (
    <div className="py-8 md:py-12" style={{ backgroundColor: p.background }}>
      <div className="container-store max-w-3xl">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs mb-8" style={{ color: p.textMuted }}>
          <Link href={storeUrl} className="hover:opacity-70 transition-opacity">Home</Link>
          <span>/</span>
          <span style={{ color: p.text }}>{pageTitle}</span>
        </nav>

        <h1 className="font-display text-2xl md:text-3xl font-bold mb-8" style={{ color: p.text }}>
          {pageTitle}
        </h1>

        {pageSlug === 'contact' && <ContactContent storeName={store.name} whatsappPhone={whatsappPhone} palette={p} />}
        {pageSlug === 'faq' && <FaqContent vertical={vertical} palette={p} />}
        {pageSlug === 'shipping' && <ShippingContent storeName={store.name} palette={p} />}
        {pageSlug === 'returns' && <ReturnsContent storeName={store.name} palette={p} />}
        {pageSlug === 'privacy' && <PrivacyContent storeName={store.name} palette={p} />}
        {pageSlug === 'terms' && <TermsContent storeName={store.name} palette={p} />}

        {/* Bottom CTA */}
        <div className="mt-12 pt-8 border-t text-center" style={{ borderColor: `color-mix(in srgb, ${p.text} 8%, transparent)` }}>
          <p className="text-sm mb-3" style={{ color: p.textMuted }}>Have questions?</p>
          {whatsappPhone ? (
            <a
              href={`https://wa.me/${whatsappPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-full transition-transform hover:scale-[0.97]"
              style={{ backgroundColor: '#25D366' }}
            >
              <MessageCircle size={16} /> Chat on WhatsApp
            </a>
          ) : (
            <a
              href={`mailto:support@${store.name.toLowerCase().replace(/\s+/g, '')}.com`}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-full"
              style={{ backgroundColor: p.primary }}
            >
              <Mail size={16} /> Email Us
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Contact ────────────────────────────────────────────────
function ContactContent({ storeName, whatsappPhone, palette }: { storeName: string; whatsappPhone?: string; palette: any }) {
  const cards = [
    ...(whatsappPhone ? [{
      icon: MessageCircle,
      title: 'WhatsApp',
      desc: 'Chat with us for quick support',
      action: `https://wa.me/${whatsappPhone}`,
      actionLabel: 'Open WhatsApp',
      accent: '#25D366',
    }] : []),
    {
      icon: Mail,
      title: 'Email',
      desc: `support@${storeName.toLowerCase().replace(/\s+/g, '')}.com`,
      action: `mailto:support@${storeName.toLowerCase().replace(/\s+/g, '')}.com`,
      actionLabel: 'Send Email',
      accent: palette.primary,
    },
    {
      icon: Clock,
      title: 'Business Hours',
      desc: 'Mon - Sat, 10:00 AM - 7:00 PM IST',
      accent: palette.primary,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card, i) => (
        <div
          key={i}
          className="p-6 rounded-lg border"
          style={{ borderColor: `color-mix(in srgb, ${palette.text} 8%, transparent)`, backgroundColor: palette.surface }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: `${card.accent}15` }}
          >
            <card.icon size={18} style={{ color: card.accent }} />
          </div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: palette.text }}>{card.title}</h3>
          <p className="text-xs leading-relaxed mb-3" style={{ color: palette.textMuted }}>{card.desc}</p>
          {card.action && (
            <a
              href={card.action}
              target={card.action.startsWith('http') ? '_blank' : undefined}
              rel={card.action.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ color: card.accent }}
            >
              {card.actionLabel}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

// ── FAQ ────────────────────────────────────────────────────
function FaqContent({ vertical, palette }: { vertical: string; palette: any }) {
  const isFashionJewellery = ['fashion', 'jewellery'].includes(vertical);

  const faqs = [
    { q: 'How long does delivery take?', a: 'We deliver to metro cities in 3-5 business days, tier 2/3 cities in 5-7 days, and remote areas in 7-10 days. You will receive a tracking link via SMS/WhatsApp once shipped.' },
    { q: 'Do you offer Cash on Delivery (COD)?', a: 'Yes, COD is available on orders up to \u20B95,000. A small COD handling fee may apply. Prepaid orders are processed faster.' },
    ...(isFashionJewellery ? [{ q: 'How do I find my size?', a: 'Please refer to the size chart on each product page. If you are between sizes, we recommend going one size up. You can also WhatsApp us for personalized sizing help.' }] : []),
    { q: 'What is your return policy?', a: 'We offer 7-day easy returns from the date of delivery. Items must be unused, unwashed, and in original packaging. Free reverse pickup is arranged for eligible returns.' },
    { q: 'How can I track my order?', a: 'Once your order is shipped, you will receive a tracking link via SMS and email. You can also check your order status by contacting us on WhatsApp.' },
    { q: 'Are online payments safe?', a: 'Absolutely. We use PCI-compliant payment gateways. Your card details are never stored on our servers. We support UPI, credit/debit cards, net banking, and popular wallets.' },
    { q: 'How can I contact you?', a: 'You can reach us via WhatsApp for the fastest response, or email us. Our team is available Monday to Saturday, 10 AM to 7 PM IST.' },
  ];

  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <FaqItem key={i} question={faq.q} answer={faq.a} palette={palette} />
      ))}
    </div>
  );
}

function FaqItem({ question, answer, palette }: { question: string; answer: string; palette: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{ borderColor: `color-mix(in srgb, ${palette.text} 8%, transparent)` }}
    >
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setOpen(!open)}
        style={{ color: palette.text }}
      >
        <span className="text-sm font-medium pr-4">{question}</span>
        <ChevronDown
          size={16}
          className="flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: palette.textMuted }}
        />
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm leading-relaxed" style={{ color: palette.textMuted }}>{answer}</p>
        </div>
      )}
    </div>
  );
}

// ── Policy Sections Helper ─────────────────────────────────
function PolicySection({ title, paragraphs, palette }: { title: string; paragraphs: string[]; palette: any }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold mb-3" style={{ color: palette.text }}>{title}</h2>
      {paragraphs.map((p, i) => (
        <p key={i} className="text-sm leading-relaxed mb-2" style={{ color: palette.textMuted }}>{p}</p>
      ))}
    </div>
  );
}

// ── Shipping ───────────────────────────────────────────────
function ShippingContent({ storeName, palette }: { storeName: string; palette: any }) {
  return (
    <>
      <PolicySection title="Delivery Timeline" palette={palette} paragraphs={[
        'Metro cities (Delhi, Mumbai, Bangalore, etc.): 3-5 business days.',
        'Tier 2/3 cities: 5-7 business days.',
        'Remote/rural areas: 7-10 business days.',
        'Orders placed before 2 PM IST are typically dispatched the same day.',
      ]} />
      <PolicySection title="Shipping Charges" palette={palette} paragraphs={[
        `Free shipping on all orders above \u20B9499.`,
        `Flat \u20B949 shipping fee on orders below \u20B9499.`,
        'Express delivery available in select cities at an additional charge.',
      ]} />
      <PolicySection title="Cash on Delivery" palette={palette} paragraphs={[
        `COD is available on orders up to \u20B95,000.`,
        'A COD handling fee of \u20B930-50 may apply depending on your location.',
        'Prepaid orders are prioritized for faster dispatch.',
      ]} />
      <PolicySection title="Tracking" palette={palette} paragraphs={[
        `You will receive a tracking link via SMS and email once your order from ${storeName} is shipped.`,
        'You can also reach out to us on WhatsApp for order status updates.',
      ]} />
    </>
  );
}

// ── Returns ────────────────────────────────────────────────
function ReturnsContent({ storeName, palette }: { storeName: string; palette: any }) {
  return (
    <>
      <PolicySection title="Return Window" palette={palette} paragraphs={[
        `${storeName} offers a 7-day return window from the date of delivery.`,
        'Items must be unused, unwashed, unaltered, and in their original packaging with all tags intact.',
      ]} />
      <PolicySection title="How to Return" palette={palette} paragraphs={[
        'Contact us via WhatsApp or email within 7 days of delivery.',
        'We will arrange a free reverse pickup from your address.',
        'Refunds are processed within 5-7 business days after we receive and inspect the returned item.',
      ]} />
      <PolicySection title="Refund Method" palette={palette} paragraphs={[
        'Prepaid orders: Refund to original payment method.',
        'COD orders: Refund via bank transfer (NEFT/IMPS). Please share your bank details when initiating the return.',
      ]} />
      <PolicySection title="Non-Returnable Items" palette={palette} paragraphs={[
        'Items that have been worn, washed, or altered.',
        'Items without original tags and packaging.',
        'Personalized or custom-made items.',
        'Sale items marked as final sale.',
      ]} />
    </>
  );
}

// ── Privacy ────────────────────────────────────────────────
function PrivacyContent({ storeName, palette }: { storeName: string; palette: any }) {
  return (
    <>
      <PolicySection title="Information We Collect" palette={palette} paragraphs={[
        `When you shop at ${storeName}, we collect your name, email address, phone number, and shipping address to process and deliver your orders.`,
        'We may also collect browsing behavior on our site to improve your shopping experience.',
      ]} />
      <PolicySection title="Payment Security" palette={palette} paragraphs={[
        'All payments are processed through PCI-DSS compliant payment gateways.',
        'We never store your credit/debit card details on our servers.',
        'UPI, card, net banking, and wallet transactions are encrypted end-to-end.',
      ]} />
      <PolicySection title="Data Sharing" palette={palette} paragraphs={[
        'We never sell, rent, or trade your personal information to third parties.',
        'Data is shared only with logistics partners (for delivery) and payment processors (for transactions).',
      ]} />
      <PolicySection title="Cookies" palette={palette} paragraphs={[
        'We use essential cookies to keep your cart and session active.',
        'Analytics cookies help us understand how visitors use our site so we can improve it.',
        'You can disable cookies in your browser settings at any time.',
      ]} />
    </>
  );
}

// ── Terms ──────────────────────────────────────────────────
function TermsContent({ storeName, palette }: { storeName: string; palette: any }) {
  return (
    <>
      <PolicySection title="Pricing" palette={palette} paragraphs={[
        `All prices on ${storeName} are listed in Indian Rupees (\u20B9) and are inclusive of applicable taxes.`,
        'Prices are subject to change without prior notice. The price at the time of order placement will be honored.',
      ]} />
      <PolicySection title="Payment Methods" palette={palette} paragraphs={[
        'We accept UPI (Google Pay, PhonePe, Paytm), credit/debit cards (Visa, Mastercard, RuPay), net banking, popular wallets, and Cash on Delivery (COD).',
        'EMI options may be available on select banks for higher-value orders.',
      ]} />
      <PolicySection title="Intellectual Property" palette={palette} paragraphs={[
        `All content on this website including product images, descriptions, logos, and branding is the intellectual property of ${storeName}.`,
        'Unauthorized use, reproduction, or distribution is prohibited.',
      ]} />
      <PolicySection title="Governing Law" palette={palette} paragraphs={[
        'These terms are governed by and construed in accordance with the laws of India.',
        'Any disputes arising shall be subject to the exclusive jurisdiction of courts in India.',
      ]} />
    </>
  );
}
