-- Migration: Add signup_source column to users table for tracking
-- Created: 2024-01-15

-- Add signup_source column to track where users came from
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_source VARCHAR(50) DEFAULT 'organic';

-- Add index for efficient filtering by source
CREATE INDEX IF NOT EXISTS idx_users_signup_source ON users(signup_source);

-- Add comments
COMMENT ON COLUMN users.signup_source IS 'Source of signup: landing_page, organic, referral, etc.';
