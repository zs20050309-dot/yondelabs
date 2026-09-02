-- Student Portal V1 upgrade: Program Overview, Learning Map, Project Journey,
-- Team detail, and Session Notes.
-- Apply after 2026-08-01_add_current_students.sql.
--
-- Design notes:
--  * Program-level content lives on course_plans and is authored once per
--    program; per-student state stays on current_students / progress tables.
--    This mirrors the existing course_milestones -> student_milestone_progress
--    split rather than inventing a second pattern.
--  * Phase status is NOT stored. It is derived in the UI from milestone
--    progress, so it cannot drift from the milestones it summarises.
--  * estimated_duration is text ("~4-6 weeks") on purpose: the product spec
--    deliberately avoids fixed calendar commitments.
--  * session_notes is its own table rather than a reuse of class_sessions.notes,
--    because class_sessions rows feed mentor_payment_records and student-facing
--    Zoom notes must not be coupled to the payment ledger.

-- 1. Program Overview -------------------------------------------------------

alter table public.course_plans
  add column if not exists learning_objective text,
  add column if not exists capstone_goal text,
  add column if not exists cadence text,
  add column if not exists starts_on date,
  add column if not exists expected_end_on date;

alter table public.current_students
  add column if not exists project_area text,
  add column if not exists project_goal text;

-- 2. Your Team --------------------------------------------------------------

alter table public.mentors
  add column if not exists responsibility text,
  add column if not exists timezone text;

-- 3. Your Learning Map ------------------------------------------------------

create table if not exists public.learning_map_categories (
  id uuid primary key default gen_random_uuid(),
  course_plan_id uuid not null references public.course_plans(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_learning_map_categories_plan
  on public.learning_map_categories (course_plan_id, display_order);

-- Intentionally only two levels deep: category -> topic. The product spec caps
-- the hierarchy here, so topics have no self-reference and no description.
create table if not exists public.learning_map_topics (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.learning_map_categories(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_learning_map_topics_category
  on public.learning_map_topics (category_id, display_order);

-- 4. Project Journey --------------------------------------------------------

create table if not exists public.project_phases (
  id uuid primary key default gen_random_uuid(),
  course_plan_id uuid not null references public.course_plans(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  estimated_duration text,
  indicative_focus text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_phases_plan
  on public.project_phases (course_plan_id, display_order);

-- Existing milestones gain a phase. Nullable so milestones created before this
-- migration keep working and simply render outside any phase.
alter table public.course_milestones
  add column if not exists phase_id uuid
    references public.project_phases(id) on delete set null;

create index if not exists idx_course_milestones_phase
  on public.course_milestones (phase_id);

-- 5. Session Notes ----------------------------------------------------------

create table if not exists public.session_notes (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null
    references public.student_course_enrollments(id) on delete cascade,
  session_date date not null,
  title text not null check (char_length(trim(title)) > 0),
  mentor_id uuid references public.mentors(id) on delete set null,
  mentor_name text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_session_notes_enrollment
  on public.session_notes (enrollment_id, session_date desc);

-- 6. RLS --------------------------------------------------------------------

alter table public.learning_map_categories enable row level security;
alter table public.learning_map_topics enable row level security;
alter table public.project_phases enable row level security;
alter table public.session_notes enable row level security;

drop policy if exists "admins_manage_learning_map_categories" on public.learning_map_categories;
create policy "admins_manage_learning_map_categories"
  on public.learning_map_categories for all
  using (public.is_yonde_admin()) with check (public.is_yonde_admin());

drop policy if exists "admins_manage_learning_map_topics" on public.learning_map_topics;
create policy "admins_manage_learning_map_topics"
  on public.learning_map_topics for all
  using (public.is_yonde_admin()) with check (public.is_yonde_admin());

drop policy if exists "admins_manage_project_phases" on public.project_phases;
create policy "admins_manage_project_phases"
  on public.project_phases for all
  using (public.is_yonde_admin()) with check (public.is_yonde_admin());

drop policy if exists "admins_manage_session_notes" on public.session_notes;
create policy "admins_manage_session_notes"
  on public.session_notes for all
  using (public.is_yonde_admin()) with check (public.is_yonde_admin());

-- Student reads, scoped through the student's own enrollment. Mirrors the
-- shape of students_read_assigned_milestones from 2026-08-01.

drop policy if exists "students_read_assigned_learning_map" on public.learning_map_categories;
create policy "students_read_assigned_learning_map"
  on public.learning_map_categories for select
  using (
    exists (
      select 1
        from public.student_course_enrollments e
        join public.student_portal_accounts a
          on a.current_student_id = e.current_student_id
          or a.application_id = e.application_id
       where e.course_plan_id = learning_map_categories.course_plan_id
         and a.portal_user_id = auth.uid()
    )
  );

drop policy if exists "students_read_assigned_learning_topics" on public.learning_map_topics;
create policy "students_read_assigned_learning_topics"
  on public.learning_map_topics for select
  using (
    exists (
      select 1
        from public.learning_map_categories c
        join public.student_course_enrollments e
          on e.course_plan_id = c.course_plan_id
        join public.student_portal_accounts a
          on a.current_student_id = e.current_student_id
          or a.application_id = e.application_id
       where c.id = learning_map_topics.category_id
         and a.portal_user_id = auth.uid()
    )
  );

drop policy if exists "students_read_assigned_phases" on public.project_phases;
create policy "students_read_assigned_phases"
  on public.project_phases for select
  using (
    exists (
      select 1
        from public.student_course_enrollments e
        join public.student_portal_accounts a
          on a.current_student_id = e.current_student_id
          or a.application_id = e.application_id
       where e.course_plan_id = project_phases.course_plan_id
         and a.portal_user_id = auth.uid()
    )
  );

drop policy if exists "students_read_own_session_notes" on public.session_notes;
create policy "students_read_own_session_notes"
  on public.session_notes for select
  using (
    exists (
      select 1
        from public.student_course_enrollments e
        join public.student_portal_accounts a
          on a.current_student_id = e.current_student_id
          or a.application_id = e.application_id
       where e.id = session_notes.enrollment_id
         and a.portal_user_id = auth.uid()
    )
  );
