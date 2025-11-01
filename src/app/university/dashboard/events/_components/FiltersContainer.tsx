'use client';

import React from 'react';
import { Filters, EventFilterState } from '@/components/events/Filters';

export default function FiltersContainer({
  value,
  onChange,
  onRefresh,
}: {
  value: EventFilterState;
  onChange: (s: EventFilterState) => void;
  onRefresh?: () => void;
}) {
  return <Filters value={value} onChange={onChange} onRefresh={onRefresh} />;
}
