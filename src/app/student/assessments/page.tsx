"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock,
  Clock,
  Play,
  PlayCircle,
  Lock,
  Building2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type StudentAssessment = {
  id: number;
  title: string;
  orgName?: string | null;
  status?: "assigned" | "in_progress" | "completed"; // completed === submitted/locked
  attemptId?: number | null;
  dueAt?: string | null;
  durationSec?: number | null;
};

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("bearer_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function formatStatus(s?: string) {
  if (!s) return "—";
  return s.replace(/_/g, " ");
}

function formatDue(dueAt?: string | null) {
  if (!dueAt) return null;
  try {
    const d = new Date(dueAt);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function formatDurationSec(sec?: number | null) {
  if (!sec || sec <= 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function timeToDue(dueAt?: string | null) {
  if (!dueAt) return null;
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  const diffMs = due - now;
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60000);
  if (mins < 60) return { label: `${mins}m ${overdue ? "overdue" : "left"}`, overdue };
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return { label: `${hrs}h ${overdue ? "overdue" : "left"}`, overdue };
  const days = Math.round(hrs / 24);
  return { label: `${days}d ${overdue ? "overdue" : "left"}`, overdue };
}

/** Pastel-green themed statuses (visible in light/dark). */
function statusTone(status?: StudentAssessment["status"]) {
  switch (status) {
    case "assigned":
      return {
        icon: Play,
        className:
          "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-900/40",
      };
    case "in_progress":
      return {
        icon: PlayCircle,
        className:
          "bg-emerald-200 text-emerald-900 border border-emerald-300 dark:bg-emerald-800/50 dark:text-emerald-100 dark:border-emerald-800",
      };
    case "completed":
      return {
        icon: CheckCircle2,
        className:
          "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-900/50",
      };
    default:
      return {
        icon: AlertCircle,
        className:
          "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-900/40",
      };
  }
}

function InitialsAvatar({ name }: { name?: string | null }) {
  const initials = useMemo(() => {
    if (!name) return "—";
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() ?? "").join("") || "—";
  }, [name]);

  // Stable hue; pastel background (green-ish bias) + readable text
  const hue = useMemo(() => {
    const s = (name || "org").toString();
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
    return (Math.abs(hash) % 60) + 120; // bias toward green range 120-180
  }, [name]);

  return (
    <div
      aria-hidden
      className="inline-flex h-9 w-9 select-none items-center justify-center rounded-full text-[11px] font-semibold"
      style={{
        backgroundColor: `hsl(${hue} 70% 92%)`,
        color: `hsl(${hue} 40% 25%)`,
      }}
      title={name ?? undefined}
    >
      {initials}
    </div>
  );
}

export default function StudentAssessmentsPage() {
  const [items, setItems] = useState<StudentAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiMissing, setApiMissing] = useState(false);
  const [startingId, setStartingId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/student/assessments", {
          cache: "no-store",
          headers: authHeaders(),
        });
        if (!res.ok) {
          setApiMissing(true);
          setItems([]);
        } else {
          const list = (await res.json()) as StudentAssessment[];
          setItems(Array.isArray(list) ? list : []);
        }
      } catch {
        setApiMissing(true);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const startAssessment = async (assessmentId: number) => {
    try {
      setStartingId(assessmentId);
      const token = localStorage.getItem("bearer_token") || "";
      const resp = await fetch(`/api/assessments/${assessmentId}/attempts/start`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const data = await resp.json();
      if (!resp.ok || !data?.attemptId) {
        alert(data?.error || "Could not start/continue this assessment.");
        setStartingId(null);
        return;
      }

      window.location.href = `/student/assessments/${assessmentId}/attempt/${data.attemptId}`;
    } catch {
      alert("Network error starting assessment.");
      setStartingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
          <p className="text-sm text-muted-foreground">
            View your assigned assessments and continue where you left off.
          </p>
        </div>
        {items?.length > 0 && (
          <div className="hidden sm:block text-xs text-muted-foreground">
            {items.length} total
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="rounded-2xl min-h-[240px] overflow-hidden">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                  <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              </CardHeader>
              <CardContent className="pb-5">
                <div className="h-3 w-3/5 rounded bg-muted animate-pulse mb-2" />
                <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {apiMissing
              ? "No API at /api/student/assessments yet. You can wire this to your assignment source later."
              : "No assessments yet."}
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {!loading && items.length > 0 && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => {
            const status = a.status || "assigned";
            const isSubmitted = status === "completed";
            const canContinue = status === "in_progress" && !!a.attemptId;
            const canStart = status === "assigned" && !a.attemptId;

            const dueStr = formatDue(a.dueAt);
            const durationStr = formatDurationSec(a.durationSec);
            const dueRel = timeToDue(a.dueAt);
            const { icon: StatusIcon, className: toneClass } = statusTone(status);

            let action: React.ReactNode = null;
            if (isSubmitted) {
              action = (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled
                  className="gap-2 cursor-not-allowed"
                >
                  <Lock className="h-4 w-4" />
                  Submitted
                </Button>
              );
            } else if (canContinue) {
              action = (
                <Button
                  asChild
                  size="sm"
                  className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-300"
                >
                  <Link href={`/student/assessments/${a.id}/attempt/${a.attemptId}`}>
                    <PlayCircle className="h-4 w-4" />
                    Continue
                  </Link>
                </Button>
              );
            } else if (canStart) {
              action = (
                <Button
                  size="sm"
                  className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-300"
                  onClick={() => startAssessment(a.id)}
                  disabled={startingId === a.id}
                  aria-busy={startingId === a.id}
                >
                  <Play className="h-4 w-4" />
                  {startingId === a.id ? "Starting…" : "Start"}
                </Button>
              );
            } else {
              action = (
                <Button size="sm" variant="secondary" disabled>
                  Unavailable
                </Button>
              );
            }

            return (
              <Card
                key={a.id}
                className="group rounded-2xl transition-shadow hover:shadow-md focus-within:shadow-md flex flex-col min-h-[240px] overflow-hidden"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <InitialsAvatar name={a.orgName ?? undefined} />
                      <div className="min-w-0">
                        <CardTitle className="text-base leading-snug line-clamp-2 break-words hyphens-auto">
                          {a.title}
                        </CardTitle>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{a.orgName ?? "—"}</span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      className={`shrink-0 gap-1 px-2 py-1 text-[10px] ${toneClass}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {formatStatus(status)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pb-5 flex grow flex-col gap-4 overflow-hidden">
                  <div className="grid gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {durationStr ? `Time limit: ${durationStr}` : "No time limit"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                      {a.dueAt ? (
                        <span className="min-w-0 truncate">
                          Due: {dueStr}
                          {dueRel && (
                            <span
                              className={`ml-1 rounded px-1 py-[1px] ${
                                dueRel.overdue
                                  ? "bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-200"
                                  : "bg-emerald-200 text-emerald-900 dark:bg-emerald-800/60 dark:text-emerald-100"
                              }`}
                            >
                              {dueRel.label}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span>No due date</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-end">
                    {action}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
