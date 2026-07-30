-- DocuSign offer-envelope tracking.
-- Apply after 2026-07-16_add_admin_application_progress.sql.

create table if not exists public.application_contracts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications(id) on delete cascade,
  provider text not null default 'docusign' check (provider = 'docusign'),
  envelope_id text not null unique,
  template_id text not null,
  status text not null default 'sent'
    check (status in ('sent', 'delivered', 'completed', 'declined', 'voided')),
  recipient_name text not null,
  recipient_email text not null,
  guardian_name text,
  guardian_email text,
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  completed_at timestamptz,
  declined_at timestamptz,
  voided_at timestamptz,
  last_event_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_application_contracts_envelope
  on public.application_contracts (envelope_id);

alter table public.application_contracts enable row level security;

drop policy if exists "admins_read_application_contracts" on public.application_contracts;
create policy "admins_read_application_contracts"
  on public.application_contracts for select
  using (public.is_yonde_admin());

drop policy if exists "students_read_own_application_contracts" on public.application_contracts;
create policy "students_read_own_application_contracts"
  on public.application_contracts for select
  using (
    exists (
      select 1
      from public.applications a
      where a.id = application_contracts.application_id
        and a.user_id = auth.uid()
    )
  );

create or replace function public.record_docusign_offer(
  p_application_id uuid,
  p_envelope_id text,
  p_template_id text,
  p_status text,
  p_recipient_name text,
  p_recipient_email text,
  p_guardian_name text default null,
  p_guardian_email text default null,
  p_sent_at timestamptz default now()
)
returns public.application_contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
  v_existing_envelope text;
  v_contract public.application_contracts;
begin
  if not public.is_yonde_admin() then
    raise exception 'Admin access required';
  end if;

  if p_status not in ('sent', 'delivered', 'completed', 'declined', 'voided') then
    raise exception 'Unsupported contract status';
  end if;

  select status into v_current_status
  from public.applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Application not found';
  end if;

  select envelope_id into v_existing_envelope
  from public.application_contracts
  where application_id = p_application_id;

  if v_existing_envelope is not null and v_existing_envelope <> p_envelope_id then
    raise exception 'An offer contract has already been sent for this application';
  end if;

  if v_current_status not in ('interview', 'offer') then
    raise exception 'Only interviewed applications can receive an offer contract';
  end if;

  insert into public.application_contracts (
    application_id,
    envelope_id,
    template_id,
    status,
    recipient_name,
    recipient_email,
    guardian_name,
    guardian_email,
    sent_at,
    last_event_at,
    created_by
  ) values (
    p_application_id,
    p_envelope_id,
    p_template_id,
    p_status,
    p_recipient_name,
    p_recipient_email,
    nullif(trim(p_guardian_name), ''),
    nullif(trim(p_guardian_email), ''),
    p_sent_at,
    p_sent_at,
    auth.uid()
  )
  on conflict (application_id) do update
  set status = excluded.status,
      last_event_at = excluded.last_event_at,
      updated_at = now()
  returning * into v_contract;

  if v_current_status = 'interview' then
    update public.applications
    set status = 'offer',
        updated_at = now()
    where id = p_application_id;

    insert into public.application_stage_history (
      application_id,
      from_status,
      to_status,
      changed_by,
      note
    ) values (
      p_application_id,
      'interview',
      'offer',
      auth.uid(),
      'DocuSign offer envelope sent: ' || p_envelope_id
    );
  end if;

  return v_contract;
end;
$$;

revoke all on function public.record_docusign_offer(
  uuid, text, text, text, text, text, text, text, timestamptz
) from public;
grant execute on function public.record_docusign_offer(
  uuid, text, text, text, text, text, text, text, timestamptz
) to authenticated;
