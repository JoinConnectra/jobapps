'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Archive, Paperclip } from 'lucide-react';
import Image from 'next/image';

import { Conversation } from '../_types';
import skans from '../../events/skans.jpeg'; // reuse avatar image you already have

type Props = {
  conversations: Conversation[];
  selectedConvId: string | null;
  selectedIds: string[];
  onSelectConv: (id: string) => void;
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleStar: (id: string) => void;
  onToggleArchive: (id: string) => void;
};

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

            return (
              <li
                key={c.id}
                className={[
                  'rounded-md border p-2 transition hover:bg-[#F5F5F5]',
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
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-white">
                      <Image src={skans} alt="avatar" fill className="object-cover" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{c.title}</p>
                        {c.pinned && <Badge variant="outline">Pinned</Badge>}
                        {c.labels.map((l) => (
                          <Badge key={l} variant="secondary" className="hidden md:inline-flex">
                            {l}
                          </Badge>
                        ))}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{c.participants.join(', ')}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {!!c.attachments && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Paperclip className="h-3.5 w-3.5" /> {c.attachments}
                          </span>
                        )}
                        <span className="truncate text-xs text-muted-foreground">{c.preview}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[11px] text-muted-foreground">{timeAgo(c.lastActivity)}</span>
                      {c.unreadCount > 0 && (
                        <Badge className="px-1.5 py-0 text-[11px]">{c.unreadCount}</Badge>
                      )}
                    </div>
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => onToggleStar(c.id)} aria-label="Toggle star">
                    <Star className={c.starred ? 'h-4 w-4 fill-current' : 'h-4 w-4'} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => onToggleArchive(c.id)} aria-label="Toggle archive">
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
