"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function RequestsPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [rows, setRows] = useState<Array<{ id: number; companyOrgId: number; companyName: string; status: string }>>([]);

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
      const resp = await fetch(`/api/university/requests?orgId=${orgId}`);
      if (resp.ok) setRows(await resp.json());
    })();
  }, [orgId]);

  const act = async (id: number, action: 'approve' | 'reject') => {
    const resp = await fetch(`/api/university/requests/${id}/${action}`, { method: 'POST' });
    if (resp.ok) setRows(rows.map(r => (r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r)));
  };

  return (
    <div className="min-h-screen bg-[#FEFEFA] p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg p-6 shadow-sm">
        <h1 className="text-lg font-semibold mb-4">Partner Requests</h1>
        <div className="space-y-3">
          {rows.length === 0 ? (
            <div className="text-sm text-gray-500">No requests</div>
          ) : (
            rows.map(r => (
              <div key={r.id} className="flex items-center justify-between border rounded-lg p-3">
                <div className="text-sm">
                  <div className="font-medium">{r.companyName || `Company #${r.companyOrgId}`}</div>
                  <div className="text-gray-500">Status: {r.status}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => act(r.id, 'reject')} disabled={r.status !== 'pending'}>Reject</Button>
                  <Button onClick={() => act(r.id, 'approve')} disabled={r.status !== 'pending'}>Approve</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


