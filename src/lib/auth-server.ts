// src/lib/auth-server.ts
import type { NextRequest } from "next/server";

export type ServerSession = {
  user?: {
    id?: string;
    email?: string;
    name?: string | null;
    [k: string]: any;
  } | null;
  [k: string]: any;
};

export async function getServerSession(req: NextRequest): Promise<ServerSession | null> {
  try {
    const authz = req.headers.get("authorization") || "";
    const cookie = req.headers.get("cookie") || "";
    const base = new URL(req.url).origin;

    const res = await fetch(`${base}/api/auth/session`, {
      method: "GET",
      headers: {
        ...(authz ? { Authorization: authz } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json && typeof json === "object" && json.user ? (json as ServerSession) : null;
  } catch {
    return null;
  }
}

export async function getEmailFromRequest(req: NextRequest): Promise<string | null> {
  const sess = await getServerSession(req);
  return (sess?.user?.email as string | undefined) ?? null;
}
