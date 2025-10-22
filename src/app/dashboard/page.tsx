"use client";

import { useEffect, useState } from "react";
import { useSession, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Briefcase, Search, HelpCircle, UserPlus, LogOut, Bell, Send } from "lucide-react";
import CommandPalette from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { getRelativeTime } from "@/lib/time-utils";

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } = useCommandPalette();
  const [stats, setStats] = useState({
    jobs: 0,
    applications: 0,
  });
  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  const [feed, setFeed] = useState<Array<{ at: string; title: string; href?: string; kind: "company" | "applicants" }>>([]);
  const [activityFilter, setActivityFilter] = useState<"all" | "company" | "applicants">("all");

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      fetchOrgAndStats();
    }
  }, [session]);

  useEffect(() => {
    // refetch activities when filter changes and org is known
    const token = localStorage.getItem("bearer_token");
    if (org?.id && token) {
      fetchActivity(org.id, token, activityFilter);
    }
  }, [activityFilter, org?.id]);

  const fetchOrgAndStats = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      // Fetch my organizations
      const orgsResponse = await fetch("/api/organizations?mine=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (orgsResponse.ok) {
        const orgs = await orgsResponse.json();
        // no orgs count on dashboard to avoid org concept surfacing
        const primary = Array.isArray(orgs) && orgs.length > 0 ? orgs[0] : null;
        setOrg(primary ? { id: primary.id, name: primary.name } : null);
        setLoadingOrg(false);

        // Fetch job/app counts and activity for primary org
        if (primary) {
          const [jobsResp, appsResp, activityResp] = await Promise.all([
            fetch(`/api/jobs?orgId=${primary.id}&limit=10`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`/api/applications?orgId=${primary.id}&limit=20`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`/api/activity?orgId=${primary.id}&limit=50`, { headers: { Authorization: `Bearer ${token}` } }),
          ]);

          if (jobsResp.ok) {
            const jobsData = await jobsResp.json();
            setStats((prev) => ({ ...prev, jobs: Array.isArray(jobsData) ? jobsData.length : 0 }));
          }
          if (appsResp.ok) {
            const appsData = await appsResp.json();
            setStats((prev) => ({ ...prev, applications: Array.isArray(appsData) ? appsData.length : 0 }));
          }
          if (activityResp.ok) {
            // initial load uses "all" filter
            await fetchActivity(primary.id, token, activityFilter);
          }
        }
      }

      // Fetch jobs (we'll need to implement this properly later)
      // For now just showing 0s
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoadingOrg(false);
    }
  };

  const fetchActivity = async (orgId: number, token: string, filter: "all" | "company" | "applicants") => {
    let url = `/api/activity?orgId=${orgId}&limit=50`;
    if (filter === "company") url += `&entityType=job`;
    if (filter === "applicants") url += `&entityType=application`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) return;
    const acts = await resp.json();
    const items: Array<{ at: string; title: string; href?: string; kind: "company" | "applicants" }> = acts.map((a: any) => {
      if (a.entityType === 'job' && a.action === 'created') {
        const jobTitle = a.diffJson?.jobTitle || 'a job';
        const by = a.actorName || a.actorEmail || 'Someone';
        return { at: a.createdAt, title: `${by} created “${jobTitle}”`, href: a.entityId ? `/dashboard/jobs/${a.entityId}` : undefined, kind: 'company' };
      }
      if (a.entityType === 'application' && a.action === 'applied') {
        const email = a.diffJson?.applicantEmail || 'A candidate';
        const jobTitle = a.diffJson?.jobTitle || 'a job';
        return { at: a.createdAt, title: `${email} applied to “${jobTitle}”`, href: a.entityId ? `/dashboard/applications/${a.entityId}` : undefined, kind: 'applicants' };
      }
      return { at: a.createdAt, title: `${a.actorName || a.actorEmail || 'Someone'} performed ${a.action} on ${a.entityType}#${a.entityId}`, kind: 'company' };
    });
    setFeed(items);
  };

  // No inline job creation on dashboard; that lives under /dashboard/jobs

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error(error.code);
    } else {
      localStorage.removeItem("bearer_token");
      router.push("/");
    }
  };

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

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Left Sidebar */}
      <aside className="w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <div className="text-xl font-display font-bold text-gray-900 mb-6">{org?.name || "forshadow"}</div>
          
          <Button onClick={() => router.push("/dashboard/jobs?create=1")} className="w-full mb-6 bg-[#F5F1E8] text-gray-900 hover:bg-[#E8E0D5] border-0">
            + Create a Job
          </Button>
          
          <nav className="space-y-1">
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900">
              <Bell className="w-4 h-4 mr-3" />
              Activities
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900" onClick={() => router.push("/dashboard/jobs")}>
              <Briefcase className="w-4 h-4 mr-3" />
              Jobs
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
            <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-3" />
              Log out
            </Button>
          </div>
          
          <div className="mt-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-sm font-medium">{session.user.name?.charAt(0)}</span>
            </div>
            <div className="text-sm font-medium text-gray-900">{session.user.name}</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8">
        <div className="max-w-6xl">
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

          {/* Filter Buttons */}
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
              <div className="text-center py-16">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 border-2 border-gray-300 rounded-lg flex items-center justify-center">
                    <div className="w-8 h-8 border border-gray-300 rounded-sm flex items-center justify-center">
                      <Bell className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
                <p className="text-sm text-gray-500 mb-6">Once you start posting jobs and receiving applications, activity will appear here</p>
                <Button 
                  onClick={() => router.push("/dashboard/jobs?create=1")}
                  className="bg-[#6a994e] hover:bg-[#5a8a3e] text-white"
                >
                  Post your first job
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {feed.map((item, idx) => (
                  <div key={idx} className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.kind === 'company' ? 'bg-green-100' : 'bg-blue-100'}`}>
                        {item.kind === 'company' ? (
                          <Send className="w-4 h-4 text-green-600" />
                        ) : (
                          <User className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={item.href || "#"} className="block cursor-pointer">
                              <div className="text-sm text-gray-900 hover:text-[#6a994e] transition-colors">
                            {item.title}
                          </div>
                        </Link>
                      </div>
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
      
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={closeCommandPalette}
        orgId={org?.id}
      />
    </div>
  );
}