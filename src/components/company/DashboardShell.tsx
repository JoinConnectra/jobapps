'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import CompanySidebar from './CompanySidebar';

type Crumb = { label: string; href?: string };

export default function DashboardShell({
  org,
  user,
  onSignOut,
  crumbs = [{ label: 'Dashboard', href: '/dashboard' }],
  title,
  actions,
  children,
}: {
  org: { id: number; name: string } | null;
  user: { name?: string | null };
  onSignOut: () => void;
  crumbs?: Crumb[];
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Left Sidebar */}
      <CompanySidebar org={org} user={user} onSignOut={onSignOut} />

      {/* Main */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        {/* Top header (breadcrumbs + actions) */}
        <div className="border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="mx-auto max-w-6xl px-8 pt-8 pb-0">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
              {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-gray-400">›</span>}
                  {c.href ? (
                    <Link href={c.href} className="hover:text-gray-700">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-gray-900 font-medium">{c.label}</span>
                  )}
                </span>
              ))}
            </nav>

            {/* Title row (optional) */}
            {(title || actions) && (
              <div className="mt-3 flex items-center justify-between">
                {title ? <h1 className="text-xl font-semibold text-gray-900">{title}</h1> : <div />}
                <div className="flex items-center gap-2">{actions}</div>
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <div className="p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </main>
    </div>
  );
}
