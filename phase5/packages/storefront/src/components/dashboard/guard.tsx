'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/auth-provider';
import { DashboardShell } from '@/components/dashboard/shell';
import { LoadingSpinner } from '@/components/dashboard/ui';

interface DashboardGuardProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * Wraps dashboard pages with:
 * 1. Auth check — redirects to login if not authenticated
 * 2. Store selection — fetches user's stores and auto-selects one
 * 3. Dashboard shell — sidebar + header
 */
export function DashboardGuard({ children, title }: DashboardGuardProps) {
  const { user, loading, storeId, setStoreId, trpc } = useAuth();
  const router = useRouter();
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeError, setStoreError] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/dashboard/login');
    }
  }, [loading, user, router]);

  // Auto-fetch and select a store
  useEffect(() => {
    if (!user || storeId) {
      setStoreLoading(false);
      return;
    }

    let cancelled = false;

    async function loadStores() {
      try {
        const stores = await trpc.store.list.query();
        if (cancelled) return;

        if (stores.length > 0) {
          setStoreId(stores[0]!.id);
        }
      } catch (err) {
        if (!cancelled) {
          setStoreError('Failed to load stores');
        }
      } finally {
        if (!cancelled) {
          setStoreLoading(false);
        }
      }
    }

    loadStores();
    return () => { cancelled = true; };
  }, [user, storeId, setStoreId, trpc]);

  // Loading state
  if (loading || storeLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Not authenticated
  if (!user) return null;

  return (
    <DashboardShell title={title}>
      {children}
    </DashboardShell>
  );
}
