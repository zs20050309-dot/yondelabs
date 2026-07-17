# Submission Confirmation and Application PDF Setup

**Feature:** Students get one confirmation email, and Ashlyn receives the submitted application as a PDF.

**Stack:** Resend + Supabase Edge Function + Supabase Database Webhook / trigger.

**What this version does**
- Sends an email when an application is first received.
- Generates the completed application PDF and emails it to `ashlyndong@gmail.com`.
- Works for all programs in the `applications` table.
- Does **not** send interview / offer / rejected emails.

---

## What triggers the email

The `send-status-email` Edge Function sends an email only when one of these happens:

1. a row is inserted into `applications` with `status = 'submitted'`
2. a row is updated from `draft` to `submitted`

For the same event, the function sends a separate internal email with the PDF attachment to `ashlyndong@gmail.com`. The internal email is still sent if the student's form email is missing or malformed.

It will skip:
- draft autosaves
- updates where status did not change
- later status changes like `interview`, `offer`, or `rejected`

---

## Part 1 - Resend

1. Create a Resend account at <https://resend.com/signup>.
2. Add `yondelabs.com` as a sending domain.
3. Add the DNS records Resend gives you at your domain registrar.
4. Wait until the domain shows as verified.
5. Create an API key with sending access.

You will use that key as `RESEND_API_KEY`.

---

## Part 2 - Supabase Edge Function

Open your Supabase project, then:

1. Go to `Edge Functions`
2. Open `send-status-email`
3. Replace the code with:
   [index.ts](C:/Users/hadiq/OneDrive/Desktop/yondelabs/supabase/functions/send-status-email/index.ts)
4. Click `Deploy`

Then set these secrets for the function:

| Name | Value |
|---|---|
| `RESEND_API_KEY` | your Resend API key |
| `WEBHOOK_SECRET` | a random secret string you choose |
| `FROM_EMAIL` | `YondeLabs Admissions <noreply@yondelabs.com>` |

Note:
- `DASHBOARD_URL` is no longer required for this version.
- The `WEBHOOK_SECRET` is not something Supabase gives you. You create it yourself and use the same value in the trigger/webhook header.

---

## Part 3 - Connect the database to the function

If the Supabase UI shows `Database -> Webhooks`, configure it there.

If that menu is missing, use SQL Editor and create the trigger manually.

### Option A - Database Webhooks UI

Use these settings:

| Field | Value |
|---|---|
| Name | `application-submission-email` |
| Table | `applications` |
| Events | `Insert` and `Update` |
| Method | `POST` |
| URL | `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-status-email` |
| Header | `Authorization: Bearer YOUR_WEBHOOK_SECRET` |

### Option B - SQL Editor

Open `SQL Editor -> New query` and run:

```sql
drop trigger if exists "application_email_webhook" on public.applications;

create trigger "application_email_webhook"
after insert or update
on public.applications
for each row
execute function supabase_functions.http_request(
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-status-email',
  'POST',
  '{"Content-Type":"application/json","Authorization":"Bearer YOUR_WEBHOOK_SECRET"}',
  '{}',
  '1000'
);
```

Replace:
- `YOUR_PROJECT_REF`
- `YOUR_WEBHOOK_SECRET`

The secret here must exactly match the `WEBHOOK_SECRET` you set on the Edge Function.

---

## Part 4 - Test it

Use one of these tests:

1. insert a new `applications` row with `status = 'submitted'`
2. update an existing `applications` row from `draft` to `submitted`

Before testing, make sure:
- `form_data.email` contains a real inbox you can access
- the Resend domain is verified

Expected result:
- the Edge Function runs
- one submission confirmation email is sent

Not expected:
- no email for `draft`
- no email for `interview`
- no email for `offer`
- no email for `rejected`

---

## Troubleshooting

### 401 Unauthorized

The `Authorization: Bearer ...` header does not match `WEBHOOK_SECRET`.

### 200 skipped

This is expected when:
- the row is still `draft`
- the status did not change
- the change was not a submission event
- `form_data.email` is missing

### No email arrives

Check:
- Resend domain verification
- Resend send logs
- Supabase Edge Function logs
- the email value inside `form_data.email`

---

## Reference

- Edge Function source:
  [index.ts](C:/Users/hadiq/OneDrive/Desktop/yondelabs/supabase/functions/send-status-email/index.ts)
- Resend docs: <https://resend.com/docs>
- Supabase database webhooks: <https://supabase.com/docs/guides/database/webhooks>
- Supabase edge functions: <https://supabase.com/docs/guides/functions>
