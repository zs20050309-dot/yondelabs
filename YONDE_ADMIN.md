# YONDE_ADMIN.md — YondeLabs Admissions Admin

This file is the admin-module companion to `CLAUDE.md`. Read both before changing admissions workflow code.

## Progress Tracking

After every admin change, update `progress.md` with:

- files created or modified
- behavior changes
- database migrations required
- build or verification results
- deferred work and external setup

## Scope

The admin portal lives inside the existing Next.js Pages Router application at `/admin`.
Do not create a second repository or a separate frontend for the admissions workflow.

### Admin files

```text
pages/admin/index.jsx                         Admin dashboard
components/admin/ApplicationDetail.jsx       Profile, progress, and form answers
components/admin/CoursePlanManager.jsx       Reusable plans and module hours
components/admin/StudentCourseHours.jsx      Assignment and class logging
components/portal/CourseHours.jsx            Student read-only hours section
pages/api/admin/applications/[id]/pdf.js      Protected PDF download endpoint
styles/admin.module.css                      Admin-only minimal UI
styles/courseHours.module.css                 Shared course-hours portal UI
lib/admin/applicationPdf.js                   Schema-driven PDF generator
lib/admin/stages.js                          Stage, program, and label definitions
lib/courseHours.js                            Minute conversion and total helpers
docs/sql/migrations/2026-07-16_add_admin_application_progress.sql
                                               History table, policies, and stage RPC
docs/sql/migrations/2026-07-22_add_course_hours_tracking.sql
                                               Plans, modules, enrollments, sessions, RLS
docs/sql/migrations/2026-07-23_add_course_milestones_and_minimum_hours.sql
                                               Overage policy, milestones, limits, RLS
proxy.js                                      Admin route protection
pages/login.jsx                               Admin login redirect
```

## Current Admin Features

- Lists all non-draft applications, newest first.
- Searches by student name, email, or program.
- Filters by current stage.
- Shows counts for all, new, in-progress, and archived applications.
- Opens the complete student profile without leaving the applications page.
- Renders submitted answers from `lib/forms/schema.js`.
- Moves applications through `submitted -> interview -> offer`.
- Archives applications by moving them to `rejected`.
- Restores archived applications to `submitted`.
- Records every move in `application_stage_history`.
- Shows the date and time each recorded stage was completed.
- Downloads a formatted PDF of any submitted application.
- Automatically emails each submitted application PDF to `ashlyndong@gmail.com`.
- Creates reusable course plans with custom modules and planned hours.
- Assigns a plan and custom total-hour allocation to a student.
- Logs each completed class by module, date/time, duration, and notes.
- Shows used and allocated hours for every assigned student in the main table.
- Lets students see allocated, used, remaining, module, and class-history details.
- Supports either a fixed hour limit or a minimum-hours policy that permits additional classes.
- Defines ordered milestones per plan and tracks each student's milestone status.
- Sends the offer contract from a DocuSign template when an admin advances an interviewed application to Offer.
- Tracks DocuSign Sent, Delivered, Completed, Declined, and Voided events in the student profile.

## Stage Contract

The current database-compatible stages are:

```text
draft       Student-only, never shown in admin admissions list
submitted   New application awaiting review
interview   Interview invitation/scheduling phase
offer       Offer sent
rejected    Archived application
```

Do not add a new status only in the admin UI. The following must stay aligned:

- `applications_status_check` in Supabase
- `lib/admin/stages.js`
- `components/portal/StatusTracker.jsx`
- `pages/dashboard.jsx`
- interview Edge Functions
- `advance_application_stage` SQL function

## Data Model

`applications.status` remains the current stage so the student portal and existing automations continue to work.

`application_stage_history` is the permanent progress log:

```text
id
application_id
from_status
to_status
changed_at
changed_by
note
```

Stage movement must use the `advance_application_stage` RPC. Do not update `applications.status` directly from admin UI code. The function locks the application, updates its status, and inserts the history row in one transaction.

The interview-to-offer transition is the exception: it must use the protected
`/api/admin/applications/[id]/send-offer` endpoint. That endpoint sends the
DocuSign envelope and then calls `record_docusign_offer`, which records the
envelope and advances the stage transactionally.

## DocuSign offer contracts

Run this migration after the admin progress migration:

```text
docs/sql/migrations/2026-07-29_add_docusign_offer_contracts.sql
```

`application_contracts` stores one offer envelope per application, including
the recipient, template, envelope ID, current signing status, and event dates.
The browser never receives DocuSign API credentials.

Required server-side configuration and the complete activation checklist are
documented in:

```text
docs/docusign-offer-automation-guide.md
```

The Connect listener is `/api/docusign/connect`. It requires a valid DocuSign
HMAC signature and uses the Supabase service role only on the server to update
envelope status. Do not move any DocuSign or service-role secret into client
code.

## Form Rendering

`lib/forms/schema.js` is the single source of truth for application questions. Admin profile views must iterate through `schema.steps[].fields[]`; do not duplicate form questions in admin components.

