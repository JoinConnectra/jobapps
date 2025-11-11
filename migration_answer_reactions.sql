-- Migration: Add applicationId, jobId, explanation, and updatedAt to answer_reactions table
-- Safe to run multiple times (uses IF NOT EXISTS checks)

-- Step 1: Add application_id column as nullable (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'answer_reactions' 
        AND column_name = 'application_id'
    ) THEN
        ALTER TABLE answer_reactions 
        ADD COLUMN application_id INTEGER;
    END IF;
END $$;

-- Step 2: Backfill application_id from answers table
UPDATE answer_reactions ar
SET application_id = (
    SELECT a.application_id 
    FROM answers a 
    WHERE a.id = ar.answer_id
)
WHERE application_id IS NULL;

-- Step 3: Make application_id NOT NULL (after backfill)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'answer_reactions' 
        AND column_name = 'application_id'
        AND is_nullable = 'YES'
    ) THEN
        -- Check if all rows have application_id before making it NOT NULL
        IF NOT EXISTS (
            SELECT 1 FROM answer_reactions WHERE application_id IS NULL
        ) THEN
            ALTER TABLE answer_reactions 
            ALTER COLUMN application_id SET NOT NULL;
        ELSE
            RAISE NOTICE 'Warning: Some rows still have NULL application_id. Cannot set NOT NULL constraint.';
        END IF;
    END IF;
END $$;

-- Step 4: Add job_id column (nullable) if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'answer_reactions' 
        AND column_name = 'job_id'
    ) THEN
        ALTER TABLE answer_reactions 
        ADD COLUMN job_id INTEGER;
    END IF;
END $$;

-- Step 5: Backfill job_id from applications table (optional, can be done later)
UPDATE answer_reactions ar
SET job_id = (
    SELECT a.job_id 
    FROM applications a 
    WHERE a.id = ar.application_id
)
WHERE job_id IS NULL 
AND application_id IS NOT NULL;

-- Step 6: Add explanation column with default if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'answer_reactions' 
        AND column_name = 'explanation'
    ) THEN
        ALTER TABLE answer_reactions 
        ADD COLUMN explanation TEXT NOT NULL DEFAULT '';
    END IF;
END $$;

-- Step 7: Add updated_at column with default if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'answer_reactions' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE answer_reactions 
        ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();
        
        -- Set updated_at to created_at for existing rows
        UPDATE answer_reactions 
        SET updated_at = created_at 
        WHERE updated_at IS NULL;
    END IF;
END $$;

-- Step 8: Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'answer_reactions' 
AND column_name IN ('application_id', 'job_id', 'explanation', 'updated_at')
ORDER BY column_name;

