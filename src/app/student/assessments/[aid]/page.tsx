"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Detail = {
  id: number;
  title: string;
  orgName?: string | null;
  descriptionMd?: string | null;
  attemptId?: number | null; // if an in-progress attempt exists
};

export default function StudentAssessmentDetails() {
  const params = useParams<{ aid: string }>();
  const aid = Number(params?.aid);
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!aid) return;
    (async () => {
      setLoading(true);
      try {
        // Reuse the list endpoint then pick one; in future you can create a dedicated details API
        const res = await fetch("/api/student/assessments", { cache: "no-store" });
        const items = (await res.json()) as Detail[];
        setData(items.find((x) => x.id === aid) ?? null);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [aid]);

  const startAttempt = useCallback(async () => {
    try {
      setStarting(true);
      const maybeCandidateId = localStorage.getItem("candidate_id");

      const resp = await fetch(`/api/student/assessments/${aid}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: maybeCandidateId ? JSON.stringify({ candidateId: maybeCandidateId }) : "{}",
      });
      const json = await resp.json();
      if (!resp.ok || !json?.ok) {
        alert(json?.error || "Unable to start assessment.");
        return;
      }
      const attemptId = json.attemptId as number | undefined;
      if (!attemptId) {
        alert("Server did not return attemptId.");
        return;
      }
      window.location.href = `/student/assessments/${aid}/attempt/${attemptId}`;
    } finally {
      setStarting(false);
    }
  }, [aid]);

  if (!aid) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : !data ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Assessment not found.
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-xl">{data.title}</CardTitle>
            {data.attemptId ? (
              <Button asChild>
                <a href={`/student/assessments/${aid}/attempt/${data.attemptId}`}>Continue</a>
              </Button>
            ) : (
              <Button onClick={startAttempt} disabled={starting}>
                {starting ? "Starting…" : "Start"}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {data.orgName ? <div className="mb-2">Organization: {data.orgName}</div> : null}
              {/* You can render `descriptionMd` as markdown later */}
              <p>This assessment may include MCQs, short answers, coding, or case responses.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
