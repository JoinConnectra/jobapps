"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type StudentAssessment = {
  id: number;
  title: string;
  orgName?: string | null;
  status?: "assigned" | "in_progress" | "completed"; // completed === submitted/locked
  attemptId?: number | null;
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
      const res = await fetch(`/api/student/assessments/${assessmentId}/attempt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        alert(json?.error || "Could not start assessment.");
        setStartingId(null);
        return;
      }
      const attemptId = json.attemptId as number;
      window.location.href = `/student/assessments/${assessmentId}/attempt/${attemptId}`;
    } catch {
      alert("Network error starting assessment.");
      setStartingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
        <p className="text-sm text-muted-foreground">
          View your assigned assessments and continue where you left off.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {apiMissing
              ? "No API at /api/student/assessments yet. You can wire this to your assignment source later."
              : "No assessments yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((a) => {
            const status = a.status || "assigned";
            const isSubmitted = status === "completed"; // lock state
            const canContinue = status === "in_progress" && !!a.attemptId;
            const canStart = status === "assigned" && !a.attemptId;

            let action: React.ReactNode = null;

            if (isSubmitted) {
              // 🔒 Submitted: no navigation forward
              action = (
                <Button size="sm" variant="secondary" disabled>
                  Submitted
                </Button>
              );
            } else if (canContinue) {
              // ▶️ Continue only when we have an attempt id
              action = (
                <Button asChild size="sm">
                  <Link href={`/student/assessments/${a.id}/attempt/${a.attemptId}`}>
                    Continue
                  </Link>
                </Button>
              );
            } else if (canStart) {
              // 🟢 Start when assigned and no attempt yet
              action = (
                <Button
                  size="sm"
                  onClick={() => startAssessment(a.id)}
                  disabled={startingId === a.id}
                >
                  {startingId === a.id ? "Starting…" : "Start"}
                </Button>
              );
            } else {
              // Fallback (e.g., inconsistent data)
              action = (
                <Button size="sm" variant="secondary" disabled>
                  Unavailable
                </Button>
              );
            }

            return (
              <Card key={a.id} className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">{a.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {a.orgName ?? "—"} • {formatStatus(status)}
                  </div>
                  {action}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
