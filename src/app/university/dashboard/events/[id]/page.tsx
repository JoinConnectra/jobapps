"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default function UniversityEventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleDelete() {
    if (!id) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this event? This cannot be undone."
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
    const end = event.end_at
      ? new Date(event.end_at).getTime()
      : start;

    const isUpcoming = start > now;
    const isPast = end < now;
    const isOngoing = !isUpcoming && !isPast;

    const totalRegistrations =
      event.reg_count ??
      event.attendees_count ??
      0;
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
      totalRegistrations <
        Math.max(10, Math.floor(capacity * 0.3));

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
                  `/university/dashboard/events/${event.id}/edit`
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
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {hostLabel}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
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
                  icon={CheckIcon} // tiny inline icon component below
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

// Tiny "checkmark" icon using Lucide's Users-style sizing
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
