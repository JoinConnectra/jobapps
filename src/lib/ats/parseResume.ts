// src/lib/parseResume.ts
// Production-grade resume parser: robust sectioning, precise skill alias matching,
// impact/achievement signals, light anti-gaming, and explainable features.
// Backward-compatible with your current pipeline (atsFormatScore + fields used by ranker).

/* ============================================================================
 * Types
 * ==========================================================================*/

export type ParsedResume = {
  /** Contact + presence */
  contact: { email?: string; phone?: string; links: string[] };
  hasLinkedIn: boolean;
  hasPortfolio: boolean;

  /** Sections (lowercased keys) */
  sections: { [k: string]: string };

  /** Skills found via taxonomy alias matching (kind/weight optional) */
  skills: {
    slug: string;
    alias: string;
    confidence: number;
    kind?: string;
    weight?: number;
  }[];

  /** Structure/quality features */
  bulletsRatio: number;           // 0..1
  hasStandardHeaders: number;     // 0..1
  keywordStuffingRatio: number;   // 0..1

  /** Achievement signals for impact-aware scoring */
  impactSignals: { numbers: number; percents: number; currency: number; verbs: number };

  /** Timeline signals */
  dateSpans: number;              // count of date tokens (rough)
  earliestYear?: number;
  latestYear?: number;

  /** Education signals (best-effort) */
  gpa?: number;                   // normalized to 0..4 when possible
  degrees?: string[];             // e.g., ["BS", "MS", "MBA"]

  /** Meta */
  langHint?: "en" | "ur" | "mixed";
  wordCount: number;
  version: string;                // parser version for traceability
};

/* ============================================================================
 * Constants & Regex
 * ==========================================================================*/

// Wide coverage of headings (experience synonyms etc.)
const HEADER_RE = new RegExp(
  [
    "experience","work","work experience","professional experience","employment",
    "education","academics","academic background",
    "projects?","personal projects","course projects",
    "skills?","technical skills","key skills",
    "certifications?","licenses?","certifications & trainings","training",
    "summary","profile","objective",
    "publications?","patents?","awards?","honors?","achievements?",
    "volunteering","volunteer experience","leadership",
    "activities","extracurricular","interests",
    "research","teaching","presentations?"
  ].join("|"),
  "i"
);

// Contacts & presence
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(\+?\d[\d \-\(\)]{7,}\d)/; // tolerant US/PK patterns
const URL_RE   = /(https?:\/\/[^\s)]+)/ig;
const LINKEDIN_RE = /linkedin\.com/i;
const PORTFOLIO_RE = /(behance|dribbble|portfolio|github\.io|notion\.site|about\.me)/i;

// Bullets/structure
const BULLET_RE = /^[\s]*([•\-*]|\u2022|\u25CF|\u25A0|\d+\.)/;

// Impact/achievement
const IMPACT_VERBS = [
  "led","managed","owned","improved","increased","reduced","optimized","generated",
  "designed","created","executed","implemented","launched","delivered","grew","achieved",
  "automated","refactored","migrated","shipped","accelerated","streamlined","scaled","hardened"
];
const NUMBER_RE   = /\b\d+(?:\.\d+)?%?\b/g;
const PERCENT_RE  = /\b\d+(?:\.\d+)?%/g;
const CURRENCY_RE = /(?:\$|Rs\.?|PKR)\s?\d[\d,]*/gi;

// Timeline & education
const MONTH_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/gi;
const YEAR_RE  = /\b(19|20)\d{2}\b/g; // 1900–2099
const GPA_RE   = /\bGPA[:\s]*([0-3]\.\d{1,2}|4\.0+|\d\.\d{1,2})\b/i; // 0.0–4.0 style
const GPA_100_RE = /\bGPA[:\s]*(\d{1,2}(?:\.\d{1,2})?)\s*\/\s*100\b/i; // out of 100
const DEGREE_RE = /\b(BS|BSc|BE|BA|MS|MSc|MEng|ME|MBA|PhD|MPhil|BBA|BCom|MCom|BCE|BEEE|BCE|BCEng)\b/ig;

// Light language hint (very rough)
const URDU_ARABIC_RANGE = /[\u0600-\u06FF]/; // Arabic/Urdu block

/* ============================================================================
 * Utilities
 * ==========================================================================*/

/** Normalize whitespace; keep newlines for sectioning. */
function normalizeText(s: string): string {
  return s.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\u00A0/g, " ");
}

