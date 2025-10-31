'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarDays, MapPin, Users, Eye, Edit3 } from 'lucide-react';
import { CompanyEvent } from '../_types';

export function CompanyEventCard({
  event,
  selected,
  onSelect,
}: {
  event: CompanyEvent;
  selected: boolean;
  onSelect: (checked: boolean) => void;
}) {
  return (
    <Card className="h-full overflow-hidden transition-shadow hover:shadow-md flex flex-col">
      {/* cover */}
      <div className="relative h-28 w-full">
        <Image src="/images/skans2.png" alt="cover" fill className="object-cover" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      <CardHeader className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <Logo />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant={event.status === 'published' ? 'default' : event.status === 'draft' ? 'secondary' : 'outline'}>
                {event.status}
              </Badge>
              {event.featured && <Badge className="bg-primary text-primary-foreground">Featured</Badge>}
            </div>
            <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug" title={event.title}>
              {event.title}
            </h3>
            <p className="truncate text-sm text-muted-foreground">{event.location}</p>
          </div>
          <Checkbox checked={selected} onCheckedChange={(v) => onSelect(Boolean(v))} className="ml-auto" />
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3 flex-1">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            {new Date(event.startDate).toLocaleString()}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {event.location}
            </span>
          )}
          {typeof event.interestCount === 'number' && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" />
              {event.interestCount} interested
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {event.tags.slice(0, 3).map(t => (
            <Badge key={t} variant="outline">{t}</Badge>
          ))}
          {event.tags.length > 3 && <Badge variant="outline">+{event.tags.length - 3} more</Badge>}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between px-4 py-3">
        <div className="text-xs text-muted-foreground">
          Created {event.createdAt ? new Date(event.createdAt).toLocaleDateString() : '—'}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
          <Button size="sm">
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
