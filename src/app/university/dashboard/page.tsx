"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Bell, Building2, Users2 } from 'lucide-react';

export default function UniversityDashboardPage() {
  const router = useRouter();
  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/organizations?mine=true');
        if (resp.ok) {
          const orgs = await resp.json();
          const uni = Array.isArray(orgs) ? orgs.find((o: any) => o.type === 'university') : null;
          if (uni) setOrg(uni);
        }
      } catch {}
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      <aside className="w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <div className="text-xl font-display font-bold text-gray-900 mb-6">{org?.name || 'Your University'}</div>
          <nav className="space-y-1">
            <Button variant="ghost" className="w-full justify-start text-gray-700">
              <Bell className="w-4 h-4 mr-3" /> Overview
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-700" onClick={() => router.push('/university/dashboard/requests')}>
              <Users2 className="w-4 h-4 mr-3" /> Partner Requests
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-700" onClick={() => router.push('/university/dashboard/partners')}>
              <Building2 className="w-4 h-4 mr-3" /> Approved Companies
            </Button>
          </nav>
        </div>
      </aside>

      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8">
          <div className="max-w-5xl">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold">Welcome to your University Portal</h2>
              <p className="text-sm text-gray-600 mt-2">Manage company access requests and approved partners.</p>
              <div className="mt-4">
                <Link className="underline text-[#6a994e]" href="/university/dashboard/requests">Go to Partner Requests</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


