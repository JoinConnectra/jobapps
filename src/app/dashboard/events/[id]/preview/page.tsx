// src/app/dashboard/events/[id]/preview/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useEmployerAuth } from "@/hooks/use-employer-auth";
import { authClient } from "@/lib/auth-client";

import CompanySidebar from "@/components/company/CompanySidebar";
import SettingsModal from "@/components/SettingsModal";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Users, Globe2, Link2 } from "lucide-react";

import type { EventOut, EventStatus, Medium } from "../../_types";

type OrgLite = { id: number; name: string; logoUrl?: string | null };

export default function EventPreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { session, isPending } = useEmployerAuth();
  const router = useRouter();

  const [org, setOrg] = useState<OrgLite | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [event, setEvent] = useState<EventOut | null>(null);
  const [loading, setLoading] = useState(true);

  // auth guard
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session?.user, isPending, router]);

  // load org
  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const token = localStorage.getItem("bearer_token") || "";
        const r = await fetch("/api/organizations?mine=true", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (r.ok) {
          const orgs = await r.json();
          if (Array.isArray(orgs) && orgs.length > 0) {
            setOrg(orgs[0]);
          }
        }
      } catch {
        /* no-op */
      }
    };
    if (session?.user && !org) {
      fetchOrg();
    }
  }, [session?.user, org]);

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) toast.error(error.code);
    else {
      localStorage.removeItem("bearer_token");
      router.push("/");
    }
  };

  // load event
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/events/${id}`, { cache: "no-store" });
        const j: EventOut = await r.json();
        if (!r.ok) {
          throw new Error((j as any).error || "Failed to load event");
        }
        setEvent(j);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to load event");
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      load();
    }
  }, [id, session?.user]);

  if (isPending || !session?.user || loading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const medium = (event.medium as Medium) ?? "IN_PERSON";
  const status = (event.status as EventStatus) ?? "draft";
  const regCount = (event as any).reg_count ?? 0;
  const checkinsCount = (event as any).checkins_count ?? 0;
  const capacity: number | null =
    (event as any).capacity != null ? Number((event as any).capacity) || 0 : null;
  const registrationUrl = (event as any).registration_url ?? null;

  const dateString = formatEventDate(event.start_at);
  const temporalLabel = getTemporalLabel(event.start_at, event.end_at);
  const isFull =
    typeof capacity === "number" && capacity > 0 && regCount >= capacity;

  const utilization =
    typeof capacity === "number" && capacity > 0
      ? Math.min(100, (regCount / capacity) * 100)
      : null;

  const studentLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/events/${event.id}`
      : `/events/${event.id}`;

  const handleCopyStudentLink = async () => {
    try {
      await navigator.clipboard.writeText(studentLink);
      toast.success("Student-facing link copied");
    } catch {
      toast.error("Unable to copy link");
    }
  };

  const handleCopyRegistrationLink = async () => {
    if (!registrationUrl) return;
    try {
      await navigator.clipboard.writeText(registrationUrl);
      toast.success("Registration link copied");
    } catch {
      toast.error("Unable to copy link");
    }
  };

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      <CompanySidebar
        org={org}
        user={session.user}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        active="events"
      />

      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto overflow-x-hidden">
        <div className="p-8">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Breadcrumb */}
            <div className="text-sm text-gray-600 mb-1">
              <button
                type="button"
                className="text-gray-500 hover:text-gray-800"
                onClick={() => router.push("/dashboard/events")}
              >
                Events
              </button>
              <span className="mx-1">›</span>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-800"
                onClick={() => router.push(`/dashboard/events/${id}`)}
              >
                Edit
              </button>
              <span className="mx-1">›</span>
              <span className="font-medium text-gray-900">Preview</span>
            </div>

            

            <Card>
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={
                        status === "published"
                          ? "default"
                          : status === "draft"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                      {temporalLabel}
                    </Badge>
                    {isFull && (
                      <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0.5">
                        Full
                      </Badge>
                    )}
                    {event.featured && (
                      <Badge className="bg-primary text-primary-foreground">
                        Featured
                      </Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="text-2xl font-semibold">
                  {event.title}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    {dateString}
                  </span>
                  {event.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Globe2 className="h-4 w-4" />
                    {medium === "VIRTUAL" ? "Virtual" : "In-person"}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {regCount} registered
                    {typeof checkinsCount === "number" &&
                      ` · ${checkinsCount} checked-in`}
                    {typeof capacity === "number" &&
                      ` · capacity ${capacity}`}
                  </span>
                </div>

                {utilization !== null && (
                  <div className="mt-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>Capacity utilization</span>
                      <span>
                        {regCount}/{capacity} seats (
                        {Math.round(utilization)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          isFull ? "bg-red-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Tags */}
                {Array.isArray(event.tags) && event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Description */}
                {event.description && (
                  <div className="mt-2 space-y-1">
                    <div className="font-medium text-gray-900">
                      Description
                    </div>
                    <p className="text-sm whitespace-pre-line">
                      {event.description}
                    </p>
                  </div>
                )}

                {/* Registration link */}
                {registrationUrl && (
                  <div className="mt-2 space-y-1">
                    <div className="font-medium text-gray-900">
                      Registration link
                    </div>
                    <a
                      href={registrationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 underline break-all"
                    >
                      {registrationUrl}
                    </a>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 flex flex-wrap justify-between gap-2 border-t mt-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/events/${id}`)}
                    >
                      Edit event
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        toast.info(
                          "This is an employer preview — student-facing page will use this data."
                        )
                      }
                    >
                      This is a preview
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopyStudentLink}
                    >
                      <Link2 className="mr-2 h-4 w-4" />
                      Copy student link
                    </Button>
                    {registrationUrl && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleCopyRegistrationLink}
                      >
                        <Link2 className="mr-2 h-4 w-4" />
                        Copy registration link
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={async () => {
            setIsSettingsOpen(false);
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

function formatEventDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function getTemporalLabel(startIso: string, endIso: string | null) {
  const now = Date.now();
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : start;

  if (end < now) return "Past";
  if (start <= now && end >= now) return "Ongoing";
  return "Upcoming";
}
