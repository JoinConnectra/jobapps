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
import { cn } from '@/lib/utils';

// ✅ Local images (you said they're in the same folder as this file)
import skans from './skans.jpeg';
import skans2 from './skans2.png';

/**
 * Works for BOTH shapes:
 *  - Student events (startDate/endDate, isEmployerHosted, employer)
 *  - University merged feed (startsAt/endsAt, is_employer_hosted, _host)
 *  - Optional imageUrl / logoUrl can be provided to override visuals
 */

type AnyEvent = {
  id?: string | number;
  title?: string;
  description?: string | null;
  location?: string | null;

  // student feed fields
  startDate?: string; // ISO
  endDate?: string;   // ISO | undefined
  employer?: string;
  isEmployerHosted?: boolean;
  attendeesCount?: number;
  checkIns?: number;
  isSaved?: boolean;
  isRegistered?: boolean;

  // university feed fields
  startsAt?: string; // ISO
  endsAt?: string | null;
  is_employer_hosted?: boolean;
  _host?: 'EMPLOYER' | 'UNIVERSITY' | string | null;

  // shared-ish
  featured?: boolean;
  medium?: 'VIRTUAL' | 'IN_PERSON' | string | null;
  tags?: string[] | null;
  categories?: string[] | null;

  // optional visuals
  imageUrl?: string | StaticImageData;
  logoUrl?: string | StaticImageData;

  // sometimes present in employer rows
  reg_count?: number;
  attendees_count?: number;
};

function normalize(ev: AnyEvent) {
  const startIso = ev.startDate ?? ev.startsAt ?? null;
  const endIso   = ev.endDate ?? (ev.endsAt ?? undefined);

  const start = startIso ? new Date(startIso) : null;
  const end   = endIso ? new Date(endIso) : undefined;

  const isEmployerHosted =
    typeof ev.isEmployerHosted === 'boolean'
      ? ev.isEmployerHosted
      : typeof ev.is_employer_hosted === 'boolean'
      ? ev.is_employer_hosted
      : (ev._host === 'EMPLOYER');

  const employer =
    ev.employer ??
    (isEmployerHosted ? 'Employer event' : 'Career center');

  const mediumUpper = (ev.medium || '').toUpperCase();
  const isVirtual = mediumUpper === 'VIRTUAL';

  const attendees =
    typeof ev.attendeesCount === 'number'
      ? ev.attendeesCount
      : typeof ev.reg_count === 'number'
      ? ev.reg_count
      : typeof ev.attendees_count === 'number'
      ? ev.attendees_count
      : undefined;

  const tags = Array.isArray(ev.tags) ? ev.tags : [];
  const cats = Array.isArray(ev.categories) ? ev.categories : [];

  return {
    start,
    end,
    isEmployerHosted,
    employer,
    isVirtual,
    attendees,
    tags,
    cats,
    featured: !!ev.featured,
    title: ev.title ?? '',
    location: ev.location ?? '',
    isSaved: !!ev.isSaved,
    isRegistered: !!ev.isRegistered,
    description: ev.description ?? null,
  };
}

function fmtDateRange(start: Date | null, end?: Date) {
  if (!start) return 'TBA';
  if (end) return `${fmtDate(start)} – ${fmtDate(end)}`;
  return fmtDate(start);
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

function prettyCategory(c: string) {
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

// Deterministic tiny hash to alternate images if no imageUrl provided
function tinyHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

function pickCover(ev: AnyEvent): string | StaticImageData {
  if (ev.imageUrl) return ev.imageUrl;
  const key = (ev.id ?? ev.title ?? 'x').toString();
  return tinyHash(key) % 2 === 0 ? (skans2 as StaticImageData) : (skans as StaticImageData);
}

export function EventCard({ event }: { event: AnyEvent }) {
  const n = normalize(event);
  const cover = pickCover(event);

  const dateLabel = fmtDateRange(n.start, n.end);
  const visibleTags = n.tags.slice(0, 3);
  const hiddenTagCount = Math.max(0, n.tags.length - visibleTags.length);

  const visibleCats = n.cats.slice(0, 2);
  const hiddenCatCount = Math.max(0, n.cats.length - visibleCats.length);

  return (
    <Card className="h-full overflow-hidden hover:shadow-md transition-shadow flex flex-col rounded-2xl">
      {/* Top cover image (now using your local images) */}
      <div className="relative h-28 w-full">
        <Image
          src={cover}
          alt={`${n.employer} cover`}
          fill
          className="object-cover"
          priority={false}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      <CardHeader className="p-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Logo placeholder to match student look (optional future: use event.logoUrl) */}
          <div className="h-12 w-12 rounded-md border bg-white flex items-center justify-center text-xs font-semibold text-muted-foreground">
            {n.isEmployerHosted ? 'EMP' : 'UNI'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {n.featured && (
                <Badge className="bg-primary text-primary-foreground">Featured employer</Badge>
              )}
              {n.isEmployerHosted ? (
                <Badge variant="secondary">Employer event</Badge>
              ) : (
                <Badge variant="secondary">Career center</Badge>
              )}
            </div>

            <h3 className="mt-1 text-base font-semibold line-clamp-2" title={n.title}>
              {n.title}
            </h3>
            <p className="text-sm text-muted-foreground truncate" title={n.employer}>
              {n.employer}
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

          {n.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span className="truncate max-w-[14ch]">
                {n.isVirtual ? 'Virtual' : n.location}
              </span>
            </span>
          )}

          {typeof n.attendees === 'number' && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" />
              {n.attendees} going
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

        {n.description ? (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-3">
            {n.description}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {n.isRegistered && (
            <span className="text-sm text-emerald-600 inline-flex items-center">
              <CheckCircle className="mr-1 h-4 w-4" />
              Registered
            </span>
          )}
          {typeof event.checkIns === 'number' && event.checkIns > 0 && (
            <span className="text-sm text-blue-600 inline-flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              {event.checkIns} check-in{event.checkIns > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="Save">
            <Bookmark className={cn('h-4 w-4', n.isSaved && 'fill-current')} />
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
