import { headers } from "next/headers";

/**
 * Builds an absolute URL for server-side fetch calls.
 * Next.js 14+: headers() is async, so we await it.
 */
export async function absoluteUrl(path: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}${path.startsWith("/") ? path : `/${path}`}`;
}
