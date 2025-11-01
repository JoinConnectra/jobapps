export type Medium = 'VIRTUAL' | 'IN_PERSON';
export type EventStatus = 'draft' | 'published' | 'past';

export type CompanyEvent = {
  id: string;
  title: string;
  medium: Medium;
  location: string;
  startDate: string;
  endDate?: string;
  status: EventStatus;
  createdAt?: number;
  interestCount?: number;
  tags: string[];
  description?: string;
  featured?: boolean;
};

export type EventOut = {
  id: number;
  org_id: number | null;
  title: string;
  description: string | null;
  location: string | null;
  medium: Medium | string;
  tags: string[];
  start_at: string;
  end_at: string | null;
  featured: boolean;
  is_employer_hosted: boolean;
  status: EventStatus | string;
  attendees_count: number;
  created_at: string;
  updated_at: string;

  reg_count?: number;
  checkins_count?: number;
};
