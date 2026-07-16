-- Admin application progress tracking.
-- Apply after the existing applications status migrations.

create or replace function public.is_yonde_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role'
  ) = 'admin';
$$;

create table if not exists public.application_stage_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  from_status text,
  to_status text not null check (to_status in ('submitted', 'interview', 'offer', 'rejected')),
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id),
  note text
);

create index if not exists idx_application_stage_history_application
  on public.application_stage_history (application_id, changed_at asc);

alter table public.application_stage_history enable row level security;

drop policy if exists "admins_read_all_applications" on public.applications;
create policy "admins_read_all_applications"
  on public.applications for select
  using (public.is_yonde_admin());

drop policy if exists "admins_read_stage_history" on public.application_stage_history;
create policy "admins_read_stage_history"
  on public.application_stage_history for select
  using (public.is_yonde_admin());

insert into public.application_stage_history (
  application_id,
  from_status,
  to_status,
  changed_at,
  changed_by,
  note
)
select
  a.id,
  null,
  'submitted',
  coalesce(a.submitted_at, a.updated_at, now()),
  null,
  'Backfilled from existing application'
from public.applications a
where a.status <> 'draft'
  and not exists (
    select 1
    from public.application_stage_history h
    where h.application_id = a.id
      and h.to_status = 'submitted'
  );

create or replace function public.advance_application_stage(
  p_application_id uuid,
  p_next_status text,
  p_note text default null
)
returns public.applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.applications;
  v_current_status text;
begin
  if not public.is_yonde_admin() then
    raise exception 'Admin access required';
  end if;

  if p_next_status not in ('submitted', 'interview', 'offer', 'rejected') then
    raise exception 'Unsupported application stage';
  end if;

  select status into v_current_status
  from public.applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Application not found';
  end if;

  if v_current_status = 'draft' then
    raise exception 'Draft applications cannot be moved by admissions';
  end if;

  if v_current_status = p_next_status then
    raise exception 'Application is already in that stage';
  end if;

  update public.applications
  set status = p_next_status,
      updated_at = now()
  where id = p_application_id
  returning * into v_application;

  insert into public.application_stage_history (
    application_id,
    from_status,
    to_status,
    changed_by,
    note
  ) values (
    p_application_id,
    v_current_status,
    p_next_status,
    auth.uid(),
    nullif(trim(p_note), '')
  );

  return v_application;
end;
$$;

revoke all on function public.advance_application_stage(uuid, text, text) from public;
grant execute on function public.advance_application_stage(uuid, text, text) to authenticated;

