'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { CompanyEvent } from '../_types';

export function EventComposer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [draft, setDraft] = useState<Partial<CompanyEvent>>({
    title: '',
    medium: 'IN_PERSON',
    location: '',
    startDate: new Date().toISOString(),
    endDate: '',
    tags: [],
    status: 'draft',
    featured: false,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create event</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={draft.title || ''}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="e.g., Graduate Hiring Open House"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Medium</Label>
              <Select
                value={(draft.medium as any) || 'IN_PERSON'}
                onValueChange={(v) => setDraft({ ...draft, medium: v as any })}
              >
                <SelectTrigger><SelectValue placeholder="Select medium" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_PERSON">In-person</SelectItem>
                  <SelectItem value="VIRTUAL">Virtual</SelectItem>
                  <SelectItem value="HYBRID">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={draft.location || ''}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                placeholder="e.g., Karachi HQ / Zoom"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="start">Start</Label>
              <Input
                id="start"
                type="datetime-local"
                value={toLocalInput(draft.startDate)}
                onChange={(e) => setDraft({ ...draft, startDate: fromLocalInput(e.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end">End (optional)</Label>
              <Input
                id="end"
                type="datetime-local"
                value={toLocalInput(draft.endDate)}
                onChange={(e) => setDraft({ ...draft, endDate: fromLocalInput(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={(draft.tags || []).join(', ')}
              onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="e.g., networking, guidance"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="desc">Description (optional)</Label>
            <Textarea
              id="desc"
              value={draft.description || ''}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="What should students know about this event?"
            />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              // TODO: submit to API; for now, just close
              onOpenChange(false);
            }}
          >
            Save draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
function fromLocalInput(local: string) {
  if (!local) return '';
  const d = new Date(local);
  return d.toISOString();
}
