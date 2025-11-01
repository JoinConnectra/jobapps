export type Medium = 'VIRTUAL' | 'IN_PERSON';
export type EventStatus = 'draft' | 'published' | 'past';

export type EventRow = {
  id: number;
  org_id: number;
  title: string;
  description: string | null;
  location: string | null;
  medium: Medium;
  categories: string[];
  tags: string[];
  start_at: string;
  end_at: string | null;
  featured: boolean;
  is_employer_hosted: boolean;
  status: EventStatus;
  attendees_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EventOut = EventRow & {
  reg_count: number;
  checkins_count: number;
  isSaved?: boolean;
  isRegistered?: boolean;
};