/** Create precise alias regex: handles symbols like C++ and word boundaries for words. */
function aliasToRegex(alias: string): RegExp {
  const a = alias.trim();
  // Escape regex specials except + (we treat + explicitly for C++ cases)
  const escaped = a.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  // If alias contains letters, enforce word boundaries; if it's symbolic (e.g., "C++"), just use escaped
  const hasAlpha = /[A-Za-z]/.test(a);
  if (hasAlpha) {
    // allow micro-architecture / microarchitecture forms by collapsing hyphens optionally
    const flexible = escaped.replace(/micro\\-?architecture/i, "micro[- ]?architecture");
    return new RegExp(`\\b${flexible}\\b`, "i");
  }
  return new RegExp(escaped, "i");
}

/** Deduplicate while preserving order. */
function uniq<T>(arr: T[]): T[] {
  const seen = new Set<string | T>();
  const out: T[] = [];
  for (const x of arr) {
    const key = typeof x === "string" ? x.toLowerCase() : (x as any);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(x);
    }
  }
  return out;
}

/** Normalize phone: strip spaces; keep leading + if present (E.164-ish). */
function normalizePhone(p?: string | null): string | undefined {
  if (!p) return undefined;
  const digits = p.replace(/[^\d+]/g, "");
  // Guard: minimum 8 digits
  return digits.replace(/^\+?0+/, "+").length >= 8 ? digits : undefined;
}

/** Try to normalize GPA into 0..4 scale. */
function normalizeGpa(raw: string): number | undefined {
  const g4 = raw.match(GPA_RE)?.[1];
  if (g4) {
    const val = parseFloat(g4);
    if (val >= 0 && val <= 4.0) return Math.min(4, Math.max(0, val));
  }
  const g100 = raw.match(GPA_100_RE)?.[1];
  if (g100) {
    const v = parseFloat(g100);
    if (v >= 0 && v <= 100) return Math.round((v / 25) * 100) / 100; // rough /25 mapping to 4.0
  }
  return undefined;
}

/** Estimate language hint: en / ur / mixed */
function languageHint(raw: string): "en" | "ur" | "mixed" {
  const hasUrdu = URDU_ARABIC_RANGE.test(raw);
  if (!hasUrdu) return "en";
  const latin = /[A-Za-z]/.test(raw);
  return hasUrdu && latin ? "mixed" : "ur";
}

/* ============================================================================
 * Parser
 * ==========================================================================*/

/**
 * Minimal-but-robust parser:
 * - Splits sections on rich set of headers (Experience > Skills > …)
 * - Extracts contact + links + presence
 * - Measures structure quality (bullets, headers)
 * - Precise alias-matching for skills (word-boundary aware; safe symbol handling)
 * - Detects achievement/impact signals (numbers/%, currency, verbs)
 * - Timeline + education hints (GPA, years)
 * - Outputs explainable features with a version tag
 */
