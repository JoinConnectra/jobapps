// src/app/student/events/_types.ts
export type EventMedium = 'IN_PERSON' | 'VIRTUAL' | 'HYBRID';
export type EventCategory = 'GUIDANCE' | 'NETWORKING' | 'EMPLOYER_INFO' | 'ACADEMIC' | 'HIRING' | 'FAIR';

export type EventItem = {
  id: string;
  title: string;
  employer: string;
  featured?: boolean;
  isEmployerHosted: boolean;
  medium: EventMedium;
  startDate: string;
  endDate?: string;
  location?: string;
  categories: EventCategory[];
  tags: string[];
  attendeesCount?: number;
  checkIns: number;
  isSaved: boolean;
  isRegistered: boolean;
};
