"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type UEvent = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
};

export default function EventsPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [rows, setRows] = useState<UEvent[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState('');

  useEffect(() => {
    (async () => {
      const resp = await fetch('/api/organizations?mine=true');
      if (resp.ok) {
        const orgs = await resp.json();
        const uni = Array.isArray(orgs) ? orgs.find((o: any) => o.type === 'university') : null;
        if (uni) setOrgId(uni.id);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!orgId) return;
      const resp = await fetch(`/api/university/events?orgId=${orgId}`);
      if (resp.ok) setRows(await resp.json());
    })();
  }, [orgId]);

  const create = async () => {
    if (!orgId || !title || !startsAt) return;
    setCreating(true);
    const resp = await fetch('/api/university/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ universityOrgId: orgId, title, description, location, startsAt }),
    });
    setCreating(false);
    if (resp.ok) {
      setTitle(''); setDescription(''); setLocation(''); setStartsAt('');
      const refreshed = await fetch(`/api/university/events?orgId=${orgId}`);
      if (refreshed.ok) setRows(await refreshed.json());
    }
  };

  const remove = async (id: number) => {
    await fetch(`/api/university/events/${id}`, { method: 'DELETE' });
    if (orgId) {
      const refreshed = await fetch(`/api/university/events?orgId=${orgId}`);
      if (refreshed.ok) setRows(await refreshed.json());
    }
  };

  return (
    <div className="min-h-screen bg-[#FEFEFA] p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg p-6 shadow-sm">
        <h1 className="text-lg font-semibold mb-4">Events</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <Input placeholder="Starts at (YYYY-MM-DDTHH:mm)" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
          <Input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
          <Input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <Button onClick={create} disabled={creating || !title || !startsAt}>Create Event</Button>

        <div className="mt-6 space-y-2">
          {rows.length === 0 ? (
            <div className="text-sm text-gray-500">No events</div>
          ) : (
            rows.map(r => (
              <div key={r.id} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-gray-500">{r.location || '—'} • {new Date(r.startsAt).toLocaleString()}</div>
                </div>
                <Button variant="outline" onClick={() => remove(r.id)}>Delete</Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


