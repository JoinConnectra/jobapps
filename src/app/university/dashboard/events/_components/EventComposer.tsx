"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type DraftState = {
  title: string;
  description: string;
  location: string;
  medium: "IN_PERSON" | "VIRTUAL";
  startDate: string;
  endDate: string;
  tags: string;
  capacity: string;
  registrationUrl: string;
};

const emptyDraft: DraftState = {
  title: "",
  description: "",
  location: "",
  medium: "IN_PERSON",
  startDate: "",
  endDate: "",
  tags: "",
  capacity: "",
  registrationUrl: "",
};

export function EventComposer({
  open,
  onOpenChange,
  orgId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: number | null;
  onCreated?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);

  function reset() {
    setDraft(emptyDraft);
    setError(null);
  }

  function close() {
    if (!saving) {
      reset();
      onOpenChange(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      if (!orgId) {
        throw new Error("Missing university org.");
      }
      if (!draft.title.trim()) {
        throw new Error("Title is required.");
      }
      if (!draft.startDate) {
        throw new Error("Start date/time is required.");
      }

      const tags =
        draft.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean) ?? [];

      const capacity = draft.capacity
        ? Number(draft.capacity)
        : null;

      if (draft.capacity && Number.isNaN(capacity)) {
        throw new Error("Capacity must be a number.");
      }

      // ✅ University API expects startsAt / endsAt (camelCase),
      // but backend ultimately writes to the same `events` table
      const payload = {
        orgId,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        location: draft.location.trim() || null,
        medium: draft.medium,                         // IN_PERSON | VIRTUAL
        tags,                                         // string[]
        capacity,                                     // number | null
        registrationUrl: draft.registrationUrl.trim() || null,
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Event creation failed.");
      }

      if (onCreated) onCreated();
      close();
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => (!saving ? onOpenChange(v) : null)}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create event</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {error && <div className="text-sm text-red-600">{error}</div>}

          {/* Title */}
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
              placeholder="Career Fair 2025"
            />
          </div>

          {/* Medium */}
          <div className="grid gap-2">
            <Label>Medium</Label>
            <Select
              value={draft.medium}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, medium: v as DraftState["medium"] }))
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

          {/* Location */}
          <div className="grid gap-2">
            <Label>Location</Label>
            <Input
              value={draft.location}
              onChange={(e) =>
                setDraft((d) => ({ ...d, location: e.target.value }))
              }
              placeholder="e.g., Main Auditorium / Zoom"
            />
          </div>

          {/* Start / End */}
          <div className="grid gap-2">
            <Label>Start</Label>
            <Input
              type="datetime-local"
              value={draft.startDate}
              onChange={(e) =>
                setDraft((d) => ({ ...d, startDate: e.target.value }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label>End (optional)</Label>
            <Input
              type="datetime-local"
              value={draft.endDate}
              onChange={(e) =>
                setDraft((d) => ({ ...d, endDate: e.target.value }))
              }
            />
          </div>

          {/* Tags */}
          <div className="grid gap-2">
            <Label>Tags (comma-separated)</Label>
            <Input
              value={draft.tags}
              onChange={(e) =>
                setDraft((d) => ({ ...d, tags: e.target.value }))
              }
              placeholder="e.g., internship, engineering, on-campus"
            />
          </div>

          {/* Capacity */}
          <div className="grid gap-2">
            <Label>Capacity (optional)</Label>
            <Input
              type="number"
              min={0}
              value={draft.capacity}
              onChange={(e) =>
                setDraft((d) => ({ ...d, capacity: e.target.value }))
              }
              placeholder="e.g., 200"
            />
          </div>

          {/* Registration URL */}
          <div className="grid gap-2">
            <Label>Registration link (optional)</Label>
            <Input
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

          {/* Description */}
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={draft.description}
              onChange={(e) =>
                setDraft((d) => ({ ...d, description: e.target.value }))
              }
              placeholder="What should students know about this event? Agenda, who should attend, etc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={close}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
