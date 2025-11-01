"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";
import FiltersContainer from "./_components/FiltersContainer";
import { EventList } from "./_components/EventList";
import { EventItem } from "@/components/events/types";
import { EventComposer } from "@/app/university/dashboard/events/_components/EventComposer";
import { Button } from "@/components/ui/button";
import { EventFilterState } from "@/components/events/Filters";
import { useSession } from "@/lib/auth-client";

export default function UniversityEventsPage() {
  const { data: session } = useSession();

  const [composerOpen, setComposerOpen] = useState(false);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [filters, setFilters] = useState<EventFilterState>({
    q: "",
    status: "upcoming",
  });

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<EventItem[] | null>(null);

  // 1) Try to read orgId from session
  useEffect(() => {
    const sid = (session as any)?.user?.org_id ?? null;
    setOrgId(sid ? Number(sid) : null);
  }, [session]);

  // 2) If not on session, mirror the main University dashboard behavior and fetch mine=true
  useEffect(() => {
    if (orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch("/api/organizations?mine=true");
        if (!resp.ok) return;
        const orgs = await resp.json();
        const uni = Array.isArray(orgs)
          ? orgs.find((o: any) => o?.type === "university")
          : null;
        if (!cancelled && uni?.id) {
          setOrgId(Number(uni.id));
        }
      } catch {
        // swallow: keep orgId null; Add button stays disabled
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    return params.toString();
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = orgId
        ? `/api/university/events?orgId=${orgId}&${queryString}`
        : `/api/university/events?${queryString}`;
      const res = await fetch(url);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, queryString]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <UniversityDashboardShell title="Events">
      <div className="flex items-center justify-between mb-4">
        <div />
        <Button
          size="sm"
          onClick={() => setComposerOpen(true)}
          disabled={!orgId} // prevent "Missing orgId" until it resolves
          title={!orgId ? "Resolving your university organization…" : undefined}
        >
          + Add event
        </Button>
      </div>

      <FiltersContainer value={filters} onChange={setFilters} onRefresh={load} />
      {loading ? (
        <div className="text-sm text-muted-foreground py-8">Loading…</div>
      ) : (
        <EventList items={items || []} />
      )}

      <EventComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        orgId={orgId}
        onCreated={() => load()}
      />
    </UniversityDashboardShell>
  );
}
