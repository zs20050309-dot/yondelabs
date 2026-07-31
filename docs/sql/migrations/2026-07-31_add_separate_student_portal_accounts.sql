-- Separate credential accounts for the enrolled-student portal.
-- Apply after the course-hours, milestones, and student-files migrations.

create table if not exists public.student_portal_accounts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique
    references public.applications(id) on delete cascade,
  portal_user_id uuid not null unique
    references auth.users(id) on delete cascade,
  portal_id text not null unique
    check (portal_id ~ '^[A-Z0-9-]{6,24}$'),
  status text not null default 'active'
    check (status in ('active', 'disabled')),
  must_change_password boolean not null default true,
  activated_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_student_portal_accounts_user
  on public.student_portal_accounts (portal_user_id, status);

alter table public.student_portal_accounts enable row level security;

revoke all on public.student_portal_accounts from anon;
grant select on public.student_portal_accounts to authenticated;

drop policy if exists "admins_read_student_portal_accounts"
  on public.student_portal_accounts;
create policy "admins_read_student_portal_accounts"
  on public.student_portal_accounts for select
  using (public.is_yonde_admin());

drop policy if exists "portal_users_read_own_account"
  on public.student_portal_accounts;
create policy "portal_users_read_own_account"
  on public.student_portal_accounts for select
  using (portal_user_id = auth.uid());

create or replace function public.is_student_portal_for_application(
  p_application_id uuid
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
    where account.application_id = p_application_id
      and account.portal_user_id = auth.uid()
      and account.status = 'active'
  );
$$;

revoke all on function public.is_student_portal_for_application(uuid) from public;
grant execute on function public.is_student_portal_for_application(uuid) to authenticated;

create or replace function public.complete_student_portal_password_change()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.student_portal_accounts
  set must_change_password = false,
      activated_at = coalesce(activated_at, now()),
      updated_at = now()
  where portal_user_id = auth.uid()
    and status = 'active';

  if not found then
    raise exception 'Active student portal account not found';
  end if;
end;
$$;

revoke all on function public.complete_student_portal_password_change() from public;
grant execute on function public.complete_student_portal_password_change() to authenticated;

drop policy if exists "portal_users_read_linked_application" on public.applications;
create policy "portal_users_read_linked_application"
  on public.applications for select
  using (public.is_student_portal_for_application(id));

-- Replace the former application-account course policies with portal-account policies.
drop policy if exists "students_read_own_enrollments" on public.student_course_enrollments;
create policy "students_read_own_enrollments"
  on public.student_course_enrollments for select
  using (public.is_student_portal_for_application(application_id));

drop policy if exists "students_read_assigned_course_plans" on public.course_plans;
create policy "students_read_assigned_course_plans"
  on public.course_plans for select
  using (
    exists (
      select 1
      from public.student_course_enrollments enrollment
      where enrollment.course_plan_id = course_plans.id
        and public.is_student_portal_for_application(enrollment.application_id)
    )
  );

drop policy if exists "students_read_assigned_modules" on public.course_modules;
create policy "students_read_assigned_modules"
  on public.course_modules for select
  using (
    exists (
      select 1
      from public.student_course_enrollments enrollment
      where enrollment.course_plan_id = course_modules.course_plan_id
        and public.is_student_portal_for_application(enrollment.application_id)
    )
  );

drop policy if exists "students_read_own_class_sessions" on public.class_sessions;
create policy "students_read_own_class_sessions"
  on public.class_sessions for select
  using (
    exists (
      select 1
      from public.student_course_enrollments enrollment
      where enrollment.id = class_sessions.enrollment_id
        and public.is_student_portal_for_application(enrollment.application_id)
    )
  );

drop policy if exists "students_read_assigned_milestones" on public.course_milestones;
create policy "students_read_assigned_milestones"
  on public.course_milestones for select
  using (
    exists (
      select 1
      from public.student_course_enrollments enrollment
      where enrollment.course_plan_id = course_milestones.course_plan_id
        and public.is_student_portal_for_application(enrollment.application_id)
    )
  );

drop policy if exists "students_read_own_milestone_progress"
  on public.student_milestone_progress;
create policy "students_read_own_milestone_progress"
  on public.student_milestone_progress for select
  using (
    exists (
      select 1
      from public.student_course_enrollments enrollment
      where enrollment.id = student_milestone_progress.enrollment_id
        and public.is_student_portal_for_application(enrollment.application_id)
    )
  );

drop policy if exists "students_read_own_visible_files" on public.student_files;
create policy "students_read_own_visible_files"
  on public.student_files for select
  using (
    visible_to_student
    and exists (
      select 1
      from public.student_course_enrollments enrollment
      where enrollment.id = student_files.enrollment_id
        and public.is_student_portal_for_application(enrollment.application_id)
    )
  );

drop policy if exists "students_read_own_file_objects" on storage.objects;
create policy "students_read_own_file_objects"
  on storage.objects for select
  using (
    bucket_id = 'student-files'
    and exists (
      select 1
      from public.student_files file
      join public.student_course_enrollments enrollment
        on enrollment.id = file.enrollment_id
      where file.storage_path = storage.objects.name
        and file.visible_to_student
        and public.is_student_portal_for_application(enrollment.application_id)
    )
  );

notify pgrst, 'reload schema';
