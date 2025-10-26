"use client";

import { useEffect, useState } from 'react';

export default function PartnersPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [rows, setRows] = useState<Array<{ id: number; name: string }>>([]);

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
      if (resp.ok) {
        const all = await resp.json();
        setRows(all.filter((r: any) => r.status === 'approved').map((r: any) => ({ id: r.companyOrgId, name: r.companyName })));
      }
    })();
  }, [orgId]);

  return (
    <div className="min-h-screen bg-[#FEFEFA] p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg p-6 shadow-sm">
        <h1 className="text-lg font-semibold mb-4">Approved Companies</h1>
        <div className="space-y-2">
          {rows.length === 0 ? (
            <div className="text-sm text-gray-500">No approved partners yet</div>
          ) : (
            rows.map(r => (
              <div key={r.id} className="border rounded-lg p-3 text-sm">{r.name || `Company #${r.id}`}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


