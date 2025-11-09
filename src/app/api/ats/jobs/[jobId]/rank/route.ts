// Uses your jobs, applications, resumes tables.
// - Job JD from jobs.description_md
// - Finds all applications for jobId
// - Pulls all resumes for those applications
// - De-dupes to latest per candidate (applications.applicant_user_id) by default

import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

/* ============= tiny utils (unchanged) ============= */
const STOP = new Set(["the","and","for","with","that","this","are","you","our","your","will","have","has","from","into","more","than","such","about","able","skills","skill","experience","preferred","required","to","of","a","in","on","by","as","be","is","or","an","at","it","we","they","their","them","who","what","how"]);
const isWord = (x: unknown): x is string => typeof x === "string" && x.length > 1 && !STOP.has(x);
function tokenize(s: string): string[] { return String(s).toLowerCase().split(/\W+/).filter(isWord); }
function jaccard(a: Set<string>, b: Set<string>) { if (a.size===0&&b.size===0) return 0; let inter=0; for (const t of a) if (b.has(t)) inter++; const uni=a.size+b.size-inter; return inter/(uni||1); }
function sectionWeightedTokens(sections: Record<string,string>) { const weights: Record<string, number> = { experience: 0.6, skills: 0.25, summary: 0.15 }; const bag: string[]=[]; for (const [sec,txt] of Object.entries(sections||{})) { const w = weights[sec] ?? 0.05; const toks = tokenize(txt); const k = w>=0.5?3:w>=0.2?2:1; for (let i=0;i<k;i++) bag.push(...toks); } return new Set(bag); }
function impactScore(parsed: any){ const is=parsed?.impactSignals||{}; const numbers=Number(is.numbers||0), percents=Number(is.percents||0), currency=Number(is.currency||0); const verbs=Math.min(Number(is.verbs||0),12); return Math.min(1,(numbers+percents+currency+verbs)/20); }
function bonusFromKinds(found: Array<{ kind?: string; weight?: number }>) { let cert=0, tool=0, soft=0; for (const s of found){ const kind=(s.kind||"skill").toLowerCase(); const w=typeof s.weight==="number"?s.weight:1.0; if (kind==="cert") cert+=0.5*w; else if (kind==="tool"||kind==="platform") tool+=0.25*w; else if (kind==="soft") soft+=0.1*w; } return { certN: Math.min(1, cert/2), toolN: Math.min(1, tool/2), softN: Math.min(1, soft/0.3) }; }
function asObject(x: unknown){ if (!x) return {}; if (typeof x === "object") return x as Record<string, any>; try { return JSON.parse(String(x)); } catch { return {}; } }

