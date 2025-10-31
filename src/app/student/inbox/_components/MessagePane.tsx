'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Paperclip, Send, Star } from 'lucide-react';
import Image from 'next/image';

import { Conversation, Message } from '../_types';
import skans from '../../events/skans.jpeg';

type Props = {
  conversation: Conversation;
  messages: Message[];
  onBackMobile: () => void;
  onSendQuick: (text: string) => void;
};

export function MessagePane({ conversation, messages, onBackMobile, onSendQuick }: Props) {
  const [draft, setDraft] = useState('');

  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.sentAt - b.sentAt),
    [messages]
  );

  const quickReplies = [
    'Thanks for reaching out!',
    'Can we schedule a quick call?',
    'I’ll share my resume shortly.',
    'Sounds good to me.',
  ];

  return (
    <div className="flex h-[75vh] flex-col md:h-[calc(100vh-260px)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onBackMobile} aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="relative h-8 w-8 overflow-hidden rounded-md border bg-white">
            <Image src={skans} alt="avatar" fill className="object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{conversation.title}</p>
              {conversation.starred && <Star className="h-4 w-4 fill-current" />}
            </div>
            <p className="text-xs text-muted-foreground">{conversation.participants.join(', ')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation.labels.map((l) => (
            <Badge key={l} variant="secondary">{l}</Badge>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="no-scrollbar flex-1 space-y-4 overflow-auto p-4">
        {sorted.map((m) => (
          <div key={m.id} className={['flex', m.mine ? 'justify-end' : 'justify-start'].join(' ')}>
            <div className={['max-w-[78%] rounded-md border p-3 text-sm', m.mine ? 'bg-primary/5' : 'bg-card'].join(' ')}>
              <p className="whitespace-pre-wrap">{m.body}</p>
              <div className="mt-1 text-[11px] text-muted-foreground">{new Date(m.sentAt).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      <Separator />

      {/* Composer */}
      <div className="space-y-2 p-3">
        {/* Quick replies */}
        <div className="flex flex-wrap gap-2">
          {quickReplies.map((q) => (
            <Button key={q} size="sm" variant="outline" onClick={() => setDraft(q)}>
              {q}
            </Button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message…"
            className="min-h-[44px]"
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={() => {
                const text = draft.trim();
                if (!text) return;
                onSendQuick(text);
                setDraft('');
              }}
            >
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
