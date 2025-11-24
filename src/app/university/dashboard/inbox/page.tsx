// src/app/university/dashboard/inbox/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import UniversityDashboardShell from '@/components/university/UniversityDashboardShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Search,
  Filter,
  MoreHorizontal,
  Star,
  Archive,
  Trash2,
  MailOpen,
  Mail,
  ChevronLeft,
} from 'lucide-react';

import { useSession } from '@/lib/auth-client';
import { Conversation, InboxTab, Message } from './_types';
import { ConversationList } from './_components/ConversationList';
import { MessagePane } from './_components/MessagePane';

export default function UniversityInboxPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [q, setQ] = useState('');
  const [tab, setTab] = useState<InboxTab>('all');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);

  const [messagesByConvId, setMessagesByConvId] = useState<Record<string, Message[]>>({});
  const [messagesLoading, setMessagesLoading] = useState<Record<string, boolean>>({});

  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/login');
    }
  }, [session, isPending, router]);

  // Preselect from URL ?threadId=...
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const threadId = params.get('threadId');
    if (threadId) {
      setSelectedConvId(threadId);
    }
  }, []);

  // Fetch conversations for this university org
  useEffect(() => {
    if (!session?.user) return;

    const fetchThreads = async () => {
      try {
        setConversationsLoading(true);

        const params = new URLSearchParams({ tab });
        const resp = await fetch(`/api/university/inbox/threads?${params.toString()}`);
        if (!resp.ok) {
          throw new Error('Failed to load inbox');
        }

        const data = await resp.json();
        const convs: Conversation[] = Array.isArray(data.conversations)
          ? data.conversations
          : [];

        setConversations(convs);
        setSelectedConvId((prev) => prev ?? (convs[0]?.id ?? null));
      } catch (err) {
        console.error(err);
        toast.error('Could not load inbox conversations');
      } finally {
        setConversationsLoading(false);
      }
    };

    fetchThreads();
  }, [session?.user, tab]);

  // Fetch messages when a conversation is selected
  useEffect(() => {
    if (!session?.user) return;
    if (!selectedConvId) return;
    if (messagesByConvId[selectedConvId]) return;

    const fetchMessages = async () => {
      try {
        setMessagesLoading((prev) => ({ ...prev, [selectedConvId]: true }));

        const resp = await fetch(`/api/university/inbox/threads/${selectedConvId}`);
        if (!resp.ok) {
          throw new Error('Failed to load messages');
        }

        const data = await resp.json();
        const msgs: Message[] = Array.isArray(data.messages)
          ? data.messages.map((m: any) => ({
              id: String(m.id),
              from: m.fromName || (m.mine ? 'You' : 'Other'),
              body: m.body,
              sentAt: m.sentAt,
              mine: Boolean(m.mine),
            }))
          : [];

        setMessagesByConvId((prev) => ({
          ...prev,
          [selectedConvId]: msgs,
        }));
      } catch (err) {
        console.error(err);
        toast.error('Could not load messages');
      } finally {
        setMessagesLoading((prev) => ({ ...prev, [selectedConvId]: false }));
      }
    };

    fetchMessages();
  }, [session?.user, selectedConvId, messagesByConvId]);

  // client-side filter/search
  const filtered: Conversation[] = useMemo(() => {
    const text = q.trim().toLowerCase();
    return conversations
      .filter((c) => {
        if (tab === 'unread' && c.unreadCount === 0) return false;
        if (tab === 'starred' && !c.starred) return false;
        if (tab === 'archived' && !c.archived) return false;
        if (tab !== 'archived' && c.archived) return false;
        if (text) {
          const hit =
            c.title.toLowerCase().includes(text) ||
            c.participants.some((p) => p.toLowerCase().includes(text)) ||
            (c.preview || '').toLowerCase().includes(text) ||
            c.labels.some((l) => l.toLowerCase().includes(text));
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => b.lastActivity - a.lastActivity);
  }, [conversations, q, tab]);

  const selectedConv = useMemo(
    () => filtered.find((c) => c.id === selectedConvId) ?? filtered[0] ?? null,
    [filtered, selectedConvId],
  );

  const bulkUpdate = (updater: (c: Conversation) => Conversation) => {
    setConversations((prev) =>
      prev.map((c) => (selectedIds.includes(c.id) ? updater(c) : c)),
    );
    setSelectedIds([]);
  };

  const unreadCount = conversations.reduce(
    (acc, c) => acc + (c.unreadCount > 0 ? 1 : 0),
    0,
  );
  const starredCount = conversations.reduce(
    (acc, c) => acc + (c.starred ? 1 : 0),
    0,
  );
  const archivedCount = conversations.reduce(
    (acc, c) => acc + (c.archived ? 1 : 0),
    0,
  );

  if (isPending || (!session?.user && !isPending)) {
    return (
      <UniversityDashboardShell title="Inbox">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </UniversityDashboardShell>
    );
  }

  if (!session?.user) return null;

  return (
    <UniversityDashboardShell title="Inbox">
      <div className="px-4 py-6">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
            <p className="text-sm text-muted-foreground">
              Chat with employers, students, and manage recruiting conversations.
            </p>
          </div>

          {/* Search + actions */}
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="w-[320px] pl-8"
                placeholder="Search conversations, people, or labels…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <Button variant="outline" onClick={() => setShowFilters((v) => !v)}>
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="mr-2 h-4 w-4" />
                  Bulk actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Selected ({selectedIds.length})</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    bulkUpdate((c) => ({
                      ...c,
                      unreadCount: 0,
                    }))
                  }
                >
                  <MailOpen className="mr-2 h-4 w-4" /> Mark as read
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    bulkUpdate((c) => ({
                      ...c,
                      unreadCount: Math.max(1, c.unreadCount || 1),
                    }))
                  }
                >
                  <Mail className="mr-2 h-4 w-4" /> Mark as unread
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    bulkUpdate((c) => ({
                      ...c,
                      starred: !c.starred,
                    }))
                  }
                >
                  <Star className="mr-2 h-4 w-4" /> Toggle star
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    bulkUpdate((c) => ({
                      ...c,
                      archived: !c.archived,
                    }))
                  }
                >
                  <Archive className="mr-2 h-4 w-4" /> Toggle archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    bulkUpdate((c) => ({
                      ...c,
                      deleted: true,
                    }))
                  }
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as InboxTab)}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread <Badge className="ml-1">{unreadCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="starred">
              Starred{' '}
              <Badge variant="secondary" className="ml-1">
                {starredCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archived{' '}
              <Badge variant="outline" className="ml-1">
                {archivedCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            <Card className="overflow-hidden">
              {showFilters && (
                <>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Filters</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Has attachment</Badge>
                      <Badge variant="outline">From employer</Badge>
                      <Badge variant="outline">From student</Badge>
                      <Badge variant="outline">Last 7 days</Badge>
                      <Button variant="ghost" size="sm">
                        Clear
                      </Button>
                    </div>
                  </CardContent>
                  <Separator />
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-[360px_1fr]">
                {/* Left col */}
                <ConversationList
                  conversations={filtered.filter((c) => !c.deleted)}
                  selectedConvId={selectedConv?.id ?? null}
                  selectedIds={selectedIds}
                  onSelectConv={(id) => {
                    setSelectedConvId(id);
                  }}
                  onToggleSelect={(id, checked) => {
                    setSelectedIds((prev) =>
                      checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
                    );
                  }}
                  onToggleStar={(id) => {
                    setConversations((prev) =>
                      prev.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c)),
                    );
                  }}
                  onToggleArchive={(id) => {
                    setConversations((prev) =>
                      prev.map((c) =>
                        c.id === id ? { ...c, archived: !c.archived } : c,
                      ),
                    );
                  }}
                />

                {/* Right col: messages */}
                <div className="border-t md:border-l md:border-t-0">
                  {selectedConv ? (
                    <MessagePane
                      conversation={selectedConv}
                      messages={messagesByConvId[selectedConv.id] ?? []}
                      onBackMobile={() => setSelectedConvId(null)}
                      onSendQuick={async (text: string) => {
                        if (!selectedConv) return;
                        try {
                          const resp = await fetch(
                            `/api/university/inbox/threads/${selectedConv.id}`,
                            {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ text }),
                            },
                          );
                          if (!resp.ok) {
                            throw new Error('Failed to send');
                          }
                          const data = await resp.json();

                          setMessagesByConvId((prev) => ({
                            ...prev,
                            [selectedConv.id]: [
                              ...(prev[selectedConv.id] ?? []),
                              {
                                id: String(data.id),
                                from: 'You',
                                body: data.body,
                                sentAt: data.sentAt,
                                mine: true,
                              },
                            ],
                          }));

                          setConversations((prev) =>
                            prev.map((c) =>
                              c.id === selectedConv.id
                                ? {
                                    ...c,
                                    preview: text,
                                    lastActivity: data.sentAt,
                                    unreadCount: 0,
                                  }
                                : c,
                            ),
                          );
                        } catch (err) {
                          console.error(err);
                          toast.error('Could not send message');
                        }
                      }}
                    />
                  ) : (
                    <div className="flex h-[480px] items-center justify-center text-muted-foreground md:h-[720px]">
                      <div className="text-center">
                        <ChevronLeft className="mx-auto mb-2 h-6 w-6 md:hidden" />
                        <p className="text-sm">Select a conversation to view messages</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UniversityDashboardShell>
  );
}
