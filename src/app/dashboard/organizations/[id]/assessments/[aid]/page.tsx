"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ListChecks,
  Bell,
  Briefcase,
  Search,
  HelpCircle,
  UserPlus,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession, authClient } from "@/lib/auth-client";
import CommandPalette from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/use-command-palette";

/** Server shape (matches DB): */
type Assessment = {
  id: number;
  orgId: number;
  jobId: number | null;
  title: string;
  type: string;
  duration: string;
  status: string;
  descriptionMd: string | null;
  isPublished: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
};

export default function AssessmentViewPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string; aid: string }>();

  const orgIdFromRoute = useMemo(() => {
    const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params]);

  const assessmentId = useMemo(() => {
    const raw = Array.isArray(params?.aid) ? params.aid[0] : params?.aid;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params]);

  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } =
    useCommandPalette();

  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);

  /** Redirect unauthenticated users */
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  /** Sidebar org (same as list page) */
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
          if (Array.isArray(orgs) && orgs.length > 0) setOrg(orgs[0]);
        }
      } catch (e) {
        console.error("Failed to fetch org (sidebar):", e);
      } finally {
        setLoadingOrg(false);
      }
    })();
  }, [session]);

  /** Load single assessment */
  useEffect(() => {
    if (!session?.user || !assessmentId) return;
    (async () => {
      try {
        const token = localStorage.getItem("bearer_token");
        const resp = await fetch(`/api/assessments/${assessmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          setAssessment(await resp.json());
        } else {
          console.warn(await resp.text());
        }
      } catch (e) {
        console.error("Error loading assessment:", e);
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

  if (isPending || loadingOrg || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!session?.user || !assessment || !orgIdFromRoute) return null;

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* ---------------- LEFT SIDEBAR ---------------- */}
      <aside className="w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <div className="text-xl font-display font-bold text-gray-900 mb-6">
            {org?.name || "Your organization"}
          </div>

          <Button
            onClick={() => router.push("/dashboard/jobs?create=1")}
            className="w-full mb-6 bg-[#F5F1E8] text-gray-900 hover:bg-[#E8E0D5] border-0"
          >
            + Create a Job
          </Button>

          <nav className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
              onClick={() => router.push("/dashboard")}
            >
              <Bell className="w-4 h-4 mr-3" />
              Activities
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
              onClick={() => router.push("/dashboard/jobs")}
            >
              <Briefcase className="w-4 h-4 mr-3" />
              Jobs
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 bg-[#F5F1E8] text-gray-900"
              onClick={() =>
                router.push(`/dashboard/organizations/${orgIdFromRoute}/assessments`)
              }
            >
              <ListChecks className="w-4 h-4 mr-3" />
              Assessments
            </Button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-gray-200">
          <div className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-500 text-sm"
              onClick={openCommandPalette}
            >
              <Search className="w-4 h-4 mr-3" />
              Search
              <span className="ml-auto text-xs">⌘K</span>
            </Button>

            <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm">
              <HelpCircle className="w-4 h-4 mr-3" />
              Help & Support
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm">
              <UserPlus className="w-4 h-4 mr-3" />
              Invite people
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-500 text-sm"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-3" />
              Log out
            </Button>
          </div>
        </div>
      </aside>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8">
          <div className="max-w-4xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-4 mb-8">
              <nav className="flex items-center gap-2 text-sm">
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition-colors">
                  Dashboard
                </Link>
                <span className="text-gray-400">&gt;</span>
                <Link
                  href={`/dashboard/organizations/${orgIdFromRoute}/assessments`}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Assessments
                </Link>
                <span className="text-gray-400">&gt;</span>
                <span className="text-gray-900 font-medium">{assessment.title}</span>
              </nav>
            </div>

            {/* Header + CTA */}
            <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">{assessment.title}</h2>
                  <p className="text-sm text-gray-500">
                    {assessment.type} • {assessment.duration} • {assessment.status}
                    {assessment.isPublished ? " • Published" : ""}
                  </p>
                </div>
                <Button asChild>
                  <Link href={`/dashboard/organizations/${orgIdFromRoute}/assessments/${assessment.id}/edit`}>
                    Edit
                  </Link>
                </Button>
              </div>
            </div>

            {/* Body */}
            <div className="bg-white rounded-lg shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {assessment.descriptionMd || "—"}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="text-sm">
                  <div className="text-gray-500">Created</div>
                  <div className="text-gray-900">
                    {new Date(assessment.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-gray-500">Last updated</div>
                  <div className="text-gray-900">
                    {new Date(assessment.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Command palette overlay */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeCommandPalette} orgId={org?.id} />
    </div>
  );
}
