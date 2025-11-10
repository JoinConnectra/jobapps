import type { Conversation, Message } from '../_types';

export const conversations: Conversation[] = [
  {
    id: 'e1',
    title: 'Software Engineer Intern – Application',
    participants: ['Aisha Khan', 'Acme Corp'],
    preview: 'Hi! Here is my updated resume. Happy to chat this week.',
    lastActivity: Date.now() - 1000 * 60 * 3,
    unreadCount: 1,
    starred: true,
    archived: false,
    deleted: false,
    pinned: true,
    labels: ['Candidate', 'Internship'],
    attachments: 1,
    counterparty: {
      type: 'candidate',
      id: 'cand_1001',
      name: 'Aisha Khan',
      avatarUrl: null,
    },
  },
  {
    id: 'e2',
    title: 'Campus Career Fair Coordination',
    participants: ['Boston University CCD', 'Acme Corp'],
    preview: 'Sharing the booth layout and power needs doc.',
    lastActivity: Date.now() - 1000 * 60 * 40,
    unreadCount: 0,
    starred: false,
    archived: false,
    deleted: false,
    pinned: false,
    labels: ['College', 'Events'],
    attachments: 2,
    counterparty: {
      type: 'college',
      id: 'college_bu',
      name: 'Boston University CCD',
      avatarUrl: null,
    },
  },
  {
    id: 'e3',
    title: 'Data Analyst – Take-home Task',
    participants: ['Bilal Ahmed', 'Acme Corp'],
    preview: 'Thanks! I will submit by Monday.',
    lastActivity: Date.now() - 1000 * 60 * 120,
    unreadCount: 2,
    starred: false,
    archived: false,
    deleted: false,
    pinned: false,
    labels: ['Candidate'],
    attachments: 0,
    counterparty: {
      type: 'candidate',
      id: 'cand_1002',
      name: 'Bilal Ahmed',
      avatarUrl: null,
    },
  },
];

export const messagesByConvId: Record<string, Message[]> = {
  e1: [
    { id: 'm1', from: 'Aisha Khan', body: 'Hi! Here is my updated resume. Happy to chat this week.', sentAt: Date.now() - 1000 * 60 * 6, mine: false },
    { id: 'm2', from: 'Acme Corp', body: 'Thanks Aisha—received. Are you free Thu 2–4pm?', sentAt: Date.now() - 1000 * 60 * 5, mine: true },
  ],
  e2: [
    { id: 'm1', from: 'Boston University CCD', body: 'Sharing the booth layout and power needs doc.', sentAt: Date.now() - 1000 * 60 * 45, mine: false },
  ],
  e3: [
    { id: 'm1', from: 'Acme Corp', body: 'Attaching the take-home. Ping us with questions!', sentAt: Date.now() - 1000 * 60 * 160, mine: true },
    { id: 'm2', from: 'Bilal Ahmed', body: 'Thanks! I will submit by Monday.', sentAt: Date.now() - 1000 * 60 * 120, mine: false },
  ],
};
