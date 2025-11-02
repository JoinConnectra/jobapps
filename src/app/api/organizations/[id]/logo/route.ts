import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { organizations } from "@/db/schema-pg";
import { eq } from "drizzle-orm";

const BUCKET = "company-logos"; // Bucket for company logos

function getSupabaseAdmin() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !key) {
    throw new Error("Missing Supabase configuration");
  }
  return createClient(url, key);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = parseInt(id);
    if (!Number.isFinite(orgId) || orgId <= 0) {
      return NextResponse.json(
        { error: "Invalid organization id" },
        { status: 400 }
      );
    }

    // Get auth token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify organization exists and user has access (simplified - you may want to check membership)
    const orgRows = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (orgRows.length === 0) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const form = await req.formData();
    const file = form.get("logo") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Missing file in form-data as 'logo'" },
        { status: 400 }
      );
    }

    // Validate file type (images only)
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (file.type && !allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload JPEG, PNG, GIF, or WebP" },
        { status: 415 }
      );
    }

    // Validate file size (max 5MB)
    const maxBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 413 }
      );
    }

    const supabase = getSupabaseAdmin();
    const ext = file.name?.includes(".") ? file.name.split(".").pop() : "png";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const path = `logos/${orgId}/${filename}`;

    // Upload to Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/png",
      });

    if (uploadErr) {
      console.error("Supabase upload error:", uploadErr);
      return NextResponse.json(
        { error: "Failed to upload logo" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    const logoUrl = urlData.publicUrl;
    console.log("Logo upload: Generated public URL:", logoUrl);
    console.log("Logo upload: Path:", path);
    console.log("Logo upload: Bucket:", BUCKET);

    // Update organization with logo URL
    const updateResult = await db
      .update(organizations)
      .set({
        logoUrl,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId))
      .returning();
    
    console.log("Logo upload: Updated organization:", updateResult[0]?.logoUrl);

    return NextResponse.json(
      {
        ok: true,
        logoUrl,
        path,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /api/organizations/[id]/logo error:", err);
    return NextResponse.json(
      { error: "Internal server error: " + (err as Error).message },
      { status: 500 }
    );
  }
}

