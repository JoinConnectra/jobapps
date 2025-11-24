// src/app/dashboard/talent/[id]/page.tsx
"use client";

/**
 * TalentDetailPage — Neutral shell + old-green CTAs (hooks-safe)
 * --------------------------------------------------------------
 * - Matches list page look (grays, subtle borders, soft spacing)
 * - Old green (#6a994e) ONLY on primary CTAs
 * - Initial avatar + tidy meta chips, compact cards
 * - No hooks after conditional returns
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { useEmployerAuth } from "@/hooks/use-employer-auth";
import { authClient } from "@/lib/auth-client";
import { useCommandPalette } from "@/hooks/use-command-palette";

import CompanySidebar from "@/components/company/CompanySidebar";
import CommandPalette from "@/components/CommandPalette";
import SettingsModal from "@/components/SettingsModal";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  ArrowLeft,
  BadgeCheck,
  Mail,
  Phone,
  MapPin,
  FileText,
  Globe,
  Github,
  Linkedin,
  FolderGit2,
  User,
  Briefcase,
  CalendarDays,
  Loader2,
} from "lucide-react";

type TalentDetail = {
  id: number;
  userId: number;
  name: string | null;
  email: string | null;
  program: string | null;
  headline: string | null;
  about: string;
  locationCity: string | null;
  locationCountry: string | null;
  websiteUrl: string | null;
  resumeUrl: string | null;
  isPublic: boolean;
  jobPrefs: any;
  skills: string[];
  whatsapp: string | null;
  province: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  githubUrl: string | null;
  workAuth: string | null;
  needSponsorship: boolean | null;
  willingRelocate: boolean | null;
  remotePref: string | null;
  earliestStart: string | null;
  salaryExpectation: string | null;
  expectedSalaryPkr: number | null;
  noticePeriodDays: number | null;
  experienceYears: number | null;
  verified: boolean;
};

/** Stable HSL color from string (for avatar background) */
function hslFromString(s: string) {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 45%)`;
}

function InitialAvatar({ name }: { name: string }) {
  const initial = (name?.trim()?.[0] || "U").toUpperCase();
  const bg = hslFromString(name || "User");
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shrink-0 shadow-sm"
      style={{ background: bg }}
      aria-hidden
    >
      {initial}
    </div>
  );
}

export default function TalentDetailPage() {
  // ----- Session & routing -----
  const { session, isPending } = useEmployerAuth();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } =
    useCommandPalette();

  // ----- Org (for sidebar header) -----
  const [org, setOrg] = useState<{ id: number; name: string; logoUrl?: string | null } | null>(null);

  // ----- Page data -----
  const [item, setItem] = useState<TalentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // ---------------- Auth & lifecycle ----------------
  useEffect(() => {
    if (!isPending && !session?.user) router.push("/login");
  }, [session, isPending, router]);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const token = localStorage.getItem("bearer_token");
        const resp = await fetch("/api/organizations?mine=true", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const orgs = await resp.json();
          if (Array.isArray(orgs) && orgs.length > 0) setOrg(orgs[0]);
        }
      } catch {
        /* soft-fail */
      }
    };
    if (session?.user && !org) fetchOrg();
  }, [session, org]);

  // ---------------- Data load ----------------
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/talent/${id}`);
        const j = await res.json();
        if (!j.ok) throw new Error(j.error || "Failed to load");
        setItem(j.item);
      } catch (e: any) {
        toast.error(e.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  // ----- Early returns (no hooks below this line!) -----
  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-[#FEFEFA] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }
  if (!session?.user) return null;
  if (!item) {
    return (
      <div className="min-h-screen bg-[#FEFEFA] flex items-center justify-center text-sm text-muted-foreground">
        Not found.
      </div>
    );
  }

  // ----- Plain derived values (no hooks below) -----
  const displayName = item.name || "Unnamed Candidate";
  const locationStr = [item.locationCity, item.locationCountry].filter(Boolean).join(", ") || "—";
  const mailHref = item.email ? `mailto:${item.email}` : undefined;
  const waHref = item.whatsapp ? `https://wa.me/${item.whatsapp.replace(/[^\d]/g, "")}` : undefined;

  // Primary CTA preference without hooks
  let primaryCTA: "email" | "resume" | "whatsapp" | null = null;
  if (mailHref) primaryCTA = "email";
  else if (item.resumeUrl) primaryCTA = "resume";
  else if (waHref) primaryCTA = "whatsapp";

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Sidebar */}
      <CompanySidebar
        org={org}
        user={session.user}
        onSignOut={async () => {
          const { error } = await authClient.signOut();
          if (error?.code) toast.error(error.code);
          else {
            localStorage.removeItem("bearer_token");
            router.push("/");
          }
        }}
        onOpenSettings={() => {
          const ev = new Event("open-settings");
          window.dispatchEvent(ev);
        }}
        active="talent"
      />

      {/* Main */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto overflow-x-hidden">
        <div className="p-8">
          <div className="max-w-5xl mx-auto">
            {/* Breadcrumb + back */}
            <div className="flex items-center justify-between mb-6">
              <nav className="flex items-center gap-2 text-sm">
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition-colors">
                  Dashboard
                </Link>
                <span className="text-gray-400">›</span>
                <Link href="/dashboard/talent" className="text-gray-500 hover:text-gray-700 transition-colors">
                  Talent
                </Link>
                <span className="text-gray-400">›</span>
                <span className="text-gray-900 font-medium">{displayName}</span>
              </nav>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => router.push("/dashboard/talent")} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to list
                </Button>
              </div>
            </div>

            {/* Header Card */}
            <Card className="mb-6 border border-gray-200">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Left: avatar + name/meta */}
                  <div className="flex items-start gap-3 min-w-0">
                    <InitialAvatar name={displayName} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                          {displayName}
                        </h1>
                        {item.verified && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <BadgeCheck className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                      </div>

                      {item.headline && (
                        <div className="text-sm text-gray-700 mt-1 line-clamp-2">{item.headline}</div>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {item.program && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border text-gray-700">
                            <User className="w-3.5 h-3.5" />
                            {item.program}
                          </span>
                        )}
                        {item.experienceYears != null && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border text-gray-700">
                            <Briefcase className="w-3.5 h-3.5" />
                            {item.experienceYears} yrs
                          </span>
                        )}
                        {item.earliestStart && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border text-gray-700">
                            <CalendarDays className="w-3.5 h-3.5" />
                            Start: {item.earliestStart}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border text-gray-700">
                          <MapPin className="w-3.5 h-3.5" />
                          {locationStr}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: actions (old green on primary) */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {item.resumeUrl && (
                      <Link href={item.resumeUrl} target="_blank">
                        <Button
                          size="sm"
                          className={[
                            "gap-2",
                            primaryCTA === "resume" ? "bg-[#6a994e] hover:bg-[#5a8743] text-white" : "",
                          ].join(" ")}
                          variant={primaryCTA === "resume" ? "default" : "outline"}
                        >
                          <FileText className="w-4 h-4" />
                          View Resume
                        </Button>
                      </Link>
                    )}
                    {mailHref && (
                      <a href={mailHref}>
                        <Button
                          size="sm"
                          className={[
                            "gap-2",
                            primaryCTA === "email" ? "bg-[#6a994e] hover:bg-[#5a8743] text-white" : "",
                          ].join(" ")}
                          variant={primaryCTA === "email" ? "default" : "outline"}
                        >
                          <Mail className="w-4 h-4" />
                          Email
                        </Button>
                      </a>
                    )}

                    <Button
  size="sm"
  className="bg-[#6a994e] hover:bg-[#5a8743] text-white gap-2"
  onClick={async () => {
    try {
      if (!org?.id) {
        toast.error("Organization not loaded yet");
        return;
      }

      const res = await fetch("/api/employer/inbox/find-or-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentUserId: item.userId,
          studentName: item.name, // pass name so API can label thread
          orgId: org.id,          // ✅ pass orgId from client
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.threadId) {
        throw new Error(data.error || "Thread not created");
      }

      // Jump to inbox, preselect this thread
      router.push(`/dashboard/inbox?threadId=${data.threadId}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to start conversation");
    }
  }}
>
  💬 Message
</Button>



                    {waHref && (
                      <a href={waHref} target="_blank" rel="noreferrer">
                        <Button
                          size="sm"
                          className={[
                            "gap-2",
                            primaryCTA === "whatsapp" ? "bg-[#6a994e] hover:bg-[#5a8743] text-white" : "",
                          ].join(" ")}
                          variant={primaryCTA === "whatsapp" ? "default" : "outline"}
                        >
                          <Phone className="w-4 h-4" />
                          WhatsApp
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Two-column content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left column */}
              <div className="lg:col-span-2 space-y-4">
                {/* About */}
                <Card className="border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-gray-900">About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none text-sm text-gray-800 whitespace-pre-wrap">
                      {item.about || "—"}
                    </div>
                  </CardContent>
                </Card>

                {/* Skills */}
                <Card className="border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-gray-900">Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(item.skills || []).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.skills.map((s) => (
                          <span
                            key={s}
                            className="text-[11px] px-2 py-1 rounded-full border text-gray-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">—</div>
                    )}
                  </CardContent>
                </Card>

                {/* Preferences */}
                <Card className="border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-gray-900">Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">Remote preference</span>
                        <span className="font-medium text-gray-800">{item.remotePref ?? "—"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">Willing to relocate</span>
                        <span className="font-medium text-gray-800">
                          {item.willingRelocate != null ? (item.willingRelocate ? "Yes" : "No") : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">Notice period</span>
                        <span className="font-medium text-gray-800">
                          {item.noticePeriodDays != null ? `${item.noticePeriodDays} days` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-gray-500">Work authorization</span>
                        <span className="font-medium text-gray-800">{item.workAuth ?? "—"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                {/* Contact & Links */}
                <Card className="border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-gray-900">Contact & Links</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Email</span>
                      <span className="truncate max-w-[60%] text-right text-gray-800">{item.email ?? "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">WhatsApp</span>
                      <span className="truncate max-w-[60%] text-right text-gray-800">{item.whatsapp ?? "—"}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {item.linkedinUrl && (
                        <Link href={item.linkedinUrl} target="_blank">
                          <Button variant="outline" size="sm" className="gap-2">
                            <Linkedin className="w-4 h-4" />
                            LinkedIn
                          </Button>
                        </Link>
                      )}
                      {item.githubUrl && (
                        <Link href={item.githubUrl} target="_blank">
                          <Button variant="outline" size="sm" className="gap-2">
                            <Github className="w-4 h-4" />
                            GitHub
                          </Button>
                        </Link>
                      )}
                      {item.portfolioUrl && (
                        <Link href={item.portfolioUrl} target="_blank">
                          <Button variant="outline" size="sm" className="gap-2">
                            <FolderGit2 className="w-4 h-4" />
                            Portfolio
                          </Button>
                        </Link>
                      )}
                      {item.websiteUrl && (
                        <Link href={item.websiteUrl} target="_blank">
                          <Button variant="outline" size="sm" className="gap-2">
                            <Globe className="w-4 h-4" />
                            Website
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Compensation / Eligibility */}
                <Card className="border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-gray-900">Compensation & Eligibility</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Expected Salary (PKR)</span>
                      <span className="font-medium text-gray-900">
                        {item.expectedSalaryPkr != null ? item.expectedSalaryPkr.toLocaleString() : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Needs Sponsorship</span>
                      <span className="font-medium text-gray-900">
                        {item.needSponsorship != null ? (item.needSponsorship ? "Yes" : "No") : "—"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Command palette */}
        <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeCommandPalette} orgId={org?.id} />

        {/* Settings modal */}
        <SettingsModal
          isOpen={false}
          onClose={async () => {
            try {
              const token = localStorage.getItem("bearer_token");
              const orgResp = await fetch("/api/organizations?mine=true", {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (orgResp.ok) {
                const orgs = await orgResp.json();
                if (Array.isArray(orgs) && orgs.length > 0) setOrg(orgs[0]);
              }
            } catch {
              /* no-op */
            }
          }}
          organization={
            org
              ? {
                  id: org.id,
                  name: org.name,
                  slug: "",
                  type: "company",
                  plan: "free",
                  seatLimit: 5,
                  logoUrl: org.logoUrl,
                  createdAt: "",
                  updatedAt: "",
                }
              : null
          }
        />
      </main>
    </div>
  );
}