Programs without a local schema fall back to rendering the raw `form_data` keys.

## Application PDFs

The admin download endpoint verifies the Supabase access token and admin role before loading an application. It generates the PDF in memory and returns it with `Cache-Control: private, no-store`; PDFs are not saved publicly or persisted in the database.

After a successful application submission, the form calls the protected
`/api/applications/[id]/submission-notification` endpoint. It verifies the
student owns the submitted application, generates the PDF in memory, and emails
it to `ashlyndong@gmail.com` through Resend.

The `send-status-email` Supabase Edge Function remains the student-confirmation
sender and database-webhook fallback. It sends:

1. the existing confirmation email to the student, when the form email is valid
2. a fallback internal email with the PDF attachment to `ashlyndong@gmail.com`

Both internal paths use `application-pdf/<application-id>` as the Resend
idempotency key. Configure the same `RESEND_API_KEY` and verified `FROM_EMAIL`
in Vercel and Supabase. Redeploy `send-status-email` in Supabase after changing
the function.

## Authentication and Authorization

The route middleware and UI accept the admin role from:

1. `user.app_metadata.role` — preferred
2. `user.user_metadata.role` — temporary backwards-compatible fallback

The database function performs the same check using the authenticated JWT. New admin accounts should place the role in protected `app_metadata`, not editable user metadata.

The browser uses the normal Supabase anonymous client plus the logged-in session. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Required Database Setup

Run this migration in the Supabase SQL Editor before using `/admin`:

```text
docs/sql/migrations/2026-07-16_add_admin_application_progress.sql
```

The migration:

- creates `application_stage_history`
- backfills a submitted event for existing non-draft applications
- grants admins read access to all applications and history
- creates the transactional stage movement function

It does not deploy automatically when the frontend is pushed.

## Course Plans and Hours

Run this migration after the admin progress migration:

```text
docs/sql/migrations/2026-07-22_add_course_hours_tracking.sql
```

The course-hours model has six tables:

```text
course_plans                  Reusable course definition
course_modules                Ordered modules and planned minutes
student_course_enrollments    Student assignment and allocated minutes
class_sessions                Dated class usage entries
course_milestones             Ordered progress stages for a plan
student_milestone_progress    Per-student milestone status
```

Time is stored as integer minutes to prevent decimal rounding problems. The portal converts minutes into hours for display.

After the base course-hours migration, run:

```text
docs/sql/migrations/2026-07-23_add_course_milestones_and_minimum_hours.sql
```

Each course plan has an `allow_overage` policy:

- **Off:** allocated hours are a hard limit. Database triggers reject class entries that would exceed the allocation.
- **On:** allocated hours are the minimum requirement. Classes may continue after the minimum until the work and milestones are complete.

The database also prevents lowering a fixed allocation below hours already used and prevents changing an overage plan into a hard-limit plan while a student is already above the minimum.

### Admin workflow

1. Open `/admin` and select **Manage course plans**.
2. Create a plan, choose whether its hours are fixed or a minimum, then add modules and expected hours.
3. Add ordered milestones such as Research question set, Methodology confirmed, First draft, and Paper completed.
4. Open a student's profile and assign the plan with an allocation and start date.
5. Update that student's milestone statuses from Not started to In progress or Completed.
6. After every class, select the module and record the class date/time, hours used, and notes.
7. Correct a mistake by deleting the class entry and adding it again.
8. Pause, resume, or complete the student's course enrollment as needed.

### Student behavior

The student dashboard shows no course section until an enrollment exists. Once assigned, it displays:

- total allocated hours
- hours used from class-session entries
- remaining hours
- overall usage percentage
- planned and used hours by module
- dated class history
- current milestone and the full milestone timeline

Students have read-only RLS access to their own enrollment, assigned plan/modules, sessions, milestones, and milestone progress. Only admins can create or modify these records. The `set_student_milestone_status` RPC also ensures only one milestone is marked In progress at a time.

## Deferred Admin Work

- Days since last action / progress time checks
- Completed/joined program category and final enrollment stage
- Mentor directory and student assignments
- Internal notes and archive reasons
- Bulk actions and exports

The next requested phase is progress time checking. It should be derived from the latest `application_stage_history.changed_at`, not maintained as a manually editable number.

## Verification

For every admin change:

1. Run `npm.cmd run build`.
2. Confirm a non-admin cannot access `/admin`.
3. Confirm an admin can list all non-draft applications.
4. Move a test application and confirm both `applications.status` and `application_stage_history` change.
5. Confirm moving to `interview` still triggers the existing interview workflow after its external webhook setup is complete.
6. Create a course plan and confirm its module total is correct.
7. Assign the plan to a test student and log a class.
8. Confirm the admin table and student dashboard show the same used-hour total.
9. Confirm a fixed-hours plan rejects a class that exceeds the allocation.
10. Confirm a minimum-hours plan displays additional hours after its minimum is fulfilled.
11. Update a milestone and confirm the student dashboard shows the new status.
