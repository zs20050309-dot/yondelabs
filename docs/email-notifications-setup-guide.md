# Email Notifications Setup Guide

**Feature:** Status-change emails — students get an email the moment an admin flips their application from `submitted` to `interview` / `offer` / `rejected`.

**Stack:** Resend (transactional email API) + Supabase Edge Function + Supabase Database Webhook.

**Total setup time:** ~30 minutes (mostly waiting for DNS verification).

**You only do this once.** After it's set up, sending emails happens automatically; no code change needed when admins update statuses in the panel.

---

## What you're building

```
Admin changes status in dashboard
        │
        ▼
applications row UPDATE in Supabase
        │
        ▼
Supabase Database Webhook fires (configured in dashboard UI)
        │  POST → Edge Function URL
        ▼
send-status-email Edge Function
        │  (decides if status change is "notifiable")
        ▼
Resend API call
        │
        ▼
Email arrives in student's inbox
```

---

## Before you start

You'll need these accounts. Sign up first if you don't have them:

| Service | URL | Free tier |
|---|---|---|
| Resend | <https://resend.com/signup> | 3,000 emails/month free |
| Supabase | <https://supabase.com> | Already set up (your existing project) |
| DNS for yondelabs.com | Wherever your domain is registered (Namecheap, Cloudflare, Squarespace, etc.) | — |

You'll also need access to your domain's DNS settings — wherever you bought `yondelabs.com`.

---

# Part 1 — Set up Resend

### Step 1.1: Sign up for Resend

1. Go to <https://resend.com/signup>.
2. Sign up with the email you want associated with the YondeLabs Resend account.
3. Verify the signup email.

### Step 1.2: Add `yondelabs.com` as a sending domain

1. In the Resend dashboard, click **Domains** in the left sidebar.
2. Click **+ Add Domain**.
3. Enter `yondelabs.com` (no `https://`, no slashes, just the domain).
4. Region: pick the one closest to your students (e.g., `us-east-1` for US, `eu-west-1` for Asia/EU).
5. Click **Add**.

Resend will show you several DNS records you need to add: typically one SPF, one MX, and three DKIM records.

**Keep this page open.** You'll come back to it after the next step.

### Step 1.3: Add the DNS records to your domain registrar

This is the most fiddly part. The exact UI depends on where you registered `yondelabs.com`.

For each row Resend gave you (SPF, MX, DKIM_1, DKIM_2, DKIM_3):

1. Open your domain's DNS management page.
2. Click "Add new record" (or similar).
3. Match the **Type** (TXT / MX / CNAME) from Resend.
4. Copy the **Host / Name** from Resend (often `send`, `resend._domainkey`, etc.).
5. Copy the **Value / Content** from Resend exactly. **Do not paste with extra spaces.**
6. Leave TTL at the default (usually 1 hour / 3600 seconds is fine).
7. Save.

**Common gotchas:**
- Some registrars auto-append your domain to the **Host** field. If Resend says `send.yondelabs.com`, you may need to enter just `send`. If it says `@`, you may need to enter `@` or leave blank.
- DKIM records are long — make sure you copy the *entire* value, including all characters at the end.
- Cloudflare users: set the proxy to **DNS only** (gray cloud, not orange) for these records.

### Step 1.4: Wait for verification

1. Go back to the Resend Domains page.
2. Click **Verify DNS Records** (or refresh — it auto-checks every few minutes).

DNS propagation can take 5 minutes to 48 hours, but is usually under 30 minutes. You can move on to Part 2 while you wait — but you cannot **test** until Resend says "verified" with a green check on all rows.

### Step 1.5: Create an API key

