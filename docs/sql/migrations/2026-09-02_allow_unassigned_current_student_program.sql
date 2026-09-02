-- Allow a current student to exist before their program is decided.
-- Apply after 2026-08-02_convert_applications_to_current_students.sql.
--
-- Students are now added directly in the admin portal (Current students →
-- "Add student"), sometimes before the program they belong to has been created.
-- Program becomes optional so admins can assign it later, exactly as the course
-- plan is already assigned after the fact.
--
-- The existing current_students_program_check does NOT need changing: in SQL,
-- `null in ('ra', ...)` evaluates to null, and a CHECK constraint only rejects
-- a row when the expression is false. Null therefore passes it unchanged, and
-- any non-null value is still restricted to the five known programs.

alter table public.current_students
  alter column program drop not null;
