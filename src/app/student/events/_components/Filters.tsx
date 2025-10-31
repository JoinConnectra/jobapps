'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { EventCategory, EventItem, EventMedium } from '../_types';

export type FiltersState = {
  category: 'ALL' | EventCategory;
  medium: 'ANY' | EventMedium;
  host: 'ANY' | 'EMPLOYER' | 'CAREER_CENTER';
  featuredOnly: boolean;
  dateRange: 'ANY' | 'UPCOMING' | 'THIS_WEEK' | 'THIS_MONTH';
  employer: string;
};

export const defaultFilters: FiltersState = {
  category: 'ALL',
  medium: 'ANY',
  host: 'ANY',
  featuredOnly: false,
  dateRange: 'ANY',
  employer: '',
};

type Props = {
  value: FiltersState;
  onChange: (v: FiltersState) => void;
  allEvents?: EventItem[];
};

export function Filters({ value, onChange, allEvents }: Props) {
  const employers = Array.from(
    new Set((allEvents ?? []).map(e => e.employer).filter(Boolean))
  ).sort();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Category */}
      <div className="space-y-2">
        <Label>Category</Label>
        <Select
          value={value.category}
          onValueChange={(v) => onChange({ ...value, category: v as FiltersState['category'] })}
        >
          <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="GUIDANCE">Guidance</SelectItem>
            <SelectItem value="NETWORKING">Networking</SelectItem>
            <SelectItem value="EMPLOYER_INFO">Employer info</SelectItem>
            <SelectItem value="ACADEMIC">Academic</SelectItem>
            <SelectItem value="HIRING">Hiring</SelectItem>
            <SelectItem value="FAIR">Career Fair</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Medium */}
      <div className="space-y-2">
        <Label>Medium</Label>
        <Select
          value={value.medium}
          onValueChange={(v) => onChange({ ...value, medium: v as FiltersState['medium'] })}
        >
          <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ANY">Any</SelectItem>
            <SelectItem value="IN_PERSON">In-person</SelectItem>
            <SelectItem value="VIRTUAL">Virtual</SelectItem>
            <SelectItem value="HYBRID">Hybrid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Host */}
      <div className="space-y-2">
        <Label>Host</Label>
        <Select
          value={value.host}
          onValueChange={(v) => onChange({ ...value, host: v as FiltersState['host'] })}
        >
          <SelectTrigger><SelectValue placeholder="Any host" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ANY">Any</SelectItem>
            <SelectItem value="EMPLOYER">Events hosted by employers</SelectItem>
            <SelectItem value="CAREER_CENTER">Career center events</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label>Date</Label>
        <Select
          value={value.dateRange}
          onValueChange={(v) => onChange({ ...value, dateRange: v as FiltersState['dateRange'] })}
        >
          <SelectTrigger><SelectValue placeholder="Any date" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ANY">Any</SelectItem>
            <SelectItem value="UPCOMING">Upcoming</SelectItem>
            <SelectItem value="THIS_WEEK">This week</SelectItem>
            <SelectItem value="THIS_MONTH">This month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Employer */}
      <div className="space-y-2">
        <Label>Employer</Label>
        {/* If you prefer a Select list, switch Input to Select using `employers` */}
        <Input
          placeholder="Exact employer name"
          value={value.employer}
          onChange={(e) => onChange({ ...value, employer: e.target.value })}
        />
      </div>

      {/* Featured only */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Switch
            checked={value.featuredOnly}
            onCheckedChange={(checked) => onChange({ ...value, featuredOnly: checked })}
          />
          Featured only
        </Label>
        <p className="text-xs text-muted-foreground">Show only “Featured employer” events.</p>
      </div>
    </div>
  );
}
