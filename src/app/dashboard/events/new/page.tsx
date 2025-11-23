// src/app/dashboard/events/new/page.tsx
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

import type { EventStatus, Medium } from "../_types";

type OrgLite = { id: number; name: string; logoUrl?: string | null };

type Draft = {
  title: string;
  medium: Medium;
  location: string;
  startLocal: string; // datetime-local
  endLocal: string;   // datetime-local
  tags: string;
  description: string;
  capacity: string;
  registrationUrl: string;
  status: EventStatus;
  featured: boolean;
};

const defaultDraft: Draft = {
  title: "",
  medium: "IN_PERSON",
  location: "",
  startLocal: nowLocal(),
  endLocal: "",
  tags: "",
  description: "",
  capacity: "",
  registrationUrl: "",
  status: "draft",
  featured: false,
};

export default function NewEventPage() {
  const { session, isPending } = useEmployerAuth();
  const router = useRouter();

  const [org, setOrg] = useState<OrgLite | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>(defaultDraft);

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

  async function handleSave() {
    if (!org?.id) {
      toast.error("Organization not loaded");
      return;
    }
    if (!draft.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!draft.startLocal) {
      toast.error("Start date & time is required");
      return;
    }

    setSaving(true);
    try {
      const body = {
        org_id: org.id,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        location: draft.location.trim() || null,
        medium: draft.medium,
        tags: draft.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        start_at: fromLocalInput(draft.startLocal),
        end_at: draft.endLocal ? fromLocalInput(draft.endLocal) : null,
        featured: Boolean(draft.featured),
        is_employer_hosted: true,
        status: draft.status,
        capacity: draft.capacity ? Number(draft.capacity) : null,
        registration_url: draft.registrationUrl.trim() || null,
      };

      const r = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error((j as any).error || "Failed to create event");
      }

      toast.success(
        draft.status === "published"
          ? "Event published"
          : "Event saved as draft"
      );
      router.push("/dashboard/events");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Save failed");
      setSaving(false);
    }
  }

  if (isPending || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
              <span className="font-medium text-gray-900">New event</span>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Create a new event
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
                    placeholder="e.g., Graduate Hiring Open House"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Medium</Label>
                    <Select
                      value={draft.medium}
                      onValueChange={(v) =>
                        setDraft((d) => ({ ...d, medium: v as Medium }))
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
                    <p className="text-[11px] text-muted-foreground">
                      Students will see this in their local timezone.
                    </p>
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
                    <Label htmlFor="capacity">
                      Capacity (optional)
                    </Label>
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
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={draft.tags}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, tags: e.target.value }))
                    }
                    placeholder="e.g., networking, on-campus, tech"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea
                    id="desc"
                    value={draft.description}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        description: e.target.value,
                      }))
                    }
                    rows={5}
                    placeholder="What should students know about this event? Agenda, speakers, who should attend, etc."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select
                      value={draft.status}
                      onValueChange={(v) =>
                        setDraft((d) => ({ ...d, status: v as EventStatus }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Save as draft</SelectItem>
                        <SelectItem value="published">
                          Publish now
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard/events")}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : "Save event"}
                  </Button>
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

function nowLocal() {
  const d = new Date();
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