/* ============================== Route ============================== */

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ jobId?: string }> }
) {
  try {
    const { jobId: jobIdFromPath } = await ctx.params;
    const url = new URL(req.url);
    const jobId = jobIdFromPath || url.searchParams.get("jobId");
    const resumeId = url.searchParams.get("resumeId");        // optional: focus one resume
    const candidateId = url.searchParams.get("candidateId");  // optional: applicant_user_id
    const showAll = url.searchParams.get("all") === "true" || url.searchParams.get("dedupe") === "false";

    if (!jobId) {
      return NextResponse.json({ ok: false, error: "jobId missing (use /api/jobs/{jobId}/rank)" }, { status: 400 });
    }

    /* -------- Job (your columns) -------- */
    const { data: job, error: jErr } = await supabaseService
      .from("jobs")
      .select("id, title, description_md, skills_required")
      .eq("id", jobId)
      .maybeSingle();
    if (jErr) throw jErr;
    if (!job) return NextResponse.json({ ok:false, error:`Job not found (${jobId})` }, { status: 404 });

    /* -------- Skills taxonomy -------- */
    const { data: taxonomy, error: tErr } = await supabaseService
      .from("skills_taxonomy_ats")
      .select("slug, aliases, kind, weight");
    if (tErr) throw tErr;
    const aliasMap = new Map<string, { aliases: string[]; kind: string; weight: number }>();
    for (const row of taxonomy ?? []) {
      const slug = String(row.slug).toLowerCase();
      const aliases = [slug, ...((row.aliases || []) as string[])].map((a) => String(a).toLowerCase());
      aliasMap.set(slug, { aliases, kind: (row.kind as string) || "skill", weight: typeof row.weight === "number" ? row.weight : 1.0 });
    }

    /* -------- Applications for this job -------- */
    let appsQuery = supabaseService
      .from("applications")
      .select("id, applicant_user_id")
      .eq("job_id", jobId);

    if (candidateId) appsQuery = appsQuery.eq("applicant_user_id", candidateId);

    const { data: apps, error: aErr } = await appsQuery;
    if (aErr) throw aErr;

    const appIds = (apps || []).map(a => a.id);
    const appById = new Map<number, { applicant_user_id: string | number | null }>();
    for (const a of apps || []) appById.set(a.id, { applicant_user_id: a.applicant_user_id });

    if (!appIds.length) {
      return NextResponse.json({ ok:true, jobId, deduped: true, ranked: [] });
    }

    /* -------- Resumes for those applications -------- */
    // Use your table & columns
    let resumesQ = supabaseService
      .from("resumes")
      .select("id, application_id, raw_text, parsed_json, ats_format_score, created_at")
      .in("application_id", appIds)
      .order("created_at", { ascending: false });

    if (resumeId) resumesQ = resumesQ.eq("id", resumeId);

    const { data: resumesRaw, error: rErr } = await resumesQ;
    if (rErr) throw rErr;

    // Map to candidate_id using applications
    const rows = (resumesRaw || []).map(r => ({
      ...r,
      candidate_id: appById.get(r.application_id as number)?.applicant_user_id ?? null,
    }));

    // Default: dedupe to **latest per candidate**
    const resumes = (() => {
      if (showAll || resumeId) return rows;
      const latestByCand = new Map<string, any>();
      for (const r of rows) {
        const cid = String(r.candidate_id || `app-${r.application_id}`); // fallback by application
        if (!latestByCand.has(cid)) latestByCand.set(cid, r); // rows are already DESC
      }
      return Array.from(latestByCand.values());
    })();

    /* -------- JD tokens & required skills -------- */
    const jdText = String(job.description_md || "");
    const jdTokens = new Set(tokenize(jdText));
    const requiredSlugs = new Set<string>(Array.isArray(job.skills_required) ? job.skills_required.map((s: string) => s.toLowerCase()) : []);

    /* -------- Rank -------- */
    const ranked = (resumes || [])
      .map((r) => {
        const raw = String(r.raw_text || "");
        const lc = raw.toLowerCase();
        const parsed = asObject(r.parsed_json);
        const sections = (parsed.sections as Record<string, string>) || { body: raw };

        const resTokens = sectionWeightedTokens(sections);

        // Taxonomy-weighted coverage
        let totalReqWeight = 0, matchedWeight = 0;
        const matchedSkills: { slug: string; alias: string; kind?: string; weight?: number }[] = [];
        const parserFoundSlugs = new Set<string>(
          Array.isArray(parsed.skills) ? parsed.skills.map((s: any) => String(s.slug || "").toLowerCase()) : []
        );

        for (const slug of requiredSlugs) {
          const entry = aliasMap.get(slug);
          const w = entry?.weight ?? 1.0;
          totalReqWeight += w;

          let matchedAlias: string | null = null;
          if (parserFoundSlugs.has(slug)) matchedAlias = slug;
          else if (entry?.aliases?.length) matchedAlias = entry.aliases.find((a) => lc.includes(a)) || null;

          if (matchedAlias) {
            matchedWeight += w;
            matchedSkills.push({ slug, alias: matchedAlias, kind: entry?.kind, weight: w });
          }
        }
        const skillCoverage = totalReqWeight ? matchedWeight / totalReqWeight : 0;

        const textSim = jaccard(jdTokens, resTokens);
        const format = Number(r.ats_format_score || 0);
        const impact = impactScore(parsed);

        const parserFoundForBonus = (parsed.skills || []).map((s: any) => ({
          kind: s.kind as string | undefined,
          weight: typeof s.weight === "number" ? s.weight : 1.0,
        }));
        const kindBonus = bonusFromKinds([...matchedSkills, ...parserFoundForBonus]);

        const presence = (parsed.hasLinkedIn ? 0.05 : 0) + (parsed.hasPortfolio ? 0.05 : 0);

        const score =
          0.35 * skillCoverage +
          0.20 * textSim +
          0.20 * format +
          0.15 * impact +
          0.05 * kindBonus.certN +
          0.05 * kindBonus.toolN +
          0.00 * kindBonus.softN +
          presence;

        return {
          resumeId: r.id,
          applicationId: r.application_id,
          candidateId: r.candidate_id,
          createdAt: r.created_at,
          score: Math.max(0, Math.min(1.1, score)),
          breakdown: {
            skillCoverage,
            textSim,
            format,
            impact,
            certBonus: kindBonus.certN,
            toolBonus: kindBonus.toolN,
            presence,
            matchedSkillsCount: matchedSkills.length,
            requiredSkillsTotal: requiredSlugs.size,
          },
          matchedSkills,
          topJobTerms: Array.from(jdTokens).slice(0, 12),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    return NextResponse.json({
      ok: true,
      jobId,
      resumeId: resumeId ?? null,
      deduped: !showAll && !resumeId,
      ranked
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
