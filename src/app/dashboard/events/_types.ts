export type Medium = 'VIRTUAL' | 'IN_PERSON' | 'HYBRID';
export type EventStatus = 'draft' | 'published' | 'past';

export type CompanyEvent = {
  id: string;
  title: string;
  medium: Medium;
  location: string;
  startDate: string;  // ISO
  endDate?: string;   // ISO
  status: EventStatus;
  createdAt?: number; // epoch ms
  interestCount?: number;
  tags: string[];
  description?: string;
  featured?: boolean;
};
