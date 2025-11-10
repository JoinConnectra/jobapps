// /src/app/api/applications/[id]/resume/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { createHash } from "crypto";

const BUCKET = "resumes"; // Supabase Storage bucket

function getSupabaseAdmin() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url) throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

function sanitizeFilename(name: string) {
  return ((name || "resume")
    .replace(/[^\p{L}\p{N}\.\-_ ]/gu, "")
    .trim()
    .slice(0, 120)) || "resume";
}

/* ========================== GET (signed URL) ========================== */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;          // ✅ await params
    const appId = Number(id);
    if (!Number.isFinite(appId) || appId <= 0) {
      return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
    }

    const row = await db.query.applications.findFirst({
      where: eq(applications.id, appId),
      columns: { resumeS3Key: true, resumeFilename: true, resumeMime: true, resumeSize: true },
    });
    if (!row?.resumeS3Key) {
      return NextResponse.json({ error: "No resume on file" }, { status: 404 });
    }

    // Row stores full key like "resumes/applications/23/..."
    const fullKey = String(row.resumeS3Key);
    const path = fullKey.startsWith(`${BUCKET}/`) ? fullKey.slice(BUCKET.length + 1) : fullKey;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 5);

    if (error || !data?.signedUrl) {
      console.error("createSignedUrl error:", error);
      return NextResponse.json({ error: "Failed to get signed URL" }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      filename: row.resumeFilename,
      mime: row.resumeMime,
      size: row.resumeSize,
    });
  } catch (err) {
    console.error("GET /api/applications/[id]/resume error:", err);
    return NextResponse.json(
      { error: "Internal server error: " + (err as Error).message },
      { status: 500 }
    );
  }
}

/* ========================== POST (upload) ========================== */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;          // ✅ await params
    const appId = Number(id);
    if (!Number.isFinite(appId) || appId <= 0) {
      return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("resume") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Missing file in form-data as 'resume'" }, { status: 400 });
    }

    // Checks
    const maxBytes = 20 * 1024 * 1024; // 20 MB
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 413 });
    }
    const allowed = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
    if (file.type && !allowed.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type. Upload PDF/DOC/DOCX" }, { status: 415 });
    }

    const supabase = getSupabaseAdmin();

    // Canonical storage path: resumes/applications/<appId>/<ts>-<sha>-<safe>
    const safeName = sanitizeFilename(file.name);
    const buf = new Uint8Array(await file.arrayBuffer());
    const sha = createHash("sha256").update(Buffer.from(buf)).digest("hex").slice(0, 16);
    const object = `${Date.now()}-${sha}-${safeName}`;
    const innerPath = `applications/${appId}/${object}`; // path INSIDE bucket
    const fullKey = `${BUCKET}/${innerPath}`;            // what we store in DB

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(innerPath, buf, {
        cacheControl: "3600",
        upsert: false,                        // don't overwrite
        contentType: file.type || "application/octet-stream",
      });

    if (uploadErr) {
      console.error("Supabase upload error:", uploadErr);
      return NextResponse.json({ error: "Failed to upload resume" }, { status: 500 });
    }

    // Persist metadata on applications (store FULL bucket-prefixed key)
    await db
      .update(applications)
      .set({
        resumeS3Key: fullKey,                 // e.g., "resumes/applications/23/....pdf"
        resumeFilename: safeName,
        resumeMime: file.type || null,
        resumeSize: Number(file.size) || null,
        updatedAt: sql`now()`,
      })
      .where(eq(applications.id, appId));

    // (Optional) kick off ingest so the resume is parsed immediately
    try {
      const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
      fetch(`${base}/api/ats/applications/${appId}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});
    } catch (_) {}

    return NextResponse.json(
      { ok: true, path: fullKey, filename: safeName, mime: file.type, size: file.size },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/applications/[id]/resume error:", err);
    return NextResponse.json(
      { error: "Internal server error: " + (err as Error).message },
      { status: 500 }
    );
  }
}
