// src/app/dashboard/events/_types.ts

export type Medium = "VIRTUAL" | "IN_PERSON";
export type EventStatus = "draft" | "published" | "past";

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

  // richer stats for employers
  regCount?: number;
  checkinsCount?: number;
  capacity?: number | null;
  registrationUrl?: string | null;
};

export type EventOut = {
  id: number;
  org_id: number | null;
  title: string;
  description: string | null;
  location: string | null;
  medium: Medium | string;
  tags: string[] | null;
  start_at: string;
  end_at: string | null;
  featured: boolean;
  is_employer_hosted: boolean;
  status: EventStatus | string;
  attendees_count: number;
  created_at: string;
  updated_at: string;

  // from event_aggregates
  reg_count?: number | null;
  checkins_count?: number | null;

  // extra fields added to events / view
  capacity?: number | null;
  registration_url?: string | null;
};
