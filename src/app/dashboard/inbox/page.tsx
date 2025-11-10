'use client';

import React, { useMemo, useState } from 'react';

import DashboardShell from '@/components/company/DashboardShell';
import { useEmployerAuth } from '@/hooks/use-employer-auth';
import { authClient } from '@/lib/auth-client';

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

import { conversations as ALL, messagesByConvId } from './_data/inbox';
import type { Conversation, InboxTab, Message } from './_types';
import { ConversationList } from './_components/ConversationList';
import { MessagePane } from './_components/MessagePane';

export default function EmployerInboxPage() {
  const { session, isPending } = useEmployerAuth();
  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);

  // sign-out (kept for header actions, wired in DashboardShell)
  const handleSignOut = async () => {
    await authClient.signOut();
    localStorage.removeItem('bearer_token');
  };

  // ---- Local UI state (same structure as student inbox) ----
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<InboxTab>('all');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(ALL[0]?.id ?? null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Filtering + search (identical logic to student, naming adapted)
  const filtered: Conversation[] = useMemo(() => {
    const text = q.trim().toLowerCase();
    return ALL
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
  }, [q, tab]);

  const selectedConv = useMemo(
    () => filtered.find((c) => c.id === selectedConvId) ?? filtered[0] ?? null,
    [filtered, selectedConvId],
  );

  // Bulk actions on selectedIds (local/mock only)
  const bulkUpdate = (updater: (c: Conversation) => Conversation) => {
    for (const id of selectedIds) {
      const idx = ALL.findIndex((c) => c.id === id);
      if (idx >= 0) ALL[idx] = updater(ALL[idx]);
    }
    setSelectedIds([]);
    setQ((s) => s + ''); // force rerender
  };

  const unreadCount = ALL.reduce((acc, c) => acc + (c.unreadCount > 0 ? 1 : 0), 0);
  const starredCount = ALL.reduce((acc, c) => acc + (c.starred ? 1 : 0), 0);
  const archivedCount = ALL.reduce((acc, c) => acc + (c.archived ? 1 : 0), 0);

  if (isPending || !session?.user) return null;

  return (
    <DashboardShell
      org={org}
      user={{ name: session.user.name }}
      onSignOut={handleSignOut}
      crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Inbox' }]}
      title="Inbox"
      actions={
        // keep a small action on the right (optional)
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
            <Filter className="mr-2 h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>
      }
    >
      {/* Header (side-by-side, same as student) */}
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Chat with candidates and partners. Manage recruiting messages.
          </p>
        </div>

        {/* Search + actions (compact, same pattern as student) */}
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
              <DropdownMenuItem onClick={() => bulkUpdate((c) => ({ ...c, unreadCount: 0 }))}>
                <MailOpen className="mr-2 h-4 w-4" /> Mark as read
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => bulkUpdate((c) => ({ ...c, unreadCount: Math.max(1, c.unreadCount || 1) }))}
              >
                <Mail className="mr-2 h-4 w-4" /> Mark as unread
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkUpdate((c) => ({ ...c, starred: !c.starred }))}>
                <Star className="mr-2 h-4 w-4" /> Toggle star
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkUpdate((c) => ({ ...c, archived: !c.archived }))}>
                <Archive className="mr-2 h-4 w-4" /> Toggle archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => bulkUpdate((c) => ({ ...c, deleted: true }))} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs (All / Unread / Starred / Archived) */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as InboxTab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread <Badge className="ml-1">{unreadCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="starred">
            Starred <Badge variant="secondary" className="ml-1">{starredCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived <Badge variant="outline" className="ml-1">{archivedCount}</Badge>
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
                  {/* Placeholder filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Has attachment</Badge>
                    <Badge variant="outline">From employer</Badge>
                    <Badge variant="outline">From career center</Badge>
                    <Badge variant="outline">Last 7 days</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setQ('')}>Clear</Button>
                  </div>
                </CardContent>
                <Separator />
              </>
            )}

            {/* SIDE-BY-SIDE like student: left list, right message pane */}
            <div className="grid grid-cols-1 md:grid-cols-[360px_1fr]">
              {/* Left: conversation list */}
              <ConversationList
                conversations={filtered.filter((c) => !c.deleted)}
                selectedConvId={selectedConv?.id ?? null}
                selectedIds={selectedIds}
                onSelectConv={setSelectedConvId}
                onToggleSelect={(id: string, checked: boolean) => {
                  setSelectedIds((prev) =>
                    checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
                  );
                }}
                onToggleStar={(id: string) => {
                  const idx = ALL.findIndex((c) => c.id === id);
                  if (idx >= 0) ALL[idx].starred = !ALL[idx].starred;
                  setQ((s) => s + ''); // force rerender
                }}
                onToggleArchive={(id: string) => {
                  const idx = ALL.findIndex((c) => c.id === id);
                  if (idx >= 0) ALL[idx].archived = !ALL[idx].archived;
                  setQ((s) => s + '');
                }}
              />

              {/* Right: message pane */}
              <div className="border-t md:border-l md:border-t-0">
                {selectedConv ? (
                  <MessagePane
                    conversation={selectedConv}
                    messages={messagesByConvId[selectedConv.id] as Message[]}
                    onBackMobile={() => setSelectedConvId(null)}
                    onSendQuick={(text: string) => {
                      (messagesByConvId[selectedConv.id] as Message[]).push({
                        id: 'local-' + Math.random().toString(36).slice(2),
                        from: 'You',
                        body: text,
                        sentAt: Date.now(),
                        mine: true,
                      });
                      selectedConv.preview = text;
                      selectedConv.lastActivity = Date.now();
                      selectedConv.unreadCount = 0;
                      setQ((s) => s + '');
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
    </DashboardShell>
  );
}
