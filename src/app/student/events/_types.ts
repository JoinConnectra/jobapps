export type EventMedium = 'IN_PERSON' | 'VIRTUAL' | 'HYBRID';
export type EventCategory = 'GUIDANCE' | 'NETWORKING' | 'EMPLOYER_INFO' | 'ACADEMIC' | 'HIRING' | 'FAIR';

export type EventItem = {
  id: string;
  title: string;
  employer: string;             // or host
  university?: string;          // e.g., “Boston University”
  featured?: boolean;           // Featured employer badge
  isEmployerHosted: boolean;    // true if hosted by employer; false = career center/guidance
  medium: EventMedium;
  startDate: string;            // ISO
  endDate?: string;             // ISO
  location?: string;            // “Main Hall…”
  categories: EventCategory[];  // tags like GUIDANCE/NETWORKING
  tags: string[];               // freeform chips
  attendeesCount?: number;      // “15 students going”
  checkIns: number;             // prior check-ins by the user
  isSaved: boolean;
  isRegistered: boolean;
  logoUrl?: string;
};
