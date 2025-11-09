import { NextRequest, NextResponse } from "next/server";
import Busboy from "busboy";
import { Readable } from "stream";
import { randomUUID, createHash } from "crypto";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { execFile } from "child_process";
import { supabaseService } from "@/lib/supabase";
import { basicParse, atsFormatScore } from "@/lib/ats/parseResume";

/* ============================ Tunables ============================ */
const MAX_BYTES = 15 * 1024 * 1024;
const OCR_TIMEOUT_MS = 120_000;
const PDF_MAX_OCR_PAGES = 18;
const PDF_TEXT_MIN_LEN = 400;
const ALLOWED_EXT = new Set([".pdf", ".docx", ".txt"]);
const STORAGE_BUCKET = "resumes"; // canonical bucket

/* ============================ Small utils ============================ */
function err(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
function sanitizeFilename(name: string) {
  const base = name.replace(/[^\p{L}\p{N}\.\-_ ]/gu, "").trim() || "resume";
  return base.slice(0, 120);
}
function extnameLower(name: string) {
  const m = name.toLowerCase().match(/\.[a-z0-9]+$/i);
  return m ? m[0] : "";
}
function looksLikePDF(buf: Buffer) {
  return buf.length > 4 && buf.slice(0, 4).toString() === "%PDF";
}
function normalizeText(s: string) {
  const noCtl = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  return noCtl.replace(/\n{3,}/g, "\n\n").trim();
}
function execOut(cmd: string, args: string[], opts?: { cwd?: string; timeoutMs?: number }) {
  return new Promise<string>((resolve, reject) => {
    const child = execFile(cmd, args, { cwd: opts?.cwd, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) return reject(stderr || error);
      resolve(String(stdout || ""));
    });
    if (opts?.timeoutMs) {
      const t = setTimeout(() => {
        try { child.kill("SIGKILL"); } catch {}
        reject(new Error(`${cmd} timed out after ${opts.timeoutMs}ms`));
      }, opts.timeoutMs);
      child.on("exit", () => clearTimeout(t));
    }
  });
}

/* ============================ Taxonomy ============================ */
async function getSkills() {
  const { data, error } = await supabaseService
    .from("skills_taxonomy_ats")
    .select("slug, aliases, kind, weight, locale_aliases");
  if (error) throw error;
  return (data || []).map((d: any) => {
    const aliases = Array.isArray(d.aliases) ? d.aliases.map(String) : [];
    const localeAliases = Array.isArray(d.locale_aliases) ? d.locale_aliases.map(String) : [];
    return { slug: String(d.slug), aliases: [...aliases, ...localeAliases], kind: d.kind || undefined, weight: typeof d.weight === "number" ? d.weight : undefined };
  });
}

/* ============================ PDF/Text extraction ============================ */
async function tryPdfJs(buf: Buffer): Promise<{ text: string; pages: number } | null> {
  try {
    (process as any).env.PDFJS_DISABLE_WORKER = "true";
    const g: any = globalThis as any;
    if (typeof g.DOMMatrix === "undefined") { g.DOMMatrix = class { multiplySelf() { return this; } }; }
    // legacy ESM build (no 'canvas' import)
    const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
    if (pdfjs?.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = undefined;

    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buf) });
    const pdf = await loadingTask.promise;

    let full = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const text = (content.items as any[])
        .map((it: any) => (typeof it?.str === "string" ? it.str : ""))
        .filter(Boolean)
        .join(" ");
      if (text) full += text + "\n";
      if (full.length > 2_000_000) break;
    }
    return { text: normalizeText(full), pages: pdf.numPages };
  } catch {
    return null;
  }
}

