// src/app/dashboard/events/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useEmployerAuth } from "@/hooks/use-employer-auth";
import { authClient } from "@/lib/auth-client";

import CompanySidebar from "@/components/company/CompanySidebar";
import SettingsModal from "@/components/SettingsModal";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { EventStatus, Medium, EventOut } from "../_types";

type OrgLite = { id: number; name: string; logoUrl?: string | null };

type Draft = {
  title: string;
  medium: Medium;
  location: string;
  startLocal: string; // datetime-local string
  endLocal: string;
  tags: string;
  description: string;
  capacity: string;
  registrationUrl: string;
  status: EventStatus;
  featured: boolean;
};

const emptyDraft: Draft = {
  title: "",
  medium: "IN_PERSON",
  location: "",
  startLocal: "",
  endLocal: "",
  tags: "",
  description: "",
  capacity: "",
  registrationUrl: "",
  status: "draft",
  featured: false,
};

export default function EditEventPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { session, isPending } = useEmployerAuth();
  const router = useRouter();

  const [org, setOrg] = useState<OrgLite | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const [regCount, setRegCount] = useState<number | null>(null);
  const [checkinsCount, setCheckinsCount] = useState<number | null>(null);
  const [startAt, setStartAt] = useState<string | null>(null);
  const [endAt, setEndAt] = useState<string | null>(null);

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
    const loadEvent = async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/events/${id}`, { cache: "no-store" });
        const j: EventOut = await r.json();
        if (!r.ok) {
          throw new Error((j as any)?.error || "Failed to load event");
        }

        const startLocal = j.start_at ? toLocalInput(j.start_at) : "";
        const endLocal = j.end_at ? toLocalInput(j.end_at) : "";

        setDraft({
          title: j.title ?? "",
          medium: (j.medium as Medium) ?? "IN_PERSON",
          location: j.location ?? "",
          startLocal,
          endLocal,
          tags: Array.isArray(j.tags) ? j.tags.join(", ") : "",
          description: j.description ?? "",
          capacity:
            j.capacity != null && j.capacity !== undefined
              ? String(j.capacity)
              : "",
          registrationUrl: (j as any).registration_url ?? "",
          status: (j.status as EventStatus) ?? "draft",
          featured: j.featured ?? false,
        });

        // stats (from event_aggregates if available)
        setRegCount((j as any).reg_count ?? null);
        setCheckinsCount((j as any).checkins_count ?? null);

        setStartAt(j.start_at ?? null);
        setEndAt(j.end_at ?? null);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to load event");
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      loadEvent();
    }
  }, [id, session?.user]);

  async function handleSave() {
    if (!draft.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      const body = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        location: draft.location.trim() || null,
        medium: draft.medium,
        tags: draft.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        start_at: draft.startLocal
          ? fromLocalInput(draft.startLocal)
          : null,
        end_at: draft.endLocal ? fromLocalInput(draft.endLocal) : null,
        status: draft.status,
        featured: draft.featured,
        capacity: draft.capacity ? Number(draft.capacity) : null,
        registration_url: draft.registrationUrl.trim() || null,
      };

      const r = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error((j as any).error || "Failed to update event");
      }

      toast.success("Event updated");
      router.push("/dashboard/events");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Save failed");
      setSaving(false);
    }
  }

  async function handleDelete() {
    const sure = window.confirm(
      "Delete this event? This cannot be undone."
    );
    if (!sure) return;

    try {
      const r = await fetch(`/api/events/${id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((j as any).error || "Delete failed");
      toast.success("Event deleted");
      router.push("/dashboard/events");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Delete failed");
    }
  }

  if (isPending || !session?.user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const numericCapacity =
    draft.capacity && !Number.isNaN(Number(draft.capacity))
      ? Number(draft.capacity)
      : null;

  const utilization =
    numericCapacity && numericCapacity > 0 && typeof regCount === "number"
      ? Math.min(100, (regCount / numericCapacity) * 100)
      : null;

  const temporalLabel =
    startAt != null ? getTemporalLabel(startAt, endAt) : null;

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
          <div className="max-w-4xl mx-auto space-y-4">
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
              <span className="font-medium text-gray-900">
                Edit event
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4">
              {/* Edit form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Event details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={draft.title}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, title: e.target.value }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Medium</Label>
                      <Select
                        value={draft.medium}
                        onValueChange={(v) =>
                          setDraft((d) => ({
                            ...d,
                            medium: v as Medium,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IN_PERSON">
                            In-person
                          </SelectItem>
                          <SelectItem value="VIRTUAL">
                            Virtual
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={draft.location}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            location: e.target.value,
                          }))
                        }
                        placeholder="e.g., Karachi HQ / Zoom"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="start">Start</Label>
                      <Input
                        id="start"
                        type="datetime-local"
                        value={draft.startLocal}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            startLocal: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="end">End (optional)</Label>
                      <Input
                        id="end"
                        type="datetime-local"
                        value={draft.endLocal}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            endLocal: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="capacity">Capacity</Label>
                      <Input
                        id="capacity"
                        type="number"
                        min={0}
                        value={draft.capacity}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            capacity: e.target.value,
                          }))
                        }
                        placeholder="e.g., 100"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="regUrl">
                        Registration link (optional)
                      </Label>
                      <Input
                        id="regUrl"
                        value={draft.registrationUrl}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            registrationUrl: e.target.value,
                          }))
                        }
                        placeholder="External form / Zoom registration link"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      value={draft.tags}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, tags: e.target.value }))
                      }
                      placeholder="e.g., CS, internship, on-campus"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="desc">Description</Label>
                    <Textarea
                      id="desc"
                      rows={5}
                      value={draft.description}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <Select
                        value={draft.status}
                        onValueChange={(v) =>
                          setDraft((d) => ({
                            ...d,
                            status: v as EventStatus,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">
                            Save as draft
                          </SelectItem>
                          <SelectItem value="published">
                            Publish
                          </SelectItem>
                          <SelectItem value="past">Mark as past</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                    >
                      Delete event
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/dashboard/events")}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? "Saving…" : "Save changes"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats / summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Event performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  {temporalLabel && (
                    <div className="flex justify-between">
                      <span>Timing</span>
                      <span className="font-medium text-gray-900">
                        {temporalLabel}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Registrations</span>
                    <span className="font-medium text-gray-900">
                      {regCount ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Check-ins</span>
                    <span className="font-medium text-gray-900">
                      {checkinsCount ?? 0}
                    </span>
                  </div>
                  {numericCapacity != null && (
                    <div className="flex justify-between">
                      <span>Capacity</span>
                      <span className="font-medium text-gray-900">
                        {numericCapacity}
                      </span>
                    </div>
                  )}

                  {utilization !== null && (
                    <div className="pt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Capacity utilization</span>
                        <span className="font-medium text-gray-900">
                          {regCount ?? 0}/{numericCapacity} (
                          {Math.round(utilization)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${utilization}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {draft.registrationUrl && (
                    <div className="mt-3 space-y-1">
                      <div className="font-medium text-gray-900 text-xs">
                        Registration link
                      </div>
                      <a
                        href={draft.registrationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 underline break-all"
                      >
                        {draft.registrationUrl}
                      </a>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() =>
                      router.push(`/dashboard/events/${id}/preview`)
                    }
                  >
                    Preview event
                  </Button>
                </CardContent>
              </Card>
            </div>
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

function toLocalInput(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromLocalInput(local: string) {
  if (!local) return "";
  const d = new Date(local);
  return d.toISOString();
}

function getTemporalLabel(startIso: string, endIso: string | null) {
  const now = Date.now();
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : start;

  if (end < now) return "Past";
  if (start <= now && end >= now) return "Ongoing";
  return "Upcoming";
}
