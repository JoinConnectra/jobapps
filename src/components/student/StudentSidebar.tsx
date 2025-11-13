"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Briefcase,
  FileText,
  GraduationCap,
  Settings,
  MessageSquare,
  HelpCircle,
  LogOut,
  CalendarDays,
  ListChecks,
  Search,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSession, authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useCommandPalette } from "@/hooks/use-command-palette";

/** Helpers */
function initialsFrom(nameOrEmail?: string) {
  if (!nameOrEmail) return "U";
  const str = nameOrEmail.trim();
  if (str.includes("@")) return str[0]?.toUpperCase() || "U";
  const parts = str.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function StudentSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { data: session } = useSession();
  const email = session?.user?.email as string | undefined;

  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [avatarLetter, setAvatarLetter] = useState<string>("U");

  const { open: openCommandPalette } = useCommandPalette();

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      if (!email) return;
      try {
        const res = await fetch(`/api/users/by-email/${encodeURIComponent(email)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        if (cancelled) return;

        if (res.ok) {
          const user = await res.json();
          const name = (user?.name as string | undefined)?.trim();
          const safeName = name && name.length > 0 ? name : email;
          setDisplayName(
            name && name.length > 0 ? name : (email?.split("@")[0] ?? "User")
          );
          setAvatarLetter(initialsFrom(safeName));
        } else {
          setDisplayName(email?.split("@")[0] ?? "User");
          setAvatarLetter(initialsFrom(email));
        }
      } catch {
        setDisplayName(email?.split("@")[0] ?? "User");
        setAvatarLetter(initialsFrom(email));
      }
    }
    loadUser();
    return () => {
      cancelled = true;
    };
  }, [email]);

  const links = useMemo(
    () => [
      { href: "/student/dashboard", label: "Dashboard", icon: Home },
      { href: "/student/jobs", label: "Jobs", icon: Briefcase },
      { href: "/student/inbox", label: "Inbox", icon: MessageSquare },
      { href: "/student/events", label: "Events", icon: CalendarDays },
      { href: "/student/applications", label: "Applications", icon: FileText },
      { href: "/student/assessments", label: "Assessments", icon: ListChecks },
      { href: "/student/profile", label: "Profile", icon: GraduationCap },
      { href: "/student/settings", label: "Settings", icon: Settings },
      { href: "/student/help", label: "Help", icon: HelpCircle },
    ],
    []
  );

  const signOut = async () => {
    try {
      setBusy(true);
      await authClient.signOut({ fetchOptions: { headers: {} } });
      toast.success("Signed out");
      router.replace("/login");
    } catch {
      toast.error("Failed to sign out");
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Brand (match company style) */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="text-xl font-display font-bold text-gray-900">
            JobHunt
          </div>
        </div>

        {/* Primary navigation – mirror CompanySidebar buttons */}
        <nav className="space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <Button
                key={href}
                variant="ghost"
                className={`w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900 ${
                  active ? "bg-[#F5F1E8] text-gray-900" : ""
                }`}
                onClick={() => router.push(href)}
              >
                <Icon className="w-4 h-4 mr-3" />
                {label}
              </Button>
            );
          })}
        </nav>
      </div>

      {/* Footer actions + user pill (match company layout) */}
      <div className="mt-auto p-6 border-t border-gray-200">
        <div className="space-y-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-500 text-sm"
            onClick={openCommandPalette}
          >
            <Search className="w-4 h-4 mr-3" />
            Search
            <span className="ml-auto text-xs">⌘K</span>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start text-gray-500 text-sm"
            type="button"
          >
            <HelpCircle className="w-4 h-4 mr-3" />
            Help &amp; Support
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start text-gray-500 text-sm"
            type="button"
          >
            <UserPlus className="w-4 h-4 mr-3" />
            Invite people
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start text-gray-500 text-sm disabled:opacity-50"
            onClick={signOut}
            disabled={busy}
          >
            <LogOut className="w-4 h-4 mr-3" />
            {busy ? "Signing out..." : "Log out"}
          </Button>
        </div>

        {/* Current user pill */}
        <div className="mt-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {avatarLetter}
            </span>
          </div>
          <div className="flex-1 text-sm font-medium text-gray-900">
            {displayName || "User"}
          </div>
        </div>
      </div>
    </aside>
  );
}
