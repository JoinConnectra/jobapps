-- Migration: bootstrap account types, job visibility, text questions

-- users.account_type
ALTER TABLE users ADD COLUMN account_type TEXT DEFAULT applicant NOT NULL;

-- jobs.visibility
ALTER TABLE jobs ADD COLUMN visibility TEXT DEFAULT public;

-- job_questions.kind and max_chars
ALTER TABLE job_questions ADD COLUMN kind TEXT DEFAULT voice NOT NULL;
ALTER TABLE job_questions ADD COLUMN max_chars INTEGER;

-- applications.applicant_university_id
ALTER TABLE applications ADD COLUMN applicant_university_id INTEGER REFERENCES organizations(id);

-- answers.text_answer
ALTER TABLE answers ADD COLUMN text_answer TEXT;

-- job_universities mapping table
CREATE TABLE IF NOT EXISTS job_universities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  university_org_id INTEGER NOT NULL REFERENCES organizations(id),
  created_at TEXT NOT NULL
);
