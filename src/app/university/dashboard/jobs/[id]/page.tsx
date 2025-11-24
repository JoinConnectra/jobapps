// src/app/university/dashboard/jobs/[id]/page.tsx
"use client";

import React, {
  useEffect,
  useState,
  useCallback,
} from "react";
import { useParams, useRouter } from "next/navigation";

import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  // NEW richer fields from jobs table
  salaryRange: string | null;
  descriptionMd: string | null;
  skillsCsv: string | null;
};

type StatusFilter = "all" | "published" | "draft" | "closed";
type LocationModeFilter = "all" | "onsite" | "remote" | "hybrid";

type Question = {
  id: number;
  prompt: string;
  kind: "voice" | "text" | null;
  maxSec: number | null;
  maxChars: number | null;
  required: boolean;
  orderIndex: number;
};

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

function normalizeStatus(status: string | null): StatusFilter {
  const s = (status || "").toLowerCase();
  if (!s) return "all";
  if (s.includes("publish")) return "published";
  if (s.includes("close")) return "closed";
  if (s.includes("draft")) return "draft";
  return "all";
}

function normalizeLocationMode(loc: string | null): LocationModeFilter {
  const s = (loc || "").toLowerCase();
  if (s.includes("remote")) return "remote";
  if (s.includes("hybrid")) return "hybrid";
  if (s.includes("onsite") || s.includes("on-site") || s.includes("office")) {
    return "onsite";
  }
  return "all";
}

