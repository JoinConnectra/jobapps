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

type Attempt = {
  id: number;
  candidateId: string;
  candidateName?: string | null;
  candidateEmail?: string | null;
  status: string;
  submittedAt: string | null;
  autoScoreTotal: string | null;
};


export default function AssessmentResultsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string; aid: string }>();

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

  const { isOpen: isCommandPaletteOpen, close: closeCommandPalette } = useCommandPalette();

  const [org, setOrg] = useState<{ id: number; name: string; logoUrl?: string | null } | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [attempts, setAttempts] = useState<Attempt[]>([]);
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

  /** Load attempts */
  useEffect(() => {
    if (!session?.user || !assessmentId) return;
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("bearer_token");
        const resp = await fetch(`/api/assessments/${assessmentId}/attempts/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          setAttempts(await resp.json());
        } else {
          console.warn("Failed to load attempts:", await resp.text());
        }
      } catch (e) {
        console.error("Error loading attempts:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [session, assessmentId]);

  /** Sign out */
  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) return;
    localStorage.removeItem("bearer_token");
    router.push("/");
  };

  const renderPercent = (s: string | null) => {
  if (!s) return "—";
  // If it's "num/den", keep your old behavior:
  if (s.includes("/")) {
    const [num, den] = s.split("/").map((x) => Number(x));
    if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return s;
    const pct = Math.round((num / den) * 100);
    return `${s} (${pct}%)`;
  }

  // Otherwise, treat it as a fraction like "1.00"
  const f = Number(s);
  if (Number.isFinite(f)) {
    const pct = Math.round(f * 100);
    return `${pct}%`;
  }
  return s;
};

  if (isPending || loadingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user || !orgId || !assessmentId) return null;

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Left Sidebar - Reusable Component */}
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
                <span className="text-gray-900 font-medium">Results</span>
              </nav>
            </div>

            {/* Header card with quick nav + actions */}
            <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Assessment Results</h2>
                  <p className="text-sm text-gray-500">
                    Review candidate submissions and open detailed attempt sheets
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="text-xs">
                    <Link href={`/dashboard/organizations/${orgId}/assessments/${assessmentId}`}>
                      View
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="text-xs">
                    <Link href={`/dashboard/organizations/${orgId}/assessments/${assessmentId}/edit`}>
                      Edit
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="text-xs">
                    <Link href={`/dashboard/organizations/${orgId}/assessments/${assessmentId}/questions`}>
                      Questions
                    </Link>
                  </Button>
                
                </div>
              </div>
            </div>

            {/* Results table */}
            <div className="bg-white rounded-lg shadow-sm p-5">
              {loading ? (
                <div className="py-8 text-sm text-gray-600">Loading…</div>
              ) : attempts.length === 0 ? (
                <div className="py-8 text-sm text-gray-600">No attempts yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 border text-left">Candidate</th>
                        <th className="p-2 border text-left">Score</th>
                        <th className="p-2 border text-left">Submitted</th>
                        <th className="p-2 border text-left">View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.map((a) => (
                        <tr key={a.id} className="align-top">
                          <td className="p-2 border">
  {a.candidateName?.trim() ||
   a.candidateEmail ||
   `${a.candidateId.slice(0, 8)}…`}
</td>

                          <td className="p-2 border">{renderPercent(a.autoScoreTotal)}</td>
                          <td className="p-2 border">
                            {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "—"}
                          </td>
                          <td className="p-2 border">
                            <Link
                              className="text-blue-600 underline"
                              href={`/dashboard/organizations/${orgId}/assessments/${assessmentId}/attempts/${a.id}`}
                            >
                              Review
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
