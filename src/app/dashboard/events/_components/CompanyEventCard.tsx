'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarDays, MapPin, Users, Eye, Edit3 } from 'lucide-react';
import type { CompanyEvent } from '../_types';

export function CompanyEventCard({
  event,
  selected,
  onSelect,
}: {
  event: CompanyEvent;
  selected: boolean;
  onSelect: (checked: boolean) => void;
}) {
  const router = useRouter();

  const registered =
    typeof event.regCount === 'number'
      ? event.regCount
      : typeof event.interestCount === 'number'
      ? event.interestCount
      : undefined;

  const checkedIn =
    typeof event.checkinsCount === 'number' ? event.checkinsCount : undefined;

  const capacity =
    typeof event.capacity === 'number' && !Number.isNaN(event.capacity)
      ? event.capacity
      : undefined;

  const dateString = formatEventDate(event.startDate);
  const temporalLabel = getTemporalLabel(event);

  const utilization =
    typeof registered === 'number' && typeof capacity === 'number' && capacity > 0
      ? Math.min(100, (registered / capacity) * 100)
      : null;

  return (
    <Card
      className="h-full overflow-hidden transition-shadow hover:shadow-md flex flex-col cursor-pointer"
      onClick={() => router.push(`/dashboard/events/${event.id}`)}
    >
      <div className="relative h-28 w-full">
        <Image src="/images/skans2.png" alt="cover" fill className="object-cover" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      <CardHeader className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <Logo />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  event.status === 'published'
                    ? 'default'
                    : event.status === 'draft'
                    ? 'secondary'
                    : 'outline'
                }
              >
                {event.status}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                {temporalLabel}
              </Badge>
              {event.featured && (
                <Badge className="bg-primary text-primary-foreground">
                  Featured
                </Badge>
              )}
            </div>
            <h3
              className="mt-1 line-clamp-2 text-base font-semibold leading-snug"
              title={event.title}
            >
              {event.title}
            </h3>
            <p className="truncate text-sm text-muted-foreground">{event.location}</p>
          </div>
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => onSelect(Boolean(v))}
            className="ml-auto"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3 flex-1">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            {dateString}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {event.location}
            </span>
          )}
          {(registered !== undefined || checkedIn !== undefined || capacity !== undefined) && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" />
              {registered ?? 0} registered
              {typeof checkedIn === 'number' && ` · ${checkedIn} checked-in`}
              {typeof capacity === 'number' && ` · cap ${capacity}`}
            </span>
          )}
        </div>

        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {event.tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
            {event.tags.length > 3 && (
              <Badge variant="outline">+{event.tags.length - 3} more</Badge>
            )}
          </div>
        )}

        {/* Utilization bar */}
        {utilization !== null && (
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Utilization</span>
              <span>
                {registered}/{capacity} seats ({Math.round(utilization)}%)
              </span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${utilization}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between px-4 py-3">
        <div className="text-xs text-muted-foreground">
          Created {event.createdAt ? new Date(event.createdAt).toLocaleDateString() : '—'}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/events/${event.id}/preview`);
            }}
          >
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/events/${event.id}`);
            }}
          >
            <Edit3 className="mr-2 h-4 w-4" /> Edit
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function Logo() {
  return (
    <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-white shrink-0">
      <Image src="/images/skans.jpeg" alt="logo" fill className="object-cover" />
    </div>
  );
}

function formatEventDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

function getTemporalLabel(event: CompanyEvent): 'Upcoming' | 'Ongoing' | 'Past' {
  const now = Date.now();
  const start = new Date(event.startDate).getTime();
  const end = event.endDate ? new Date(event.endDate).getTime() : start;

  if (end < now) return 'Past';
  if (start <= now && end >= now) return 'Ongoing';
  return 'Upcoming';
}
