export type EventItem = {
  id: number | string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;   // ISO
  endsAt?: string | null;
  medium?: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID' | string | null;
  tags?: string[] | null;
  categories?: string[] | null;
  featured?: boolean;
  status?: 'published' | 'draft' | string | null;
  is_employer_hosted?: boolean;
  _host?: 'EMPLOYER' | 'UNIVERSITY';
};
