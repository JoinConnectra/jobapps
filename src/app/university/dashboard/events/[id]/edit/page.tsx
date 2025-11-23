"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type EventRecord = {
  id: number;
  org_id: number | null;
  title: string;
  description: string | null;
  location: string | null;
  medium: string | null;
  tags: string[] | null;
  start_at: string;
  end_at: string | null;
  featured: boolean;
  is_employer_hosted: boolean;
  status: string;
  capacity?: number | null;
  registration_url?: string | null;
};

function toLocalInputValue(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // "YYYY-MM-DDTHH:MM"
  return d.toISOString().slice(0, 16);
}

export default function EditUniversityEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [initial, setInitial] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    title: "",
    description: "",
    location: "",
    medium: "IN_PERSON" as "IN_PERSON" | "VIRTUAL",
    startDate: "",
    endDate: "",
    tags: "",
    capacity: "",
    registrationUrl: "",
  });

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
      const ev = data as EventRecord;
      setInitial(ev);

      setDraft({
        title: ev.title ?? "",
        description: ev.description ?? "",
        location: ev.location ?? "",
        medium: (ev.medium as "IN_PERSON" | "VIRTUAL") || "IN_PERSON",
        startDate: toLocalInputValue(ev.start_at),
        endDate: toLocalInputValue(ev.end_at),
        tags: (ev.tags ?? []).join(", "),
        capacity:
          ev.capacity !== null && ev.capacity !== undefined
            ? String(ev.capacity)
            : "",
        registrationUrl: ev.registration_url ?? "",
      });
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    try {
      setSaving(true);
      setError(null);

      if (!draft.title.trim()) {
        throw new Error("Title is required.");
      }
      if (!draft.startDate) {
        throw new Error("Start date/time is required.");
      }

      const tags = draft.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const capacityNum = draft.capacity
        ? Number.parseInt(draft.capacity, 10)
        : null;

      const payload = {
        title: draft.title.trim(),
        description: draft.description || null,
        location: draft.location || null,
        medium: draft.medium,
        tags,
        capacity: capacityNum,
        registrationUrl: draft.registrationUrl || null,
        startsAt: new Date(draft.startDate).toISOString(),
        endsAt: draft.endDate
          ? new Date(draft.endDate).toISOString()
          : null,
      };

      const res = await fetch(`/api/university/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Update failed.");
      }

      router.push(`/university/dashboard/events/${id}`);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <UniversityDashboardShell title="Edit Event">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() =>
            router.push(
              `/university/dashboard/events/${id ?? ""}`
            )
          }
        >
          ← Back to event
        </Button>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {loading
              ? "Loading…"
              : initial
              ? `Edit: ${initial.title}`
              : "Edit event"}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 text-sm text-red-600">{error}</div>
          )}

          {!loading && !initial && !error && (
            <div className="text-sm text-muted-foreground">
              Event not found.
            </div>
          )}

          {initial && (
            <form className="space-y-5" onSubmit={handleSave}>
              <div className="grid gap-2">
                <Label>Title *</Label>
                <Input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                  placeholder="Career Fair 2025"
                />
              </div>

              <div className="grid gap-2">
                <Label>Medium</Label>
                <Select
                  value={draft.medium}
                  onValueChange={(v) =>
                    setDraft({
                      ...draft,
                      medium: v as "IN_PERSON" | "VIRTUAL",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select medium" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN_PERSON">
                      In-person
                    </SelectItem>
                    <SelectItem value="VIRTUAL">Virtual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Location</Label>
                <Input
                  value={draft.location}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      location: e.target.value,
                    })
                  }
                  placeholder="Main Auditorium, Campus A"
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2 md:gap-4">
                <div className="grid gap-2">
                  <Label>Start *</Label>
                  <Input
                    type="datetime-local"
                    value={draft.startDate}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        startDate: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label>End (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={draft.endDate}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        endDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Tags (comma separated)</Label>
                <Input
                  value={draft.tags}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      tags: e.target.value,
                    })
                  }
                  placeholder="career, tech, internship"
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2 md:gap-4">
                <div className="grid gap-2">
                  <Label>Capacity (optional)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={draft.capacity}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        capacity: e.target.value,
                      })
                    }
                    placeholder="e.g. 200"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Registration URL (optional)</Label>
                  <Input
                    type="url"
                    value={draft.registrationUrl}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        registrationUrl: e.target.value,
                      })
                    }
                    placeholder="https://…"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  rows={5}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      description: e.target.value,
                    })
                  }
                  placeholder="Share details about the event, target audience, and agenda."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() =>
                    router.push(
                      `/university/dashboard/events/${id ?? ""}`
                    )
                  }
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </UniversityDashboardShell>
  );
}
