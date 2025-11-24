// src/app/dashboard/inbox/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useEmployerAuth } from "@/hooks/use-employer-auth";
import { authClient } from "@/lib/auth-client";
import { useCommandPalette } from "@/hooks/use-command-palette";

import CompanySidebar from "@/components/company/CompanySidebar";
import CommandPalette from "@/components/CommandPalette";
import SettingsModal from "@/components/SettingsModal";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
} from "lucide-react";

import type { Conversation, InboxTab, Message } from "./_types";
import { ConversationList } from "./_components/ConversationList";
import { MessagePane } from "./_components/MessagePane";

export default function EmployerInboxPage() {
  const { session, isPending } = useEmployerAuth();
  const router = useRouter();
  const {
    isOpen: isCommandPaletteOpen,
    open: openCommandPalette,
    close: closeCommandPalette,
  } = useCommandPalette();

  const [org, setOrg] =
    useState<{ id: number; name: string; logoUrl?: string | null } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ---- Inbox data state ----
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);

  // messagesByConvId: convId -> Message[]
  const [messagesByConvId, setMessagesByConvId] = useState<Record<string, Message[]>>({});
  const [messagesLoading, setMessagesLoading] = useState<Record<string, boolean>>({});

  // ---- Local UI state ----
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<InboxTab>("all");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  // Fetch organization for sidebar/header
  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const token = localStorage.getItem("bearer_token");
        const resp = await fetch("/api/organizations?mine=true", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (resp.ok) {
          const orgs = await resp.json();
          if (Array.isArray(orgs) && orgs.length > 0) {
            setOrg(orgs[0]);
          }
        }
      } catch {
        /* soft fail */
      }
    };

    if (session?.user && !org) {
      fetchOrg();
    }
  }, [session, org]);

  // sign-out used by sidebar
  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error(error.code);
    } else {
      localStorage.removeItem("bearer_token");
      router.push("/");
    }
  };

  // -------- Read threadId from URL and pre-select that conversation --------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const threadId = params.get("threadId");
    if (threadId) {
      setSelectedConvId(threadId);
    }
  }, []);

  // -------- Fetch conversations from API whenever org/tab changes --------
  useEffect(() => {
    if (!org?.id) return;

    const fetchThreads = async () => {
      try {
        setConversationsLoading(true);
        const params = new URLSearchParams({
          orgId: String(org.id),
          tab, // server can optionally use this; we still filter in UI
        });

        const resp = await fetch(`/api/employer/inbox/threads?${params.toString()}`);
        if (!resp.ok) {
          throw new Error("Failed to load inbox");
        }
        const data = await resp.json();
        const convs: Conversation[] = Array.isArray(data.conversations)
          ? data.conversations
          : [];

        setConversations(convs);

        // If nothing selected (first load), select the first conversation
        setSelectedConvId((prev) => prev ?? (convs[0]?.id ?? null));
      } catch (err) {
        console.error(err);
        toast.error("Could not load inbox conversations");
      } finally {
        setConversationsLoading(false);
      }
    };

    fetchThreads();
  }, [org?.id, tab]);

  // -------- Fetch messages for selected conversation --------
  useEffect(() => {
    if (!org?.id) return;
    if (!selectedConvId) return;
    if (messagesByConvId[selectedConvId]) return; // already loaded

    const fetchMessages = async () => {
      try {
        setMessagesLoading((prev) => ({ ...prev, [selectedConvId]: true }));

        const params = new URLSearchParams({
          orgId: String(org.id),
        });

        const resp = await fetch(
          `/api/employer/inbox/threads/${selectedConvId}?${params.toString()}`,
        );
        if (!resp.ok) {
          throw new Error("Failed to load messages");
        }
        const data = await resp.json();
        const msgs: Message[] = Array.isArray(data.messages)
          ? data.messages.map((m: any) => ({
              id: String(m.id),
              from: m.fromName || (m.mine ? "You" : "Other"),
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
        toast.error("Could not load messages");
      } finally {
        setMessagesLoading((prev) => ({ ...prev, [selectedConvId]: false }));
      }
    };

    fetchMessages();
  }, [org?.id, selectedConvId, messagesByConvId]);

  // -------- Filtering + search (client-side) --------
  const filtered: Conversation[] = useMemo(() => {
    const text = q.trim().toLowerCase();
    return conversations
      .filter((c) => {
        if (tab === "unread" && c.unreadCount === 0) return false;
        if (tab === "starred" && !c.starred) return false;
        if (tab === "archived" && !c.archived) return false;
        if (tab !== "archived" && c.archived) return false;
        if (text) {
          const hit =
            c.title.toLowerCase().includes(text) ||
            c.participants.some((p) => p.toLowerCase().includes(text)) ||
            (c.preview || "").toLowerCase().includes(text) ||
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

  // -------- Bulk actions (local optimistic only for now) --------
  const bulkUpdate = (updater: (c: Conversation) => Conversation) => {
    setConversations((prev) =>
      prev.map((c) => (selectedIds.includes(c.id) ? updater(c) : c)),
    );
    setSelectedIds([]);
  };

  const handleToggleStar = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c)),
    );
  };

  const handleToggleArchive = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, archived: !c.archived } : c)),
    );
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
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Sidebar */}
      <CompanySidebar
        org={org}
        user={session.user}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        active="inbox"
      />

      {/* Main */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto overflow-x-hidden">
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-4 mb-4">
              <nav className="flex items-center gap-2 text-sm">
                <Link
                  href="/dashboard"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Dashboard
                </Link>
                <span className="text-gray-400">›</span>
                <span className="text-gray-900 font-medium">Inbox</span>
              </nav>
            </div>

            {/* Filters toggle */}
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters((v) => !v)}
              >
                <Filter className="mr-2 h-4 w-4" />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>

            {/* Header: search + bulk actions */}
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
                    <DropdownMenuLabel>
                      Selected ({selectedIds.length})
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        bulkUpdate((c) => ({ ...c, unreadCount: 0 }))
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
                        bulkUpdate((c) => ({ ...c, starred: !c.starred }))
                      }
                    >
                      <Star className="mr-2 h-4 w-4" /> Toggle star
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        bulkUpdate((c) => ({ ...c, archived: !c.archived }))
                      }
                    >
                      <Archive className="mr-2 h-4 w-4" /> Toggle archive
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        bulkUpdate((c) => ({ ...c, deleted: true }))
                      }
                      className="text-destructive"
                    >
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
                  Starred{" "}
                  <Badge variant="secondary" className="ml-1">
                    {starredCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="archived">
                  Archived{" "}
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
                        {/* Placeholder filters */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">Has attachment</Badge>
                          <Badge variant="outline">From candidate</Badge>
                          <Badge variant="outline">From college</Badge>
                          <Badge variant="outline">Last 7 days</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setQ("")}
                          >
                            Clear
                          </Button>
                        </div>
                      </CardContent>
                      <Separator />
                    </>
                  )}

                  {/* SIDE-BY-SIDE: left list, right message pane */}
                  <div className="grid grid-cols-1 md:grid-cols-[360px_1fr]">
                    {/* Left: conversation list */}
                    <ConversationList
                      conversations={filtered.filter((c) => !c.deleted)}
                      selectedConvId={selectedConv?.id ?? null}
                      selectedIds={selectedIds}
                      onSelectConv={(id) => {
                        setSelectedConvId(id);
                        // If we switch threads and don't have messages yet,
                        // messages effect above will fetch them.
                      }}
                      onToggleSelect={(id: string, checked: boolean) => {
                        setSelectedIds((prev) =>
                          checked
                            ? [...new Set([...prev, id])]
                            : prev.filter((x) => x !== id),
                        );
                      }}
                      onToggleStar={handleToggleStar}
                      onToggleArchive={handleToggleArchive}
                    />

                    {/* Right: message pane */}
                    <div className="border-t md:border-l md:border-t-0">
                      {selectedConv ? (
                        <MessagePane
                          conversation={selectedConv}
                          messages={
                            messagesByConvId[selectedConv.id] ?? []
                          }
                          onBackMobile={() => setSelectedConvId(null)}
                          onSendQuick={async (text: string) => {
                            if (!org?.id || !selectedConv) return;
                            try {
                              const resp = await fetch(
                                `/api/employer/inbox/threads/${selectedConv.id}`,
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    text,
                                    orgId: org.id,
                                  }),
                                },
                              );
                              if (!resp.ok) {
                                throw new Error("Failed to send");
                              }
                              const data = await resp.json();

                              // Append to messages
                              setMessagesByConvId((prev) => ({
                                ...prev,
                                [selectedConv.id]: [
                                  ...(prev[selectedConv.id] ?? []),
                                  {
                                    id: String(data.id),
                                    from: "You",
                                    body: data.body,
                                    sentAt: data.sentAt,
                                    mine: true,
                                  },
                                ],
                              }));

                              // Update conversation preview + lastActivity + unread
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
                              toast.error("Could not send message");
                            }
                          }}
                        />
                      ) : (
                        <div className="flex h-[480px] items-center justify-center text-muted-foreground md:h-[720px]">
                          <div className="text-center">
                            <ChevronLeft className="mx-auto mb-2 h-6 w-6 md:hidden" />
                            <p className="text-sm">
                              Select a conversation to view messages
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Command palette */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={closeCommandPalette}
          orgId={org?.id}
        />

        {/* Settings modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={async () => {
            setIsSettingsOpen(false);
            try {
              const token = localStorage.getItem("bearer_token");
              const orgResp = await fetch("/api/organizations?mine=true", {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (orgResp.ok) {
                const orgs = await orgResp.json();
                if (Array.isArray(orgs) && orgs.length > 0) setOrg(orgs[0]);
              }
            } catch {
              /* no-op */
            }
          }}
          organization={
            org
              ? {
                  id: org.id,
                  name: org.name,
                  slug: "",
                  type: "company",
                  plan: "free",
                  seatLimit: 5,
                  logoUrl: org.logoUrl,
                  createdAt: "",
                  updatedAt: "",
                }
              : null
          }
        />
      </main>
    </div>
  );
}