export function basicParse(
  rawInput: string,
  knownSkills: Array<{ slug: string; aliases: string[]; kind?: string; weight?: number }>
): ParsedResume {
  const raw = normalizeText(String(rawInput || ""));
  const lines = raw.split("\n");

  /* ---------------- Contact & presence ---------------- */
  const email = raw.match(EMAIL_RE)?.[0] || undefined;
  const phone = normalizePhone(raw.match(PHONE_RE)?.[0] || undefined);
  const links = uniq([...raw.matchAll(URL_RE)].map((m) => m[0])).slice(0, 30);
  const hasLinkedIn = links.some((l) => LINKEDIN_RE.test(l));
  const hasPortfolio = links.some((l) => PORTFOLIO_RE.test(l));

  /* ---------------- Sections (greedy but simple) ---------------- */
  // We walk line-by-line and open a new section whenever we encounter a header line.
  const sections: Record<string, string> = {};
  let current = "body";
  sections[current] = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && HEADER_RE.test(trimmed)) {
      // normalize to the first token of the header (lowercase)
      const key = trimmed.toLowerCase().replace(/\s+experience$/, " experience")
        .split(/[—:-]/)[0] // cut trailing punctuation
        .trim()
        .split(/\s+/)[0]; // take first word (experience, education, skills, etc.)
      current = key || "body";
      if (!sections[current]) sections[current] = "";
      continue;
    }
    sections[current] += line + "\n";
  }

  /* ---------------- Structure quality ---------------- */
  const bulletLines = lines.filter((l) => BULLET_RE.test(l)).length;
  const bulletsRatio = lines.length ? Math.min(1, bulletLines / lines.length) : 0;

  const stdHeaders = ["experience","education","skills","projects","certifications","summary"];
  const found = stdHeaders.filter((h) => sections[h]).length;
  const hasStandardHeaders = stdHeaders.length ? found / stdHeaders.length : 0;

  /* ---------------- Skill mentions (precise alias matching) ---------------- */
  const skills: ParsedResume["skills"] = [];
  // Precompile alias regexes once per taxonomy row
  const compiled: Array<{
    slug: string; kind?: string; weight?: number;
    patterns: RegExp[];
  }> = knownSkills.map((s) => ({
    slug: s.slug,
    kind: s.kind,
    weight: typeof s.weight === "number" ? s.weight : undefined,
    patterns: uniq([s.slug, ...(s.aliases || [])]).map(aliasToRegex),
  }));

  for (const s of compiled) {
    const hit = s.patterns.find((re) => re.test(raw));
    if (hit) {
      // confidence is conservative; scorer can weight by taxonomy weight/kind
      skills.push({
        slug: s.slug,
        alias: hit.source, // store regex source (debuggable); could also store the *matched* string by capturing exec
        confidence: 0.7,
        kind: s.kind,
        weight: s.weight
      });
    }
  }

  // Anti-stuffing: repeated mentions of the same slug increase penalty
  const slugCounts: Record<string, number> = {};
  for (const k of skills.map((s) => s.slug)) slugCounts[k] = (slugCounts[k] || 0) + 1;
  const stuffing = Object.values(slugCounts).reduce((mx, v) => Math.max(mx, v), 0);
  const keywordStuffingRatio = Math.min(1, Math.max(0, (stuffing - 3) / 10)); // linear ramp after 3

  /* ---------------- Impact signals ---------------- */
  const numbers  = raw.match(NUMBER_RE)?.length  ?? 0;
  const percents = raw.match(PERCENT_RE)?.length ?? 0;
  const currency = raw.match(CURRENCY_RE)?.length ?? 0;
  const verbs    = (raw.toLowerCase().match(new RegExp(`\\b(${IMPACT_VERBS.join("|")})\\b`, "g")) || []).length;

  /* ---------------- Timeline + education ---------------- */
  const years = (raw.match(YEAR_RE) || []).map((y) => parseInt(y, 10)).sort((a,b) => a-b);
  const earliestYear = years.length ? years[0] : undefined;
  const latestYear   = years.length ? years[years.length - 1] : undefined;
  const dateSpans    = ((raw.match(MONTH_RE) || []).length + years.length);

  const gpa = normalizeGpa(raw);
  const degrees = uniq((raw.match(DEGREE_RE) || []).map((d) => d.toUpperCase()));

  /* ---------------- Language + meta ---------------- */
  const langHint = languageHint(raw);
  const wordCount = raw.trim() ? raw.trim().split(/\s+/).length : 0;

  return {
    contact: { email, phone, links },
    hasLinkedIn,
    hasPortfolio,

    sections,
    skills,

    bulletsRatio,
    hasStandardHeaders,
    keywordStuffingRatio,

    impactSignals: { numbers, percents, currency, verbs },

    dateSpans,
    earliestYear,
    latestYear,

    gpa,
    degrees,

    langHint,
    wordCount,
    version: "prs.v2.1.0" // bump when parser logic changes
  };
}

/* ============================================================================
 * ATS formatting score (explainable 0..1)
 * ==========================================================================*/

export function atsFormatScore(p: ParsedResume): number {
  // Contact presence (email or phone)
  const contact = (p.contact.email ? 1 : 0) + (p.contact.phone ? 1 : 0) > 0 ? 1 : 0;

  // Bullet usage in a reasonable band (too few = walls of text; too many = noisy)
  const bullets = p.bulletsRatio >= 0.10 && p.bulletsRatio <= 0.70 ? 1 : 0.5;

  // Standard headers coverage
  const sections = p.hasStandardHeaders; // already 0..1

  // Anti-stuffing penalty
  const stuffingPenalty = 1 - 0.5 * p.keywordStuffingRatio;

  // Slight bonus for any timeline evidence (dates) to discourage totally generic resumes
  const timeline = p.dateSpans > 3 ? 1 : p.dateSpans > 0 ? 0.8 : 0.6;

  // Blend (kept simple + stable)
  const rawScore =
    0.18 * contact +
    0.18 * sections +
    0.18 * bullets +
    0.36 * stuffingPenalty +
    0.10 * timeline;

  return Math.max(0, Math.min(1, rawScore));
}
