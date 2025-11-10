// Employer inbox shared types

export type InboxTab = 'all' | 'unread' | 'starred' | 'archived';

export type Message = {
  id: string;
  from: string;
  body: string;
  sentAt: number; // epoch ms
  mine: boolean;  // sent by the logged-in org user
};

export type CounterpartyType = 'candidate' | 'college';

export type Counterparty = {
  type: CounterpartyType;
  id: string;               // candidateId or collegeId
  name: string;             // "Aisha Khan" or "Boston University"
  avatarUrl?: string | null;
};

export type Conversation = {
  id: string;
  title: string;            // e.g. "Software Intern Application"
  participants: string[];   // keep for backward-compat
  preview: string;
  lastActivity: number;
  unreadCount: number;
  starred: boolean;
  archived: boolean;
  deleted: boolean;
  pinned?: boolean;
  labels: string[];         // tags/badges
  attachments?: number;

  // Employer perspective
  counterparty: Counterparty; // who the company is chatting with
};
