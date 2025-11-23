"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSession, authClient } from "@/lib/auth-client";
import CompanySidebar from "@/components/company/CompanySidebar";
import CommandPalette from "@/components/CommandPalette";
import SettingsModal from "@/components/SettingsModal";
import { useCommandPalette } from "@/hooks/use-command-palette";

/* ---------------- CODE BLOCK COMPONENT ---------------- */
function CodeBlock({ value }: { value: string }) {
  return (
    <pre className="bg-[#0f111a] text-[#e8e8e8] text-sm p-4 rounded-md overflow-x-auto whitespace-pre-wrap border border-gray-800 mt-2">
      <code>{value}</code>
    </pre>
  );
}

type AttemptMeta = {
  id: number;
  candidateId: string;
  candidateName?: string | null;
  candidateEmail?: string | null;
  status: string;
  submittedAt: string | null;
  autoScoreTotal: string | null;
};

type ReviewRow = {
  question: string | null;
  kind: string | null;
  correctAnswer: any;
  response: any;
  autoScore: string | null;
};

export default function AttemptReviewPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string; aid: string; attemptId: string }>();

  const orgId = useMemo(() => {
    const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [params]);

  const assessmentId = useMemo(() => {
    const raw = Array.isArray(params?.aid) ? params.aid[0] : params?.aid;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [params]);

  const attemptId = useMemo(() => {
    const raw = Array.isArray(params?.attemptId) ? params.attemptId[0] : params?.attemptId;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [params]);

  const { isOpen: isCommandPaletteOpen, close: closeCommandPalette } = useCommandPalette();
  const [org, setOrg] = useState<{ id: number; name: string; logoUrl?: string | null } | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [attemptMeta, setAttemptMeta] = useState<AttemptMeta | null>(null);
  const [items, setItems] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* Redirect if not logged in */
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  /* Load org for sidebar */
  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      try {
        const token = localStorage.getItem("bearer_token");
        const resp = await fetch("/api/organizations?mine=true", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resp.ok) {
          const orgs = await resp.json();
          if (Array.isArray(orgs) && orgs.length > 0) {
            setOrg(orgs[0]);
          }
        }
      } catch {}
      finally {
        setLoadingOrg(false);
      }
    })();
  }, [session]);

  /* Load attempt meta + answers */
  useEffect(() => {
    if (!session?.user || !assessmentId || !attemptId) return;
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("bearer_token");

        // Attempts list
        const listResp = await fetch(`/api/assessments/${assessmentId}/attempts/list`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (listResp.ok) {
          const list = await listResp.json();
          setAttemptMeta(list.find((x: any) => x.id === attemptId) || null);
        }

        // Review rows
        const reviewResp = await fetch(
          `/api/assessments/${assessmentId}/attempts/${attemptId}/review`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (reviewResp.ok) {
          setItems(await reviewResp.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [session, assessmentId, attemptId]);

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (!error?.code) {
      localStorage.removeItem("bearer_token");
      router.push("/");
    }
  };

  const renderPercent = (s: string | null) => {
    if (!s) return "—";
    if (s.includes("/")) {
      const [num, den] = s.split("/").map(Number);
      return `${s} (${Math.round((num / den) * 100)}%)`;
    }
    const f = Number(s);
    return Number.isFinite(f) ? `${Math.round(f * 100)}%` : s;
  };

  if (isPending || loadingOrg)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!session?.user || !orgId || !assessmentId || !attemptId) return null;

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Sidebar */}
      <CompanySidebar
        org={org}
        user={session.user}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        active="assessments"
      />

      <main className="flex-1 overflow-y-auto bg-[#FEFEFA]">
        <div className="p-8 max-w-6xl">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-8">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">Dashboard</Link>
            <span className="text-gray-400">&gt;</span>
            <Link href={`/dashboard/organizations/${orgId}/assessments`} className="text-gray-500 hover:text-gray-700">Assessments</Link>
            <span className="text-gray-400">&gt;</span>
            <Link
              href={`/dashboard/organizations/${orgId}/assessments/${assessmentId}/results`}
              className="text-gray-500 hover:text-gray-700"
            >
              Results
            </Link>
            <span className="text-gray-400">&gt;</span>
            <span className="font-medium text-gray-900">Review</span>
          </nav>

          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
            <h2 className="text-lg font-medium text-gray-900">Attempt Review</h2>
            <p className="text-sm text-gray-500">
              {attemptMeta?.candidateName?.trim() ||
                attemptMeta?.candidateEmail ||
                attemptMeta?.candidateId?.slice(0, 8) + "…"}
              {" • "}
              Score: {renderPercent(attemptMeta?.autoScoreTotal ?? null)}
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link href={`/dashboard/organizations/${orgId}/assessments/${assessmentId}/results`}>
                Back to Results
              </Link>
            </Button>
          </div>

          {/* Review Items */}
          <div className="bg-white rounded-lg shadow-sm p-5">
            {loading ? (
              <div className="py-8 text-sm text-gray-600">Loading…</div>
            ) : items.length === 0 ? (
              <div className="py-8 text-sm text-gray-600">No answers recorded.</div>
            ) : (
              items.map((i, idx) => {
                /* ---------------- EXTRACT CLEAN ANSWER ---------------- */
                let answerText = "";
                if (i.response && typeof i.response === "object" && "code" in i.response) {
                  answerText = i.response.code; // only show actual code
                } else if (typeof i.response === "string") {
                  answerText = i.response;
                } else {
                  answerText = JSON.stringify(i.response, null, 2);
                }

                const isCode =
                  answerText.includes("function") ||
                  answerText.includes("=>") ||
                  answerText.includes("{") ||
                  answerText.includes("return");

                return (
                  <div key={idx} className="border rounded p-3 mb-4 bg-white">
                    <div className="text-xs uppercase text-gray-400 mb-1">
                      {i.kind || "Question"}
                    </div>
                    <div className="font-medium">{i.question || "—"}</div>

                    {/* Answer */}
                    <div className="text-sm text-gray-600 mt-2 font-semibold">Answer:</div>
                    {isCode ? (
                      <CodeBlock value={answerText} />
                    ) : (
                      <div className="mt-1 text-sm font-mono whitespace-pre-wrap break-all">
                        {answerText}
                      </div>
                    )}

                    {/* Correct answer */}
                    {i.correctAnswer != null && (
                      <>
                        <div className="text-sm text-gray-600 mt-2 font-semibold">
                          Correct:
                        </div>
                        <div className="mt-1 text-sm font-mono whitespace-pre-wrap break-all">
                          {typeof i.correctAnswer === "string"
                            ? i.correctAnswer
                            : JSON.stringify(i.correctAnswer, null, 2)}
                        </div>
                      </>
                    )}

                    {/* Score */}
                    <div className="text-sm font-semibold mt-2">
                      Score: {i.autoScore ?? "—"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeCommandPalette} orgId={org?.id} />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        organization={
          org
            ? {
                id: org.id,
                name: org.name,
                slug: "",
                type: "company",
                plan: "free",
                seatLimit: 5,
                createdAt: "",
                updatedAt: "",
              }
            : null
        }
      />
    </div>
  );
}
