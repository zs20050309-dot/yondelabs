-- Remove database objects from the paused DocuSign offer integration.
-- This migration is safe to run even when the DocuSign migration was never applied.

drop function if exists public.record_docusign_offer(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz
);

drop table if exists public.application_contracts;

notify pgrst, 'reload schema';
