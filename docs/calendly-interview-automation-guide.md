# Calendly Interview Automation Guide

This guide sets up the second email automation flow:

1. when an application is moved to `interview`, the student gets a Calendly scheduling email
2. when Calendly confirms the booking, the student gets a follow-up email telling them the Zoom details have been sent

This uses:
- `send-interview-invite` Supabase Edge Function
- `handle-calendly-booking` Supabase Edge Function
- one SQL migration
- one database trigger
- one Calendly webhook

---

## Part 1 - Run the SQL migration

Open Supabase `SQL Editor` and run:

[2026-07-14_add_interview_scheduling_fields.sql](C:/Users/hadiq/OneDrive/Desktop/yondelabs/docs/sql/migrations/2026-07-14_add_interview_scheduling_fields.sql)

This adds:
- `contact_email`
- `interview_invite_sent_at`
- `interview_scheduled_at`
- `calendly_invitee_uri`
- `calendly_event_uri`
- `zoom_confirmation_sent_at`

It also backfills `contact_email` from `form_data.email`.

---

## Part 2 - Deploy the Edge Functions

Deploy both functions:

```powershell
supabase functions deploy send-interview-invite --project-ref YOUR_PROJECT_REF
supabase functions deploy handle-calendly-booking --project-ref YOUR_PROJECT_REF
```

Use these source files:
- [send-interview-invite/index.ts](C:/Users/hadiq/OneDrive/Desktop/yondelabs/supabase/functions/send-interview-invite/index.ts)
- [handle-calendly-booking/index.ts](C:/Users/hadiq/OneDrive/Desktop/yondelabs/supabase/functions/handle-calendly-booking/index.ts)

For `handle-calendly-booking`, make sure **JWT verification is off** because Calendly is an external webhook caller.

---

## Part 3 - Add function secrets

In Supabase `Edge Functions -> Secrets`, set:

| Name | Value |
|---|---|
| `RESEND_API_KEY` | your Resend API key |
| `FROM_EMAIL` | `YondeLabs Admissions <noreply@yondelabs.com>` |
| `WEBHOOK_SECRET` | a random secret string for database -> function calls |
| `CALENDLY_BOOKING_URL` | your public Calendly booking link |
| `CALENDLY_WEBHOOK_TOKEN` | another random secret string for the Calendly webhook URL |

Notes:
- `WEBHOOK_SECRET` is for Supabase database triggers calling `send-interview-invite`
- `CALENDLY_WEBHOOK_TOKEN` is for Calendly calling `handle-calendly-booking`
- use different random values for those two secrets

---

## Part 4 - Connect the database to the interview email function

When a student is shortlisted, you will update their application row:

```text
status = interview
```

That change should trigger the scheduling email.

If you do not have the `Database -> Webhooks` UI, use this SQL:

```sql
create or replace function public.notify_interview_invite()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'UPDATE' and OLD.status is distinct from NEW.status and NEW.status = 'interview' then
    perform net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-interview-invite',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_WEBHOOK_SECRET'
      ),
      body := jsonb_build_object(
        'type', 'UPDATE',
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', to_jsonb(NEW),
        'old_record', to_jsonb(OLD)
      )
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists interview_invite_webhook on public.applications;

create trigger interview_invite_webhook
after update on public.applications
for each row
execute function public.notify_interview_invite();
```

Replace:
- `YOUR_PROJECT_REF`
- `YOUR_WEBHOOK_SECRET`

---

## Part 5 - Connect Calendly to the booking webhook

Create a Calendly webhook subscription for:

```text
invitee.created
```

Use this callback URL:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/handle-calendly-booking?token=YOUR_CALENDLY_WEBHOOK_TOKEN
```

Replace:
- `YOUR_PROJECT_REF`
- `YOUR_CALENDLY_WEBHOOK_TOKEN`

What this event does:
- finds the matching `applications` row by `contact_email`
- stores the booking metadata on the row
- sets `interview_scheduled_at`
- sends a confirmation email telling the student Calendly has sent the Zoom details

---

## Part 6 - Operational flow

### To invite a student

Update their application row in Supabase:

```text
status = interview
```

Result:
- `send-interview-invite` sends the Calendly email
- `interview_invite_sent_at` is saved on the row
- the dashboard shows `Interview Invitation Sent` until the slot is actually booked

### After the student books a slot in Calendly

Result:
- Calendly calls `handle-calendly-booking`
- the app stores `interview_scheduled_at`
- the app stores the Calendly URIs
- the student gets the follow-up confirmation email
- the dashboard changes to `Interview Scheduled`

---

## Part 7 - Testing checklist

1. Set one real test application row to `status = interview`
2. Confirm the student gets the Calendly booking email
3. Confirm `interview_invite_sent_at` was saved
4. Create a real Calendly booking with the same email address as `applications.contact_email`
5. Confirm `interview_scheduled_at` was saved
6. Confirm the student gets the second email
7. Confirm the dashboard now says `Interview Scheduled`

---

## Troubleshooting

### The first interview email does not send

Check:
- `send-interview-invite` logs
- the `interview_invite_webhook` trigger exists
- `status` actually changed into `interview`
- `CALENDLY_BOOKING_URL` is set
- `contact_email` is populated on the application row

### Calendly booking does not update the application

Check:
- `handle-calendly-booking` logs
- the webhook URL token matches `CALENDLY_WEBHOOK_TOKEN`
- the booking email exactly matches `applications.contact_email`
- the application is still in `status = interview`

### The second email fails

Check:
- Resend logs
- `RESEND_API_KEY`
- `FROM_EMAIL`

---

## File reference

- [send-interview-invite/index.ts](C:/Users/hadiq/OneDrive/Desktop/yondelabs/supabase/functions/send-interview-invite/index.ts)
- [handle-calendly-booking/index.ts](C:/Users/hadiq/OneDrive/Desktop/yondelabs/supabase/functions/handle-calendly-booking/index.ts)
- [2026-07-14_add_interview_scheduling_fields.sql](C:/Users/hadiq/OneDrive/Desktop/yondelabs/docs/sql/migrations/2026-07-14_add_interview_scheduling_fields.sql)
