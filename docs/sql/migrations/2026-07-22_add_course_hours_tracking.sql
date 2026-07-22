-- Course plans, modules, student enrollment, and class-hour tracking.
-- Apply after 2026-07-16_add_admin_application_progress.sql.

create table if not exists public.course_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  description text,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_plan_id uuid not null references public.course_plans(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  planned_minutes integer not null check (planned_minutes > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_course_enrollments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  course_plan_id uuid not null references public.course_plans(id) on delete restrict,
  allocated_minutes integer not null check (allocated_minutes > 0),
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  started_at date not null default current_date,
  completed_at date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_one_active_course_per_application
  on public.student_course_enrollments (application_id)
  where status = 'active';

create index if not exists idx_course_modules_plan
  on public.course_modules (course_plan_id, sort_order, created_at);

create index if not exists idx_enrollments_application
  on public.student_course_enrollments (application_id, status);

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.student_course_enrollments(id) on delete cascade,
  module_id uuid references public.course_modules(id) on delete set null,
  session_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_class_sessions_enrollment
  on public.class_sessions (enrollment_id, session_at desc);

alter table public.course_plans enable row level security;
alter table public.course_modules enable row level security;
alter table public.student_course_enrollments enable row level security;
alter table public.class_sessions enable row level security;

drop policy if exists "admins_manage_course_plans" on public.course_plans;
create policy "admins_manage_course_plans"
  on public.course_plans for all
  using (public.is_yonde_admin())
  with check (public.is_yonde_admin());

drop policy if exists "admins_manage_course_modules" on public.course_modules;
create policy "admins_manage_course_modules"
  on public.course_modules for all
  using (public.is_yonde_admin())
  with check (public.is_yonde_admin());

drop policy if exists "admins_manage_course_enrollments" on public.student_course_enrollments;
create policy "admins_manage_course_enrollments"
  on public.student_course_enrollments for all
  using (public.is_yonde_admin())
  with check (public.is_yonde_admin());

drop policy if exists "admins_manage_class_sessions" on public.class_sessions;
create policy "admins_manage_class_sessions"
  on public.class_sessions for all
  using (public.is_yonde_admin())
  with check (public.is_yonde_admin());

drop policy if exists "students_read_own_enrollments" on public.student_course_enrollments;
create policy "students_read_own_enrollments"
  on public.student_course_enrollments for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = student_course_enrollments.application_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "students_read_assigned_course_plans" on public.course_plans;
create policy "students_read_assigned_course_plans"
  on public.course_plans for select
  using (
    exists (
      select 1
      from public.student_course_enrollments e
      join public.applications a on a.id = e.application_id
      where e.course_plan_id = course_plans.id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "students_read_assigned_modules" on public.course_modules;
create policy "students_read_assigned_modules"
  on public.course_modules for select
  using (
    exists (
      select 1
      from public.student_course_enrollments e
      join public.applications a on a.id = e.application_id
      where e.course_plan_id = course_modules.course_plan_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "students_read_own_class_sessions" on public.class_sessions;
create policy "students_read_own_class_sessions"
  on public.class_sessions for select
  using (
    exists (
      select 1
      from public.student_course_enrollments e
      join public.applications a on a.id = e.application_id
      where e.id = class_sessions.enrollment_id
        and a.user_id = auth.uid()
    )
  );

-- Verification: expect four rows.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'course_plans',
    'course_modules',
    'student_course_enrollments',
    'class_sessions'
  )
order by table_name;

