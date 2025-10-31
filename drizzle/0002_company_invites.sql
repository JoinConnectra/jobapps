CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
ALTER TABLE "memberships"
  ADD COLUMN "status" text DEFAULT 'active' NOT NULL,
  ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "memberships_user_org_unique"
  ON "memberships" ("user_id", "org_id");
--> statement-breakpoint
CREATE TABLE "organization_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" integer NOT NULL,
  "email" varchar(255),
  "role" varchar(50) DEFAULT 'member' NOT NULL,
  "token" varchar(255) NOT NULL,
  "expires_at" timestamp DEFAULT (now() + interval '7 day') NOT NULL,
  "accepted" boolean DEFAULT false NOT NULL,
  "invited_by" integer,
  "accepted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "organization_invites_token_unique" UNIQUE ("token"),
  CONSTRAINT "organization_invites_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE,
  CONSTRAINT "organization_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users" ("id") ON DELETE SET NULL
);

