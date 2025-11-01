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
import Image, { StaticImageData } from 'next/image';
import { EventItem } from '../_types';
import { cn } from '@/lib/utils';

import skans from '../skans.jpeg';
import skans2 from '../skans2.png';

export function EventCard({ event }: { event: EventItem }) {
  const start = new Date(event.startDate);
  const end = event.endDate ? new Date(event.endDate) : undefined;

  const dateLabel = end
    ? `${fmtDate(start)} – ${fmtDate(end)}`
    : `${fmtDate(start)}${event.medium === 'VIRTUAL' ? ' · Virtual' : ''}`;

  const tags = Array.isArray(event.tags) ? event.tags : [];
  const cats = Array.isArray(event.categories) ? event.categories : [];

  const visibleTags = tags.slice(0, 3);
  const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);

  const visibleCats = cats.slice(0, 2);
  const hiddenCatCount = Math.max(0, cats.length - visibleCats.length);

  return (
    <Card className="h-full overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="relative h-28 w-full">
        <Image
          src={skans2 as StaticImageData}
          alt={`${event.employer} cover`}
          fill
          className="object-cover"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      <CardHeader className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <Logo alt={event.employer} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {event.featured && (
                <Badge className="bg-primary text-primary-foreground">Featured employer</Badge>
              )}
              {event.isEmployerHosted ? (
                <Badge variant="secondary">Employer event</Badge>
              ) : (
                <Badge variant="secondary">Career center</Badge>
              )}
            </div>

            <h3 className="mt-1 text-base font-semibold line-clamp-2" title={event.title}>
              {event.title}
            </h3>
            <p className="text-sm text-muted-foreground truncate" title={event.employer}>
              {event.employer}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 px-4 pb-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            {dateLabel}
          </span>

          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span className="truncate max-w-[14ch]">{event.location}</span>
            </span>
          )}

          {typeof event.attendeesCount === 'number' && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" />
              {event.attendeesCount} going
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {visibleCats.map((c) => (
            <Badge key={c} variant="outline" className="uppercase">
              {prettyCategory(c)}
            </Badge>
          ))}
          {hiddenCatCount > 0 && <Badge variant="outline">+{hiddenCatCount} more</Badge>}

          {visibleTags.map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
          {hiddenTagCount > 0 && <Badge variant="outline">+{hiddenTagCount} more</Badge>}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {event.isRegistered && (
            <span className="text-sm text-emerald-600 inline-flex items-center">
              <CheckCircle className="mr-1 h-4 w-4" />
              Registered
            </span>
          )}
          {event.checkIns > 0 && (
            <span className="text-sm text-blue-600 inline-flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              {event.checkIns} check-in{event.checkIns > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Bookmark className={cn('h-4 w-4', event.isSaved && 'fill-current')} />
          </Button>
          <Button>
            View details
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function fmtDate(d: Date) {
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function prettyCategory(c: EventItem['categories'][number]) {
  switch (c) {
    case 'GUIDANCE': return 'Guidance';
    case 'NETWORKING': return 'Networking';
    case 'EMPLOYER_INFO': return 'Employer Info';
    case 'ACADEMIC': return 'Academic';
    case 'HIRING': return 'Hiring';
    case 'FAIR': return 'Career Fair';
    default: return c;
  }
}

function Logo({ alt }: { alt: string }) {
  return (
    <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-white">
      <Image src={skans} alt={alt} fill className="object-cover" />
    </div>
  );
}
