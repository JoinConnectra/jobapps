"use client";

/**
 * DashboardPage
 * -------------
 * Purpose:
 * - Main company dashboard at /dashboard.
 * - Shows activity feed (company + applicants), quick stats, and left sidebar nav.
 *
 * What it does:
 * - Auth gate: if not logged in, redirect to /login.
 * - On load, fetches the user's primary organization (via /api/organizations?mine=true).
 * - Uses that org id to fetch:
 *    - jobs count      (/api/jobs?orgId=...&limit=10)
 *    - applications    (/api/applications?orgId=...&limit=20)
 *    - activity feed   (/api/activity?orgId=...&limit=50)
 * - Lets the user filter the activity feed by "All / Company / Applicants".
 * - Left sidebar includes an Assessments link routed to
 *   /dashboard/organizations/[orgId]/assessments (disabled until org is known).
 *
 * Notes:
 * - No inline job creation here (that lives under /dashboard/jobs).
 * - Command Palette is wired via useCommandPalette hook.
 */

import { useEffect, useState } from "react";
import { useSession, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User,
  Briefcase,
  BarChartIcon,
  Search,
  HelpCircle,
  UserPlus,
  LogOut,
  Bell,
  Send,
  ListChecks, // Icon for "Assessments" entry
} from "lucide-react";
import CommandPalette from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { getRelativeTime } from "@/lib/time-utils";

