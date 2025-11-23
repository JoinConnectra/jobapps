"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";
import { useSession } from "@/lib/auth-client";

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

export default function NewUniversityEventPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [orgId, setOrgId] = useState<number | null>(null);
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

  // resolve university org id
  useEffect(() => {
    const sid = (session as any)?.user?.org_id ?? null;
    if (sid) {
      setOrgId(Number(sid));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch("/api/organizations?mine=true");
        if (!resp.ok) return;
        const orgs = await resp.json();
        const uni = Array.isArray(orgs)
          ? orgs.find((o: any) => o?.type === "university")
          : null;
        if (!cancelled && uni?.id) {
          setOrgId(Number(uni.id));
        }
      } catch {
        // no-op
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      if (!orgId) {
        throw new Error("Could not resolve your university organization.");
      }
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
        orgId,
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

      const res = await fetch("/api/university/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Event creation failed.");
      }

      // go back to events list
      router.push("/university/dashboard/events");
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <UniversityDashboardShell title="Create Event">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => router.push("/university/dashboard/events")}
        >
          ← Back to events
        </Button>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            New University Event
          </CardTitle>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 text-sm text-red-600">{error}</div>
          )}

          {!orgId && (
            <div className="mb-4 text-sm text-muted-foreground">
              Resolving your university organization…
            </div>
          )}

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
                  <SelectItem value="IN_PERSON">In-person</SelectItem>
                  <SelectItem value="VIRTUAL">Virtual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Location</Label>
              <Input
                value={draft.location}
                onChange={(e) =>
                  setDraft({ ...draft, location: e.target.value })
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
                  setDraft({ ...draft, tags: e.target.value })
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
                  router.push("/university/dashboard/events")
                }
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !orgId}>
                {saving ? "Creating…" : "Create event"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </UniversityDashboardShell>
  );
}
