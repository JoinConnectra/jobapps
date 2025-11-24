// src/app/university/dashboard/inbox/_types.ts
export type InboxTab = 'all' | 'unread' | 'starred' | 'archived';

export type Conversation = {
  id: string;
  title: string;
  participants: string[];
  preview: string;
  lastActivity: number;
  unreadCount: number;
  starred: boolean;
  archived: boolean;
  deleted: boolean;
  pinned?: boolean;
  labels: string[];
  attachments?: number;
};

export type Message = {
  id: string;
  from: string;
  body: string;
  sentAt: number;
  mine?: boolean;
};
