# Separate student portal credentials

The enrolled-student portal uses credentials that are separate from the
student's application account. Admins create a portal ID and temporary password;
no invitation email is sent.

## Apply the migration

Run this migration after course hours, milestones, and private student files:

```text
docs/sql/migrations/2026-07-31_add_separate_student_portal_accounts.sql
```

The migration:

- creates `student_portal_accounts`
- links one portal Auth identity to one application
- gives portal accounts read-only access to their linked course and visible files
- removes course/file access from the original application account
- adds the first-password-change completion function

## Server configuration

The protected credential endpoint requires these server environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never prefix it with `NEXT_PUBLIC_`
or expose it in browser code.

## Admin workflow

1. Open `/admin` and select the student.
2. Assign a course plan.
3. Open **Separate portal credentials**.
4. Select **Create portal credentials**.
5. Copy the portal ID and temporary password and give them directly to the student.
6. Close the panel only after saving the temporary password; it is never stored
   in readable form and cannot be viewed again.

If the student loses the password, select **Reset temporary password** and give
them the newly generated password.

## Student workflow

1. Open `/student/login`.
2. Enter the issued portal ID and temporary password.
3. Choose a new password on the required first-login screen.
4. Use `/student`, `/student/course`, and `/student/files`.

The portal login uses an internal Supabase Auth identity. It does not send mail
and cannot use email-based password recovery. An admin must reset a forgotten
password from the student profile.

## Verification

1. Assign a course to a test application.
2. Create portal credentials and save the temporary password.
3. Confirm the application account cannot read course or file records after the migration.
4. Sign in at `/student/login` with the new portal ID.
5. Confirm the temporary password is replaced before the portal opens.
6. Confirm the linked student sees only their own course and visible files.
7. Reset the password in admin and confirm the previous password stops working.
