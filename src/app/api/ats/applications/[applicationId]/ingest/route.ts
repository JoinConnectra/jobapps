import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { basicParse, atsFormatScore } from "@/lib/ats/parseResume";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { execFile } from "child_process";

function sanitizeFilename(name: string) {
  return ((name || "resume")
    .replace(/[^\p{L}\p{N}\.\-_ ]/gu, "")
    .trim()
    .slice(0, 120)) || "resume";
}
function extnameLower(name?: string) {
  if (!name) return "";
  const m = name.toLowerCase().match(/\.[a-z0-9]+$/i);
  return m ? m[0] : "";
}
function execOut(cmd: string, args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { cwd, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) return reject(stderr || error);
        resolve(String(stdout || ""));
      }
    );
  });
}

/* ---------- OCR fallback ---------- */
async function ocrPdf(buf: Uint8Array): Promise<string> {
  const id = randomUUID();
  const work = join(tmpdir(), `ocr-${id}`);
  await fs.mkdir(work, { recursive: true });

  const pdfPath = join(work, "in.pdf");
  await fs.writeFile(pdfPath, Buffer.from(buf));

  await execOut("pdftoppm", ["-png", pdfPath, "out"], work);
  let files = (await fs.readdir(work)).filter(f => /^out-\d+\.png$/i.test(f));
  files.sort(
    (a, b) =>
      Number(a.match(/out-(\d+)\.png/i)?.[1] ?? 0) -
      Number(b.match(/out-(\d+)\.png/i)?.[1] ?? 0)
  );

  let full = "";
  for (const f of files) {
    const pngPath = join(work, f);
    const text = await execOut("tesseract", [pngPath, "stdout", "-l", "eng", "--psm", "6"], work);
    full += text + "\n";
    if (full.length > 2_000_000) break;
  }

  await fs.rm(work, { recursive: true, force: true });
  return full.trim();
}

/* ---------- extraction ---------- */
async function extractTextFromBuffer(filename: string, buf: Uint8Array) {
  const ext = extnameLower(filename);
  const txt = new TextDecoder("utf-8").decode(buf);

  if (ext === ".txt") return { text: txt.trim(), kind: "txt" };

  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const r = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    const out = String(r.value || "").trim();
    if (!out || out.length < 40) throw new Error("DOCX has insufficient extractable text");
    return { text: out, kind: "docx" };
  }

  if (ext === ".pdf") {
    try {
      (globalThis as any).DOMMatrix ??= class { multiplySelf() { return this; } };
      const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
      if (pdfjs?.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = undefined;

      const loading = pdfjs.getDocument({ data: buf });
      const pdf = await loading.promise;
      let full = "";

      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        const text = (content.items as any[]).map(it => it?.str || "").join(" ");
        full += text + "\n";
      }

      const out = full.trim();
      if (out.length >= 40) return { text: out, kind: "pdf" };

      const ocrText = await ocrPdf(buf);
      if (!ocrText || ocrText.length < 40) throw new Error("OCR produced no text");
      return { text: ocrText, kind: "pdf-ocr" };
    } catch {
      const ocrText = await ocrPdf(buf);
      if (!ocrText || ocrText.length < 40) throw new Error("OCR produced no text");
      return { text: ocrText, kind: "pdf-ocr" };
    }
  }

  if (txt.trim().length > 40) return { text: txt.trim(), kind: "txt" };
  throw new Error("Unsupported or non-text document. Use text-based PDF, DOCX, or TXT.");
}

/* ---------- taxonomy ---------- */
async function getSkillsTaxonomy() {
  const { data, error } = await supabaseService
    .from("skills_taxonomy_ats")
    .select("slug, aliases, kind, weight, locale_aliases");
  if (error) throw error;
  return (data || []).map((d: any) => {
    const aliases = Array.isArray(d.aliases) ? d.aliases.map(String) : [];
    const localeAliases = Array.isArray(d.locale_aliases) ? d.locale_aliases.map(String) : [];
    return {
      slug: String(d.slug),
      aliases: [...aliases, ...localeAliases],
      kind: d.kind || undefined,
      weight: typeof d.weight === "number" ? d.weight : undefined
    };
  });
}

/* ---------- robust download helper ---------- */
async function tryDownloadAny(b0: string, p0: string, opts: { appId: number; filenameGuess?: string }) {
  const tried: { bucket: string; path: string; message?: string }[] = [];

  async function attempt(b: string, p: string) {
    const r = await supabaseService.storage.from(b).download(p);
    if (!r.error) return r;
    tried.push({ bucket: b, path: p, message: r.error.message });
    return null;
  }

  const appId = opts.appId;
  const base = p0.split("/").pop() || opts.filenameGuess || "resume.pdf";

  let res = await attempt(b0, p0);
  if (res) return res;

  res = await attempt("resumes", p0);
  if (res) return res;

  const variants: [string, string][] = [
    ["resumes", `${appId}/${base}`],
    ["applications", `${appId}/${base}`],
    ["resumes", base],
    ["applications", base],
  ];
  for (const [b, p] of variants) {
    res = await attempt(b, p);
    if (res) return res;
  }

  throw new Error("Failed to download resume from storage");
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ applicationId?: string }> }) {
  try {
    const { applicationId } = await ctx.params;
    const appId = Number(applicationId);
    if (!appId) return NextResponse.json({ ok: false, error: "applicationId required" }, { status: 400 });

    const { data: app } = await supabaseService
      .from("applications")
      .select("id, applicant_user_id, resume_s3_key, resume_filename")
      .eq("id", appId)
      .maybeSingle();
    if (!app) return NextResponse.json({ ok: false, error: "Application not found" }, { status: 404 });

    if (!app.resume_s3_key)
      return NextResponse.json({ ok: false, error: "No resume_s3_key on application" }, { status: 422 });

    // 🔧 Normalize: ensure bucket prefix "resumes/" if missing
    let key = String(app.resume_s3_key);
    if (!/^[a-z0-9_-]+\/.+/i.test(key)) {
      key = `resumes/${key}`;
    }

    // Split bucket/path
    let bucket = "resumes";
    let path = key;
    const slash = key.indexOf("/");
    if (slash > 0) {
      const maybeBucket = key.slice(0, slash);
      const rest = key.slice(slash + 1);
      // accept known buckets; default back to resumes
      if (["resumes", "applications", "logos"].includes(maybeBucket)) {
        bucket = maybeBucket;
        path = rest;
      }
    }

    const dl = await tryDownloadAny(bucket, path, {
      appId,
      filenameGuess: sanitizeFilename(app.resume_filename || path.split("/").pop() || "resume"),
    });
    const buf = new Uint8Array(await dl.data.arrayBuffer());

    const filename = sanitizeFilename(app.resume_filename || path.split("/").pop() || "resume");
    const extracted = await extractTextFromBuffer(filename, buf);

    const taxonomy = await getSkillsTaxonomy();
    const parsed = basicParse(extracted.text, taxonomy);
    const score = atsFormatScore(parsed);

    const fullKey = `${bucket}/${path}`;
    const ins = await supabaseService
      .from("resumes")
      .insert({
        application_id: appId,
        s3_key: fullKey,
        raw_text: extracted.text,
        parsed_json: parsed as any,
        ats_format_score: score,
      })
      .select("id")
      .single();

    if (!ins.data) {
      throw new Error("Resume insert returned no data");
    }

    return NextResponse.json({
      ok: true,
      applicationId: appId,
      resumeId: ins.data.id,
      ats_format_score: score,
      storage: { bucket, path },
      kind: extracted.kind,
    });

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
