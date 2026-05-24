# Supabase Migration Guide — Add Draft Status

**Migration:** `2026-05-24_add_draft_status.sql`
**Purpose:** Enable the new in-app application form (draft auto-save + native submission flow).
**Estimated time:** 5 minutes.

This guide is written for someone who has never run a Supabase SQL migration before. If anything in the steps looks different from what you see, stop and ping the engineer — don't guess.

---

## Why this migration is needed

Right now the `applications` table only allows four statuses:

```
submitted   →   interview   →   offer   /   rejected
```

The new in-app form needs a fifth status: **`draft`**. A `draft` row is created the moment a student starts filling out the form, and it's updated on every auto-save (every 2 seconds while typing). When the student finally clicks **Submit**, the same row flips from `draft` to `submitted`.

Without this migration:
- The auto-save will fail (the database will reject the unknown `draft` status).
- Students will not be able to start the new form.

Once this migration runs, everything just works.

---

## What this migration changes

Three small things — all additive, none destructive:

1. **Allow `draft` in the status check constraint.** Existing rows (currently `submitted` / `interview` / `offer` / `rejected`) are untouched.
2. **Add an index** on `(user_id, program, status)` so the app can quickly find a student's draft.
3. **Add an RLS policy** named `student_update_own_draft` that lets a logged-in student edit and submit *their own draft* — and only their own draft. They still cannot touch any other row.

The migration is **idempotent** — safe to run more than once. Each statement uses `IF EXISTS` / `IF NOT EXISTS` patterns.

---

## Step-by-step

### Step 1: Open the Supabase Dashboard

1. Go to <https://supabase.com/dashboard>.
2. Sign in.
3. Click the **YondeLabs** project (or whatever your project is named).

### Step 2: Open the SQL Editor

In the left sidebar, click the icon labeled **SQL Editor** (it looks like a database with `>_`).

Then click the green **+ New query** button at the top.

A blank text area will open on the right.

### Step 3: Paste the migration SQL

Open the file:

```
docs/sql/migrations/2026-05-24_add_draft_status.sql
```

in your code editor (Cursor, VS Code, etc.).

**Copy the entire file** — every line, including comments. Paste it into the SQL Editor text area in Supabase.

Don't worry if the comments look colored differently — Supabase highlights them. The actual SQL is what matters.

### Step 4: Run the migration

Click the green **Run** button in the bottom-right of the SQL Editor (or press **Cmd+Enter** on Mac / **Ctrl+Enter** on Windows).

You should see, at the bottom of the screen, three result blocks:

| Block | What it shows |
|---|---|
| 1st | `CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, …]))` — proves the CHECK constraint now allows `'draft'` |
| 2nd | A single row with `idx_applications_user_program_status` — proves the index exists |
| 3rd | A single row with `student_update_own_draft` and `UPDATE` — proves the new policy is active |

If you see all three blocks, **the migration succeeded.** You're done.

### Step 5 (optional sanity check): Test the constraint by hand

Still in the SQL Editor, paste this and click Run:

```sql
-- This SELECT should return 'draft' in the list of allowed values
SELECT pg_get_constraintdef(c.oid) AS allowed_statuses
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
WHERE t.relname = 'applications' AND c.conname = 'applications_status_check';
```

Expected output:

```
CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'interview'::text, 'offer'::text, 'rejected'::text]))
```

If you see `'draft'::text` in there, you're good.

---

## What if something looks wrong?

### "ERROR: constraint applications_status_check does not exist"

That's actually fine — the migration uses `DROP CONSTRAINT IF EXISTS`, so it will skip silently. Then it adds the new one. As long as the verification queries at the bottom return the expected rows, you're done.

### "ERROR: relation applications does not exist"

The base table was never created. You need to run the initial setup from `Spec.md` Section 3.1 first (`CREATE TABLE applications …`), then come back and run this migration.

### "ERROR: policy student_update_own_draft already exists"

Should not happen — the migration uses `DROP POLICY IF EXISTS` first. If it does happen, just re-run the file; the second run will succeed cleanly.

### Verification queries return zero rows

The migration didn't actually take. Check the SQL Editor for any red error messages above the result blocks. Most commonly: a typo introduced when copying. Re-paste the file fresh and run again.

### Anything else weird

Take a screenshot of the SQL Editor (showing the full query and the result/error) and send it. Don't run more SQL commands trying to "fix" it — better to read the actual state first.

---

## After the migration

Nothing more to do on Supabase. The app code will automatically:

- Create a `draft` row when a student opens a form for the first time
- Update that row every 2 seconds as they type
- Flip it to `submitted` (and set `submitted_at`) when they hit Submit at the end

Drafts stay forever unless the student finishes them — there is no cleanup job. That's intentional. Disk usage from JSON drafts is negligible.

---

## Where this lives in the repo

- **Migration SQL:** `docs/sql/migrations/2026-05-24_add_draft_status.sql`
- **This guide:** `docs/supabase-migration-guide.md`
- **Original schema spec:** `Spec.md` (Section 3.1)

When the next migration is needed, a new file will be added under `docs/sql/migrations/` with a date prefix, and this guide will get a new section linking to it.
