'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Archive, Paperclip } from 'lucide-react';

import type { Conversation } from '../_types';

type Props = {
  conversations: Conversation[];
  selectedConvId: string | null;
  selectedIds: string[];
  onSelectConv: (id: string) => void;
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleStar: (id: string) => void;
  onToggleArchive: (id: string) => void;
};

// Simple, stable HSL color from a string
function hslFromString(s: string) {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 45%)`;
}

function InitialAvatar({ name }: { name: string }) {
  const initial = (name?.trim()?.[0] || '?').toUpperCase();
  const bg = hslFromString(name || 'user');
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-sm font-semibold"
      style={{ backgroundColor: bg }}
      aria-hidden
    >
      {initial}
    </div>
  );
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function ConversationList({
  conversations,
  selectedConvId,
  selectedIds,
  onSelectConv,
  onToggleSelect,
  onToggleStar,
  onToggleArchive,
}: Props) {
  return (
    <div className="max-h-[75vh] overflow-auto p-2 md:max-h-[calc(100vh-260px)]">
      {conversations.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">No conversations</div>
      ) : (
        <ul className="space-y-1">
          {conversations.map((c) => {
            const isActive = c.id === selectedConvId;
            const checked = selectedIds.includes(c.id);
            const cp = c.counterparty;
            const name = cp?.name || c.title || 'User';

            // Determine the counterparty badge label (to avoid duplication in tags)
            const typeLabel =
              cp?.type === 'candidate'
                ? 'Candidate'
                : cp?.type === 'college'
                ? 'College'
                : null;

            // Raw labels from API
            const rawLabels = Array.isArray(c.labels) ? c.labels : [];

            // Start from raw labels, then:
            //  - remove candidate/college duplicates
            //  - remove internal tags ("company", "org:<id>") which are for routing, not UX
            let labels = [...rawLabels];

            if (typeLabel) {
              labels = labels.filter(
                (l) => l.toLowerCase() !== typeLabel.toLowerCase(),
              );
            }

            labels = labels.filter(
              (l) => l !== 'company' && !l.startsWith('org:'),
            );

            // cap labels to 2 to avoid horizontal overflow
            const show = labels.slice(0, 2);
            const more = Math.max(0, labels.length - show.length);

            return (
              <li
                key={c.id}
                className={[
                  'rounded-md border p-2 transition',
                  'hover:bg-[#F5F5F5]',
                  isActive ? 'border-primary/30 bg-[#EFEFEF]' : 'border-transparent',
                ].join(' ')}
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => onToggleSelect(c.id, Boolean(v))}
                    className="mt-1"
                  />

                  <button
                    className="group flex min-w-0 flex-1 items-start gap-3 text-left"
                    onClick={() => onSelectConv(c.id)}
                  >
                    {/* Letter avatar (no images) */}
                    <InitialAvatar name={name} />

                    {/* Text block */}
                    <div className="min-w-0 flex-1">
                      {/* Top row: name + counters; keep it tight, no overflow */}
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-semibold">{name}</p>

                        {/* Counterparty type (single source of truth for Candidate/College) */}
                        {typeLabel && (
                          <Badge
                            variant={typeLabel === 'Candidate' ? 'secondary' : 'outline'}
                            className="shrink-0"
                          >
                            {typeLabel}
                          </Badge>
                        )}

                        {/* Pin / flags */}
                        {c.pinned && (
                          <Badge variant="outline" className="shrink-0">
                            Pinned
                          </Badge>
                        )}

                        {/* Right-aligned time/unread */}
                        <div className="ml-auto shrink-0 text-right">
                          <span className="block text-[11px] text-muted-foreground">
                            {timeAgo(c.lastActivity)}
                          </span>
                          {c.unreadCount > 0 && (
                            <Badge className="mt-1 px-1.5 py-0 text-[11px]">
                              {c.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Second row: compact labels that never leak (Candidate/College removed above) */}
                      {(show.length > 0 || more > 0) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px]">
                          {show.map((l) => (
                            <Badge
                              key={l}
                              variant="secondary"
                              className="max-w-[120px] truncate"
                            >
                              {l}
                            </Badge>
                          ))}
                          {more > 0 && (
                            <Badge variant="outline" className="shrink-0">{`+${more}`}</Badge>
                          )}
                        </div>
                      )}

                      {/* Third row: title (secondary) */}
                      {c.title && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {c.title}
                        </p>
                      )}

                      {/* Fourth row: preview + attachment indicator */}
                      <div className="mt-1 flex min-w-0 items-center gap-2">
                        {!!c.attachments && (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <Paperclip className="h-3.5 w-3.5" /> {c.attachments}
                          </span>
                        )}
                        <span className="truncate text-xs text-muted-foreground">
                          {c.preview}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Row actions */}
                <div className="mt-2 flex items-center justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onToggleStar(c.id)}
                    aria-label="Toggle star"
                  >
                    <Star className={c.starred ? 'h-4 w-4 fill-current' : 'h-4 w-4'} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onToggleArchive(c.id)}
                    aria-label="Toggle archive"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
