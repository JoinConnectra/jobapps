"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Bell, Building2, Users2, Search, HelpCircle, UserPlus, LogOut, Settings, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function PartnersPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);
  const [rows, setRows] = useState<Array<{ id: number; name: string }>>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/login');
    }
  }, [session, isPending, router]);

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

  useEffect(() => {
    (async () => {
      if (!org?.id) return;
      const resp = await fetch(`/api/university/requests?orgId=${org.id}`);
      if (resp.ok) {
        const all = await resp.json();
        setRows(all.filter((r: any) => r.status === 'approved').map((r: any) => ({ id: r.companyOrgId, name: r.companyName })));
      }
    })();
  }, [org?.id]);

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error(error.code);
    } else {
      localStorage.removeItem('bearer_token');
      router.push('/');
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      <aside className="w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <div className="text-xl font-display font-bold text-gray-900 mb-6">
            {org?.name || 'Your University'}
          </div>
          
          <nav className="space-y-1">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
              onClick={() => router.push('/university/dashboard')}
            >
              <Bell className="w-4 h-4 mr-3" /> Overview
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
              onClick={() => router.push('/university/dashboard/requests')}
            >
              <Users2 className="w-4 h-4 mr-3" /> Partner Requests
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-700 bg-[#F5F1E8] text-gray-900"
            >
              <Building2 className="w-4 h-4 mr-3" /> Approved Companies
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900" 
              onClick={() => router.push('/university/dashboard/events')}
            >
              <Calendar className="w-4 h-4 mr-3" /> Events
            </Button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-gray-200">
          <div className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-500 text-sm"
            >
              <Search className="w-4 h-4 mr-3" />
              Search
              <span className="ml-auto text-xs">⌘K</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm">
              <HelpCircle className="w-4 h-4 mr-3" />
              Help & Support
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-500 text-sm"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="w-4 h-4 mr-3" />
              Settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-500 text-sm"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-3" />
              Log out
            </Button>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {session.user.name?.charAt(0)}
              </span>
            </div>
            <div className="flex-1 text-sm font-medium text-gray-900">{session.user.name}</div>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              title="Settings"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Approved Companies</h1>
            <div className="space-y-4">
              {rows.length === 0 ? (
                <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-600">
                  No approved partners yet
                </div>
              ) : (
                rows.map(r => (
                  <div key={r.id} className="bg-white rounded-lg shadow-sm p-5">
                    <h3 className="text-lg font-medium text-gray-900">{r.name || `Company #${r.id}`}</h3>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


