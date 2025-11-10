// /src/app/api/student/resume/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { createHash } from "crypto";
import { db } from "@/db";
import { applications, users } from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "resumes";

/** Keep names clean + short */
function sanitizeFilename(name: string) {
  return ((name || "resume")
    .replace(/[^\p{L}\p{N}\.\-_ ]/gu, "")
    .trim()
    .slice(0, 120)) || "resume";
}

/** Resolve the current applicant (reject if not an applicant) */
async function getDbUserOrThrow(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [dbUser] = await db
    .select({ id: users.id, email: users.email, accountType: users.accountType })
    .from(users)
    .where(eq(users.email, authUser.email))
    .limit(1);

  if (!dbUser) return NextResponse.json({ error: "No DB user for email" }, { status: 401 });
  if (dbUser.accountType !== "applicant") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return dbUser;
}

/* ======================= GET (latest resume signed URL) ======================= */
export async function GET(req: NextRequest) {
  const dbUserOrResp = await getDbUserOrThrow(req);
  if ("json" in dbUserOrResp) return dbUserOrResp as NextResponse;
  const dbUser = dbUserOrResp;

  // Latest application for this user
  const [latestApp] = await db
    .select()
    .from(applications)
    .where(eq(applications.applicantUserId, dbUser.id))
    .orderBy(desc(applications.createdAt))
    .limit(1);

  if (!latestApp) return NextResponse.json({ url: null });

  // Files are stored under resumes/applications/<applicationId>/...
  const folder = `applications/${latestApp.id}`;
  const { data: files, error: listErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .list(folder, { sortBy: { column: "name", order: "desc" } });

  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
  if (!files || files.length === 0) return NextResponse.json({ url: null });

  const latest = files[0];
  const fullPath = `${folder}/${latest.name}`;
  const signed = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(fullPath, 600);
  if (signed.error) return NextResponse.json({ error: signed.error.message }, { status: 500 });

  return NextResponse.json({ url: signed.data.signedUrl });
}

/* ======================= POST (upload & attach) ======================= */
export async function POST(req: NextRequest) {
  const dbUserOrResp = await getDbUserOrThrow(req);
  if ("json" in dbUserOrResp) return dbUserOrResp as NextResponse;
  const dbUser = dbUserOrResp;

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  // Attach to the user's latest application (apply → then upload flow)
  const [latestApp] = await db
    .select()
    .from(applications)
    .where(eq(applications.applicantUserId, dbUser.id))
    .orderBy(desc(applications.createdAt))
    .limit(1);

  if (!latestApp) {
    return NextResponse.json(
      { error: "No application found to attach this resume to." },
      { status: 400 }
    );
  }

  // Build canonical storage path: resumes/applications/<applicationId>/<timestamp>-<sha>-<safe>
  const ts = Date.now();
  const safe = sanitizeFilename(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sha = createHash("sha256").update(Buffer.from(bytes)).digest("hex").slice(0, 16);

  const folder = `applications/${latestApp.id}`;
  const objectName = `${ts}-${sha}-${safe}`;
  const path = `${folder}/${objectName}`;         // path INSIDE the bucket
  const fullKey = `${BUCKET}/${path}`;            // bucket-prefixed key for DB (ALWAYS)

  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Persist on applications row — use camelCase fields from drizzle schema-pg
  await db
    .update(applications)
    .set({
      resumeS3Key: fullKey,                        // e.g., "resumes/applications/22/....pdf"
      resumeFilename: safe,
      resumeMime: file.type || null,
      resumeSize: typeof file.size === "number" ? file.size : null,
      updatedAt: new Date(),
    })
    .where(eq(applications.id, latestApp.id));

  return NextResponse.json({
    ok: true,
    applicationId: latestApp.id,
    key: fullKey,
  });
}
