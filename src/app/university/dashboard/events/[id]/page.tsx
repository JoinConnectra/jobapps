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
} from "lucide-react";

type EventRecord = {
  id: number;
  org_id: number | null;
  title: string;
  description: string | null;
  location: string | null;
  medium: string | null;
  tags: string[] | null;
  categories?: string[] | null;
  start_at: string;
  end_at: string | null;
  featured: boolean;
  is_employer_hosted: boolean;
  status: string;
  attendees_count?: number | null;
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
                router.push(`/university/dashboard/events/${event.id}/edit`)
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

      <Card className="max-w-3xl">
        <CardHeader>
          {loading ? (
            <CardTitle className="text-lg">Loading…</CardTitle>
          ) : error ? (
            <CardTitle className="text-lg text-red-600">{error}</CardTitle>
          ) : (
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold">
                {event?.title}
              </CardTitle>
              {event?.status && (
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {event.status}{" "}
                  {event.featured ? "• Featured" : ""}
                  {!event.is_employer_hosted ? " • University event" : ""}
                </p>
              )}
            </div>
          )}
        </CardHeader>

        {!loading && !error && event && (
          <CardContent className="space-y-4">
            {/* Date/time */}
            <div className="flex items-start gap-2 text-sm">
              <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {formatDateTime(event.start_at)}
                </div>
                {event.end_at && (
                  <div className="text-muted-foreground">
                    Ends: {formatDateTime(event.end_at)}
                  </div>
                )}
              </div>
            </div>

            {/* Location / Medium */}
            <div className="flex flex-wrap gap-4 text-sm">
              {event.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span>{event.location}</span>
                </div>
              )}

              {event.medium && (
                <div className="flex items-start gap-2">
                  <Globe2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span>
                    {event.medium === "VIRTUAL" ? "Virtual" : "In-person"}
                  </span>
                </div>
              )}
            </div>

            {/* Tags / capacity / attendees */}
            <div className="flex flex-wrap gap-4 text-sm">
              {event.tags && event.tags.length > 0 && (
                <div className="flex items-start gap-2">
                  <Tag className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span className="flex flex-wrap gap-1">
                    {event.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border px-2 py-0.5 text-xs"
                      >
                        {t}
                      </span>
                    ))}
                  </span>
                </div>
              )}

              {(event.attendees_count ?? null) !== null && (
                <div className="flex items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span>
                    {(event.attendees_count as number) ?? 0} attendees
                    {event.capacity
                      ? ` • Capacity ${event.capacity}`
                      : ""}
                  </span>
                </div>
              )}

              {event.capacity && (event.attendees_count ?? 0) === 0 && (
                <div className="flex items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span>Capacity {event.capacity}</span>
                </div>
              )}
            </div>

            {/* Registration URL */}
            {event.registration_url && (
              <div className="text-sm">
                <span className="font-medium">Registration: </span>
                <a
                  href={event.registration_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline break-all"
                >
                  {event.registration_url}
                </a>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="mt-2 text-sm leading-relaxed whitespace-pre-line">
                {event.description}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </UniversityDashboardShell>
  );
}
