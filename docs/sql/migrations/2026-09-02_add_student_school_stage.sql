-- School and stage for current students.
-- Apply after 2026-09-02_add_student_journey.sql.
--
-- The V1 spec's Initial Student Data carries a School ("The Webb Schools",
-- "Appleby College") and a Stage ("Rising Sophomore") that had no column. Both
-- are common student-level fields, not specific to any one cohort, and both are
-- optional: students without them simply omit those rows in Program Overview.

alter table public.current_students
  add column if not exists school text,
  add column if not exists stage text;
