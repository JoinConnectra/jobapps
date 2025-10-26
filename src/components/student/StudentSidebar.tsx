"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Briefcase,
  FileText,
  GraduationCap,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import clsx from "clsx";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const mainNav = [
  { href: "/student/dashboard", label: "Dashboard", icon: Home },
  { href: "/student/jobs", label: "Jobs", icon: Briefcase },
  { href: "/student/applications", label: "Applications", icon: FileText },
  { href: "/student/profile", label: "Profile", icon: GraduationCap },
];

const secondary = [
  { href: "/student/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: HelpCircle },
  // NOTE: Logout is rendered as a button below (not a Link)
];

export default function StudentSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // 1) Better-Auth sign out
      await authClient.signOut();

      // 2) Clear our persisted bearer token (used by auth-client.ts)
      try {
        localStorage.removeItem("bearer_token");
      } catch {
        /* ignore */
      }

      // 3) Route to /login
      toast.success("Signed out");
      router.replace("/login");
    } catch (e) {
      toast.error("Failed to sign out. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Brand (matches employer) */}
      <div className="p-6">
        <div className="text-xl font-display font-bold text-gray-900 mb-6">
          JobHunt
        </div>

        {/* Primary navigation */}
        <div className="space-y-1">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "w-full flex items-center gap-3 text-sm px-3 py-2 rounded",
                  active
                    ? "bg-[#F5F1E8] text-gray-900"
                    : "text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Secondary (settings/help links) */}
        <div className="mt-6 space-y-1">
          {secondary.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "w-full flex items-center gap-3 text-sm px-3 py-2 rounded",
                  active
                    ? "bg-[#F5F1E8] text-gray-900"
                    : "text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}

          {/* Logout action (button, not a link) */}
          <button
            type="button"
            onClick={handleLogout}
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
            <span className="text-white text-sm font-medium">S</span>
          </div>
        <div className="flex-1 text-sm font-medium text-gray-900">Student</div>
        </div>
      </div>
    </div>
  );
}
