-- Add last_seen timestamp to demo_profiles
-- Run in Supabase SQL Editor

ALTER TABLE demo_profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
