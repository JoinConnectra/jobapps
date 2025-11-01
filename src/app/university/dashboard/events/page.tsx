"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Building2, Users2, Search, HelpCircle, UserPlus, LogOut, Settings, Calendar } from 'lucide-react';
import { toast } from 'sonner';

type UEvent = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
};
//test123


export default function EventsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);
  const [rows, setRows] = useState<UEvent[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState('');
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
      const resp = await fetch(`/api/university/events?orgId=${org.id}`);
      if (resp.ok) setRows(await resp.json());
    })();
  }, [org?.id]);

  const create = async () => {
    if (!org?.id || !title || !startsAt) return;
    setCreating(true);
    const resp = await fetch('/api/university/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ universityOrgId: org.id, title, description, location, startsAt }),
    });
    setCreating(false);
    if (resp.ok) {
      setTitle(''); setDescription(''); setLocation(''); setStartsAt('');
      const refreshed = await fetch(`/api/university/events?orgId=${org.id}`);
      if (refreshed.ok) setRows(await refreshed.json());
      toast.success('Event created successfully!');
    } else {
      toast.error('Failed to create event');
    }
  };

  const remove = async (id: number) => {
    await fetch(`/api/university/events/${id}`, { method: 'DELETE' });
    if (org?.id) {
      const refreshed = await fetch(`/api/university/events?orgId=${org.id}`);
      if (refreshed.ok) setRows(await refreshed.json());
      toast.success('Event deleted successfully!');
    }
  };

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
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
              onClick={() => router.push('/university/dashboard/partners')}
            >
              <Building2 className="w-4 h-4 mr-3" /> Approved Companies
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-700 bg-[#F5F1E8] text-gray-900"
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
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Events</h1>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
                <Input placeholder="Starts at (YYYY-MM-DDTHH:mm)" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
                <Input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
                <Input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <Button onClick={create} disabled={creating || !title || !startsAt} className="bg-[#6a994e] hover:bg-[#5a8a3e] text-white">
                {creating ? 'Creating...' : 'Create Event'}
              </Button>

              <div className="mt-6 space-y-4">
                {rows.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-8">No events</div>
                ) : (
                  rows.map(r => (
                    <div key={r.id} className="flex items-center justify-between border rounded-lg p-4">
                      <div>
                        <div className="font-medium text-gray-900">{r.title}</div>
                        <div className="text-sm text-gray-500">{r.location || '—'} • {new Date(r.startsAt).toLocaleString()}</div>
                      </div>
                      <Button variant="outline" onClick={() => remove(r.id)} className="text-red-600 border-red-600 hover:bg-red-50">
                        Delete
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


