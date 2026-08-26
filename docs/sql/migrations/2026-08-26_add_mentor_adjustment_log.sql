-- Manual mentor payment adjustments: a delete path and an append-only audit log.
-- Manual line items are the one payable source an admin types in by hand, so
-- they are the one source that can be removed again -- milestone and session
-- lines are owned by their sync triggers and must be corrected at the source.
-- Every add and every delete is recorded in mentor_payment_adjustment_log,
-- which keeps the money trail even after the record row is gone.
-- Apply after 2026-08-13_add_mentor_payments.sql.

create table if not exists public.mentor_payment_adjustment_log (
  id uuid primary key default gen_random_uuid(),
  -- Nulled out when the adjustment it describes is deleted; the denormalised
  -- columns below are what make this log readable after that happens.
  record_id uuid references public.mentor_payment_records(id) on delete set null,
  mentor_id uuid not null references public.mentors(id) on delete cascade,
  current_student_id uuid references public.current_students(id) on delete set null,
  assignment_id uuid references public.student_mentor_assignments(id) on delete set null,
  student_name text,
  action text not null check (action in ('created', 'deleted')),
  amount_cents integer not null,
  currency text not null default 'USD',
  notes text,
  actor_id uuid references auth.users(id),
  actor_email text,
  created_at timestamptz not null default now()
);

create index if not exists idx_mentor_adjustment_log_mentor
  on public.mentor_payment_adjustment_log (mentor_id, created_at desc);

alter table public.mentor_payment_adjustment_log enable row level security;

-- Read-only from the client. The log is append-only: rows are written solely
-- by the two security-definer functions below, so there is deliberately no
-- insert/update/delete policy for anyone.
drop policy if exists "admins_read_mentor_adjustment_log" on public.mentor_payment_adjustment_log;
create policy "admins_read_mentor_adjustment_log"
  on public.mentor_payment_adjustment_log for select
  using (public.is_yonde_admin());

-- Add a manual adjustment and log it in one transaction, so a payable line can
-- never exist without the log entry that explains where it came from.
create or replace function public.add_mentor_manual_adjustment(
  p_assignment_id uuid,
  p_amount_cents integer,
  p_notes text default null
)
returns public.mentor_payment_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.mentor_payment_records;
  v_mentor_id uuid;
  v_current_student_id uuid;
  v_student_name text;
  v_actor_email text;
begin
  if not public.is_yonde_admin() then
    raise exception 'Admin access required';
  end if;

  if p_amount_cents is null or p_amount_cents < 0 then
    raise exception 'Adjustment amount must be zero or more';
  end if;

  select sma.mentor_id, sma.current_student_id, cs.full_name
    into v_mentor_id, v_current_student_id, v_student_name
  from public.student_mentor_assignments sma
  join public.current_students cs on cs.id = sma.current_student_id
  where sma.id = p_assignment_id;

  if v_mentor_id is null then
    raise exception 'Mentor assignment not found';
  end if;

  insert into public.mentor_payment_records (
    mentor_id, current_student_id, assignment_id, source_type,
    amount_cents, status, notes
  ) values (
    v_mentor_id, v_current_student_id, p_assignment_id, 'manual',
    p_amount_cents, 'pending', nullif(btrim(p_notes), '')
  )
  returning * into v_record;

  select email into v_actor_email from auth.users where id = auth.uid();

  insert into public.mentor_payment_adjustment_log (
    record_id, mentor_id, current_student_id, assignment_id, student_name,
    action, amount_cents, currency, notes, actor_id, actor_email
  ) values (
    v_record.id, v_mentor_id, v_current_student_id, p_assignment_id, v_student_name,
    'created', v_record.amount_cents, v_record.currency, v_record.notes, auth.uid(), v_actor_email
  );

  return v_record;
end;
$$;

revoke all on function public.add_mentor_manual_adjustment(uuid, integer, text) from public;
grant execute on function public.add_mentor_manual_adjustment(uuid, integer, text) to authenticated;

-- Delete a manual adjustment, logging it first. Two deliberate guards:
-- only 'manual' rows can be deleted (milestone/session lines are trigger-owned
-- and would simply be regenerated), and only while still pending -- a paid
-- adjustment is payment history and must be reverted to pending first, which
-- is itself an explicit admin action.
create or replace function public.delete_mentor_manual_adjustment(p_record_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.mentor_payment_records;
  v_student_name text;
  v_actor_email text;
begin
  if not public.is_yonde_admin() then
    raise exception 'Admin access required';
  end if;

  select * into v_record
  from public.mentor_payment_records
  where id = p_record_id;

  if not found then
    raise exception 'Payment record not found';
  end if;

  if v_record.source_type <> 'manual' then
    raise exception 'Only manual adjustments can be deleted';
  end if;

  if v_record.status = 'paid' then
    raise exception 'Revert this adjustment to pending before deleting it';
  end if;

  select full_name into v_student_name
  from public.current_students where id = v_record.current_student_id;

  select email into v_actor_email from auth.users where id = auth.uid();

  insert into public.mentor_payment_adjustment_log (
    record_id, mentor_id, current_student_id, assignment_id, student_name,
    action, amount_cents, currency, notes, actor_id, actor_email
  ) values (
    v_record.id, v_record.mentor_id, v_record.current_student_id, v_record.assignment_id, v_student_name,
    'deleted', v_record.amount_cents, v_record.currency, v_record.notes, auth.uid(), v_actor_email
  );

  delete from public.mentor_payment_records where id = p_record_id;

  return p_record_id;
end;
$$;

revoke all on function public.delete_mentor_manual_adjustment(uuid) from public;
grant execute on function public.delete_mentor_manual_adjustment(uuid) to authenticated;

notify pgrst, 'reload schema';

-- Verification: expect the log table and both functions.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'mentor_payment_adjustment_log';

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('add_mentor_manual_adjustment', 'delete_mentor_manual_adjustment')
order by routine_name;
