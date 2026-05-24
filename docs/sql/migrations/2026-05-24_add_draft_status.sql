-- Migration: add 'draft' status + student self-update policy
-- Date: 2026-05-24
-- Author: Assisi
-- Run in Supabase SQL Editor (Dashboard → SQL → New query).
-- Safe to re-run: every statement is idempotent.

-- ───────────────────────────────────────────────────────────────────────────
-- 1) Allow 'draft' in the status CHECK constraint
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('draft', 'submitted', 'interview', 'offer', 'rejected'));

-- ───────────────────────────────────────────────────────────────────────────
-- 2) Index for "find my draft for this program" lookups
-- ───────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_applications_user_program_status
  ON applications (user_id, program, status);

-- ───────────────────────────────────────────────────────────────────────────
-- 3) RLS: let a student update their own draft (and transition it to
--    'submitted'). Admin update policy stays untouched — both policies
--    coexist; PostgreSQL ORs them at evaluation time.
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "student_update_own_draft" ON applications;

CREATE POLICY "student_update_own_draft"
  ON applications FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'draft'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status IN ('draft', 'submitted')
  );

-- ───────────────────────────────────────────────────────────────────────────
-- 4) Verification queries — run these AFTER the migration. Each should
--    return a row; if any returns nothing, the migration didn't take.
-- ───────────────────────────────────────────────────────────────────────────

-- Expect: applications_status_check with 5 allowed values
SELECT pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
WHERE t.relname = 'applications'
  AND c.conname = 'applications_status_check';

-- Expect: idx_applications_user_program_status
SELECT indexname
FROM pg_indexes
WHERE tablename = 'applications'
  AND indexname = 'idx_applications_user_program_status';

-- Expect: 1 row for student_update_own_draft on applications
SELECT polname, polcmd
FROM pg_policy p
JOIN pg_class t ON t.oid = p.polrelid
WHERE t.relname = 'applications'
  AND polname = 'student_update_own_draft';
