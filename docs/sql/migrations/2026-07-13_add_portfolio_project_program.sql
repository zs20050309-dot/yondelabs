-- Migration: add 'portfolio-project' to the applications.program CHECK constraint
-- Date: 2026-07-13
-- Run in Supabase SQL Editor.
-- Safe to re-run: the statements are idempotent.

ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS applications_program_check;

ALTER TABLE applications
  ADD CONSTRAINT applications_program_check
  CHECK (program IN ('ra', 'irp', 'passion-project', 'portfolio-project', 'isef'));

-- Verification: expect one row containing 'portfolio-project'
SELECT pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
WHERE t.relname = 'applications'
  AND c.conname = 'applications_program_check';
