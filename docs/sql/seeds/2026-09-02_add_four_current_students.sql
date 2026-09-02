-- Adds four current students requested on 2026-09-02.
--
-- Data, not schema. Run AFTER
-- docs/sql/migrations/2026-09-02_allow_unassigned_current_student_program.sql,
-- which is what permits program to be left null here.
--
-- Program and course plan are both intentionally unset: admins assign them once
-- the programs these students belong to have been created.
--
-- This file exists only because the four could not be entered directly. The
-- same result is achievable in the admin portal under Current students →
-- "Add student", which is the intended path for anyone added from here on.

insert into public.current_students (full_name, contact_email, program, status, source)
values
  ('Clementine Li', null,                    null, 'active', 'manual'),
  ('Emily Wei',     null,                    null, 'active', 'manual'),
  ('Cici Fu',       null,                    null, 'active', 'manual'),
  ('Alex HanWeici', 'annalisazwc@gmail.com', null, 'active', 'manual')
on conflict do nothing;

-- Verify:
-- select full_name, contact_email, program, status, source, created_at
--   from public.current_students
--  where source = 'manual'
--  order by created_at desc;
