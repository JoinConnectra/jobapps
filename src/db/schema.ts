import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

// Core organization management
export const organizations = sqliteTable('organizations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  type: text('type').notNull(), // 'company' or 'university'
  plan: text('plan'),
  seatLimit: integer('seat_limit'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const orgDomains = sqliteTable('org_domains', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  domain: text('domain').notNull(),
  verified: integer('verified', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  phone: text('phone'),
  locale: text('locale').default('en'),
  avatarUrl: text('avatar_url'),
  // 'applicant' | 'employer' | 'university_admin'
  accountType: text('account_type').default('applicant').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const memberships = sqliteTable('memberships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  role: text('role').notNull(), // 'admin','manager','recruiter','reviewer','read_only'
  createdAt: text('created_at').notNull(),
});

export const employerProfiles = sqliteTable('employer_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  companyUrl: text('company_url'),
  locations: text('locations', { mode: 'json' }),
  industry: text('industry'),
  createdAt: text('created_at').notNull(),
});

export const studentProfiles = sqliteTable('student_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  universityId: integer('university_id').references(() => organizations.id),
  gradYear: integer('grad_year'),
  program: text('program'),
  verified: integer('verified', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
});

export const jobs = sqliteTable('jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  title: text('title').notNull(),
  dept: text('dept'),
  locationMode: text('location_mode'),
  salaryRange: text('salary_range'),
  descriptionMd: text('description_md'),
  status: text('status').default('draft'),
  // 'public' | 'institutions' | 'both'
  visibility: text('visibility').default('public'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const jobQuestions = sqliteTable('job_questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobs.id),
  prompt: text('prompt').notNull(),
  // 'voice' | 'text'
  kind: text('kind').default('voice').notNull(),
  maxSec: integer('max_sec').default(120),
  maxChars: integer('max_chars'),
  required: integer('required', { mode: 'boolean' }).default(true),
  orderIndex: integer('order_index'),
  createdAt: text('created_at').notNull(),
});

export const jdVersions = sqliteTable('jd_versions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobs.id),
  contentMd: text('content_md').notNull(),
  createdBy: integer('created_by').references(() => users.id),
  source: text('source').notNull(), // 'ai' or 'manual'
  createdAt: text('created_at').notNull(),
});

// Mapping: jobs visible to selected universities
export const jobUniversities = sqliteTable('job_universities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobs.id),
  universityOrgId: integer('university_org_id').notNull().references(() => organizations.id),
  createdAt: text('created_at').notNull(),
});

export const applications = sqliteTable('applications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobs.id),
  applicantUserId: integer('applicant_user_id').references(() => users.id),
  applicantEmail: text('applicant_email').notNull(),
  stage: text('stage').default('applied'),
  source: text('source'),
  applicantUniversityId: integer('applicant_university_id').references(() => organizations.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const resumes = sqliteTable('resumes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  applicationId: integer('application_id').notNull().references(() => applications.id),
  s3Key: text('s3_key').notNull(),
  parsedJson: text('parsed_json', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
});

export const answers = sqliteTable('answers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  applicationId: integer('application_id').notNull().references(() => applications.id),
  questionId: integer('question_id').notNull().references(() => jobQuestions.id),
  audioS3Key: text('audio_s3_key'),
  durationSec: integer('duration_sec'),
  textAnswer: text('text_answer'),
  createdAt: text('created_at').notNull(),
});

export const transcripts = sqliteTable('transcripts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  answerId: integer('answer_id').notNull().references(() => answers.id),
  text: text('text').notNull(),
  wordsJson: text('words_json', { mode: 'json' }),
  lang: text('lang').default('en'),
  createdAt: text('created_at').notNull(),
});

export const aiAnalyses = sqliteTable('ai_analyses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  applicationId: integer('application_id').notNull().references(() => applications.id),
  summaryMd: text('summary_md'),
  strengths: text('strengths', { mode: 'json' }),
  concerns: text('concerns', { mode: 'json' }),
  matchScore: integer('match_score'),
  modelMeta: text('model_meta', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
});

export const rubrics = sqliteTable('rubrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobs.id),
  items: text('items', { mode: 'json' }).notNull(),
  guidance: text('guidance'),
  createdAt: text('created_at').notNull(),
});

export const scores = sqliteTable('scores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  applicationId: integer('application_id').notNull().references(() => applications.id),
  reviewerId: integer('reviewer_id').notNull().references(() => users.id),
  itemId: text('item_id').notNull(),
  value: integer('value').notNull(),
  note: text('note'),
  createdAt: text('created_at').notNull(),
});

export const commentThreads = sqliteTable('comment_threads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  applicationId: integer('application_id').notNull().references(() => applications.id),
  anchorType: text('anchor_type').notNull(), // 'transcript','summary','resume'
  anchorPayload: text('anchor_payload', { mode: 'json' }),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
});

export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  threadId: integer('thread_id').notNull().references(() => commentThreads.id),
  bodyMd: text('body_md').notNull(),
  createdBy: integer('created_by').notNull().references(() => users.id),
  resolvedBy: integer('resolved_by').references(() => users.id),
  resolvedAt: text('resolved_at'),
  createdAt: text('created_at').notNull(),
});

export const actions = sqliteTable('actions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  applicationId: integer('application_id').notNull().references(() => applications.id),
  type: text('type').notNull(), // 'reject','move_to_phone','email_sent','exported'
  payload: text('payload', { mode: 'json' }),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
});

export const emailTemplates = sqliteTable('email_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  mjmlHtml: text('mjml_html').notNull(),
  variables: text('variables', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
});

export const activity = sqliteTable('activity', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  actorUserId: integer('actor_user_id').references(() => users.id),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  action: text('action').notNull(),
  diffJson: text('diff_json', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
});

export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  stripeCustomerId: text('stripe_customer_id'),
  plan: text('plan'),
  seats: integer('seats'),
  renewsAt: text('renews_at'),
  limitsJson: text('limits_json', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
});

export const usage = sqliteTable('usage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  month: text('month').notNull(),
  minutesTranscribed: integer('minutes_transcribed').default(0),
  aiTokens: integer('ai_tokens').default(0),
  emailsSent: integer('emails_sent').default(0),
});

export const webhookEndpoints = sqliteTable('webhook_endpoints', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orgId: integer('org_id').notNull().references(() => organizations.id),
  url: text('url').notNull(),
  secret: text('secret').notNull(),
  events: text('events', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actor: integer('actor').references(() => users.id),
  action: text('action').notNull(),
  target: text('target').notNull(),
  ip: text('ip'),
  userAgent: text('user_agent'),
  before: text('before', { mode: 'json' }),
  after: text('after', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
});


// Auth tables for better-auth
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});