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

  // route params → numbers
  const orgId = useMemo(() => {
    const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params]);

  const assessmentId = useMemo(() => {
    const raw = Array.isArray(params?.aid) ? params.aid[0] : params?.aid;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params]);

  const attemptId = useMemo(() => {
    const raw = Array.isArray(params?.attemptId) ? params.attemptId[0] : params?.attemptId;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params]);

  const { isOpen: isCommandPaletteOpen, close: closeCommandPalette } = useCommandPalette();

  const [org, setOrg] = useState<{ id: number; name: string; logoUrl?: string | null } | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [attemptMeta, setAttemptMeta] = useState<AttemptMeta | null>(null);
  const [items, setItems] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  /** Redirect unauthenticated users */
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  /** Sidebar org (same as other employer pages) */
  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      try {
        const token = localStorage.getItem("bearer_token");
        const resp = await fetch("/api/organizations?mine=true", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const orgs = await resp.json();
          if (Array.isArray(orgs) && orgs.length > 0) {
            setOrg({ id: orgs[0].id, name: orgs[0].name, logoUrl: orgs[0].logoUrl });
          }
        }
      } catch (e) {
        console.error("Failed to fetch org (sidebar):", e);
      } finally {
        setLoadingOrg(false);
      }
    })();
  }, [session]);

  /** Load attempt meta (from enriched list) + review rows */
  useEffect(() => {
    if (!session?.user || !assessmentId || !attemptId) return;
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("bearer_token");

        // 1) Pull attempts list and find our attempt for name/email + score
        const listResp = await fetch(`/api/assessments/${assessmentId}/attempts/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (listResp.ok) {
          const list: AttemptMeta[] = await listResp.json();
          const meta = list.find((x) => x.id === attemptId) || null;
          setAttemptMeta(meta);
        } else {
          console.warn("Failed to load attempt meta:", await listResp.text());
        }

        // 2) Pull review rows (per-question)
        const reviewResp = await fetch(
          `/api/assessments/${assessmentId}/attempts/${attemptId}/review`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (reviewResp.ok) {
          setItems(await reviewResp.json());
        } else {
          console.warn("Failed to load review:", await reviewResp.text());
        }
      } catch (e) {
        console.error("Error loading review:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [session, assessmentId, attemptId]);

  /** Sign out */
  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) return;
    localStorage.removeItem("bearer_token");
    router.push("/");
  };

  const renderPercent = (s: string | null) => {
    if (!s) return "—";
    const [num, den] = s.split("/").map((x) => Number(x));
    if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return s;
    const pct = Math.round((num / den) * 100);
    return `${s} (${pct}%)`;
  };

  if (isPending || loadingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user || !orgId || !assessmentId || !attemptId) return null;

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Left Sidebar */}
      <CompanySidebar
        org={org}
        user={session?.user || null}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        active="assessments"
      />

      {/* ---------------- MAIN CONTENT ---------------- */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8">
          <div className="max-w-6xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-4 mb-8">
              <nav className="flex items-center gap-2 text-sm">
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition-colors">
                  Dashboard
                </Link>
                <span className="text-gray-400">&gt;</span>
                <Link
                  href={`/dashboard/organizations/${orgId}/assessments`}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Assessments
                </Link>
                <span className="text-gray-400">&gt;</span>
                <Link
                  href={`/dashboard/organizations/${orgId}/assessments/${assessmentId}/results`}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Results
                </Link>
                <span className="text-gray-400">&gt;</span>
                <span className="text-gray-900 font-medium">Review</span>
              </nav>
            </div>

            {/* Header card */}
            <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Attempt Review</h2>
                  <p className="text-sm text-gray-500">
                    {attemptMeta
                      ? (attemptMeta.candidateName?.trim() ||
                         attemptMeta.candidateEmail ||
                         `${attemptMeta.candidateId.slice(0, 8)}…`)
                      : "—"}
                    {" • "}
                    Score: {renderPercent(attemptMeta?.autoScoreTotal ?? null)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="text-xs">
                    <Link href={`/dashboard/organizations/${orgId}/assessments/${assessmentId}/results`}>
                      Back to Results
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Review list */}
            <div className="bg-white rounded-lg shadow-sm p-5">
              {loading ? (
                <div className="py-8 text-sm text-gray-600">Loading…</div>
              ) : items.length === 0 ? (
                <div className="py-8 text-sm text-gray-600">No answers recorded for this attempt.</div>
              ) : (
                <div>
                  {items.map((i, idx) => (
                    <div key={idx} className="border rounded p-3 mb-4 bg-white">
                      <div className="text-xs uppercase text-gray-400 mb-1">{i.kind || "Question"}</div>
                      <div className="font-medium">{i.question || "—"}</div>

                      <div className="text-sm text-gray-600 mt-2">
                        <span className="font-semibold">Answer:</span>{" "}
                        <span className="font-mono break-all">
                          {typeof i.response === "string" ? i.response : JSON.stringify(i.response)}
                        </span>
                      </div>

                      {i.correctAnswer != null && (
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-semibold">Correct:</span>{" "}
                          <span className="font-mono break-all">
                            {typeof i.correctAnswer === "string"
                              ? i.correctAnswer
                              : JSON.stringify(i.correctAnswer)}
                          </span>
                        </div>
                      )}

                      <div className="text-sm font-semibold mt-2">
                        Score: {i.autoScore ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Command palette overlay */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeCommandPalette} orgId={org?.id} />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        organization={
          org
            ? { id: org.id, name: org.name, slug: "", type: "company", plan: "free", seatLimit: 5, createdAt: "", updatedAt: "" }
            : null
        }
      />
    </div>
  );
}
