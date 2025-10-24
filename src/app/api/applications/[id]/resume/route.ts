// /src/app/api/applications/[id]/resume/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const BUCKET = "resumes"; // Supabase Storage bucket name

function getSupabaseAdmin() {
  // allow fallback to NEXT_PUBLIC_SUPABASE_URL for convenience (server will read it)
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url) {
    throw new Error(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL). Add SUPABASE_URL to .env.local"
    );
  }
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Get it from Supabase → Settings → API (service_role) and add to .env.local"
    );
  }
  return createClient(url, key);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appId = Number(params.id);
    if (!Number.isFinite(appId) || appId <= 0) {
      return NextResponse.json(
        { error: "Invalid application id" },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const file = form.get("resume") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Missing file in form-data as 'resume'" },
        { status: 400 }
      );
    }

    // Optional size/type checks
    const maxBytes = 20 * 1024 * 1024; // 20 MB
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: "File too large (max 20MB)" },
        { status: 413 }
      );
    }
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (file.type && !allowed.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload PDF/DOC/DOCX" },
        { status: 415 }
      );
    }

    const supabase = getSupabaseAdmin();
    const ext = file.name?.includes(".") ? file.name.split(".").pop() : "bin";
    const filename = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    const path = `applications/${appId}/${filename}`;

    // Upload to Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadErr) {
      console.error("Supabase upload error:", uploadErr);
      return NextResponse.json(
        { error: "Failed to upload resume" },
        { status: 500 }
      );
    }

    // Persist metadata on the application row
    await db
      .update(applications)
      .set({
        resumeS3Key: path, // storage path in bucket
        resumeFilename: file.name || filename,
        resumeMime: file.type || null,
        resumeSize: Number(file.size) || null,
        updatedAt: sql`now()`,
      })
      .where(eq(applications.id, appId));

    return NextResponse.json(
      {
        ok: true,
        path,
        filename: file.name || filename,
        mime: file.type,
        size: file.size,
      },
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
