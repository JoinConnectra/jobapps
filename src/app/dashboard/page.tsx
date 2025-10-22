"use client";

import { useEffect, useState } from "react";
import { useSession, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, User } from "lucide-react";

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    jobs: 0,
    applications: 0,
  });
  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  const [feed, setFeed] = useState<Array<{ at: string; title: string; href?: string }>>([]);

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

        // Fetch job/app counts and recent activity for primary org
        if (primary) {
          const jobsResp = await fetch(`/api/jobs?orgId=${primary.id}&limit=10`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (jobsResp.ok) {
            const jobsData = await jobsResp.json();
            setStats((prev) => ({ ...prev, jobs: Array.isArray(jobsData) ? jobsData.length : 0 }));
          }

          const appsResp = await fetch(`/api/applications?orgId=${primary.id}&limit=20`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (appsResp.ok) {
            const appsData = await appsResp.json();
            setStats((prev) => ({ ...prev, applications: Array.isArray(appsData) ? appsData.length : 0 }));

            const items: Array<{ at: string; title: string; href?: string }> = [];
            for (const a of appsData) {
              items.push({
                at: a.createdAt,
                title: `${a.applicantEmail} applied to ${a.jobTitle}`,
                href: `/dashboard/applications/${a.id}`,
              });
            }
            // sort newest first
            items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
            setFeed(items.slice(0, 25));
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
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
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
    <div className="min-h-screen bg-[#F5F1E8]">
      <nav className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-2xl font-display font-bold text-foreground">
              Rapha
            </Link>
            {org && (
              <span className="text-sm text-muted-foreground">/ {org.name}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{session.user.name}</p>
              <p className="text-xs text-muted-foreground">{session.user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-all font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="md:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
              <div className="mb-6">
                <div className="text-lg font-display font-bold text-foreground">{org?.name || "Your Company"}</div>
              </div>
              <div className="space-y-2">
                <Button onClick={() => router.push("/dashboard/jobs?create=1")} className="w-full justify-between">
                  Create a Job
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => router.push("/dashboard")}>Activities</Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => router.push("/dashboard/jobs")}>Jobs</Button>
              </div>
              <div className="mt-8 pt-6 border-t border-border flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{session.user.name}</div>
                  <div className="text-xs text-muted-foreground">{session.user.email}</div>
                </div>
                <button onClick={handleSignOut} className="text-xs text-muted-foreground hover:text-foreground">Sign out</button>
              </div>
            </div>
          </aside>

          {/* Activities Feed */}
          <section className="md:col-span-9">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">Activities</h2>
              {feed.length === 0 ? (
                <p className="text-muted-foreground">No recent activity yet.</p>
              ) : (
                <div className="space-y-6">
                  {feed.map((item, idx) => (
                    <Link key={idx} href={item.href || "#"} className="block">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-foreground">{item.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">{new Date(item.at).toLocaleString()}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}