// src/app/university/dashboard/applications/page.tsx
"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type ApplicationItem = {
  id: number;
  jobId: number | null;
  stage: string | null;
  createdAt: string | null;

  studentName: string | null;
  studentEmail: string | null;
  program: string | null;
  gradYear: number | null;

  jobTitle: string | null;
  companyName: string | null;
};

export default function UniversityApplicationsPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ApplicationItem[]>([]);

  // Resolve the university orgId (same pattern as students/events)
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
          ? orgs.find((o: any) => o?.type === "university")
          : null;

        if (!cancelled && uni?.id) {
          setOrgId(Number(uni.id));
        }
      } catch (e) {
        console.error("Error loading organizations", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    if (!orgId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/university/applications?orgId=${orgId}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading applications", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    load();
  }, [orgId, load]);

  const filteredItems = useMemo(() => {
    if (!q) return items;
    const lower = q.toLowerCase();
    return items.filter((item) => {
      return (
        (item.studentName &&
          item.studentName.toLowerCase().includes(lower)) ||
        (item.studentEmail &&
          item.studentEmail.toLowerCase().includes(lower)) ||
        (item.jobTitle &&
          item.jobTitle.toLowerCase().includes(lower)) ||
        (item.companyName &&
          item.companyName.toLowerCase().includes(lower)) ||
        (item.stage &&
          item.stage.toLowerCase().includes(lower))
      );
    });
  }, [items, q]);

  function formatDate(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString();
  }

  function prettyStage(stage: string | null) {
    if (!stage) return "Applied";
    const s = stage.trim();
    if (!s) return "Applied";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  return (
    <UniversityDashboardShell title="Applications">
      {/* Top row: breadcrumb + search */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="text-xs md:text-sm text-muted-foreground">
          <span className="font-medium">Dashboard</span>
          <span className="mx-1">›</span>
          <span>Applications</span>
        </div>
        <div className="w-full max-w-xs ml-auto">
          <Input
            placeholder="Search by student, job, company, or stage..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Content card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base md:text-lg">
              Applications
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Job applications submitted by students from this university.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {items.length} total
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No applications found yet.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  {/* Left: student + job */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {app.studentName || "Unnamed student"}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase tracking-wide"
                      >
                        {prettyStage(app.stage)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {app.studentEmail || "No email"}{" "}
                      {" • "}
                      {app.program || "Program not set"}
                      {app.gradYear
                        ? ` • Class of ${app.gradYear}`
                        : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {app.jobTitle
                        ? `Applied for: ${app.jobTitle}`
                        : "Job title not available"}
                      {app.companyName
                        ? ` @ ${app.companyName}`
                        : ""}
                    </div>
                  </div>

                  {/* Right: meta */}
                  <div className="mt-2 md:mt-0 flex flex-col items-start md:items-end gap-1 text-xs text-muted-foreground">
                    <span>
                      Submitted{" "}
                      {app.createdAt
                        ? formatDate(app.createdAt)
                        : ""}
                    </span>
                    {/* Later we can add "View student" / "View job" buttons here */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </UniversityDashboardShell>
  );
}
