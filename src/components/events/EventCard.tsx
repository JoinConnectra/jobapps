'use client';

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Bookmark,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { EventItem } from './types';
import { cn } from '@/lib/utils';

function fmtDate(d: Date) {
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EventCard({ event }: { event: EventItem }) {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : undefined;

  const dateLabel = end
    ? `${fmtDate(start)} – ${fmtDate(end)}`
    : fmtDate(start);

  const tags = Array.isArray(event.tags) ? event.tags : [];
  const cats = Array.isArray(event.categories) ? event.categories : [];
  const isVirtual = (event.medium || '').toUpperCase() === 'VIRTUAL';

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold leading-snug">{event.title}</h3>

          {event.featured ? (
            <Badge className="rounded-full" variant="default">
              Featured
            </Badge>
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap gap-2">
          {event._host ? (
            <Badge variant="outline" className="rounded-full">
              Host: {event._host === 'EMPLOYER' ? 'Employer' : 'University'}
            </Badge>
          ) : null}
          {event.medium ? (
            <Badge variant="outline" className="rounded-full">
              {event.medium === 'IN_PERSON' ? 'In-person' : event.medium}
            </Badge>
          ) : null}
          {cats.map((c) => (
            <Badge key={c} variant="secondary" className="rounded-full">
              {c}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="grid gap-3">
        {event.description ? (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {event.description}
          </p>
        ) : null}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span>{dateLabel}</span>
          </div>

          {event.location ? (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="truncate">
                {isVirtual ? 'Virtual' : event.location}
              </span>
            </div>
          ) : null}
        </div>

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Badge key={t} variant="outline" className="rounded-full">
                {t}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-0">
        <div className="flex items-center gap-4">
          <button
            className={cn(
              'inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors'
            )}
            title="Interested"
          >
            <CheckCircle className="h-4 w-4" />
            Interested
          </button>

          <button
            className={cn(
              'inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors'
            )}
            title="Save"
          >
            <Bookmark className="h-4 w-4" />
            Save
          </button>
        </div>

        <Button size="sm" variant="secondary">
          <ExternalLink className="h-4 w-4 mr-1" />
          Details
        </Button>
      </CardFooter>
    </Card>
  );
}
