"use client";

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { getDashboardUrl } from '@/lib/auth-redirect';

export default function DebugLoginPage() {
  const { data: session, isPending } = useSession();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [dashboardUrl, setDashboardUrl] = useState<string>('');

  useEffect(() => {
    if (session?.user) {
      // Test the dashboard URL detection
      getDashboardUrl().then(url => {
        setDashboardUrl(url);
        console.log('Detected dashboard URL:', url);
      });

      // Test the organizations API
      fetch('/api/organizations?mine=true')
        .then(res => res.json())
        .then(data => {
          setDebugInfo(data);
          console.log('Organizations API response:', data);
        })
        .catch(err => {
          console.error('Organizations API error:', err);
          setDebugInfo({ error: err.message });
        });
    }
  }, [session]);

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session?.user) {
    return <div>Not logged in</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Login Debug Page</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Session Info</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Detected Dashboard URL</h2>
          <p className="text-lg font-mono bg-blue-100 p-2 rounded">{dashboardUrl}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Organizations API Response</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
