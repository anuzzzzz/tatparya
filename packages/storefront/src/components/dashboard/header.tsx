'use client';

import React from 'react';
import { Menu, Bell, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-provider';

interface DashboardHeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function DashboardHeader({ onMenuClick, title }: DashboardHeaderProps) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        {title && (
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View Store
        </a>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            <span className="text-orange-600 font-medium text-xs">
              {user?.phone?.slice(-2) || '??'}
            </span>
          </div>
          <span className="hidden sm:inline text-gray-500">
            {user?.phone || 'Seller'}
          </span>
        </div>
      </div>
    </header>
  );
}
