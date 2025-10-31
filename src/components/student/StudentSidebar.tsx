"use client";

import Link from "next/link";
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
  CalendarDays, // 👈 added
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSession, authClient } from "@/lib/auth-client";

/** Helpers */
function initialsFrom(nameOrEmail?: string) {
  if (!nameOrEmail) return "U";
  const str = nameOrEmail.trim();

  // If it looks like an email, use first letter before '@'
  if (str.includes("@")) return str[0]?.toUpperCase() || "U";

  // Otherwise try to create initials from a name
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
  const [displayName, setDisplayName] = useState<string>(""); // fetched user's name
  const [avatarLetter, setAvatarLetter] = useState<string>("U");

  // Fetch app user by email (uses your existing API route)
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
          const safeName = name && name.length > 0 ? name : email; // fallback to email's local part
          setDisplayName(name && name.length > 0 ? name : (email?.split("@")[0] ?? "User"));
          setAvatarLetter(initialsFrom(safeName));
        } else if (res.status === 404) {
          // No DB user—fallback to email
          setDisplayName(email?.split("@")[0] ?? "User");
          setAvatarLetter(initialsFrom(email));
        } else {
          // Unknown error—fallback to email
          setDisplayName(email?.split("@")[0] ?? "User");
          setAvatarLetter(initialsFrom(email));
        }
      } catch {
        // Network/API failure—fallback to email
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
      { href: "/student/events", label: "Events", icon: CalendarDays }, // 👈 added
      { href: "/student/applications", label: "Applications", icon: FileText },
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
    } catch (e: any) {
      toast.error("Failed to sign out");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-64 bg-[#FEFEFA] border-r border-gray-200 h-screen sticky top-0 flex flex-col">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="text-lg font-semibold">JobHunt</div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto">
        <nav className="p-4 space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 rounded px-3 py-2 text-sm",
                  active
                    ? "bg-[#F5F1E8] text-gray-900"
                    : "text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 pt-2">
          <button
            onClick={signOut}
            disabled={busy}
            className={clsx(
              "w-full flex items-center gap-3 text-sm px-3 py-2 rounded text-left",
              "text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900",
              busy && "opacity-50 cursor-not-allowed"
            )}
          >
            <LogOut className="w-4 h-4" />
            {busy ? "Signing out..." : "Log out"}
          </button>
        </div>
      </div>

      {/* Footer user pill (employer-like footer strip) */}
      <div className="mt-auto p-6 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white text-sm font-medium">{avatarLetter}</span>
          </div>
          <div className="flex-1 text-sm font-medium text-gray-900">
            {displayName || "User"}
          </div>
        </div>
      </div>
    </div>
  );
}
