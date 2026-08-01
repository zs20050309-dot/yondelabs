-- Current-student records for students who did not enter through applications.
-- Apply after 2026-07-31_add_separate_student_portal_accounts.sql.

create table if not exists public.current_students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) > 0),
  contact_email text,
  program text not null check (
    program in ('isef', 'irp', 'passion-project', 'portfolio-project')
  ),
  status text not null default 'active'
    check (status in ('active', 'completed', 'paused', 'archived')),
  source text not null default 'manual',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_current_students_email
  on public.current_students (lower(contact_email))
  where contact_email is not null and trim(contact_email) <> '';

create table if not exists public.mentors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_mentors_name
  on public.mentors (lower(name));

create table if not exists public.student_mentor_assignments (
  id uuid primary key default gen_random_uuid(),
  current_student_id uuid not null
    references public.current_students(id) on delete cascade,
  mentor_id uuid not null references public.mentors(id) on delete restrict,
  role text not null check (char_length(trim(role)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (current_student_id, mentor_id, role)
);

alter table public.student_course_enrollments
  add column if not exists current_student_id uuid
    references public.current_students(id) on delete cascade;

alter table public.student_course_enrollments
  alter column application_id drop not null;

alter table public.student_course_enrollments
  drop constraint if exists student_course_enrollments_owner_check;
alter table public.student_course_enrollments
  add constraint student_course_enrollments_owner_check check (
    (application_id is not null and current_student_id is null)
    or (application_id is null and current_student_id is not null)
  );

create unique index if not exists idx_one_active_course_per_current_student
  on public.student_course_enrollments (current_student_id)
  where status = 'active' and current_student_id is not null;

create index if not exists idx_enrollments_current_student
  on public.student_course_enrollments (current_student_id, status);

create table if not exists public.student_hour_allocations (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null
    references public.student_course_enrollments(id) on delete cascade,
  label text not null check (char_length(trim(label)) > 0),
  allocated_minutes integer not null check (allocated_minutes > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_student_hour_allocations_enrollment
  on public.student_hour_allocations (enrollment_id, sort_order, created_at);

alter table public.student_portal_accounts
  add column if not exists current_student_id uuid
    references public.current_students(id) on delete cascade;

alter table public.student_portal_accounts
  alter column application_id drop not null;

alter table public.student_portal_accounts
  drop constraint if exists student_portal_accounts_owner_check;
alter table public.student_portal_accounts
  add constraint student_portal_accounts_owner_check check (
    (application_id is not null and current_student_id is null)
    or (application_id is null and current_student_id is not null)
  );

create unique index if not exists idx_student_portal_accounts_current_student
  on public.student_portal_accounts (current_student_id)
  where current_student_id is not null;

alter table public.current_students enable row level security;
alter table public.mentors enable row level security;
alter table public.student_mentor_assignments enable row level security;
alter table public.student_hour_allocations enable row level security;

drop policy if exists "admins_manage_current_students" on public.current_students;
create policy "admins_manage_current_students"
  on public.current_students for all
  using (public.is_yonde_admin())
  with check (public.is_yonde_admin());

drop policy if exists "admins_manage_mentors" on public.mentors;
create policy "admins_manage_mentors"
  on public.mentors for all
  using (public.is_yonde_admin())
  with check (public.is_yonde_admin());

drop policy if exists "admins_manage_student_mentors" on public.student_mentor_assignments;
create policy "admins_manage_student_mentors"
  on public.student_mentor_assignments for all
  using (public.is_yonde_admin())
  with check (public.is_yonde_admin());

drop policy if exists "admins_manage_student_hour_allocations" on public.student_hour_allocations;
create policy "admins_manage_student_hour_allocations"
  on public.student_hour_allocations for all
  using (public.is_yonde_admin())
  with check (public.is_yonde_admin());

create or replace function public.is_student_portal_for_current_student(
  p_current_student_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.student_portal_accounts account
    where account.current_student_id = p_current_student_id
      and account.portal_user_id = auth.uid()
      and account.status = 'active'
  );
$$;

revoke all on function public.is_student_portal_for_current_student(uuid) from public;
grant execute on function public.is_student_portal_for_current_student(uuid) to authenticated;

drop policy if exists "portal_users_read_own_current_student" on public.current_students;
create policy "portal_users_read_own_current_student"
  on public.current_students for select
  using (public.is_student_portal_for_current_student(id));

drop policy if exists "portal_users_read_own_mentor_assignments" on public.student_mentor_assignments;
create policy "portal_users_read_own_mentor_assignments"
  on public.student_mentor_assignments for select
  using (public.is_student_portal_for_current_student(current_student_id));

drop policy if exists "portal_users_read_assigned_mentors" on public.mentors;
create policy "portal_users_read_assigned_mentors"
  on public.mentors for select
  using (
    exists (
      select 1 from public.student_mentor_assignments assignment
      where assignment.mentor_id = mentors.id
        and public.is_student_portal_for_current_student(assignment.current_student_id)
    )
  );

drop policy if exists "portal_users_read_own_hour_allocations" on public.student_hour_allocations;
create policy "portal_users_read_own_hour_allocations"
  on public.student_hour_allocations for select
  using (
    exists (
      select 1 from public.student_course_enrollments enrollment
      where enrollment.id = student_hour_allocations.enrollment_id
        and public.is_student_portal_for_current_student(enrollment.current_student_id)
    )
  );

-- Extend existing portal policies to support either an application or current student.
drop policy if exists "students_read_own_enrollments" on public.student_course_enrollments;
create policy "students_read_own_enrollments"
  on public.student_course_enrollments for select
  using (
    public.is_student_portal_for_application(application_id)
    or public.is_student_portal_for_current_student(current_student_id)
  );

drop policy if exists "students_read_assigned_course_plans" on public.course_plans;
create policy "students_read_assigned_course_plans"
  on public.course_plans for select
  using (exists (
    select 1 from public.student_course_enrollments enrollment
    where enrollment.course_plan_id = course_plans.id
      and (
        public.is_student_portal_for_application(enrollment.application_id)
        or public.is_student_portal_for_current_student(enrollment.current_student_id)
      )
  ));

drop policy if exists "students_read_assigned_modules" on public.course_modules;
create policy "students_read_assigned_modules"
  on public.course_modules for select
  using (exists (
    select 1 from public.student_course_enrollments enrollment
    where enrollment.course_plan_id = course_modules.course_plan_id
      and (
        public.is_student_portal_for_application(enrollment.application_id)
        or public.is_student_portal_for_current_student(enrollment.current_student_id)
      )
  ));

drop policy if exists "students_read_own_class_sessions" on public.class_sessions;
create policy "students_read_own_class_sessions"
  on public.class_sessions for select
  using (exists (
    select 1 from public.student_course_enrollments enrollment
    where enrollment.id = class_sessions.enrollment_id
      and (
        public.is_student_portal_for_application(enrollment.application_id)
        or public.is_student_portal_for_current_student(enrollment.current_student_id)
      )
  ));

drop policy if exists "students_read_assigned_milestones" on public.course_milestones;
create policy "students_read_assigned_milestones"
  on public.course_milestones for select
  using (exists (
    select 1 from public.student_course_enrollments enrollment
    where enrollment.course_plan_id = course_milestones.course_plan_id
      and (
        public.is_student_portal_for_application(enrollment.application_id)
        or public.is_student_portal_for_current_student(enrollment.current_student_id)
      )
  ));

drop policy if exists "students_read_own_milestone_progress" on public.student_milestone_progress;
create policy "students_read_own_milestone_progress"
  on public.student_milestone_progress for select
  using (exists (
    select 1 from public.student_course_enrollments enrollment
    where enrollment.id = student_milestone_progress.enrollment_id
      and (
        public.is_student_portal_for_application(enrollment.application_id)
        or public.is_student_portal_for_current_student(enrollment.current_student_id)
      )
  ));

drop policy if exists "students_read_own_visible_files" on public.student_files;
create policy "students_read_own_visible_files"
  on public.student_files for select
  using (
    visible_to_student and exists (
      select 1 from public.student_course_enrollments enrollment
      where enrollment.id = student_files.enrollment_id
        and (
          public.is_student_portal_for_application(enrollment.application_id)
          or public.is_student_portal_for_current_student(enrollment.current_student_id)
        )
    )
  );

drop policy if exists "students_read_own_file_objects" on storage.objects;
create policy "students_read_own_file_objects"
  on storage.objects for select
  using (
    bucket_id = 'student-files' and exists (
      select 1
      from public.student_files file
      join public.student_course_enrollments enrollment on enrollment.id = file.enrollment_id
      where file.storage_path = storage.objects.name
        and file.visible_to_student
        and (
          public.is_student_portal_for_application(enrollment.application_id)
          or public.is_student_portal_for_current_student(enrollment.current_student_id)
        )
    )
  );

grant select on public.current_students to authenticated;
grant select on public.mentors to authenticated;
grant select on public.student_mentor_assignments to authenticated;
grant select on public.student_hour_allocations to authenticated;

notify pgrst, 'reload schema';