1. In Resend, click **API Keys** in the left sidebar.
2. Click **+ Create API Key**.
3. Name it `yondelabs-edge-function` (or any name you'll recognize).
4. Permission: **Sending access**.
5. Domain restriction: select `yondelabs.com` (so this key can only send from your domain — defense in depth).
6. Click **Add**.

**Copy the API key now (it starts with `re_...`)**. You will not be able to see it again — Resend hides it after this screen closes. If you lose it, just delete and create a new one.

Paste it somewhere safe for the next step (a sticky note, password manager — not a public Google Doc).

---

# Part 2 — Deploy the Edge Function to Supabase

### Step 2.1: Generate a webhook secret

This is a shared password between Supabase and the Edge Function. You'll create it now and use it in two places.

Open a terminal and run:

```bash
openssl rand -hex 32
```

You'll get something like `7a3f9c2e1b4d8a6f0e2d3c5b1a9f8e7d6c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f`. Copy this value somewhere safe.

If you don't have `openssl` or don't want to use a terminal, use <https://www.random.org/strings/?num=1&len=64&digits=on&upperalpha=on&loweralpha=on> — set length 64.

### Step 2.2: Create the function in Supabase

1. Open <https://supabase.com/dashboard> and pick the YondeLabs project.
2. In the left sidebar, click **Edge Functions**.
3. Click **+ Create a new function**.
4. Name: `send-status-email` (must match exactly — the code expects this name).
5. Verify JWT: **OFF**. Supabase webhooks don't carry a Supabase JWT, so we authenticate with our own shared secret instead.
6. Click **Create function**.

A code editor opens with default boilerplate.

### Step 2.3: Paste the function code

1. Open the file in this repo: `supabase/functions/send-status-email/index.ts`.
2. Select all (Cmd+A / Ctrl+A) → copy.
3. In the Supabase web editor: select all the boilerplate → paste over it with our code.
4. Click **Deploy function** (top right).

Wait for "Deployed successfully" — usually under 30 seconds.

### Step 2.4: Set environment secrets

1. Still in the function page, click **Secrets** (left submenu under your function).
2. Click **+ Add new secret** four times, adding:

| Name | Value |
|---|---|
| `RESEND_API_KEY` | The `re_...` key from Resend Step 1.5 |
| `WEBHOOK_SECRET` | The 64-char random string from Step 2.1 |
| `DASHBOARD_URL` | `https://yondelabs.com/dashboard` (or your staging URL if testing) |
| `FROM_EMAIL` | `YondeLabs Admissions <noreply@yondelabs.com>` |

3. Click **Save** after each one.

### Step 2.5: Copy your function URL

At the top of the function page, you'll see a URL like:

```
https://abcdefghij.supabase.co/functions/v1/send-status-email
```

Copy this. You need it in Part 3.

---

# Part 3 — Hook up the Database Webhook

### Step 3.1: Create the webhook

1. In the Supabase dashboard, click **Database** in the left sidebar.
2. Click **Webhooks** (under Database — *not* "Webhooks" under Auth, which is different).
3. Click **Create a new hook**.

Fill out the form:

| Field | Value |
|---|---|
| Name | `application-status-changed` |
| Table | `applications` |
| Events | check only **Update** |
| Type of webhook | **HTTP Request** |
| Method | `POST` |
| URL | The function URL from Step 2.5 |
| HTTP Headers | Add one: `Authorization` = `Bearer <your WEBHOOK_SECRET from 2.1>` |

For the **Conditions** section, you *could* filter to "only when status changes" here, but our Edge Function already does that check, so leave conditions empty. Belt + suspenders is fine.

### Step 3.2: Save and verify

1. Click **Create webhook**.
2. The webhook should appear in the list with a green "Active" indicator.

---

# Part 4 — Test it

### Step 4.1: Create or pick a test application

Easiest option: in the Supabase **Table Editor**, open the `applications` table. You should see at least one row (from a real student submission, or insert a test row manually if needed).

### Step 4.2: Flip the status

1. Pick a row where `status = 'submitted'`.
2. Make sure `form_data.email` contains an email address you can check (you can edit the `form_data` cell to point it at your own inbox for testing).
3. Change the `status` cell to `interview`.
4. Save.

Within about 5–10 seconds, you should:

1. See the webhook fire (Supabase → Webhooks → click the hook → "Logs" tab — there should be a new entry with status 200).
2. See an entry in Edge Functions → Logs for `send-status-email`.
3. Receive the email at the address from `form_data.email`.

### Step 4.3: Repeat for `offer` and `rejected`

Flip the same row through `offer` and `rejected`, confirming each one fires an email and the wording is correct.

---

## Troubleshooting

### Webhook fires but no email arrives

1. **Check Resend logs.** Resend → **Emails** in the left sidebar. Recent sends are listed there with status. If the send shows as `bounced` or `complained`, the recipient's email server rejected it.
2. **Check spam folder.** If a brand-new sender domain, first emails sometimes land in spam until reputation builds. Mark as "Not Spam" to train.
3. **Verify DNS again.** Resend → Domains. If anything went from green to red, fix it.
4. **Check Edge Function logs.** Supabase → Edge Functions → `send-status-email` → Logs. Look for `Email send failed`. If yes, the error detail will say why (usually invalid API key or unverified domain).

### Webhook doesn't fire at all

1. **Confirm the webhook is enabled.** Database → Webhooks. Toggle should be green.
2. **Confirm the table and event.** Should be `applications` table, `Update` event only.
3. **Manual trigger.** Click the webhook → "Test" tab → "Send test". This sends a fake payload — useful to verify the function URL and auth header are correct.

### Edge Function returns 401 Unauthorized

The webhook secret doesn't match. Most likely either:
- The `Authorization` header value isn't `Bearer <secret>` (case-sensitive, space matters).
- The `WEBHOOK_SECRET` env var on the function doesn't exactly match what's in the webhook's Authorization header.

Re-copy both from your stored value. Whitespace or a stray newline at the end is the usual culprit.

### Edge Function returns 200 but with `skipped: ...` in the body

This is **expected behavior** for these cases:
- Status didn't actually change (e.g., the row was updated for some other reason).
- Status changed to `draft` or `submitted` (not notifiable).
- `form_data.email` is empty.

No email gets sent. Not a bug.

### Email lands in spam consistently

Several reasons:
- **DNS records didn't all verify.** Re-check Resend → Domains. Every row must be green.
- **Sender reputation is low** (brand-new domain). Resolves itself over a few days of legitimate sending. Don't send bulk in this period.
- **Email content triggers spam filters.** Our templates are plain text and short, which should be fine, but if you customize them, avoid spam-trigger words (FREE, GUARANTEED, etc.).
- **Add a `Reply-To` header.** Future improvement: add `Reply-To: info@yondelabs.com` so students can reply directly. Quick edit to the Edge Function.

---

## Cost expectations

Resend free tier covers **3,000 emails/month and up to 100 emails/day**. With 4 programs and small cohorts, you're realistically well under 100 status-change emails per week. The free tier will outlast MVP.

If you exceed it, the next tier is $20/month for 50,000 emails — still trivial.

---

## What's intentionally *not* set up

- **HTML / branded emails.** First version is plain text. Looks fine on every client, never breaks. When you want branded HTML, edit the Edge Function `TEMPLATES` to add an `html:` field and pass it in the Resend payload.
- **`submitted` confirmation email.** When a student first submits, no email is sent — the dashboard already says "Application Submitted." If you want a confirmation email anyway, extend the function's notifiable list and add a 4th template.
- **Reply-to.** Currently `noreply@`. If you want students replying to thread with admissions, change `FROM_EMAIL` to a monitored address, or add a `reply_to` field in the Resend payload.
- **Internationalization.** All emails are English-only per project policy.
- **Retry on failure.** If Resend fails (rare), no automatic retry. Supabase webhooks have a retry button in the dashboard. Acceptable for current volume.

---

## Reference

- Edge Function source: `supabase/functions/send-status-email/index.ts`
- Resend docs: <https://resend.com/docs>
- Supabase Database Webhooks: <https://supabase.com/docs/guides/database/webhooks>
- Supabase Edge Functions: <https://supabase.com/docs/guides/functions>
