import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, ctx: { params: Promise<{ jobId?: string }> }) {
  try {
    const { jobId } = await ctx.params;
    const id = Number(jobId);
    if (!id) return NextResponse.json({ ok:false, error:"jobId required" }, { status:400 });

    const { data: apps, error } = await supabaseService
      .from("applications")
      .select("id, resume_s3_key")
      .eq("job_id", id);
    if (error) throw error;

    const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
    const results = await Promise.allSettled(
      (apps || []).map(a =>
        fetch(`${base}/api/ats/applications/${a.id}/ingest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    const summary = {
      total: apps?.length ?? 0,
      okCount: results.filter(r => r.status === "fulfilled").length,
      failedCount: results.filter(r => r.status === "rejected").length,
    };

    return NextResponse.json({ ok:true, jobId: id, ...summary });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error:String(e?.message || e) }, { status:400 });
  }
}
