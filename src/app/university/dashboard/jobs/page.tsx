"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";

import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type UniversityJobItem = {
  id: number;
  title: string | null;
  dept: string | null;
  status: string | null;
  visibility: string | null;
  locationMode: string | null;
  location: string | null;
  seniority: string | null;
  orgId: number | null;
  orgName: string | null;
  orgSlug: string | null;
  createdAt: string | null;
};

export default function UniversityJobsPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<UniversityJobItem[]>([]);

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
      setJobs([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("orgId", String(orgId));
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch(`/api/university/jobs?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading university jobs", e);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, q]);

  useEffect(() => {
    if (!orgId) return;
    load();
  }, [orgId, load]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return jobs;
    return jobs.filter((job) => {
      const haystack = `${job.title ?? ""} ${job.dept ?? ""} ${
        job.orgName ?? ""
      } ${job.location ?? ""}`.toLowerCase();
      return haystack.includes(text);
    });
  }, [jobs, q]);

  function formatDate(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString();
  }

  return (
    <UniversityDashboardShell title="Jobs">
      {/* Top row: breadcrumb + search */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-xs md:text-sm text-muted-foreground">
          <span className="font-medium">Dashboard</span>
          <span className="mx-1">›</span>
          <span>Jobs</span>
        </div>
        <div className="w-full max-w-xs ml-auto">
          <Input
            placeholder="Search by title, company, or location..."
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
              Jobs for your students
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              All published jobs that have been targeted to this university.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {jobs.length} total
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading jobs…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No jobs found for this university yet.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {job.title || "Untitled job"}
                      </span>
                      {job.status && (
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase tracking-wide"
                        >
                          {job.status}
                        </Badge>
                      )}
                      {job.visibility && job.visibility !== "public" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase tracking-wide"
                        >
                          {job.visibility}
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {job.orgName || "Unknown company"}
                      {job.dept ? ` • ${job.dept}` : ""}
                      {job.location
                        ? ` • ${job.location}`
                        : job.locationMode
                        ? ` • ${job.locationMode}`
                        : ""}
                    </div>

                    <div className="text-[11px] text-muted-foreground">
                      Posted {formatDate(job.createdAt)}
                    </div>
                  </div>

                  <div className="mt-2 md:mt-0 flex items-center gap-3 text-xs">
                    <Link
                      href={`/student/jobs/${job.id}`}
                      target="_blank"
                      className="underline text-[#3d6a4a]"
                    >
                      View student view
                    </Link>
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
