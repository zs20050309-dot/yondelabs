-- Auditable delivery history for program-specific PDF offer letters.

create table if not exists public.offer_letter_sends (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  recipient_email text not null,
  program text not null,
  letter_data jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  sent_by uuid references auth.users(id)
);

create index if not exists idx_offer_letter_sends_application
  on public.offer_letter_sends (application_id, created_at desc);

alter table public.offer_letter_sends enable row level security;

drop policy if exists "admins_read_offer_letter_sends" on public.offer_letter_sends;
create policy "admins_read_offer_letter_sends"
  on public.offer_letter_sends for select
  using (public.is_yonde_admin());

drop policy if exists "admins_create_offer_letter_sends" on public.offer_letter_sends;
create policy "admins_create_offer_letter_sends"
  on public.offer_letter_sends for insert
  with check (public.is_yonde_admin() and sent_by = auth.uid());

drop policy if exists "admins_update_offer_letter_sends" on public.offer_letter_sends;
create policy "admins_update_offer_letter_sends"
  on public.offer_letter_sends for update
  using (public.is_yonde_admin())
  with check (public.is_yonde_admin());
