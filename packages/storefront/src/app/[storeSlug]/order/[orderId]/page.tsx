import { notFound } from 'next/navigation';
import { api } from '@/lib/trpc';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import type { Metadata } from 'next';
import { OrderConfirmationClient } from './order-confirmation-client';

interface OrderPageProps {
  params: { storeSlug: string; orderId: string };
}

export async function generateMetadata({ params }: OrderPageProps): Promise<Metadata> {
  try {
    const store = await api.store.get.query({ slug: params.storeSlug });
    return {
      title: `Order Confirmed | ${store.name}`,
    };
  } catch {
    return { title: 'Order Confirmed' };
  }
}

export default async function OrderConfirmationPage({ params }: OrderPageProps) {
  let store, order;
  try {
    store = await api.store.get.query({ slug: params.storeSlug });
    order = await api.order.publicGet.query({ storeId: store.id, orderId: params.orderId });
  } catch {
    notFound();
  }

  if (!order) notFound();

  return (
    <OrderConfirmationClient
      store={store as any}
      order={order as any}
      storeSlug={params.storeSlug}
    />
  );
}