function statusBadgeClass(status: string | null) {
  const key = normalizeStatus(status);
  if (key === "published") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }
  if (key === "closed") {
    return "border-red-100 bg-red-50 text-red-700";
  }
  if (key === "draft") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function locationBadgeClass(loc: string | null) {
  const key = normalizeLocationMode(loc);
  if (key === "remote") {
    return "border-blue-100 bg-blue-50 text-blue-700";
  }
  if (key === "hybrid") {
    return "border-violet-100 bg-violet-50 text-violet-700";
  }
  if (key === "onsite") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

/**
 * Collapsible description, similar to employer view but read-only
 */
function CollapsibleText({
  text,
  previewChars = 400,
}: {
  text: string;
  previewChars?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!text || text.trim().length === 0) return null;

  const needsToggle = text.length > previewChars;
  const shown =
    expanded || !needsToggle
      ? text
      : text.slice(0, previewChars).trimEnd() + "…";

  return (
    <div className="relative">
      <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
        {shown}
      </pre>

      {!expanded && needsToggle && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
      )}

      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900"
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}

export default function UniversityJobDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [orgId, setOrgId] = useState<number | null>(null);
  const [job, setJob] = useState<UniversityJobItem | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve university orgId
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

  const loadQuestions = useCallback(async (jobId: string) => {
    setQuestionsLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/questions`, {
        cache: "no-store",
      });
      if (!res.ok) {
        console.error("Failed to load questions");
        setQuestions([]);
        return;
      }
      const data = await res.json();
      setQuestions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading questions", e);
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    if (!orgId || !id) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("orgId", String(orgId));
      params.set("jobId", id);

      const res = await fetch(`/api/university/jobs?${params.toString()}`, {
        cache: "no-store",
      });

      const data: UniversityJobItem[] | { error?: string } = await res.json();

      if (!res.ok) {
        throw new Error((data as any)?.error || "Failed to load job");
      }

      const item = Array.isArray(data) ? data[0] : null;
      if (!item) {
        setJob(null);
        setError("Job not found or not targeted to this university.");
      } else {
        setJob(item);
        // Once we know the job is valid for this university, load its questions
        await loadQuestions(id);
      }
    } catch (e: any) {
      console.error("Error loading job detail", e);
      setError(e?.message || "Something went wrong.");
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [orgId, id, loadQuestions]);

  useEffect(() => {
    if (!orgId || !id) return;
    load();
  }, [orgId, id, load]);

  const skills: string[] =
    job?.skillsCsv
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  return (
    <UniversityDashboardShell title="Job details">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => router.push("/university/dashboard/jobs")}
        >
          ← Back to jobs
        </Button>
      </div>

      {loading ? (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="text-lg">Loading job…</CardTitle>
          </CardHeader>
        </Card>
      ) : error ? (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="text-lg text-red-600">
              {error}
            </CardTitle>
          </CardHeader>
        </Card>
      ) : !job ? (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="text-lg">Job not found</CardTitle>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6 max-w-3xl">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold flex flex-wrap items-center gap-2">
                    {job.title || "Untitled job"}
                    {job.status && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase tracking-wide ${statusBadgeClass(
                          job.status,
                        )}`}
                      >
                        {(() => {
                          const key = normalizeStatus(job.status);
                          if (key === "published") return "Published";
                          if (key === "closed") return "Closed";
                          if (key === "draft") return "Draft";
                          return job.status;
                        })()}
                      </Badge>
                    )}
                    {job.visibility && job.visibility !== "public" && (
                      <Badge
                        variant="outline"
                        className="border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-700"
                      >
                        {job.visibility}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {job.orgName || "Unknown company"}
                    {job.dept ? ` • ${job.dept}` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {job.locationMode && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase tracking-wide ${locationBadgeClass(
                          job.locationMode,
                        )}`}
                      >
                        {(() => {
                          const key = normalizeLocationMode(job.locationMode);
                          if (key === "remote") return "Remote";
                          if (key === "hybrid") return "Hybrid";
                          if (key === "onsite") return "Onsite";
                          return job.locationMode;
                        })()}
                      </Badge>
                    )}
                    {job.location && <span>{job.location}</span>}
                    {job.seniority && (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px]">
                        {job.seniority}
                      </span>
                    )}
                    {job.createdAt && (
                      <span className="text-[11px]">
                        Posted {formatDate(job.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                This is a read-only university view. It shows how this role is
                configured by the employer for your students, without exposing
                the student-facing apply page.
              </p>
            </CardContent>
          </Card>

          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm text-muted-foreground md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Company
                </div>
                <div>{job.orgName || "Unknown company"}</div>
                {job.dept && (
                  <>
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-3">
                      Department
                    </div>
                    <div>{job.dept}</div>
                  </>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Work mode
                </div>
                <div>{job.locationMode || "Not specified"}</div>

                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-3">
                  Work location
                </div>
                <div>{job.location || "Not specified"}</div>

                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-3">
                  Seniority
                </div>
                <div>{job.seniority || "Not specified"}</div>

                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-3">
                  Compensation
                </div>
                <div>{job.salaryRange || "Not disclosed"}</div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Skills / focus areas
                </div>
                {skills.length === 0 ? (
                  <div>Not specified</div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              {job.descriptionMd ? (
                <CollapsibleText text={job.descriptionMd} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  The employer hasn&apos;t added a detailed description yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Screening questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Screening questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {questionsLoading ? (
                <p>Loading questions…</p>
              ) : questions.length === 0 ? (
                <p>
                  No screening questions configured for this job. Students will
                  apply with resume only.
                </p>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id ?? idx}
                      className="rounded-md border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Question {idx + 1}
                          </div>
                          <div className="mt-1 text-sm text-slate-800">
                            {q.prompt}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-[11px] text-slate-500">
                          <span>
                            Type:{" "}
                            {q.kind === "text"
                              ? "Text response"
                              : "Voice response"}
                          </span>
                          {q.maxSec != null && q.kind === "voice" && (
                            <span>Max {q.maxSec} sec</span>
                          )}
                          {q.maxChars != null && q.kind === "text" && (
                            <span>Max {q.maxChars} chars</span>
                          )}
                          <span>
                            {q.required ? "Required" : "Optional"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    These are the exact questions students will see when they
                    apply, shown here in a read-only format for your review.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </UniversityDashboardShell>
  );
}
