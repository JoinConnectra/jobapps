'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarDays, RefreshCw } from 'lucide-react';

export type EventFilterState = {
  q: string;
  status: 'all' | 'upcoming' | 'past';
};

export function Filters({
  value,
  onChange,
  onRefresh,
}: {
  value: EventFilterState;
  onChange: (s: EventFilterState) => void;
  onRefresh?: () => void;
}) {
  return (
    <div className="w-full flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex-1 flex items-center gap-2">
        <Input
          placeholder="Search events…"
          value={value.q}
          onChange={(e) => onChange({ ...value, q: e.target.value })}
        />

        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value as any })}
        >
          <option value="all">All</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange({ q: '', status: 'all' })}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset
        </Button>

        {onRefresh ? (
          <Button type="button" onClick={onRefresh}>
            <CalendarDays className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        ) : null}
      </div>
    </div>
  );
}
