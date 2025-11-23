"use client";

import { useEffect, useState, useCallback } from "react";
import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PartnerRow = {
  id: number;
  name: string;
};

export default function PartnersPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Get university orgId
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch("/api/organizations?mine=true", {
          cache: "no-store",
        });
        if (!resp.ok) return;
        const orgs = await resp.json();
        const uni = Array.isArray(orgs)
          ? orgs.find((o: any) => o.type === "university")
          : null;
        if (!cancelled && uni?.id) {
          setOrgId(Number(uni.id));
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/university/requests?orgId=${orgId}`, {
        cache: "no-store",
      });
      if (resp.ok) {
        const all = await resp.json();
        const approved = Array.isArray(all)
          ? all
              .filter((r: any) => r.status === "approved")
              .map((r: any) => ({
                id: r.companyOrgId,
                name: r.companyName,
              }))
          : [];
        setRows(approved);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    load();
  }, [orgId, load]);

  return (
    <UniversityDashboardShell title="Approved Companies">
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">
            Approved Companies
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Companies that have been approved to partner with your
            university.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-600">
              Loading approved companies...
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-600">
              No approved partners yet.
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-lg shadow-sm p-5"
                >
                  <h3 className="text-lg font-medium text-gray-900">
                    {r.name || `Company #${r.id}`}
                  </h3>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </UniversityDashboardShell>
  );
}
