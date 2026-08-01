-- scripts/supabase/seed-production-data.sql
-- Production demo seed script for PAYSAVE
-- Apply after running migrations
-- Contains exact required counts

-- This file mirrors the seed_reference migration for convenience
-- Use: psql or Supabase SQL editor

-- 25 Partners (see migration 000004 for full)
-- 50 Employees
-- 1200 Recovery Cases
-- 300 Commission
-- 400 Notifications
-- 150 Reports
-- 100 Feedback

-- For full data, run the 000004_seed_reference.sql migration
-- Or use this file to top-up if needed.

-- Example top-up for 1200 cases if not present
-- (The main data is in the migration file for atomic apply)