export default function DashboardPage() {
  // ---- Session & routing ----
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } =
    useCommandPalette();

  // ---- Topline stats (counts only) ----
  const [stats, setStats] = useState({
    jobs: 0,
    applications: 0,
  });

  // ---- Organization selection (first org) ----
  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  // ---- Activity feed & filter state ----
  type FeedItem = { at: string; title: string; href?: string; kind: "company" | "applicants" };
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [activityFilter, setActivityFilter] = useState<"all" | "company" | "applicants">("all");

  /**
   * Auth guard:
   * - While session is pending, do nothing.
   * - If not logged in, redirect to /login.
   */
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  /**
   * After login:
   * - Fetch primary org and initial stats + feed
   */
  useEffect(() => {
    if (session?.user) {
      fetchOrgAndStats();
    }
  }, [session]);

  /**
   * Refresh feed whenever the filter or org changes.
   */
  useEffect(() => {
    const token = localStorage.getItem("bearer_token");
    if (org?.id && token) {
      fetchActivity(org.id, token, activityFilter);
    }
  }, [activityFilter, org?.id]);

  /**
   * Fetch user's organizations, select the first one as "primary",
   * and then load its stats and initial activity feed.
   */
  const fetchOrgAndStats = async () => {
    try {
      const token = localStorage.getItem("bearer_token");

      // 1) Load user's orgs
      const orgsResponse = await fetch("/api/organizations?mine=true", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (orgsResponse.ok) {
        const orgs = await orgsResponse.json();
        const primary = Array.isArray(orgs) && orgs.length > 0 ? orgs[0] : null;

        setOrg(primary ? { id: primary.id, name: primary.name } : null);
        setLoadingOrg(false);

        // 2) If we have a primary org, load counts and initial feed
        if (primary) {
          const [jobsResp, appsResp] = await Promise.all([
            fetch(`/api/jobs?orgId=${primary.id}&limit=10`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`/api/applications?orgId=${primary.id}&limit=20`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          if (jobsResp.ok) {
            const jobsData = await jobsResp.json();
            setStats((prev) => ({ ...prev, jobs: Array.isArray(jobsData) ? jobsData.length : 0 }));
          }

          if (appsResp.ok) {
            const appsData = await appsResp.json();
            setStats((prev) => ({
              ...prev,
              applications: Array.isArray(appsData) ? appsData.length : 0,
            }));
          }

          // Initial activity load honors the current filter (default: "all")
          await fetchActivity(primary.id, token, activityFilter);
        }
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoadingOrg(false);
    }
  };

  /**
   * Fetch activity for an org id, filtered by entity type.
   * - "company"  => entityType=job
   * - "applicants" => entityType=application
   * - "all"      => no entityType filter
   */
  const fetchActivity = async (
    orgId: number,
    token: string,
    filter: "all" | "company" | "applicants",
  ) => {
    let url = `/api/activity?orgId=${orgId}&limit=50`;
    if (filter === "company") url += `&entityType=job`;
    if (filter === "applicants") url += `&entityType=application`;

    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) return;

    const acts = await resp.json();

    // Normalize API payload -> FeedItem[]
    const items: FeedItem[] = acts.map((a: any) => {
      if (a.entityType === "job" && a.action === "created") {
        const jobTitle = a.diffJson?.jobTitle || "a job";
        const by = a.actorName || a.actorEmail || "Someone";
        return {
          at: a.createdAt,
          title: `${by} created “${jobTitle}”`,
          href: a.entityId ? `/dashboard/jobs/${a.entityId}` : undefined,
          kind: "company",
        };
      }
      if (a.entityType === "application" && a.action === "applied") {
        const email = a.diffJson?.applicantEmail || "A candidate";
        const jobTitle = a.diffJson?.jobTitle || "a job";
        return {
          at: a.createdAt,
          title: `${email} applied to “${jobTitle}”`,
          href: a.entityId ? `/dashboard/applications/${a.entityId}` : undefined,
          kind: "applicants",
        };
      }
      // Fallback for any other activity kind
      return {
        at: a.createdAt,
        title: `${a.actorName || a.actorEmail || "Someone"} performed ${a.action} on ${
          a.entityType
        }#${a.entityId}`,
        kind: "company",
      };
    });

    setFeed(items);
  };

  // Sign out via auth client; clear token and go to home
  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error(error.code);
    } else {
      localStorage.removeItem("bearer_token");
      router.push("/");
    }
  };

  // ----- Loading / auth gates -----
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  // ----- Layout -----
  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Left Sidebar (shared style with Jobs pages) */}
      <aside className="w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <div className="text-xl font-display font-bold text-gray-900 mb-6">
            {org?.name || "forshadow"}
          </div>

          {/* CTA to create a job (navigates to Jobs surface with ?create=1) */}
          <Button
            onClick={() => router.push("/dashboard/jobs?create=1")}
            className="w-full mb-6 bg-[#F5F1E8] text-gray-900 hover:bg-[#E8E0D5] border-0"
          >
            + Create a Job
          </Button>

          {/* Primary navigation */}
          <nav className="space-y-1">
            {/* Current section highlight intentionally omitted for "Activities" */}
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
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

            {/* Assessments (org scoped). Disabled until org id is known. */}
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
              disabled={!org?.id}
              title={!org?.id ? "Select or create an organization first" : "Assessments"}
              onClick={() =>
                org?.id && router.push(`/dashboard/organizations/${org.id}/assessments`)
              }
            >
              <ListChecks className="w-4 h-4 mr-3" />
              Assessments
            </Button>

            <Button
  variant="ghost"
  className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
  onClick={() => router.push("/dashboard/kpi/insights")}
>
  <BarChartIcon className="w-4 h-4 mr-3" />
  KPI · Insights
</Button>
          </nav>
        </div>

        {/* Footer actions: search/shortcuts/help/invite/logout */}
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

          {/* Current user pill */}
          <div className="mt-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {session.user.name?.charAt(0)}
              </span>
            </div>
            <div className="text-sm font-medium text-gray-900">{session.user.name}</div>
          </div>
        </div>
      </aside>

      {/* Main Content: breadcrumbs, filters, and activities feed */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8">
          <div className="max-w-6xl">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-4 mb-8">
              <nav className="flex items-center gap-2 text-sm">
                <Link
                  href="/dashboard"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Dashboard
                </Link>
                <span className="text-gray-400">&gt;</span>
                <span className="text-gray-900 font-medium">Activities</span>
              </nav>
            </div>

            {/* Filter Buttons (All / Company / Applicants) */}
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setActivityFilter("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activityFilter === "all"
                    ? "bg-[#6a994e] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActivityFilter("company")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activityFilter === "company"
                    ? "bg-[#6a994e] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Company
              </button>
              <button
                onClick={() => setActivityFilter("applicants")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activityFilter === "applicants"
                    ? "bg-[#6a994e] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Applicants
              </button>
            </div>

            {/* Activities List */}
            <div className="bg-white rounded-lg shadow-sm">
              {feed.length === 0 ? (
                // Empty state if no activity exists yet
                <div className="text-center py-16">
                  <div className="flex items-center justify-center mb-6">
                    <div className="w-16 h-16 border-2 border-gray-300 rounded-lg flex items-center justify-center">
                      <div className="w-8 h-8 border border-gray-300 rounded-sm flex items-center justify-center">
                        <Bell className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Once you start posting jobs and receiving applications, activity will appear here
                  </p>
                  <Button
                    onClick={() => router.push("/dashboard/jobs?create=1")}
                    className="bg-[#6a994e] hover:bg-[#5a8a3e] text-white"
                  >
                    Post your first job
                  </Button>
                </div>
              ) : (
                // Feed items
                <div className="divide-y divide-gray-100">
                  {feed.map((item, idx) => (
                    <div key={idx} className="p-5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        {/* Icon pill by kind */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            item.kind === "company" ? "bg-green-100" : "bg-blue-100"
                          }`}
                        >
                          {item.kind === "company" ? (
                            <Send className="w-4 h-4 text-green-600" />
                          ) : (
                            <User className="w-4 h-4 text-blue-600" />
                          )}
                        </div>

                        {/* Title + link */}
                        <div className="flex-1 min-w-0">
                          <Link href={item.href || "#"} className="block cursor-pointer">
                            <div className="text-sm text-gray-900 hover:text-[#6a994e] transition-colors">
                              {item.title}
                            </div>
                          </Link>
                        </div>

                        {/* Right-aligned relative timestamp */}
                        <div className="text-xs text-gray-400">
                          {getRelativeTime(item.at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Command palette modal (global actions / search) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        orgId={org?.id}
      />
    </div>
  );
}
