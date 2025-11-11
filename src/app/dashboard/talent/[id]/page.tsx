// src/app/dashboard/talent/[id]/page.tsx
"use client";

/**
 * TalentDetailPage — Hybrid shell (fixed hooks order)
 * ---------------------------------------------------
 * - No hooks after conditional returns (prevents “Rendered more hooks…”)
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

  // ----- Plain derived values (no hooks) -----
  const locationStr =
    [item.locationCity, item.locationCountry].filter(Boolean).join(", ") || "—";
  const mailHref = item.email ? `mailto:${item.email}` : undefined;
  const waHref = item.whatsapp ? `https://wa.me/${item.whatsapp.replace(/[^\d]/g, "")}` : undefined;

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
        {/* Breadcrumb + top actions */}
        <div className="p-8">
          <div className="max-w-5xl mx-auto">
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
                <span className="text-gray-900 font-medium">{item.name || "Candidate"}</span>
              </nav>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => router.push("/dashboard/talent")} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to list
                </Button>
              </div>
            </div>

            {/* Header card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-semibold text-gray-900 truncate">
                        {item.name || "Unnamed Candidate"}
                      </h1>
                      {item.verified && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <BadgeCheck className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {item.program ? (
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> {item.program}
                        </span>
                      ) : null}
                      {item.experienceYears != null ? (
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5" /> {item.experienceYears} yrs
                        </span>
                      ) : null}
                      {item.earliestStart ? (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" /> Earliest start: {item.earliestStart}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {item.resumeUrl && (
                      <Link href={item.resumeUrl} target="_blank">
                        <Button size="sm" className="gap-2">
                          <FileText className="w-4 h-4" />
                          View Resume
                        </Button>
                      </Link>
                    )}
                    {mailHref && (
                      <a href={mailHref}>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Mail className="w-4 h-4" />
                          Email
                        </Button>
                      </a>
                    )}
                    {waHref && (
                      <a href={waHref} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Phone className="w-4 h-4" />
                          WhatsApp
                        </Button>
                      </a>
                    )}
                  </div>
                </CardTitle>

                {item.headline && (
                  <div className="text-sm text-gray-700 mt-2">{item.headline}</div>
                )}
                <div className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {locationStr}
                </div>
              </CardHeader>
            </Card>

            {/* 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left column */}
              <div className="lg:col-span-2 space-y-4">
                {/* About */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none text-sm whitespace-pre-wrap">
                      {item.about || "—"}
                    </div>
                  </CardContent>
                </Card>

                {/* Skills */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(item.skills || []).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.skills.map((s) => (
                          <span key={s} className="text-[10px] px-2 py-1 rounded-full border">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">—</div>
                    )}
                  </CardContent>
                </Card>

                {/* Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div>Remote preference: {item.remotePref ?? "—"}</div>
                    <div>
                      Willing to relocate:{" "}
                      {item.willingRelocate != null ? (item.willingRelocate ? "Yes" : "No") : "—"}
                    </div>
                    <div>Notice period: {item.noticePeriodDays != null ? `${item.noticePeriodDays} days` : "—"}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                {/* Contact & Links */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contact & Links</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Email</span>
                      <span className="truncate max-w-[60%] text-right">{item.email ?? "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">WhatsApp</span>
                      <span className="truncate max-w-[60%] text-right">{item.whatsapp ?? "—"}</span>
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Compensation & Eligibility</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Expected Salary (PKR)</span>
                      <span className="font-medium">
                        {item.expectedSalaryPkr != null ? item.expectedSalaryPkr.toLocaleString() : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Work Authorization</span>
                      <span className="font-medium">{item.workAuth ?? "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Needs Sponsorship</span>
                      <span className="font-medium">
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
          isOpen={false /* toggle via sidebar or route when you wire it */}
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
