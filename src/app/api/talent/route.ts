// src/app/api/talent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toInt(v: string | null, d: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const page = Math.max(1, toInt(url.searchParams.get("page"), 1));
    const pageSize = Math.min(50, Math.max(1, toInt(url.searchParams.get("pageSize"), 20)));

    const q = (url.searchParams.get("q") || "").trim();
    const city = (url.searchParams.get("city") || "").trim();
    const country = (url.searchParams.get("country") || "").trim();
    const program = (url.searchParams.get("program") || "").trim();
    const minExp = toInt(url.searchParams.get("minExp"), 0);

    // 1) Fetch student_profiles page (no join) with server-side filters only
    let q1 = supabaseService
      .from("student_profiles")
      .select(
        `
          id,
          user_id,
          grad_year,
          program,
          verified,
          headline,
          about,
          location_city,
          location_country,
          website_url,
          resume_url,
          is_public,
          job_prefs,
          skills,
          whatsapp,
          province,
          linkedin_url,
          portfolio_url,
          github_url,
          work_auth,
          need_sponsorship,
          willing_relocate,
          remote_pref,
          earliest_start,
          salary_expectation,
          expected_salary_pkr,
          notice_period_days,
          experience_years,
          created_at
        `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (city) q1 = q1.ilike("location_city", `%${city}%`);
    if (country) q1 = q1.ilike("location_country", `%${country}%`);
    if (program) q1 = q1.ilike("program", `%${program}%`);
    if (minExp > 0) q1 = q1.gte("experience_years", minExp);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: profiles, error: e1, count } = await q1.range(from, to);
    if (e1) throw e1;

    const profs = profiles || [];

    // 2) Fetch matching users in bulk and map by id
    const userIds = [...new Set(profs.map((p: any) => p.user_id).filter(Boolean))];
    let usersById: Record<number, { id: number; name: string | null; email: string | null; account_type?: string | null }> = {};

    if (userIds.length > 0) {
      const { data: users, error: e2 } = await supabaseService
        .from("users") // <- your public users table (NOT auth.users)
        .select("id, name, email, account_type")
        .in("id", userIds);
      if (e2) throw e2;

      for (const u of users || []) {
        usersById[u.id as number] = {
          id: u.id as number,
          name: (u as any).name ?? null,
          email: (u as any).email ?? null,
          account_type: (u as any).account_type ?? null,
        };
      }
    }

    // 3) Merge and apply free-text search in app
    let items = profs.map((row: any) => {
      const u = usersById[row.user_id as number] || {};
      return {
        id: row.id,
        userId: row.user_id,
        name: (u as any).name ?? null,
        email: (u as any).email ?? null,
        program: row.program ?? null,
        headline: row.headline ?? null,
        locationCity: row.location_city ?? null,
        locationCountry: row.location_country ?? null,
        skills: Array.isArray(row.skills) ? row.skills : [],
        experienceYears: row.experience_years ?? null,
        verified: !!row.verified,
        isPublic: !!row.is_public,
      };
    });

    if (q) {
      const qq = q.toLowerCase();
      items = items.filter((it) => {
        const hay = [
          it.name,
          it.email,
          it.program,
          it.headline,
          it.locationCity,
          it.locationCountry,
          ...(it.skills || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(qq);
      });
    }

    // Calculate previous period data (30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Previous period total profiles
    const { count: previousTotalCount } = await supabaseService
      .from("student_profiles")
      .select("*", { count: "exact", head: true })
      .lte("created_at", thirtyDaysAgo.toISOString());
    
    // Previous period average experience
    const { data: previousProfiles } = await supabaseService
      .from("student_profiles")
      .select("experience_years")
      .lte("created_at", thirtyDaysAgo.toISOString());
    
    const previousAvgExp = previousProfiles && previousProfiles.length > 0
      ? previousProfiles.reduce((sum: number, p: any) => sum + (Number(p.experience_years) || 0), 0) / previousProfiles.length
      : 0;

    return NextResponse.json({
      ok: true,
      page,
      pageSize,
      total: count ?? items.length,
      items,
      previousPeriod: {
        total: previousTotalCount || 0,
        avgExperience: previousAvgExp,
      },
    });
  } catch (e: any) {
    console.error("[/api/talent] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
