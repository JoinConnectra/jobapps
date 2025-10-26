import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
// Use the schema you actually use elsewhere in your app.
// If your users table is in "schema-pg", swap the import accordingly:
import { users } from "@/db/schema"; // or "@/db/schema-pg"
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ email: string }> } // Next 15 dynamic APIs: params is a Promise
) {
  try {
    const { email } = await ctx.params; // ← await the params
    const decoded = decodeURIComponent(email || "");

    if (!decoded) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const rows = await db.select().from(users).where(eq(users.email, decoded)).limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If you don’t want to leak sensitive columns, select explicit fields instead of "*".
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("GET /api/users/by-email/[email] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
