// src/app/api/talent/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const pid = Number(id);
    if (!pid) {
      return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    }

    // 1) Fetch the profile WITHOUT any relational join
    const { data: p, error: e1 } = await supabaseService
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
          experience_years
        `
      )
      .eq("id", pid)
      .single();

    if (e1) throw e1;
    if (!p) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    // 2) Fetch the linked user (from your PUBLIC users table, not auth.users)
    let u: { id?: number; name?: string | null; email?: string | null; account_type?: string | null } = {};
    if (p.user_id) {
      const { data: udata, error: e2 } = await supabaseService
        .from("users")
        .select("id, name, email, account_type")
        .eq("id", p.user_id)
        .maybeSingle();

      if (e2) throw e2;
      if (udata) u = udata;
    }

    // 3) Shape the response
    const item = {
      id: p.id,
      userId: p.user_id,
      name: u.name ?? null,
      email: u.email ?? null,
      program: p.program ?? null,
      headline: p.headline ?? null,
      about: p.about ?? "",
      locationCity: p.location_city ?? null,
      locationCountry: p.location_country ?? null,
      websiteUrl: p.website_url ?? null,
      resumeUrl: p.resume_url ?? null,
      isPublic: !!p.is_public,
      jobPrefs: p.job_prefs ?? {},
      skills: Array.isArray(p.skills) ? p.skills : [],
      whatsapp: p.whatsapp ?? null,
      province: p.province ?? null,
      linkedinUrl: p.linkedin_url ?? null,
      portfolioUrl: p.portfolio_url ?? null,
      githubUrl: p.github_url ?? null,
      workAuth: p.work_auth ?? null,
      needSponsorship: p.need_sponsorship ?? null,
      willingRelocate: p.willing_relocate ?? null,
      remotePref: p.remote_pref ?? null,
      earliestStart: p.earliest_start ?? null,
      salaryExpectation: p.salary_expectation ?? null,
      expectedSalaryPkr: p.expected_salary_pkr ?? null,
      noticePeriodDays: p.notice_period_days ?? null,
      experienceYears: p.experience_years ?? null,
      verified: !!p.verified,
    };

    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    console.error("[/api/talent/:id] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
