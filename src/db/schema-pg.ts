import {
  pgTable, serial, integer, text, boolean, date, numeric, timestamp, jsonb, uuid, varchar, uniqueIndex
} from "drizzle-orm/pg-core";
import { sql } from 'drizzle-orm';

// NOTE: This is a minimal Postgres schema mirroring the current SQLite schema names and columns
// to avoid breaking existing queries. Types are adapted to PG (serial, boolean, timestamp, jsonb).

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  type: text('type').notNull(),
  plan: text('plan'),
  seatLimit: integer('seat_limit'),
  link: text('link'),
  benefits: text('benefits'),
  aboutCompany: text('about_company'),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const orgDomains = pgTable('org_domains', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull(),
  domain: text('domain').notNull(),
  verified: boolean('verified').default(false),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  name: text('name').notNull(),
  phone: text('phone'),
  locale: text('locale').default('en'),
  avatarUrl: text('avatar_url'),
  accountType: text('account_type').default('applicant').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const memberships = pgTable('memberships', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  orgId: integer('org_id').notNull(),
  role: text('role').notNull(),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  membershipUserOrgUnique: uniqueIndex('memberships_user_org_unique').on(table.userId, table.orgId)
}));

export const employerProfiles = pgTable('employer_profiles', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull(),
  companyUrl: text('company_url'),
  locations: jsonb('locations'),
  industry: text('industry'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const studentProfiles = pgTable('student_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  universityId: integer('university_id'),
  gradYear: integer('grad_year'),
  program: text('program'),
  verified: boolean('verified').default(false),

  // Rich profile fields
  headline: text('headline'),
  about: text('about'),
  locationCity: text('location_city'),
  locationCountry: text('location_country'),
  websiteUrl: text('website_url'),
  resumeUrl: text('resume_url'),
  isPublic: boolean('is_public').default(false),
  jobPrefs: jsonb('job_prefs'),
  skills: text('skills').array(),

  // Standard application fields (persisted on profile)
  whatsapp: text('whatsapp'),
  province: text('province'),
  cnic: text('cnic'),
  linkedinUrl: text('linkedin_url'),
  portfolioUrl: text('portfolio_url'),
  githubUrl: text('github_url'),
  workAuth: text('work_auth'),
  needSponsorship: boolean('need_sponsorship'),
  willingRelocate: boolean('willing_relocate'),
  remotePref: text('remote_pref'),
  earliestStart: date('earliest_start'),
  salaryExpectation: text('salary_expectation'),
  expectedSalaryPkr: integer('expected_salary_pkr'),
  noticePeriodDays: integer('notice_period_days'),
  experienceYears: numeric('experience_years', { precision: 5, scale: 2 }),

  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const jobs = pgTable('jobs', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull(),
  title: text('title').notNull(),
  dept: text('dept'),
  locationMode: text('location_mode'),
  salaryRange: text('salary_range'),
  descriptionMd: text('description_md'),
  status: text('status').default('draft'),
  visibility: text('visibility').default('public'),

  /** NEW FIELDS (added; non-breaking) */
  location: text('location'),              // e.g., "Lahore, PK" or office address
  seniority: text('seniority'),            // "junior" | "mid" | "senior"
  skillsCsv: text('skills_csv'),
  skillsRequired: text('skills_required').array().default(sql`'{}'::text[]`),
atsUuid: uuid('ats_uuid'),
  // "React, TypeScript, Node"

  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const jobQuestions = pgTable('job_questions', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').notNull(),
  prompt: text('prompt').notNull(),
  kind: text('kind').default('voice').notNull(),
  maxSec: integer('max_sec').default(120),
  maxChars: integer('max_chars'),
  required: boolean('required').default(true),
  orderIndex: integer('order_index'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const jdVersions = pgTable('jd_versions', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').notNull(),
  contentMd: text('content_md').notNull(),
  createdBy: integer('created_by'),
  source: text('source').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const jobUniversities = pgTable('job_universities', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').notNull(),
  universityOrgId: integer('university_org_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

// Link between employer organizations and university organizations controlling access
export const universityAuthorizations = pgTable('university_authorizations', {
  id: serial('id').primaryKey(),
  companyOrgId: integer('company_org_id').notNull(),
  universityOrgId: integer('university_org_id').notNull(),
  status: text('status').default('pending').notNull(), // pending | approved | rejected
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

// Universities can post events for their students/alumni
export const universityEvents = pgTable('university_events', {
  id: serial('id').primaryKey(),
  universityOrgId: integer('university_org_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  location: text('location'),
  startsAt: timestamp('starts_at', { withTimezone: false }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: false }),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').notNull(),
  applicantUserId: integer('applicant_user_id'),
  applicantEmail: text('applicant_email').notNull(),

  // Contact + links snapshot
  applicantName: text('applicant_name'),
  phone: text('phone'),
  whatsapp: text('whatsapp'),
  location: text('location'),
  city: text('city'),
  province: text('province'),
  cnic: text('cnic'),
  linkedinUrl: text('linkedin_url'),
  portfolioUrl: text('portfolio_url'),
  githubUrl: text('github_url'),

  // Work prefs snapshot
  workAuth: text('work_auth'),
  needSponsorship: boolean('need_sponsorship'),
  willingRelocate: boolean('willing_relocate'),
  remotePref: text('remote_pref'),
  earliestStart: text('earliest_start'),
  salaryExpectation: text('salary_expectation'),
  expectedSalaryPkr: integer('expected_salary_pkr'),
  noticePeriodDays: integer('notice_period_days'),
  experienceYears: text('experience_years'),

  // Education snapshot
  university: text('university'),
  degree: text('degree'),
  graduationYear: integer('graduation_year'),
  gpa: text('gpa'),
  gpaScale: text('gpa_scale'),

  // Resume snapshot (optional)
  resumeS3Key: text('resume_s3_key'),
  resumeFilename: text('resume_filename'),
  resumeMime: text('resume_mime'),
  resumeSize: integer('resume_size'),

  stage: text('stage').default('applied'),
  source: text('source'),
  applicantUniversityId: integer('applicant_university_id'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const resumes = pgTable('resumes', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').notNull(),
  s3Key: text('s3_key').notNull(),
  parsedJson: jsonb('parsed_json'),
  rawText: text('raw_text'), // extracted resume text for ranking
atsFormatScore: numeric('ats_format_score', { precision: 3, scale: 2 }), // 0.00–1.10 supported
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const answers = pgTable('answers', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').notNull(),
  questionId: integer('question_id').notNull(),
  audioS3Key: text('audio_s3_key'),
  durationSec: integer('duration_sec'),
  textAnswer: text('text_answer'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const transcripts = pgTable('transcripts', {
  id: serial('id').primaryKey(),
  answerId: integer('answer_id').notNull(),
  text: text('text').notNull(),
  wordsJson: jsonb('words_json'),
  lang: text('lang').default('en'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const aiAnalyses = pgTable('ai_analyses', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').notNull(),
  summaryMd: text('summary_md'),
  strengths: jsonb('strengths'),
  concerns: jsonb('concerns'),
  matchScore: integer('match_score'),
  modelMeta: jsonb('model_meta'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const rubrics = pgTable('rubrics', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').notNull(),
  items: jsonb('items').notNull(),
  guidance: text('guidance'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const scores = pgTable('scores', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').notNull(),
  reviewerId: integer('reviewer_id').notNull(),
  itemId: text('item_id').notNull(),
  value: integer('value').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const commentThreads = pgTable('comment_threads', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').notNull(),
  anchorType: text('anchor_type').notNull(),
  anchorPayload: jsonb('anchor_payload'),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  threadId: integer('thread_id').notNull(),
  bodyMd: text('body_md').notNull(),
  createdBy: integer('created_by').notNull(),
  resolvedBy: integer('resolved_by'),
  resolvedAt: timestamp('resolved_at', { withTimezone: false }),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const actions = pgTable('actions', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').notNull(),
  type: text('type').notNull(),
  payload: jsonb('payload'),
  createdBy: integer('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const emailTemplates = pgTable('email_templates', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull(),
  name: text('name').notNull(),
  mjmlHtml: text('mjml_html').notNull(),
  variables: jsonb('variables'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const activity = pgTable('activity', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull(),
  actorUserId: integer('actor_user_id'),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  action: text('action').notNull(),
  diffJson: jsonb('diff_json'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const answerReactions = pgTable("answer_reactions", {
  id: serial("id").primaryKey(),
  answerId: integer("answer_id").notNull(),
  applicationId: integer("application_id").notNull(),
  jobId: integer("job_id"),
  userId: integer("user_id").notNull(),
  reaction: text("reaction").notNull(),
  explanation: text("explanation").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});

export const answerComments = pgTable('answer_comments', {
  id: serial('id').primaryKey(),
  answerId: integer('answer_id').notNull(),
  userId: integer('user_id').notNull(),
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  plan: text('plan'),
  seats: integer('seats'),
  renewsAt: timestamp('renews_at', { withTimezone: false }),
  limitsJson: jsonb('limits_json'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const usage = pgTable('usage', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull(),
  month: text('month').notNull(),
  minutesTranscribed: integer('minutes_transcribed').default(0),
  aiTokens: integer('ai_tokens').default(0),
  emailsSent: integer('emails_sent').default(0),
});

export const webhookEndpoints = pgTable('webhook_endpoints', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull(),
  url: text('url').notNull(),
  secret: text('secret').notNull(),
  events: jsonb('events'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actor: integer('actor'),
  action: text('action').notNull(),
  target: text('target').notNull(),
  ip: text('ip'),
  userAgent: text('user_agent'),
  before: jsonb('before'),
  after: jsonb('after'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

// -----------------------------
// NEW: Assessments & Questions
// -----------------------------

export const assessments = pgTable('assessments', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull(),            // owning org
  jobId: integer('job_id'),                      // optional link to a job
  title: varchar('title', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),       // 'MCQ' | 'Coding' | 'Case Study' | etc.
  duration: varchar('duration', { length: 50 }).notNull(), // e.g. '30 min'
  status: varchar('status', { length: 50 }).default('Draft'),
  descriptionMd: text('description_md'),
  isPublished: boolean('is_published').default(false),
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const assessmentQuestions = pgTable('assessment_questions', {
  id: serial('id').primaryKey(),
  assessmentId: integer('assessment_id').notNull(),
  prompt: text('prompt').notNull(),
  kind: text('kind').default('text').notNull(),  // 'text' | 'voice' | 'mcq' | 'coding' | 'case'
  optionsJson: jsonb('options_json'),            // for MCQ: [{id, label}] or similar
  correctAnswer: text('correct_answer'),         // optional (MCQ/coding autograde)
  maxSec: integer('max_sec'),                    // for timed/voice
  maxChars: integer('max_chars'),                // for text answers
  required: boolean('required').default(true),
  orderIndex: integer('order_index'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

// Better-auth tables (kept minimal for compatibility). If using Supabase Auth, you may replace later.
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: false }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: false }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: false }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: false }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow(),
});

export const applicationAssessments = pgTable("application_assessments", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(), // FK → applications.id
  assessmentId: integer("assessment_id").notNull(),   // FK → assessments.id
  status: text("status").default("assigned"),          // assigned | invited | started | submitted | reviewed
  dueAt: timestamp("due_at", { withTimezone: false }),
  invitedAt: timestamp("invited_at", { withTimezone: false }),
  startedAt: timestamp("started_at", { withTimezone: false }),
  submittedAt: timestamp("submitted_at", { withTimezone: false }),
  score: integer("score"),
  resultJson: jsonb("result_json"),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});

export const savedJobs = pgTable('saved_jobs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  jobId: integer('job_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const studentExperiences = pgTable('student_experiences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  title: text('title').notNull(),
  company: text('company'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  isCurrent: boolean('is_current').default(false),
  location: text('location'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const studentEducations = pgTable('student_educations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  school: text('school').notNull(),
  degree: text('degree'),
  field: text('field'),
  startYear: integer('start_year'),
  endYear: integer('end_year'),
  gpa: numeric('gpa', { precision: 3, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const studentLinks = pgTable('student_links', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  label: text('label').notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const organizationInvites = pgTable('organization_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: integer('org_id').references(() => organizations.id).notNull(),
  email: varchar('email', { length: 255 }),
  role: varchar('role', { length: 50 }).default('member').notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: false }).default(sql`CURRENT_TIMESTAMP + interval '7 day'`).notNull(),
  accepted: boolean('accepted').default(false).notNull(),
  invitedBy: integer('invited_by').references(() => users.id),
  acceptedAt: timestamp('accepted_at', { withTimezone: false }),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
}, (table) => ({
  inviteTokenUnique: uniqueIndex('organization_invites_token_unique').on(table.token)
}));

// ---- Events core ----
// ---- Events core ----
// ---- Events core ----
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').notNull(), // FK → organizations.id (enforce via SQL migration if needed)
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  medium: text('medium').$type<'VIRTUAL' | 'IN_PERSON'>().default('IN_PERSON'),

  // Note: in Supabase this is `text[]` NULL DEFAULT '{}'
  categories: text('categories').array().notNull().default(sql`'{}'`),

  // `tags text[] NOT NULL DEFAULT '{}'::text[]`
  tags: text('tags').array().notNull().default(sql`'{}'`),

  // timestamptz in Supabase; we keep withTimezone: false here for backwards-compat
  startAt: timestamp('start_at', { withTimezone: false }).notNull(),
  endAt: timestamp('end_at', { withTimezone: false }),

  featured: boolean('featured').default(false).notNull(),
  isEmployerHosted: boolean('is_employer_hosted').default(true).notNull(),
  status: text('status')
    .$type<'draft' | 'published' | 'past'>()
    .default('draft')
    .notNull(),

  attendeesCount: integer('attendees_count').default(0).notNull(),

  // 🔹 NEW: capacity + registration_url
  capacity: integer('capacity'),                 // matches: integer, nullable
  registrationUrl: text('registration_url'),     // matches: text, nullable

  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

// ---- Event aggregates VIEW (read-only) ----
// This mirrors the Supabase SQL view: event_aggregates

export const eventAggregates = pgTable('event_aggregates', {
  id: integer('id'),
  orgId: integer('org_id'),
  title: text('title'),

  startAt: timestamp('start_at', { withTimezone: false }),
  endAt: timestamp('end_at', { withTimezone: false }),

  attendeesCount: integer('attendees_count'),

  createdAt: timestamp('created_at', { withTimezone: false }),
  updatedAt: timestamp('updated_at', { withTimezone: false }),

  description: text('description'),
  location: text('location'),
  medium: text('medium'),

  tags: text('tags').array(),

  featured: boolean('featured'),
  isEmployerHosted: boolean('is_employer_hosted'),
  status: text('status'),

  // Aggregated metrics
  regCount: integer('reg_count'),
  checkinsCount: integer('checkins_count'),

  // New fields we added
  capacity: integer('capacity'),
  registrationUrl: text('registration_url'),
});

export const universityPartnerMeta = pgTable(
  "university_partner_meta",
  {
    id: serial("id").primaryKey(),

    authorizationId: integer("authorization_id").notNull(),
    universityOrgId: integer("university_org_id").notNull(),
    companyOrgId: integer("company_org_id").notNull(),

    // Priority of this partner for this university (app-enforced enum: 'high' | 'normal' | 'low')
    priority: text("priority").notNull().default("normal"),

    // Primary recruiter contact details (owned by the university / career center)
    primaryContactName: text("primary_contact_name"),
    primaryContactEmail: text("primary_contact_email"),
    primaryContactRole: text("primary_contact_role"),
    primaryContactPhone: text("primary_contact_phone"),

    // Last meaningful touch point
    lastMeetingDate: date("last_meeting_date"),

    // Internal notes (MVP for "log interactions")
    internalNotes: text("internal_notes"),

    createdAt: timestamp("created_at", { withTimezone: false })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    authorizationUnique: uniqueIndex(
      "university_partner_meta_authorization_unique",
    ).on(table.authorizationId),
  }),
);



export const eventRegistrations = pgTable('event_registrations', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull(),
  userEmail: text('user_email').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const eventSaves = pgTable('event_saves', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull(),
  userEmail: text('user_email').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const eventCheckins = pgTable('event_checkins', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull(),
  userEmail: text('user_email').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
});

export const skillsTaxonomyAts = pgTable('skills_taxonomy_ats', {
  slug: text('slug').primaryKey(),                                  // e.g., "react", "python"
  aliases: text('aliases').array().notNull().default(sql`'{}'::text[]`),
  kind: text('kind'),                                               // 'skill' | 'tool' | 'platform' | 'cert' | 'soft'
  weight: numeric('weight', { precision: 5, scale: 2 }),            // optional; defaults to 1.0 in code
  localeAliases: text('locale_aliases').array().default(sql`'{}'::text[]`),

  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});


export const resumeSkillsAts = pgTable('resume_skills_ats', {
  id: serial('id').primaryKey(),
  resumeId: integer('resume_id').notNull().references(() => resumes.id),
  skillSlug: text('skill_slug').notNull().references(() => skillsTaxonomyAts.slug),
  confidence: numeric('confidence', { precision: 3, scale: 2 }), // 0.00–1.00
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
}, (t) => ({
  resumeSkillUnique: uniqueIndex('resume_skills_ats_resume_skill_unique').on(t.resumeId, t.skillSlug),
}));


export const assessmentAttempts = pgTable('assessment_attempts', {
  id: serial('id').primaryKey(),
  assessmentId: integer('assessment_id').notNull(),
  candidateId: uuid('candidate_id').notNull(),
  startedAt: timestamp('started_at', { withTimezone: false }).defaultNow().notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: false }),
  score: numeric('score', { precision: 5, scale: 2 }),
  totalPossible: numeric('total_possible', { precision: 5, scale: 2 }),
  passed: boolean('passed'),
  status: text('status').default('in_progress').notNull(),
  autoScoreTotal: numeric('auto_score_total', { precision: 10, scale: 2 }),
});


export const assessmentAnswers = pgTable('assessment_answers', {
  id: serial('id').primaryKey(),
  attemptId: integer('attempt_id').notNull(),
  questionId: integer('question_id').notNull(),
  responseJson: jsonb('response_json'),
  autoScore: numeric('auto_score', { precision: 5, scale: 2 }),
  manualScore: numeric('manual_score', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
});


export const codingTestCases = pgTable('coding_test_cases', {
  id: serial('id').primaryKey(),
  questionId: integer('question_id').notNull(),
  inputJson: jsonb('input_json').notNull(),
  expectedOutputJson: jsonb('expected_output_json').notNull(),
  isHidden: boolean('is_hidden').default(false),
});

// -----------------------------
// Inbox (threads + messages)
// -----------------------------
export const inboxThreads = pgTable('inbox_threads', {
  id: serial('id').primaryKey(),

  // Who owns this inbox view (company / university)
  orgId: integer('org_id').notNull(), // FK → organizations.id (enforced via migration / app)

  // Which portal this row is primarily for. Reuse later for university/student
  portal: text('portal')
    .$type<'employer' | 'university' | 'student'>()
    .default('employer')
    .notNull(),

  // High-level subject / title of the thread
  subject: text('subject').notNull(),

  // Counterparty info from the org's perspective (candidate, uni, etc.)
  counterpartyUserId: integer('counterparty_user_id'),
  counterpartyName: text('counterparty_name'),
  counterpartyEmail: text('counterparty_email'),
  counterpartyType: text('counterparty_type'), // 'candidate' | 'university' | 'employer' | 'system'

  // Flags & labels (map nicely to your UI)
  archived: boolean('archived').default(false).notNull(),
  starred: boolean('starred').default(false).notNull(),
  labels: text('labels')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),

  // Denormalized counts / last message info for fast list rendering
  unreadCount: integer('unread_count').default(0).notNull(),
  lastMessageAt: timestamp('last_message_at', { withTimezone: false }),
  lastMessageSnippet: text('last_message_snippet'),

  // Optional anchors into ATS / events
  jobId: integer('job_id'),
  applicationId: integer('application_id'),
  eventId: integer('event_id'),

  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});

export const inboxMessages = pgTable('inbox_messages', {
  id: serial('id').primaryKey(),

  threadId: integer('thread_id').notNull(),    // FK → inbox_threads.id
  orgId: integer('org_id').notNull(),          // redundant but useful for filtering

  // Who sent it
  fromUserId: integer('from_user_id'),
  fromName: text('from_name'),
  fromEmail: text('from_email'),
  fromRole: text('from_role'),                 // 'employer' | 'candidate' | 'university' | 'system'

  body: text('body').notNull(),

  // Direction + note flag
  direction: text('direction')
    .$type<'incoming' | 'outgoing' | 'internal'>()
    .default('internal')
    .notNull(),
  isInternalNote: boolean('is_internal_note').default(false).notNull(),

  // Per-message read timestamp (for future per-user read receipts if you want)
  readAt: timestamp('read_at', { withTimezone: false }),

  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
});


// -----------------------------
// Interviews (slots + bookings)
// -----------------------------
export const interviewSlots = pgTable('interview_slots', {
  id: serial('id').primaryKey(),

  // Org that owns this slot (company or university, but MVP is company org)
  orgId: integer('org_id').notNull(),

  // Optional link to a specific job
  jobId: integer('job_id'),

  // Who created the slot (user id from your users table)
  createdByUserId: integer('created_by_user_id').notNull(),

  // Time range for this slot
  startAt: timestamp('start_at', { withTimezone: false }).notNull(),
  endAt: timestamp('end_at', { withTimezone: false }).notNull(),

  // Where / how the interview happens
  locationType: text('location_type') // 'online' | 'in_person'
    .default('online')
    .notNull(),
  locationDetail: text('location_detail'), // Zoom/Meet link or office address

  // How many people can book this same slot (MVP = 1)
  maxCandidates: integer('max_candidates').default(1).notNull(),

  // Slot lifecycle
  status: text('status')
    // 'open' | 'partially_booked' | 'booked' | 'cancelled'
    .default('open')
    .notNull(),

  notes: text('notes'),

  createdAt: timestamp('created_at', { withTimezone: false })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false })
    .defaultNow()
    .notNull(),
});

export const interviewBookings = pgTable(
  'interview_bookings',
  {
    id: serial('id').primaryKey(),

    slotId: integer('slot_id').notNull(), // FK → interview_slots.id

    // Tie this back to your ATS data
    applicationId: integer('application_id').notNull(), // FK → applications.id

    // Candidate identity (either via user record or just email snapshot)
    applicantUserId: integer('applicant_user_id'),
    applicantEmail: text('applicant_email'),

    status: text('status')
      // 'confirmed' | 'cancelled' | 'no_show' | 'completed'
      .default('confirmed')
      .notNull(),

    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: false })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // prevent duplicate bookings for same slot + application
    slotApplicationUnique: uniqueIndex(
      'interview_bookings_slot_application_unique',
    ).on(table.slotId, table.applicationId),
  }),
);
