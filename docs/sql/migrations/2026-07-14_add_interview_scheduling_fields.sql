-- Migration: add interview scheduling metadata to applications
--
-- Why:
-- - We need a stable email column for interview automations and Calendly webhook matching.
-- - We need interview-specific timestamps/URIs so the dashboard can reflect whether a slot
--   has merely been requested or has actually been scheduled.

alter table public.applications
  add column if not exists contact_email text,
  add column if not exists interview_invite_sent_at timestamptz,
  add column if not exists interview_scheduled_at timestamptz,
  add column if not exists calendly_invitee_uri text,
  add column if not exists calendly_event_uri text,
  add column if not exists zoom_confirmation_sent_at timestamptz;

update public.applications
set contact_email = nullif(trim(form_data->>'email'), '')
where contact_email is null;

create index if not exists idx_applications_contact_email
  on public.applications (contact_email);

create index if not exists idx_applications_interview_status
  on public.applications (status, interview_scheduled_at, updated_at desc);

-- Verification queries
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'applications'
  and column_name in (
    'contact_email',
    'interview_invite_sent_at',
    'interview_scheduled_at',
    'calendly_invitee_uri',
    'calendly_event_uri',
    'zoom_confirmation_sent_at'
  )
order by column_name;

select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'applications'
  and indexname in (
    'idx_applications_contact_email',
    'idx_applications_interview_status'
  )
order by indexname;
