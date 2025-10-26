"use client";
import { createAuthClient } from "better-auth/react";
import { useEffect, useState } from "react";

/**
 * Notes:
 * - We rely on the server to return a "set-auth-token" header.
 * - We store that token verbatim (no splitting). If you later decide to rely only on cookies,
 *   you can remove the Authorization header from fetchOptions.
 */

function getBaseURL() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function getStoredToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("bearer_token") || "";
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  fetchOptions: {
    headers: {
      Authorization: `Bearer ${getStoredToken()}`,
    },
    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get("set-auth-token");
      if (authToken) {
        try {
          // Store the token AS-IS
          localStorage.setItem("bearer_token", authToken);
        } catch { /* ignore storage errors */ }
      }
    },
  },
});

// -------------------------------------------------------------------------------------
// Lightweight session hook (client)
// -------------------------------------------------------------------------------------
export function useSession() {
  const [session, setSession] = useState<any>(null);
  const [isPending, setIsPending] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  const fetchSession = async () => {
    setIsPending(true);
    try {
      const res = await fetch("/api/auth/session", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
        credentials: "include",
      });
      if (!res.ok) {
        setSession(null);
        setError(null);
      } else {
        const data = await res.json();
        setSession(data?.user ? data : null);
        setError(null);
      }
    } catch (err) {
      setSession(null);
      setError(err);
    } finally {
      setIsPending(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  return { data: session, isPending, error, refetch: fetchSession };
}
