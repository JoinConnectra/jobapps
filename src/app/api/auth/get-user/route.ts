import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema-pg";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

/** Robust JSON parser that won’t throw on empty/non-JSON bodies */
async function safeJson<T = any>(req: NextRequest): Promise<T | null> {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength === "0") return null;

    const ctype = req.headers.get("content-type") || "";
    if (!ctype.includes("application/json")) {
      const txt = await req.text();
      if (!txt?.trim()) return null;
      return JSON.parse(txt);
    }
    return await req.json();
  } catch {
    return null;
  }
}

function normalizeAccountType(row: any): "applicant" | "employer" | null {
  // Handle both camelCase and snake_case from Drizzle result
  const raw =
    (row?.accountType ?? row?.account_type ?? "").toString().trim().toLowerCase();
  if (raw === "applicant" || raw === "student") return "applicant";
  if (raw === "employer" || raw === "company" || raw === "org") return "employer";
  return null;
}

// ----------------------------- POST: lookup by email -----------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await safeJson<{ email?: string }>(request);
    const email = body?.email?.trim();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (found.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const accountType = normalizeAccountType(found[0]);
    return NextResponse.json({ ok: true, accountType });
  } catch (err) {
    console.error("get-user POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ----------------------------- GET: lookup by current session -----------------------------
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (found.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const accountType = normalizeAccountType(found[0]);
    return NextResponse.json({ ok: true, accountType });
  } catch (err) {
    console.error("get-user GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
