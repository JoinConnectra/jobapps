"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  MapPin,
  Globe2,
  Tag,
  Users,
  Pencil,
  Trash2,
  Gauge,
  AlertTriangle,
  Building2,
  Link2,
  Clock3,
  Download,
  Mails,
} from "lucide-react";

type EventRecord = {
  id: number;
  org_id: number | null;
  title: string;
  description: string | null;
  location: string | null;
  medium: "IN_PERSON" | "VIRTUAL" | null;
  tags: string[] | null;
  start_at: string;
  end_at: string | null;
  featured: boolean;
  is_employer_hosted: boolean;
  status: string;
  attendees_count?: number | null;
  reg_count?: number | null;
  checkins_count?: number | null;
  capacity?: number | null;
  registration_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

type EventAttendee = {
  userId: number | null;
  studentProfileId: number | null;
  name: string | null;
  email: string;
  program: string | null;
  gradYear: number | null;
  resumeUrl: string | null;
  registered: boolean;
  checkedIn: boolean;
};

export default function UniversityEventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeesError, setAttendeesError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/university/events/${id}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load event");
      }
      setEvent(data as EventRecord);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Load attendees list
  useEffect(() => {
    if (!id) return;
    setAttendeesLoading(true);
    setAttendeesError(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/university/events/${id}/attendees`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load attendees.");
        }
        setAttendees(Array.isArray(data) ? data : []);
      } catch (e: any) {
        console.error("Error loading attendees", e);
        setAttendees([]);
        setAttendeesError(e?.message || "Failed to load attendees.");
      } finally {
        setAttendeesLoading(false);
      }
    })();
  }, [id]);

  async function handleDelete() {
    if (!id) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this event? This cannot be undone.",
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/university/events/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Delete failed.");
      }
      router.push("/university/dashboard/events");
    } catch (e: any) {
      alert(e?.message || "Failed to delete event.");
    } finally {
      setDeleting(false);
    }
  }

  function formatDateTime(iso?: string | null) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  }

  function formatShortDate(iso?: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  }

  const hasData = !!event && !loading && !error;

  // Derived metrics for dashboard-style view
  const metrics = React.useMemo(() => {
    if (!event) {
      return {
        totalRegistrations: 0,
        checkins: 0,
        capacity: null as number | null,
        utilization: null as number | null,
        isUpcoming: false,
        isOngoing: false,
        isPast: false,
        lowRegistration: false,
      };
    }

    const now = Date.now();
    const start = new Date(event.start_at).getTime();
    const end = event.end_at ? new Date(event.end_at).getTime() : start;

    const isUpcoming = start > now;
    const isPast = end < now;
    const isOngoing = !isUpcoming && !isPast;

    const totalRegistrations =
      event.reg_count ?? event.attendees_count ?? 0;
    const checkins = event.checkins_count ?? 0;
    const capacity =
      typeof event.capacity === "number" &&
      Number.isFinite(event.capacity)
        ? event.capacity
        : null;

    const utilization =
      capacity && capacity > 0
        ? Math.min(100, (totalRegistrations / capacity) * 100)
        : null;

    // Heuristic for "low registration" highlight:
    // - Event is upcoming
    // - Has a capacity
    // - Registrations < max(10, 30% of capacity)
    const lowRegistration =
      isUpcoming &&
      capacity !== null &&
      capacity > 0 &&
      totalRegistrations < Math.max(10, Math.floor(capacity * 0.3));

    return {
      totalRegistrations,
      checkins,
      capacity,
      utilization,
      isUpcoming,
      isOngoing,
      isPast,
      lowRegistration,
    };
  }, [event]);

  const hostLabel = event
    ? event.is_employer_hosted
      ? "Employer-hosted"
      : "Career center / university"
    : "";

  const statusLabel = event?.status ?? "";
  const mediumLabel =
    event?.medium === "VIRTUAL" ? "Virtual" : "In-person";

  // "Email all attendees" helper
  const handleEmailAll = React.useCallback(() => {
    if (!attendees || attendees.length === 0) return;

    const uniqueEmails = Array.from(
      new Set(attendees.map((a) => a.email).filter(Boolean)),
    );
    if (uniqueEmails.length === 0) return;

    const subject = event
      ? `Follow-up: ${event.title}`
      : "Event follow-up";

    const body =
      "Hi,\n\nThank you for your interest in this event.\n\nBest regards,\nCareer Center";

    const mailto = `mailto:?bcc=${encodeURIComponent(
      uniqueEmails.join(","),
    )}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      body,
    )}`;

    window.location.href = mailto;
  }, [attendees, event]);

  return (
    <UniversityDashboardShell title="Event details">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => router.push("/university/dashboard/events")}
        >
          ← Back to events
        </Button>

        {event && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() =>
                router.push(
                  `/university/dashboard/events/${event.id}/edit`,
                )
              }
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              type="button"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        )}
      </div>

      <Card className="max-w-4xl">
        <CardHeader>
          {loading ? (
            <CardTitle className="text-lg">Loading…</CardTitle>
          ) : error ? (
            <CardTitle className="text-lg text-red-600">
              {error}
            </CardTitle>
          ) : (
            event && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {statusLabel && (
                    <Badge
                      variant={
                        statusLabel === "published"
                          ? "default"
                          : statusLabel === "draft"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {statusLabel}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <Building2 className="h-3 w-3" />
                    {hostLabel}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <Globe2 className="h-3 w-3" />
                    {mediumLabel}
                  </Badge>
                  {event.featured && (
                    <Badge className="bg-primary text-primary-foreground">
                      Featured
                    </Badge>
                  )}
                </div>

                <CardTitle className="text-2xl font-semibold">
                  {event.title}
                </CardTitle>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>{formatShortDate(event.start_at)}</span>
                    {event.end_at && (
                      <>
                        <span>–</span>
                        <span>{formatShortDate(event.end_at)}</span>
                      </>
                    )}
                  </div>

                  {event.location && (
                    <div className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </CardHeader>

        {hasData && event && (
          <CardContent className="space-y-6">
            {/* Metrics strip */}
            <section className="rounded-md border bg-muted/40 px-4 py-3">
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <Metric
                  label="Registrations"
                  value={metrics.totalRegistrations}
                  icon={Users}
                />
                <Metric
                  label="Check-ins"
                  value={metrics.checkins}
                  icon={CheckIcon}
                />
                <Metric
                  label="Capacity"
                  value={
                    metrics.capacity !== null
                      ? metrics.capacity
                      : "—"
                  }
                  icon={Gauge}
                />
                <Metric
                  label="Utilization"
                  value={
                    metrics.utilization !== null
                      ? `${Math.round(metrics.utilization)}%`
                      : "—"
                  }
                  icon={Gauge}
                />
                <Metric
                  label="When"
                  value={
                    metrics.isUpcoming
                      ? "Upcoming"
                      : metrics.isOngoing
                      ? "Ongoing"
                      : "Past"
                  }
                  icon={Clock3}
                />
              </div>

              {/* Low registration callout */}
              {metrics.lowRegistration && (
                <div className="mt-3 inline-flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                  <div>
                    <div className="font-semibold">
                      Low registrations for an upcoming event
                    </div>
                    <p className="mt-0.5">
                      Consider promoting this event to students and
                      employers. You can highlight it on the dashboard,
                      share the registration link, or nudge relevant
                      majors.
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Registration link */}
            {event.registration_url && (
              <section className="text-sm">
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  Registration link
                </div>
                <a
                  href={event.registration_url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-primary underline"
                >
                  {event.registration_url}
                </a>
              </section>
            )}

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <section className="text-sm">
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  Tags
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {event.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border px-2 py-0.5 text-xs"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Description */}
            {event.description && (
              <section className="text-sm leading-relaxed whitespace-pre-line">
                {event.description}
              </section>
            )}

            {/* Attendees table */}
            <section className="border-t pt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Attendees</h2>
                </div>
                <div className="flex items-center gap-2">
                  {!attendeesLoading && attendees.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {attendees.length} unique student
                      {attendees.length !== 1 && "s"}
                    </span>
                  )}

                  {/* Always show buttons, even if 0 attendees */}
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={`/api/university/events/${String(
                        id,
                      )}/attendees?format=csv`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download CSV
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEmailAll}
                    // optional: disable if none
                    disabled={attendeesLoading || attendees.length === 0}
                  >
                    <Mails className="mr-1.5 h-3.5 w-3.5" />
                    Email all
                  </Button>
                </div>
              </div>

              {attendeesLoading ? (
                <p className="text-xs text-muted-foreground">
                  Loading attendees…
                </p>
              ) : attendeesError ? (
                <p className="text-xs text-red-600">
                  {attendeesError}
                </p>
              ) : attendees.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No student attendees recorded for this event yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Student</th>
                        <th className="px-3 py-2 text-left">
                          Program / Year
                        </th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-right">Profile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendees.map((a) => (
                        <tr
                          key={a.email}
                          className="border-t hover:bg-muted/40"
                        >
                          <td className="px-3 py-2 align-top">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {a.name || "Unknown student"}
                              </span>
                              <span className="text-xs text-muted-foreground break-all">
                                {a.email}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                            {a.program || "—"}
                            {a.gradYear
                              ? ` • Class of ${a.gradYear}`
                              : ""}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="flex flex-wrap gap-1">
                              {a.registered && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  Registered
                                </Badge>
                              )}
                              {a.checkedIn && (
                                <Badge className="text-[10px]">
                                  Checked in
                                </Badge>
                              )}
                              {!a.registered && !a.checkedIn && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  Added manually
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top text-right">
                            {a.studentProfileId ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/university/dashboard/students/${a.studentProfileId}`,
                                  )
                                }
                              >
                                View profile
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No profile
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Meta (created / updated) */}
            <section className="border-t pt-3 text-xs text-muted-foreground flex flex-wrap gap-4">
              {event.created_at && (
                <div className="inline-flex items-center gap-1">
                  <span>Created:</span>
                  <span>{formatDateTime(event.created_at)}</span>
                </div>
              )}
              {event.updated_at && (
                <div className="inline-flex items-center gap-1">
                  <span>Last updated:</span>
                  <span>{formatDateTime(event.updated_at)}</span>
                </div>
              )}
            </section>
          </CardContent>
        )}
      </Card>
    </UniversityDashboardShell>
  );
}

// Small metric tile
function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-background/60 px-3 py-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <div>
        <div className="text-xs font-semibold text-foreground">
          {value}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}

// Tiny "checkmark" icon
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      stroke="currentColor"
      fill="none"
      strokeWidth={2}
    >
      <path
        d="M5 13l4 4L19 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
