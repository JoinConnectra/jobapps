"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";
import FiltersContainer from "./_components/FiltersContainer";
import { EventList } from "./_components/EventList";
import { EventItem } from "@/components/events/types";
import { EventFilterState } from "@/components/events/Filters";
import { useSession } from "@/lib/auth-client";

export default function UniversityEventsPage() {
  const { data: session } = useSession();

  const [orgId, setOrgId] = useState<number | null>(null);
  const [filters, setFilters] = useState<EventFilterState>({
    q: "",
    status: "all",
  });
  const [items, setItems] = useState<EventItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const possibleOrgId =
      (session as any)?.user?.orgId ??
      (session as any)?.user?.universityOrgId ??
      null;
    setOrgId(typeof possibleOrgId === "number" ? possibleOrgId : null);
  }, [session]);

  const fetchUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (orgId) params.set("orgId", String(orgId));
    params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q.trim());
    return `/api/university/events?${params}`;
  }, [orgId, filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(fetchUrl);
      const data = (await res.json()) as EventItem[];
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fetchUrl]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <UniversityDashboardShell title="Events">
      <FiltersContainer value={filters} onChange={setFilters} onRefresh={load} />
      {loading ? (
        <div className="text-sm text-muted-foreground py-8">Loading…</div>
      ) : (
        <EventList items={items || []} />
      )}
    </UniversityDashboardShell>
  );
}
