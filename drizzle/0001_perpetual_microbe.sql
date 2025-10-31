CREATE TABLE "application_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"assessment_id" integer NOT NULL,
	"status" text DEFAULT 'assigned',
	"due_at" timestamp,
	"invited_at" timestamp,
	"started_at" timestamp,
	"submitted_at" timestamp,
	"score" integer,
	"result_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessment_id" integer NOT NULL,
	"prompt" text NOT NULL,
	"kind" text DEFAULT 'text' NOT NULL,
	"options_json" jsonb,
	"correct_answer" text,
	"max_sec" integer,
	"max_chars" integer,
	"required" boolean DEFAULT true,
	"order_index" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"job_id" integer,
	"title" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"duration" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'Draft',
	"description_md" text,
	"is_published" boolean DEFAULT false,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"job_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_educations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"school" text NOT NULL,
	"degree" text,
	"field" text,
	"start_year" integer,
	"end_year" integer,
	"gpa" numeric(3, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_experiences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"company" text,
	"start_date" date,
	"end_date" date,
	"is_current" boolean DEFAULT false,
	"location" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "university_authorizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_org_id" integer NOT NULL,
	"university_org_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "university_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"university_org_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"location" text,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "applicant_name" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "whatsapp" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "province" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "cnic" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "portfolio_url" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "github_url" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "work_auth" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "need_sponsorship" boolean;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "willing_relocate" boolean;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "remote_pref" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "earliest_start" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "salary_expectation" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "expected_salary_pkr" integer;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "notice_period_days" integer;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "experience_years" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "university" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "degree" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "graduation_year" integer;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "gpa" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "gpa_scale" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "resume_s3_key" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "resume_filename" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "resume_mime" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "resume_size" integer;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "headline" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "about" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "location_city" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "location_country" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "website_url" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "resume_url" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "is_public" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "job_prefs" jsonb;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "skills" text[];--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "whatsapp" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "province" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "cnic" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "portfolio_url" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "github_url" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "work_auth" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "need_sponsorship" boolean;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "willing_relocate" boolean;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "remote_pref" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "earliest_start" date;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "salary_expectation" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "expected_salary_pkr" integer;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "notice_period_days" integer;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "experience_years" numeric(5, 2);