'use client';

import React from 'react';
import { EventCard } from '@/components/events/EventCard';
import { EventItem } from '@/components/events/types';

export function EventList({ items }: { items: EventItem[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-12 text-center">
        No events found.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((e) => (
        <EventCard key={`${e._host || 'X'}-${e.id}`} event={e} />
      ))}
    </div>
  );
}
