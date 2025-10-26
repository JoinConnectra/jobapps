// src/lib/url.ts

/**
 * Builds an absolute URL for fetch calls that may run on the client or server.
 * - On the server (App Router), uses next/headers()
 * - On the client, falls back to window.location.origin
 */
export async function absoluteUrl(path: string): Promise<string> {
  // In Node.js (server)
  if (typeof window === "undefined") {
    // next/headers only exists on the server side
    try {
      const { headers } = await import("next/headers");
      const h = await headers();
      const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
      const proto = h.get("x-forwarded-proto") ?? "http";
      return `${proto}://${host}${path.startsWith("/") ? path : `/${path}`}`;
    } catch {
      // Fallback if import fails (e.g. non-Next runtime)
      return `http://localhost:3000${path.startsWith("/") ? path : `/${path}`}`;
    }
  }

  // In the browser (client)
  const origin = window.location.origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
