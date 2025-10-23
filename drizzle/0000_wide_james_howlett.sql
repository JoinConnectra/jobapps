CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"actor_user_id" integer,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"action" text NOT NULL,
	"diff_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"summary_md" text,
	"strengths" jsonb,
	"concerns" jsonb,
	"match_score" integer,
	"model_meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "answer_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"answer_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "answer_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"answer_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reaction" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"audio_s3_key" text,
	"duration_sec" integer,
	"text_answer" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"applicant_user_id" integer,
	"applicant_email" text NOT NULL,
	"stage" text DEFAULT 'applied',
	"source" text,
	"applicant_university_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor" integer,
	"action" text NOT NULL,
	"target" text NOT NULL,
	"ip" text,
	"user_agent" text,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"anchor_type" text NOT NULL,
	"anchor_payload" jsonb,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"body_md" text NOT NULL,
	"created_by" integer NOT NULL,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"name" text NOT NULL,
	"mjml_html" text NOT NULL,
	"variables" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employer_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"company_url" text,
	"locations" jsonb,
	"industry" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jd_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"content_md" text NOT NULL,
	"created_by" integer,
	"source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"prompt" text NOT NULL,
	"kind" text DEFAULT 'voice' NOT NULL,
	"max_sec" integer DEFAULT 120,
	"max_chars" integer,
	"required" boolean DEFAULT true,
	"order_index" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_universities" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"university_org_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"title" text NOT NULL,
	"dept" text,
	"location_mode" text,
	"salary_range" text,
	"description_md" text,
	"status" text DEFAULT 'draft',
	"visibility" text DEFAULT 'public',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"org_id" integer NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"domain" text NOT NULL,
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"plan" text,
	"seat_limit" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"s3_key" text NOT NULL,
	"parsed_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"items" jsonb NOT NULL,
	"guidance" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"reviewer_id" integer NOT NULL,
	"item_id" text NOT NULL,
	"value" integer NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"university_id" integer,
	"grad_year" integer,
	"program" text,
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"stripe_customer_id" text,
	"plan" text,
	"seats" integer,
	"renews_at" timestamp,
	"limits_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" serial PRIMARY KEY NOT NULL,
	"answer_id" integer NOT NULL,
	"text" text NOT NULL,
	"words_json" jsonb,
	"lang" text DEFAULT 'en',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"month" text NOT NULL,
	"minutes_transcribed" integer DEFAULT 0,
	"ai_tokens" integer DEFAULT 0,
	"emails_sent" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" varchar(320) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"locale" text DEFAULT 'en',
	"avatar_url" text,
	"account_type" text DEFAULT 'applicant' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"events" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
