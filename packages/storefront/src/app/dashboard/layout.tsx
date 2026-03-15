'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare, ShoppingBag, Package, BarChart3,
  Settings, Menu, X, LogOut,
} from 'lucide-react';
import { SellerAuthProvider, useSellerAuth } from '@/lib/chat/auth-provider';
import { LoginScreen } from '@/components/chat/login-screen';
import './dashboard.css';

export const dynamic = 'force-dynamic';

const NAV_ITEMS = [
  { href: '/dashboard',           icon: MessageSquare, label: 'Chat'      },
  { href: '/dashboard/orders',    icon: ShoppingBag,   label: 'Orders'    },
  { href: '/dashboard/products',  icon: Package,       label: 'Products'  },
  { href: '/dashboard/analytics', icon: BarChart3,     label: 'Analytics' },
  { href: '/dashboard/settings',  icon: Settings,      label: 'Settings'  },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, signOut } = useSellerAuth();

  return (
    <>
      {open && <div className="db-overlay" onClick={onClose} />}

      <aside className={`db-sidebar ${open ? 'db-sidebar--open' : ''}`}>
        {/* Logo */}
        <div className="db-sidebar-logo">
          <span className="db-logo-text">त Tatparya</span>
          <button className="db-sidebar-close db-mobile-only" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="db-sidebar-nav">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive = href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`db-nav-item ${isActive ? 'db-nav-item--active' : ''}`}
                onClick={onClose}
              >
                <Icon size={17} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="db-sidebar-footer">
          <div className="db-user-phone">
            {user?.phone ?? (process.env.NODE_ENV === 'development' ? 'Dev Mode' : '—')}
          </div>
          <button className="db-logout-btn" onClick={signOut}>
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSellerAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="db-loading">
        <div className="db-loading-logo">त</div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>Loading…</p>
      </div>
    );
  }

  if (!user && process.env.NODE_ENV !== 'development') {
    return <LoginScreen onLogin={() => window.location.reload()} />;
  }

  const isChat = pathname === '/dashboard';

  return (
    <div className="db-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="db-main">
        {/* Mobile top bar — hidden on desktop via CSS */}
        <div className="db-topbar">
          <button
            className="db-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <span className="db-topbar-title">त Tatparya</span>
        </div>

        <div className={`db-content ${isChat ? 'db-content--chat' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SellerAuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </SellerAuthProvider>
  );
}
