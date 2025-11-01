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

  const [draft, setDraft] = useState({
    title: "",
    description: "",
    location: "",
    medium: "IN_PERSON",
    startDate: "",
    endDate: "",
    tags: "",
  });

  function reset() {
    setDraft({
      title: "",
      description: "",
      location: "",
      medium: "IN_PERSON",
      startDate: "",
      endDate: "",
      tags: "",
    });
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

      // ✅ University API expects startsAt NOT start_at
      const payload = {
  orgId,
  title: draft.title.trim(),
  description: draft.description || null,
  location: draft.location || null,
  startsAt: new Date(draft.startDate).toISOString(),
  endsAt: draft.endDate ? new Date(draft.endDate).toISOString() : null,
};

const res = await fetch("/api/university/events/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});


      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Event creation failed.");

      if (onCreated) onCreated();
      close();
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!saving ? onOpenChange(v) : null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create event</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="grid gap-2">
            <Label>Title</Label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Career Fair 2025"
            />
          </div>

          <div className="grid gap-2">
            <Label>Medium</Label>
            <Select
              value={draft.medium}
              onValueChange={(v) => setDraft({ ...draft, medium: v })}
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
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label>Start</Label>
            <Input
              type="datetime-local"
              value={draft.startDate}
              onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label>End (optional)</Label>
            <Input
              type="datetime-local"
              value={draft.endDate}
              onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
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