async function ocrPdfWithCli(buf: Buffer): Promise<string> {
  const workId = randomUUID();
  const workDir = join(tmpdir(), `ocr-${workId}`);
  await fs.mkdir(workDir, { recursive: true });
  const pdfPath = join(workDir, "in.pdf");
  await fs.writeFile(pdfPath, buf);
  try {
    await execOut("pdftoppm", ["-png", pdfPath, "out"], { cwd: workDir, timeoutMs: OCR_TIMEOUT_MS });
    let files = (await fs.readdir(workDir)).filter((f) => /^out-\d+\.png$/i.test(f));
    files.sort((a, b) => Number(a.match(/out-(\d+)\.png/i)?.[1] ?? 0) - Number(b.match(/out-(\d+)\.png/i)?.[1] ?? 0));
    if (!files.length) throw new Error("pdftoppm produced no images (is Poppler installed?)");

    files = files.slice(0, PDF_MAX_OCR_PAGES);

    let full = "";
    for (const f of files) {
      const pagePath = join(workDir, f);
      const out = await execOut("tesseract", [pagePath, "stdout", "-l", "eng", "--psm", "6"], {
        cwd: workDir,
        timeoutMs: Math.floor(OCR_TIMEOUT_MS / Math.max(1, files.length)),
      });
      if (out) full += out + "\n";
      if (full.length > 2_000_000) break;
    }
    const final = normalizeText(full);
    if (!final) throw new Error("OCR produced no text");
    return final;
  } finally {
    try { await fs.rm(workDir, { recursive: true, force: true }); } catch {}
  }
}

async function extractTextFromPDF(buf: Buffer): Promise<string> {
  const viaPdf = await tryPdfJs(buf);
  if (viaPdf && viaPdf.text.length >= PDF_TEXT_MIN_LEN) return viaPdf.text;
  return await ocrPdfWithCli(buf);
}

function extFromNameOrHeader(filename: string, buf: Buffer) {
  const lowerExt = extnameLower(filename);
  if (ALLOWED_EXT.has(lowerExt)) return lowerExt;
  if (looksLikePDF(buf)) return ".pdf";
  return "";
}

async function extractTextFromBuffer(filename: string, buf: Buffer): Promise<{ text: string; kind: string }> {
  const lowerExt = extFromNameOrHeader(filename, buf);
  if (!ALLOWED_EXT.has(lowerExt)) throw new Error("Unsupported file type. Upload PDF, DOCX, or TXT.");
  if (lowerExt === ".txt") return { text: normalizeText(buf.toString("utf8")), kind: "txt" };
  if (lowerExt === ".pdf") return { text: await extractTextFromPDF(buf), kind: "pdf" };
  if (lowerExt === ".docx") {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ buffer: buf });
    return { text: normalizeText(String(res.value || "")), kind: "docx" };
  }
  throw new Error("Unsupported file type.");
}

