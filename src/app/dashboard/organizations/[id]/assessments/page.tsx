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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession, authClient } from "@/lib/auth-client";
import CommandPalette from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/use-command-palette";

/** Server shape (matches DB): */
type Assessment = {
  id: number;
  orgId: number;
  jobId: number | null;
  title: string;
  type: string;       // "MCQ" | "Coding" | "Case Study" | ...
  duration: string;   // "30 min"
  status: string;     // "Draft" | "Published"
  descriptionMd: string | null;
  isPublished: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
};

export default function AssessmentsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orgIdFromRoute = useMemo(() => {
    const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params]);

  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } =
    useCommandPalette();

  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(true);

  // New Assessment modal
  const [openNew, setOpenNew] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"MCQ" | "Coding" | "Case Study">("MCQ");
  const [duration, setDuration] = useState("30 min");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /** Redirect unauthenticated users */
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  /** Fetch the user's primary organization (for sidebar display only). */
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
            setOrg(orgs[0]);
          }
        }
      } catch (e) {
        console.error("Failed to fetch org (sidebar):", e);
      } finally {
        setLoadingOrg(false);
      }
    })();
  }, [session]);

  /** Load assessments for the org in the route. */
  const loadAssessments = async () => {
    if (!orgIdFromRoute) return;
    setLoadingAssessments(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch(`/api/assessments?orgId=${orgIdFromRoute}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const rows: Assessment[] = await resp.json();
        setAssessments(rows);
      } else {
        console.warn("Failed to load assessments:", await resp.text());
      }
    } catch (e) {
      console.error("Error loading assessments:", e);
    } finally {
      setLoadingAssessments(false);
    }
  };

  useEffect(() => {
    if (session?.user && orgIdFromRoute) {
      loadAssessments();
    }
  }, [session, orgIdFromRoute]);

  /** Sign out */
  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) return;
    localStorage.removeItem("bearer_token");
    router.push("/");
  };

  /** Create new assessment */
  const handleCreate = async () => {
    if (!orgIdFromRoute) return;
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch("/api/assessments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orgId: orgIdFromRoute,
          title: title.trim(),
          type,
          duration: duration.trim(),
          descriptionMd: desc.trim() || undefined,
          status: "Draft",
          isPublished: false,
        }),
      });

      if (resp.ok) {
        // Optimistically append or just reload list
        await loadAssessments();
        // reset form
        setTitle("");
        setType("MCQ");
        setDuration("30 min");
        setDesc("");
        setOpenNew(false);
      } else {
        const t = await resp.text();
        console.error("Create assessment failed:", t);
      }
    } catch (e) {
      console.error("Create assessment error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  if (isPending || loadingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user) return null;

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
          <div className="max-w-6xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-4 mb-8">
              <nav className="flex items-center gap-2 text-sm">
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition-colors">
                  Dashboard
                </Link>
                <span className="text-gray-400">&gt;</span>
                <span className="text-gray-900 font-medium">Assessments</span>
              </nav>
            </div>

            {/* Header + CTA */}
            <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Assessments</h2>
                  <p className="text-sm text-gray-500">Manage screening tests for your openings</p>
                </div>
                <Button onClick={() => setOpenNew(true)}>+ New Assessment</Button>
              </div>
            </div>

            {/* List */}
            {loadingAssessments ? (
              <div className="py-10 flex items-center justify-center">
                <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : assessments.length === 0 ? (
              <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-600">
                No assessments yet. Create your first one!
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {assessments.map((a) => (
                  <div key={a.id} className="bg-white rounded-lg shadow-sm p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{a.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {a.type} • {a.duration}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                          a.status === "Published"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>

                    {/* (Optional) View/Edit buttons can go here */}
                    <div className="mt-4 flex gap-2">
  <Button asChild variant="outline" size="sm" className="text-xs">
    <Link href={`/dashboard/organizations/${orgIdFromRoute}/assessments/${a.id}`}>
      View
    </Link>
  </Button>
  <Button asChild variant="outline" size="sm" className="text-xs">
    <Link href={`/dashboard/organizations/${orgIdFromRoute}/assessments/${a.id}/edit`}>
      Edit
    </Link>
  </Button>
</div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Command palette overlay */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeCommandPalette} orgId={org?.id} />

      {/* ------------- New Assessment Dialog ------------- */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Assessment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., General Aptitude v1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MCQ">MCQ</SelectItem>
                    <SelectItem value="Coding">Coding</SelectItem>
                    <SelectItem value="Case Study">Case Study</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  placeholder="e.g., 30 min"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Description (optional)</Label>
              <Input
                id="desc"
                placeholder="Short description (Markdown allowed)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => setOpenNew(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting || !title.trim() || !orgIdFromRoute}>
              {submitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
