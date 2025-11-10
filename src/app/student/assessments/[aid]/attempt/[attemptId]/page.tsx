"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Question = {
  id: number;
  prompt: string;
  kind: "mcq" | "short" | "coding" | "case";
  optionsJson: any | null;
  correctAnswer: string | null;
  orderIndex: number | null;
};

type ServerLoadResponse = {
  questions: Question[];
  meta?: { title?: string; durationSec?: number; attemptStatus?: string };
};

export default function AttemptRunner() {
  const params = useParams<{ attemptId: string; aid: string }>();
  const router = useRouter();

  const attemptId = useMemo(() => Number(params.attemptId), [params.attemptId]);
  const aid = useMemo(() => Number(params.aid), [params.aid]);

  const [title, setTitle] = useState<string>("Assessment");
  const [durationSec, setDurationSec] = useState<number | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attemptStatus, setAttemptStatus] = useState<string>("in_progress");

  const locked = attemptStatus === "submitted";

  // debounce state
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef<boolean>(false);

  // ✅ Always return a stable HeadersInit (Record<string,string>)
  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("bearer_token");
      if (token) h.Authorization = `Bearer ${token}`;
    }
    return h;
  };

  // initial load
  useEffect(() => {
    if (!aid || !attemptId) return;
    (async () => {
      setLoading(true);
      const resp = await fetch(
        `/api/assessments/${aid}/attempts/${attemptId}/questions`,
        { headers: authHeaders() }
      );

      if (resp.status === 403) {
        try {
          const j = await resp.json();
          if (j?.error) alert(j.error);
        } catch {}
        router.replace(`/student/assessments`);
        return;
      }

      const json: ServerLoadResponse = await resp.json();
      setQuestions(Array.isArray(json?.questions) ? json.questions : []);
      setTitle(json?.meta?.title || "Assessment");
      setDurationSec(
        Number.isFinite(json?.meta?.durationSec as any) ? (json.meta!.durationSec as number) : null
      );
      setAttemptStatus(json?.meta?.attemptStatus || "in_progress");
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aid, attemptId]);

  // ---------- autosave helpers ----------
  const scheduleSave = () => {
    if (locked) return;
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!dirtyRef.current) return;
      setSaving(true);
      try {
        await fetch(`/api/assessments/${aid}/attempts/${attemptId}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ answers }),
        });
        dirtyRef.current = false;
      } catch {
        // silent
      } finally {
        setSaving(false);
      }
    }, 800);
  };

  // ---------- handlers ----------
  const onSelectMCQ = (qid: number, choice: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: { choice } }));
    scheduleSave();
  };

  const onShortText = (qid: number, text: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: { text } }));
    scheduleSave();
  };

  const onCodingChange = (qid: number, code: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: { code } }));
    scheduleSave();
  };

  const onCaseChange = (qid: number, text: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: { text } }));
    scheduleSave();
  };

  // ---------- submit ----------
  const onSubmit = async () => {
    if (!aid || !attemptId || locked) return;
    setSubmitting(true);
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (dirtyRef.current) {
        await fetch(`/api/assessments/${aid}/attempts/${attemptId}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ answers }),
        });
        dirtyRef.current = false;
      }

      const resp = await fetch(
        `/api/assessments/${aid}/attempts/${attemptId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ answers }),
        }
      );

      if (resp.status === 409) {
        alert("Attempt already submitted.");
        router.replace(`/student/assessments`);
        return;
      }
      if (resp.status === 403) {
        alert("This attempt is locked.");
        router.replace(`/student/assessments`);
        return;
      }

      const json = await resp.json();
      if (json?.ok) {
        setAttemptStatus("submitted");
        router.replace(`/student/assessments`);
      } else {
        alert(json?.error || "Submission failed");
      }
    } catch {
      alert("Something went wrong submitting your attempt.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-sm text-muted-foreground">Loading…</div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {Number.isFinite(durationSec) && durationSec !== null && (
            <p className="text-sm text-muted-foreground">Time: {durationSec}s</p>
          )}
          {saving && !submitting && (
            <p className="text-xs text-muted-foreground">Saving…</p>
          )}
          {locked && (
            <p className="text-xs text-red-600">This attempt has been submitted and is locked.</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => history.back()} disabled={locked}>
            Back
          </Button>
          <Button onClick={onSubmit} disabled={submitting || locked}>
            {submitting ? "Submitting…" : locked ? "Submitted" : "Submit"}
          </Button>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <Card key={q.id} className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">
                Q{idx + 1}. {q.prompt}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {q.kind === "mcq" && (
                <div className="space-y-2">
                  {(q.optionsJson?.options ?? []).map((opt: string) => {
                    const checked = answers[q.id]?.choice === opt;
                    return (
                      <label key={opt} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={!!checked}
                          onChange={() => onSelectMCQ(q.id, opt)}
                          disabled={locked}
                        />
                        {opt}
                      </label>
                    );
                  })}
                </div>
              )}

              {q.kind === "short" && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Your short answer…"
                    value={answers[q.id]?.text ?? ""}
                    onChange={(e) => onShortText(q.id, e.target.value)}
                    rows={3}
                    disabled={locked}
                  />
                </div>
              )}

              {q.kind === "coding" && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Language: {q.optionsJson?.language ?? "—"}
                    {q.optionsJson?.timeLimitSec ? ` • Time limit: ${q.optionsJson.timeLimitSec}s` : ""}
                  </div>
                  {q.optionsJson?.starterCode ? (
                    <div className="rounded bg-muted p-2 text-xs overflow-auto">
                      <pre>{q.optionsJson.starterCode}</pre>
                    </div>
                  ) : null}
                  <Textarea
                    placeholder="Write your solution here…"
                    value={answers[q.id]?.code ?? ""}
                    onChange={(e) => onCodingChange(q.id, e.target.value)}
                    rows={8}
                    disabled={locked}
                  />
                </div>
              )}

              {q.kind === "case" && (
                <div className="space-y-2">
                  {q.optionsJson?.maxWords ? (
                    <div className="text-xs text-muted-foreground">
                      Word limit: {q.optionsJson.maxWords}
                    </div>
                  ) : null}
                  <Textarea
                    placeholder="Type your response…"
                    value={answers[q.id]?.text ?? ""}
                    onChange={(e) => onCaseChange(q.id, e.target.value)}
                    rows={8}
                    disabled={locked}
                  />
                  {q.optionsJson?.rubric ? (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Rubric (info)</summary>
                      <div className="mt-2 whitespace-pre-wrap text-muted-foreground">
                        {q.optionsJson.rubric}
                      </div>
                    </details>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => history.back()} disabled={locked}>
          Back
        </Button>
        <Button onClick={onSubmit} disabled={submitting || locked}>
          {submitting ? "Submitting…" : locked ? "Submitted" : "Submit"}
        </Button>
      </div>
    </div>
  );
}
