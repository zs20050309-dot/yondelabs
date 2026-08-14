-- Mentor payment tracking: per-assignment payment settings, an auto-generated
-- payable ledger from milestone completions and logged class sessions, and a
-- proper mentor link on class_sessions (replacing the free-text mentor_role
-- match with student_mentor_assignments.role).
-- Each milestone is delivered by exactly one mentor per student (never split
-- between co-mentors), tracked on student_milestone_progress.assignment_id,
-- and priced per (assignment, milestone) via mentor_milestone_rates.
-- Apply after 2026-08-12_add_mentor_role_to_class_sessions.sql.

alter table public.class_sessions
  add column if not exists assignment_id uuid references public.student_mentor_assignments(id) on delete set null;

create index if not exists idx_class_sessions_assignment
  on public.class_sessions (assignment_id);

-- Each milestone is delivered by exactly one mentor per student -- not
-- split, not shared. This is the mentor payments are keyed off of.
alter table public.student_milestone_progress
  add column if not exists assignment_id uuid references public.student_mentor_assignments(id) on delete set null;

create index if not exists idx_student_milestone_progress_assignment
  on public.student_milestone_progress (assignment_id);

create table if not exists public.mentor_payment_settings (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique
    references public.student_mentor_assignments(id) on delete cascade,
  payment_type text not null check (payment_type in ('milestone', 'hourly')),
  hourly_rate_cents integer check (hourly_rate_cents >= 0),
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Milestone payouts are not a single flat rate: each mentor assignment has
-- its own custom amount per milestone (two co-mentors on the same course are
-- priced independently, never split). No row for a given
-- (assignment, milestone) means that milestone is not payable for that mentor.
create table if not exists public.mentor_milestone_rates (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.student_mentor_assignments(id) on delete cascade,
  milestone_id uuid not null references public.course_milestones(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, milestone_id)
);

create index if not exists idx_mentor_milestone_rates_assignment
  on public.mentor_milestone_rates (assignment_id);

create table if not exists public.mentor_payment_records (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentors(id) on delete restrict,
  current_student_id uuid not null references public.current_students(id) on delete cascade,
  assignment_id uuid references public.student_mentor_assignments(id) on delete set null,
  source_type text not null check (source_type in ('milestone', 'session', 'manual')),
  milestone_progress_id uuid references public.student_milestone_progress(id) on delete set null,
  class_session_id uuid references public.class_sessions(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  paid_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One payment record per milestone completion (not per mentor) -- a milestone
-- has exactly one responsible mentor, so this also prevents double-paying if
-- responsibility is reassigned.
create unique index if not exists idx_one_payment_per_milestone
  on public.mentor_payment_records (milestone_progress_id)
  where milestone_progress_id is not null;

create unique index if not exists idx_one_payment_per_session
  on public.mentor_payment_records (class_session_id)
  where class_session_id is not null;

create index if not exists idx_mentor_payment_records_mentor
  on public.mentor_payment_records (mentor_id, status);

create index if not exists idx_mentor_payment_records_student
  on public.mentor_payment_records (current_student_id);

alter table public.mentor_payment_settings enable row level security;
alter table public.mentor_milestone_rates enable row level security;
alter table public.mentor_payment_records enable row level security;

drop policy if exists "admins_manage_mentor_payment_settings" on public.mentor_payment_settings;
create policy "admins_manage_mentor_payment_settings"
  on public.mentor_payment_settings for all
  using (public.is_yonde_admin())
  with check (public.is_yonde_admin());

drop policy if exists "admins_manage_mentor_milestone_rates" on public.mentor_milestone_rates;
create policy "admins_manage_mentor_milestone_rates"
  on public.mentor_milestone_rates for all
  using (public.is_yonde_admin())
  with check (public.is_yonde_admin());

drop policy if exists "admins_manage_mentor_payment_records" on public.mentor_payment_records;
create policy "admins_manage_mentor_payment_records"
  on public.mentor_payment_records for all
  using (public.is_yonde_admin())
  with check (public.is_yonde_admin());

-- Milestone completion -> a single payable line for the one mentor assigned
-- as responsible for this milestone (student_milestone_progress.assignment_id),
-- when that mentor is payment_type = 'milestone' and has a custom rate set
-- for this specific milestone. No responsible mentor, or no rate for them =
-- no payout. Reassigning the responsible mentor updates the same pending
-- line rather than creating a second one; paid lines are left untouched.
create or replace function public.sync_milestone_payment_records()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_student_id uuid;
  v_mentor_id uuid;
  v_amount integer;
begin
  select e.current_student_id into v_current_student_id
  from public.student_course_enrollments e
  where e.id = new.enrollment_id;

  if v_current_student_id is null then
    return new;
  end if;

  if new.status <> 'completed' or new.assignment_id is null then
    delete from public.mentor_payment_records
    where milestone_progress_id = new.id and status = 'pending';
    return new;
  end if;

  select sma.mentor_id, mmr.amount_cents
    into v_mentor_id, v_amount
  from public.student_mentor_assignments sma
  join public.mentor_payment_settings mps on mps.assignment_id = sma.id and mps.payment_type = 'milestone'
  join public.mentor_milestone_rates mmr on mmr.assignment_id = sma.id and mmr.milestone_id = new.milestone_id
  where sma.id = new.assignment_id;

  if v_mentor_id is null then
    delete from public.mentor_payment_records
    where milestone_progress_id = new.id and status = 'pending';
    return new;
  end if;

  insert into public.mentor_payment_records (
    mentor_id, current_student_id, assignment_id, source_type,
    milestone_progress_id, amount_cents, status
  ) values (
    v_mentor_id, v_current_student_id, new.assignment_id, 'milestone',
    new.id, v_amount, 'pending'
  )
  on conflict (milestone_progress_id) where milestone_progress_id is not null
  do update set
    mentor_id = excluded.mentor_id,
    assignment_id = excluded.assignment_id,
    amount_cents = excluded.amount_cents,
    updated_at = now()
  where public.mentor_payment_records.status = 'pending';

  return new;
end;
$$;

drop trigger if exists sync_milestone_payment_records_trigger on public.student_milestone_progress;
create trigger sync_milestone_payment_records_trigger
after insert or update of status, assignment_id on public.student_milestone_progress
for each row execute function public.sync_milestone_payment_records();

-- A rate can be entered before or after a milestone is marked complete. If an
-- admin sets/edits a mentor's rate for a milestone that's already completed
-- for that student, generate the payable line now (or refresh its amount if
-- still pending -- paid records are never touched automatically).
create or replace function public.sync_mentor_milestone_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_student_id uuid;
  v_mentor_id uuid;
  v_is_milestone_type boolean;
  v_progress record;
begin
  select sma.current_student_id, sma.mentor_id into v_current_student_id, v_mentor_id
  from public.student_mentor_assignments sma
  where sma.id = new.assignment_id;

  select exists (
    select 1 from public.mentor_payment_settings mps
    where mps.assignment_id = new.assignment_id and mps.payment_type = 'milestone'
  ) into v_is_milestone_type;

  if v_current_student_id is null or not v_is_milestone_type then
    return new;
  end if;

  for v_progress in
    select smp.id
    from public.student_milestone_progress smp
    join public.student_course_enrollments e on e.id = smp.enrollment_id
    where e.current_student_id = v_current_student_id
      and smp.milestone_id = new.milestone_id
      and smp.status = 'completed'
      and smp.assignment_id = new.assignment_id
  loop
    insert into public.mentor_payment_records (
      mentor_id, current_student_id, assignment_id, source_type,
      milestone_progress_id, amount_cents, status
    ) values (
      v_mentor_id, v_current_student_id, new.assignment_id, 'milestone',
      v_progress.id, new.amount_cents, 'pending'
    )
    on conflict (milestone_progress_id) where milestone_progress_id is not null
    do update set amount_cents = excluded.amount_cents, updated_at = now()
    where public.mentor_payment_records.status = 'pending';
  end loop;

  return new;
end;
$$;

drop trigger if exists sync_mentor_milestone_rate_trigger on public.mentor_milestone_rates;
create trigger sync_mentor_milestone_rate_trigger
after insert or update of amount_cents on public.mentor_milestone_rates
for each row execute function public.sync_mentor_milestone_rate();

-- Logged class session -> payable line only when the assigned mentor is
-- configured as payment_type = 'hourly'. Recomputes on edit, removes on
-- delete or reassignment; already-paid records are left untouched.
create or replace function public.sync_session_payment_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mentor_id uuid;
  v_current_student_id uuid;
  v_hourly_rate integer;
  v_amount integer;
begin
  if tg_op = 'DELETE' then
    delete from public.mentor_payment_records
    where class_session_id = old.id and status = 'pending';
    return old;
  end if;

  if new.assignment_id is null then
    delete from public.mentor_payment_records
    where class_session_id = new.id and status = 'pending';
    return new;
  end if;

  select sma.mentor_id, mps.hourly_rate_cents
    into v_mentor_id, v_hourly_rate
  from public.student_mentor_assignments sma
  left join public.mentor_payment_settings mps on mps.assignment_id = sma.id
  where sma.id = new.assignment_id;

  select e.current_student_id into v_current_student_id
  from public.student_course_enrollments e
  where e.id = new.enrollment_id;

  if v_mentor_id is null or v_hourly_rate is null or v_current_student_id is null then
    delete from public.mentor_payment_records
    where class_session_id = new.id and status = 'pending';
    return new;
  end if;

  v_amount := round(v_hourly_rate * new.duration_minutes / 60.0);

  insert into public.mentor_payment_records (
    mentor_id, current_student_id, assignment_id, source_type,
    class_session_id, amount_cents, status
  ) values (
    v_mentor_id, v_current_student_id, new.assignment_id, 'session',
    new.id, v_amount, 'pending'
  )
  on conflict (class_session_id) where class_session_id is not null
  do update set
    amount_cents = excluded.amount_cents,
    assignment_id = excluded.assignment_id,
    mentor_id = excluded.mentor_id,
    updated_at = now()
  where public.mentor_payment_records.status = 'pending';

  return new;
end;
$$;

drop trigger if exists sync_session_payment_record_trigger on public.class_sessions;
create trigger sync_session_payment_record_trigger
after insert or delete or update of duration_minutes, assignment_id on public.class_sessions
for each row execute function public.sync_session_payment_record();

-- Admin-only write path for setting which single mentor is responsible for
-- delivering a milestone, mirroring set_student_milestone_status's upsert
-- shape. Can be set before the milestone is started; validates the mentor is
-- actually assigned to this student.
create or replace function public.set_student_milestone_mentor(
  p_enrollment_id uuid,
  p_milestone_id uuid,
  p_assignment_id uuid
)
returns public.student_milestone_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  v_progress public.student_milestone_progress;
  v_current_student_id uuid;
begin
  if not public.is_yonde_admin() then
    raise exception 'Admin access required';
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

  select e.current_student_id into v_current_student_id
  from public.student_course_enrollments e
  where e.id = p_enrollment_id;

  if p_assignment_id is not null and not exists (
    select 1 from public.student_mentor_assignments sma
    where sma.id = p_assignment_id and sma.current_student_id = v_current_student_id
  ) then
    raise exception 'Mentor is not assigned to this student';
  end if;

  insert into public.student_milestone_progress (
    enrollment_id, milestone_id, assignment_id, status, updated_by, updated_at
  ) values (
    p_enrollment_id, p_milestone_id, p_assignment_id, 'not_started', auth.uid(), now()
  )
  on conflict (enrollment_id, milestone_id)
  do update set
    assignment_id = excluded.assignment_id,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at
  returning * into v_progress;

  return v_progress;
end;
$$;

revoke all on function public.set_student_milestone_mentor(uuid, uuid, uuid) from public;
grant execute on function public.set_student_milestone_mentor(uuid, uuid, uuid) to authenticated;

-- Admin-only write path for marking a payment record paid/pending, mirroring
-- set_student_milestone_status. Also allows editing the amount at pay time
-- (e.g. a one-off adjustment on top of the configured rate).
create or replace function public.set_mentor_payment_status(
  p_record_id uuid,
  p_status text,
  p_amount_cents integer default null,
  p_notes text default null
)
returns public.mentor_payment_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.mentor_payment_records;
begin
  if not public.is_yonde_admin() then
    raise exception 'Admin access required';
  end if;

  if p_status not in ('pending', 'paid') then
    raise exception 'Unsupported payment status';
  end if;

  update public.mentor_payment_records
  set status = p_status,
      amount_cents = coalesce(p_amount_cents, amount_cents),
      notes = coalesce(p_notes, notes),
      paid_at = case when p_status = 'paid' then now() else null end,
      paid_by = case when p_status = 'paid' then auth.uid() else null end,
      updated_at = now()
  where id = p_record_id
  returning * into v_record;

  if not found then
    raise exception 'Payment record not found';
  end if;

  return v_record;
end;
$$;

revoke all on function public.set_mentor_payment_status(uuid, text, integer, text) from public;
grant execute on function public.set_mentor_payment_status(uuid, text, integer, text) to authenticated;

notify pgrst, 'reload schema';

-- Verification: expect all three new tables plus the assignment_id column.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('mentor_payment_settings', 'mentor_milestone_rates', 'mentor_payment_records')
order by table_name;

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (
    ('class_sessions', 'assignment_id'),
    ('student_milestone_progress', 'assignment_id')
  )
order by table_name;
