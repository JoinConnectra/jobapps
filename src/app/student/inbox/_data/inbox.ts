import { Conversation, Message } from '../_types';

export const conversations: Conversation[] = [
  {
    id: 'c1',
    title: 'KPMG Campus Recruiting',
    participants: ['KPMG Careers', 'You'],
    preview: 'Hi! Thanks for applying — can you share your availability for a quick chat?',
    lastActivity: Date.now() - 1000 * 60 * 3,
    unreadCount: 1,
    starred: true,
    archived: false,
    deleted: false,
    pinned: true,
    labels: ['Employer', 'Interview'],
    attachments: 0,
  },
  {
    id: 'c2',
    title: 'BU CCD – Resume Review',
    participants: ['BU Career Center', 'You'],
    preview: 'Your revised resume looks strong. One suggestion: quantify the impact in your bullet points.',
    lastActivity: Date.now() - 1000 * 60 * 45,
    unreadCount: 0,
    starred: false,
    archived: false,
    deleted: false,
    pinned: false,
    labels: ['Career Center'],
    attachments: 1,
  },
  {
    id: 'c3',
    title: 'Engro – Data Intern Screening Task',
    participants: ['Engro HR', 'You'],
    preview: 'Please find the screening assignment attached. Deadline is next Wednesday.',
    lastActivity: Date.now() - 1000 * 60 * 110,
    unreadCount: 2,
    starred: false,
    archived: false,
    deleted: false,
    pinned: false,
    labels: ['Employer'],
    attachments: 2,
  },
  {
    id: 'c4',
    title: 'Handshake Events Team',
    participants: ['HS Events', 'You'],
    preview: 'Appreciate your feedback! We’re rolling out new fair tools this semester.',
    lastActivity: Date.now() - 1000 * 60 * 240,
    unreadCount: 0,
    starred: true,
    archived: true,
    deleted: false,
    pinned: false,
    labels: ['Info'],
    attachments: 0,
  },
];

export const messagesByConvId: Record<string, Message[]> = {
  c1: [
    { id: 'm1', from: 'KPMG Careers', body: 'Hi! Thanks for applying — can you share your availability for a quick chat?', sentAt: Date.now() - 1000 * 60 * 6, mine: false },
    { id: 'm2', from: 'You', body: 'Hi! Yes, tomorrow 2–4 PM PKT works.', sentAt: Date.now() - 1000 * 60 * 5, mine: true },
  ],
  c2: [
    { id: 'm1', from: 'BU Career Center', body: 'Your revised resume looks strong. One suggestion: quantify the impact in your bullet points.', sentAt: Date.now() - 1000 * 60 * 50, mine: false },
  ],
  c3: [
    { id: 'm1', from: 'Engro HR', body: 'Please find the screening assignment attached. Deadline is next Wednesday.', sentAt: Date.now() - 1000 * 60 * 150, mine: false },
    { id: 'm2', from: 'You', body: 'Received, thank you! I’ll share questions if any.', sentAt: Date.now() - 1000 * 60 * 120, mine: true },
  ],
  c4: [
    { id: 'm1', from: 'HS Events', body: 'Appreciate your feedback! We’re rolling out new fair tools this semester.', sentAt: Date.now() - 1000 * 60 * 250, mine: false },
  ],
};
