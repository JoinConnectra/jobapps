// src/app/api/student/assessments/[aid]/attempt/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { getEmailFromRequest } from "@/lib/auth-server";

// RFC 4122 UUID v5 helper (SHA-1)
function uuidFromStringV5(name: string, namespace = "6ba7b811-9dad-11d1-80b4-00c04fd430c8"): string {
  // Minimal v5 implementation: SHA-1(namespace_bytes + name_bytes)
  // and set version/variant bits.
  function hexToBytes(hex: string) {
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    return bytes;
  }
  function uuidToBytes(uuid: string) {
    const hex = uuid.replace(/-/g, "");
    return hexToBytes(hex);
  }
  function bytesToUuid(buf: Uint8Array) {
    const hex: string[] = [];
    for (let i = 0; i < buf.length; i++) {
      hex.push((buf[i] + 0x100).toString(16).slice(1));
    }
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }

  const nsBytes = uuidToBytes(namespace);
  const nameBytes = new TextEncoder().encode(name);

  const toHash = new Uint8Array(nsBytes.length + nameBytes.length);
  toHash.set(nsBytes, 0);
  toHash.set(nameBytes, nsBytes.length);

  // SHA-1
  // @ts-ignore - Node 18+ has crypto.subtle
  const digest = (globalThis.crypto?.subtle
    ? globalThis.crypto.subtle
    : (require("crypto").webcrypto.subtle)).digest("SHA-1", toHash);

  // Since digest() is Promise-like, wrap in sync-ish helper via Atomics is overkill.
  // We'll just cheat with an async IIFE and deasync via .then in caller.
  // But easier: throw if subtle is missing (unlikely in Next runtime).
  throw new Error("uuidFromStringV5 must be awaited");
}

// Async wrapper to actually compute v5
async function uuidFromStringV5Async(name: string, namespace?: string) {
  const _namespace = namespace ?? "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
  const nsBytes = (() => {
    const hex = _namespace.replace(/-/g, "");
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    return bytes;
  })();
  const nameBytes = new TextEncoder().encode(name);

  const toHash = new Uint8Array(nsBytes.length + nameBytes.length);
  toHash.set(nsBytes, 0);
  toHash.set(nameBytes, nsBytes.length);

  // @ts-ignore
  const subtle = globalThis.crypto?.subtle ?? (require("crypto").webcrypto.subtle);
  const hashBuf = await subtle.digest("SHA-1", toHash);
  const hash = new Uint8Array(hashBuf).slice(0, 16);

  // Set version (5)
  hash[6] = (hash[6] & 0x0f) | 0x50;
  // Set variant (RFC 4122)
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex: string[] = [];
  for (let i = 0; i < 16; i++) hex.push((hash[i] + 0x100).toString(16).slice(1));

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ aid?: string }> }
) {
  try {
    const { aid } = await ctx.params;
    const assessmentId = Number(aid);
    if (!assessmentId) {
      return NextResponse.json({ ok: false, error: "assessmentId required" }, { status: 400 });
    }

    // Resolve the logged-in user
    const email = await getEmailFromRequest(req);
    if (!email) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get the user row (to enforce ownership of the application)
    const { data: userRow, error: userErr } = await supabaseService
      .from("users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();
    if (userErr) {
      console.error("users lookup err", userErr);
      return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
    }
    if (!userRow?.id) {
      return NextResponse.json({ ok: false, error: "No DB user for email" }, { status: 401 });
    }
    const userId = Number(userRow.id);

    // Confirm this assessment is assigned to one of THIS user's applications
    const { data: aaRows, error: aaErr } = await supabaseService
      .from("application_assessments")
      .select("id, application_id, assessment_id, status")
      .eq("assessment_id", assessmentId);
    if (aaErr) {
      console.error("application_assessments err", aaErr);
      return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
    }
    if (!aaRows?.length) {
      return NextResponse.json({ ok: false, error: "Not assigned" }, { status: 403 });
    }

    const appIds = aaRows.map(r => r.application_id);
    const { data: apps, error: appsErr } = await supabaseService
      .from("applications")
      .select("id, applicant_user_id")
      .in("id", appIds);
    if (appsErr) {
      console.error("applications err", appsErr);
      return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
    }

    const mine = aaRows.find(r =>
      (apps ?? []).some(a => a.id === r.application_id && Number(a.applicant_user_id) === userId)
    );
    if (!mine) {
      return NextResponse.json({ ok: false, error: "Not assigned to this user" }, { status: 403 });
    }

    // Create a deterministic candidate UUID from email
    const candidateUuid = await uuidFromStringV5Async(email);

    // Insert attempt — only the columns your table actually has
    const nowIso = new Date().toISOString();
    const { data: attempt, error: attErr } = await supabaseService
      .from("assessment_attempts")
      .insert({
        assessment_id: assessmentId,
        candidate_id: candidateUuid,
        status: "in_progress",
        started_at: nowIso,
      } as any)
      .select("id")
      .single();

    if (attErr) {
      console.error("attempt insert err", attErr);
      return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
    }

    // Mark the assignment as in_progress (nice to have)
    const { error: updErr } = await supabaseService
      .from("application_assessments")
      .update({ status: "in_progress", started_at: nowIso })
      .eq("id", mine.id);
    if (updErr) {
      console.warn("application_assessments status update warning", updErr);
    }

    return NextResponse.json({ ok: true, attemptId: attempt.id }, { status: 200 });
  } catch (e: any) {
    console.error("POST /api/student/assessments/[aid]/attempt error:", e?.message || e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
