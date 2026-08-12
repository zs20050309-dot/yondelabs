-- Track which assigned mentor role delivered each class session.
alter table public.class_sessions add column if not exists mentor_role text;

create index if not exists idx_class_sessions_enrollment_mentor_role
  on public.class_sessions (enrollment_id, mentor_role);