/* ============================== Route ============================== */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return new Promise<NextResponse>((resolve) => {
    const busboy = Busboy({ headers: Object.fromEntries(req.headers) as any });

    let applicationId: number | null = null;
    let filename = "resume";
    let bytes = 0;
    let fileBuffer: Buffer | null = null;

    function pushChunk(d: Buffer) {
      bytes += d.length;
      if (bytes > MAX_BYTES) {
        throw Object.assign(new Error(`File too large. Max allowed is ${Math.floor(MAX_BYTES / (1024 * 1024))} MB.`), { status: 413 });
      }
    }

    busboy.on("field", (name, val) => {
      if (name === "application_id") applicationId = Number(val);
    });

    busboy.on("file", (_name, file, info) => {
      filename = sanitizeFilename(info.filename || "resume");
      const chunks: Buffer[] = [];
      file.on("data", (d: Buffer) => {
        try { pushChunk(d); chunks.push(d); }
        catch (e: any) { file.resume?.(); file.removeAllListeners?.(); resolve(err(e.message, e.status || 413)); }
      });
      file.on("end", () => { if (!fileBuffer) fileBuffer = Buffer.concat(chunks); });
    });

    busboy.on("finish", async () => {
      try {
        if (!applicationId || Number.isNaN(applicationId)) return resolve(err("application_id is required", 400));
        if (!fileBuffer || fileBuffer.length === 0) return resolve(err("No file uploaded", 400));

        // Ensure application exists
        const { data: app, error: appErr } = await supabaseService
          .from("applications")
          .select("id, applicant_user_id")
          .eq("id", applicationId)
          .maybeSingle();
        if (appErr) throw appErr;
        if (!app) return resolve(err("Invalid application_id", 404));

        // Store file in Storage (canonical: resumes/<applicationId>/...)
        const sha = createHash("sha256").update(fileBuffer).digest("hex").slice(0, 16);
        const safe = filename.replace(/\s+/g, "_");
        const path = `${applicationId}/${Date.now()}-${sha}-${safe}`;

        const up = await supabaseService.storage
          .from(STORAGE_BUCKET)
          .upload(path, fileBuffer, { contentType: "application/pdf", upsert: false });
        if (up.error) throw new Error(`Failed to store file: ${up.error.message || up.error}`);

        // Extract text
        const ext = extFromNameOrHeader(filename, fileBuffer);
        let extracted;
        try { extracted = await extractTextFromBuffer(filename, fileBuffer); }
        catch (e: any) { return resolve(err(`Could not read the document. ${e?.message || e}`, 422)); }
        if (!extracted.text || extracted.text.length < 40) {
          return resolve(err("Document text appears empty. Please upload a text-based PDF/DOCX/TXT (not just images).", 422));
        }

        // Parse + score
        const taxonomy = await getSkills();
        const parsed = basicParse(extracted.text, taxonomy);
        const score = atsFormatScore(parsed);

        // Insert into resumes (store full bucket-prefixed key for clarity)
        const fullKey = `${STORAGE_BUCKET}/${path}`;
        const ins = await supabaseService
          .from("resumes")
          .insert({
            application_id: applicationId,
            s3_key: fullKey,
            raw_text: extracted.text,
            parsed_json: parsed as any,
            ats_format_score: score,
          })
          .select("id")
          .single();
        if (ins.error) throw new Error(`Failed to save resume record: ${ins.error.message || ins.error}`);

        // Sync back to applications so ingest always knows the true location
        await supabaseService
  .from("applications")
  .update({
    resume_s3_key: `${STORAGE_BUCKET}/${path}`, // FORCE prefix every time
    resume_filename: filename
  })
  .eq("id", applicationId);


        // Upsert detected skills (skip if your join expects UUID but resumes.id is integer)
        if (Array.isArray(parsed.skills) && parsed.skills.length) {
          if (typeof ins.data.id === "number") {
            console.warn("[upload] Skipping resume_skills_ats upsert: resumes.id is integer but resume_skills_ats.resume_id is UUID");
          } else {
            const rows = parsed.skills.map((s) => ({
              resume_id: ins.data.id as any,
              skill_slug: s.slug,
              confidence: s.confidence,
            }));
            await supabaseService.from("resume_skills_ats").upsert(rows);
          }
        }

        resolve(NextResponse.json({
          ok: true,
          resumeId: ins.data.id,
          ats_format_score: score,
          meta: {
            ext,
            bytes,
            storage_path: fullKey,
            kind: extracted.kind,
            application_id: applicationId,
            candidate_id: app.applicant_user_id
          }
        }));
      } catch (e: any) {
        const msg = typeof e?.message === "string" ? e.message : String(e);
        if (/timed out/i.test(msg)) return resolve(err("OCR took too long. Try a text-based PDF or DOCX.", 504));
        if (/Poppler|tesseract/i.test(msg)) return resolve(err("OCR tools are unavailable on the server. Please upload a text-based PDF/DOCX/TXT.", 503));
        return resolve(err(msg || "Upload failed", 400));
      }
    });

    const body = req.body;
    if (body) Readable.fromWeb(body as any).pipe(busboy);
    else resolve(err("Empty body", 400));
  });
}
