-- Migration to update members_role_check to include THEKEDAAR

-- Drop the existing constraint
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_role_check;

-- Add the new constraint with all valid roles
ALTER TABLE members ADD CONSTRAINT members_role_check 
  CHECK (role IN ('MANAGER', 'BILLING CLERK', 'STAFF', 'THEKEDAAR'));
