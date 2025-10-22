CREATE TABLE `ai_analysis` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`summary` text NOT NULL,
	`strengths` text,
	`concerns` text,
	`match_score` integer,
	`model_version` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `job_universities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`university_org_id` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`university_org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `question_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`answer_id` integer NOT NULL,
	`reviewer_user_id` integer NOT NULL,
	`feedback_type` text NOT NULL,
	`comment` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`answer_id`) REFERENCES `answers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `answers` ADD `text_answer` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `applicant_university_id` integer REFERENCES organizations(id);--> statement-breakpoint
ALTER TABLE `job_questions` ADD `kind` text DEFAULT 'voice' NOT NULL;--> statement-breakpoint
ALTER TABLE `job_questions` ADD `max_chars` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `visibility` text DEFAULT 'public';--> statement-breakpoint
ALTER TABLE `users` ADD `account_type` text DEFAULT 'applicant' NOT NULL;