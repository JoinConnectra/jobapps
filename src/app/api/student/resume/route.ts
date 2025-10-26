import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, users } from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "resumes";

async function getDbUserOrThrow(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [dbUser] = await db
    .select({ id: users.id, email: users.email, accountType: users.accountType })
    .from(users)
    .where(eq(users.email, authUser.email))
    .limit(1);

  if (!dbUser) return NextResponse.json({ error: "No DB user for email" }, { status: 401 });
  if (dbUser.accountType !== "applicant")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return dbUser;
}

export async function GET(req: NextRequest) {
  const dbUserOrResp = await getDbUserOrThrow(req);
  if ("json" in dbUserOrResp) return dbUserOrResp as NextResponse;
  const dbUser = dbUserOrResp;

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .list(`${dbUser.id}`, { sortBy: { column: "name", order: "desc" } });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ url: null });

  const latest = data[0];
  const path = `${dbUser.id}/${latest.name}`;
  const signed = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 600);
  if (signed.error) return NextResponse.json({ error: signed.error.message }, { status: 500 });

  return NextResponse.json({ url: signed.data.signedUrl });
}

export async function POST(req: NextRequest) {
  const dbUserOrResp = await getDbUserOrThrow(req);
  if ("json" in dbUserOrResp) return dbUserOrResp as NextResponse;
  const dbUser = dbUserOrResp;

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  const ts = Date.now();
  const path = `${dbUser.id}/${ts}-${file.name}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type || "application/pdf", upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach to latest application owned by this user (optional)
  const [latestApp] = await db
    .select()
    .from(applications)
    .where(eq(applications.applicantUserId, dbUser.id))
    .orderBy(desc(applications.createdAt))
    .limit(1);

  if (latestApp) {
    await db
      .update(applications)
      .set({
        resumeS3Key: path,
        resumeFilename: file.name,
        resumeMime: file.type || null,
        resumeSize: typeof file.size === "number" ? file.size : null,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, latestApp.id));
  }

  return NextResponse.json({ ok: true, key: path });
}
