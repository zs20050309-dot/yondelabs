-- Minimum-hours policy and per-student milestone progress.
-- Apply after 2026-07-22_add_course_hours_tracking.sql.

alter table public.course_plans
  add column if not exists allow_overage boolean not null default false;

create table if not exists public.course_milestones (
  id uuid primary key default gen_random_uuid(),
  course_plan_id uuid not null references public.course_plans(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_course_milestones_plan
  on public.course_milestones (course_plan_id, sort_order, created_at);

create table if not exists public.student_milestone_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.student_course_enrollments(id) on delete cascade,
  milestone_id uuid not null references public.course_milestones(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  notes text,
  completed_at timestamptz,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, milestone_id)
);

create index if not exists idx_student_milestone_progress_enrollment
  on public.student_milestone_progress (enrollment_id, updated_at desc);

create unique index if not exists idx_one_current_milestone_per_enrollment
  on public.student_milestone_progress (enrollment_id)
  where status = 'in_progress';

alter table public.course_milestones enable row level security;
alter table public.student_milestone_progress enable row level security;

drop policy if exists "admins_manage_course_milestones" on public.course_milestones;
create policy "admins_manage_course_milestones"
  on public.course_milestones for all
  using (public.is_yonde_admin())
  with check (public.is_yonde_admin());

drop policy if exists "admins_manage_student_milestones" on public.student_milestone_progress;
create policy "admins_manage_student_milestones"
  on public.student_milestone_progress for all
  using (public.is_yonde_admin())
  with check (public.is_yonde_admin());

drop policy if exists "students_read_assigned_milestones" on public.course_milestones;
create policy "students_read_assigned_milestones"
  on public.course_milestones for select
  using (
    exists (
      select 1
      from public.student_course_enrollments e
      join public.applications a on a.id = e.application_id
      where e.course_plan_id = course_milestones.course_plan_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "students_read_own_milestone_progress" on public.student_milestone_progress;
create policy "students_read_own_milestone_progress"
  on public.student_milestone_progress for select
  using (
    exists (
      select 1
      from public.student_course_enrollments e
      join public.applications a on a.id = e.application_id
      where e.id = student_milestone_progress.enrollment_id
        and a.user_id = auth.uid()
    )
  );

create or replace function public.set_student_milestone_status(
  p_enrollment_id uuid,
  p_milestone_id uuid,
  p_status text
)
returns public.student_milestone_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  v_progress public.student_milestone_progress;
begin
  if not public.is_yonde_admin() then
    raise exception 'Admin access required';
  end if;

  if p_status not in ('not_started', 'in_progress', 'completed') then
    raise exception 'Unsupported milestone status';
  end if;

  if not exists (
    select 1
    from public.student_course_enrollments e
    join public.course_milestones m on m.course_plan_id = e.course_plan_id
    where e.id = p_enrollment_id
      and m.id = p_milestone_id
  ) then
    raise exception 'Milestone does not belong to the enrolled course plan';
  end if;

  if p_status = 'in_progress' then
    update public.student_milestone_progress
    set status = 'not_started',
        completed_at = null,
        updated_by = auth.uid(),
        updated_at = now()
    where enrollment_id = p_enrollment_id
      and milestone_id <> p_milestone_id
      and status = 'in_progress';
  end if;

  insert into public.student_milestone_progress (
    enrollment_id, milestone_id, status, completed_at, updated_by, updated_at
  ) values (
    p_enrollment_id,
    p_milestone_id,
    p_status,
    case when p_status = 'completed' then now() else null end,
    auth.uid(),
    now()
  )
  on conflict (enrollment_id, milestone_id)
  do update set
    status = excluded.status,
    completed_at = excluded.completed_at,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at
  returning * into v_progress;

  return v_progress;
end;
$$;

revoke all on function public.set_student_milestone_status(uuid, uuid, text) from public;
grant execute on function public.set_student_milestone_status(uuid, uuid, text) to authenticated;

create or replace function public.enforce_course_session_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allocated integer;
  v_plan_id uuid;
  v_allow_overage boolean;
  v_used integer;
  v_module_plan_id uuid;
begin
  select e.allocated_minutes, e.course_plan_id, p.allow_overage
    into v_allocated, v_plan_id, v_allow_overage
  from public.student_course_enrollments e
  join public.course_plans p on p.id = e.course_plan_id
  where e.id = new.enrollment_id;

  if not found then
    raise exception 'Course enrollment not found';
  end if;

  if new.module_id is not null then
    select course_plan_id into v_module_plan_id
    from public.course_modules
    where id = new.module_id;

    if v_module_plan_id is distinct from v_plan_id then
      raise exception 'The selected module does not belong to this course plan';
    end if;
  end if;

  if not v_allow_overage then
    select coalesce(sum(duration_minutes), 0)
      into v_used
    from public.class_sessions
    where enrollment_id = new.enrollment_id
      and id is distinct from new.id;

    if v_used + new.duration_minutes > v_allocated then
      raise exception 'This plan has a hard hour limit. Only % minutes remain.', greatest(v_allocated - v_used, 0)
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_course_session_limit_trigger on public.class_sessions;
create trigger enforce_course_session_limit_trigger
before insert or update of enrollment_id, module_id, duration_minutes
on public.class_sessions
for each row execute function public.enforce_course_session_limit();

create or replace function public.enforce_enrollment_allocation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allow_overage boolean;
  v_used integer;
begin
  select allow_overage into v_allow_overage
  from public.course_plans
  where id = new.course_plan_id;

  if not coalesce(v_allow_overage, false) then
    select coalesce(sum(duration_minutes), 0)
      into v_used
    from public.class_sessions
    where enrollment_id = new.id;

    if v_used > new.allocated_minutes then
      raise exception 'Allocated hours cannot be lower than already-used hours for a hard-limit plan'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_enrollment_allocation_trigger on public.student_course_enrollments;
create trigger enforce_enrollment_allocation_trigger
before update of allocated_minutes, course_plan_id
on public.student_course_enrollments
for each row execute function public.enforce_enrollment_allocation();

create or replace function public.prevent_invalid_overage_policy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.allow_overage and not new.allow_overage and exists (
    select 1
    from public.student_course_enrollments e
    join public.class_sessions s on s.enrollment_id = e.id
    where e.course_plan_id = new.id
    group by e.id, e.allocated_minutes
    having sum(s.duration_minutes) > e.allocated_minutes
  ) then
    raise exception 'This plan cannot become a hard limit while a student is above the minimum hours'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_invalid_overage_policy_trigger on public.course_plans;
create trigger prevent_invalid_overage_policy_trigger
before update of allow_overage
on public.course_plans
for each row execute function public.prevent_invalid_overage_policy();

notify pgrst, 'reload schema';

-- Verification: expect allow_overage plus both milestone tables.
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'course_plans'
  and column_name = 'allow_overage';

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('course_milestones', 'student_milestone_progress')
order by table_name;
