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
components/admin/StudentFiles.jsx            Per-student course file management
components/admin/StudentPortalAccess.jsx     Portal ID and password management
components/admin/CurrentStudents.jsx          Current-student list and CSV onboarding
components/portal/CourseHours.jsx            Student read-only hours section
components/portal/StudentFiles.jsx            Student read-only files section
components/portal/StudentPortalShell.jsx      Shared student portal page shell
pages/student/index.jsx                       Student portal overview
pages/student/course.jsx                      Dedicated student course page
pages/student/files.jsx                       Dedicated student files page
pages/student/login.jsx                       Separate portal-ID sign in
pages/student/set-password.jsx                Required first-login password change
pages/api/admin/applications/[id]/pdf.js      Protected PDF download endpoint
pages/api/admin/applications/[id]/portal-access.js
                                               Server-only credential creation/reset
pages/api/admin/current-students/import.js     Protected current-student CSV import
styles/admin.module.css                      Admin-only minimal UI
styles/courseHours.module.css                 Shared course-hours portal UI
styles/studentPortal.module.css               Student portal page layout
lib/admin/applicationPdf.js                   Schema-driven PDF generator
lib/admin/stages.js                          Stage, program, and label definitions
lib/admin/currentStudents.js                  CSV parsing and program normalization
lib/courseHours.js                            Minute conversion and total helpers
lib/portal/useStudentPortal.js                Shared student auth/application loader
docs/sql/migrations/2026-07-16_add_admin_application_progress.sql
                                               History table, policies, and stage RPC
docs/sql/migrations/2026-07-22_add_course_hours_tracking.sql
                                               Plans, modules, enrollments, sessions, RLS
docs/sql/migrations/2026-07-23_add_course_milestones_and_minimum_hours.sql
                                               Overage policy, milestones, limits, RLS
docs/sql/migrations/2026-07-30_add_student_files.sql
                                               Private file bucket, metadata, and RLS
docs/sql/migrations/2026-07-31_add_separate_student_portal_accounts.sql
                                               Separate portal identities and RLS
docs/sql/migrations/2026-08-01_add_current_students.sql
                                               Non-application students and mentors
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
- Uploads private files for an enrolled student and controls student visibility.
- Shows students their own course documents through expiring signed downloads.
- Separates the student experience into Overview, My course, and Files pages.
- Creates a separate portal ID and temporary password without sending an invitation email.
- Forces students to replace the temporary password on their first portal sign-in.
- Keeps existing students in a separate **Current students** admin section.
- Imports current students from CSV without creating application records.
- Normalizes `IRP-Game` to `IRP` and imports mentors and hour allocations.
- Exports newly generated portal credentials once as a local CSV download.

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

If the removed DocuSign migration was previously applied to Supabase, run
`docs/sql/migrations/2026-07-31_remove_docusign_offer_contracts.sql` once to
remove its unused contract table and database function.

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

Enrolled students use a separate Supabase Auth identity whose protected
`app_metadata.role` is `student_portal`. Students sign in with a generated
portal ID instead of an email address. The server translates that ID to a
non-public internal Auth email, while the browser and admin UI display only the
portal ID. The service-role key creates and resets these accounts only inside
the protected admin API route.

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

After the course, milestone, and file migrations, run:

```text
docs/sql/migrations/2026-07-31_add_separate_student_portal_accounts.sql
```

This creates `student_portal_accounts`, replaces the former application-account
course/file read policies, and links all student learning access to the separate
portal identity.

For students who did not apply through this website, then run:

```text
docs/sql/migrations/2026-08-01_add_current_students.sql
```

This adds `current_students`, mentors, mentor assignments, hour-allocation
breakdowns, and current-student links on enrollments and portal accounts. It
extends portal RLS so application-based and directly onboarded students can use
the same course, milestone, session, and file features.

### Importing existing students

1. Open `/admin` and choose **Current students**.
2. Select **Import CSV** and choose the source spreadsheet exported as CSV.
3. Review the normalized programs, hours, mentors, and validation warnings.
4. Import the valid rows, then download the credentials CSV immediately.

The importer intentionally ignores any source password column. Strong temporary
passwords are generated on the server, while the downloadable credential file
is created only in the browser. Rows without an email are supported because
students sign in with portal IDs. Imported students never appear under
Applications.

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

The application account and student portal account are separate. The student
portal uses these protected routes:

- `/dashboard` shows the application summary, admissions progress, and links into the learning workspace.
- `/student/login` accepts the administrator-issued portal ID and password.
- `/student` is the enrolled-student overview.
- `/student/course` shows the assigned plan and:

- total allocated hours
- hours used from class-session entries
- remaining hours
- overall usage percentage
- planned and used hours by module
- dated class history
- current milestone and the full milestone timeline

- `/student/files` shows private course materials, mentor feedback, and templates shared with the student.

Portal accounts have read-only RLS access to the linked application,
enrollment, assigned plan/modules, sessions, milestones, milestone progress,
and visible files. The original application account does not receive course or
file access. Only admins can create or modify these records.

## Private student files

Run this migration after the base course-hours migration:

```text
docs/sql/migrations/2026-07-30_add_student_files.sql
```

It creates the private `student-files` Supabase Storage bucket and the
enrollment-linked `student_files` metadata table. The bucket permits supported
documents and images up to 20 MB.

Admins manage files inside each student profile. Students see only visible
files associated with their own enrollments on `/student/files`. Storage RLS and
metadata RLS both enforce ownership; the UI uses short-lived signed download
URLs and never creates public file URLs.

Setup and verification:

```text
docs/student-files-setup-guide.md
docs/student-portal-credentials-setup.md
```

## Deferred Admin Work

- Days since last action / progress time checks
- Completed/joined program category and final enrollment stage
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
8. Confirm the admin table and `/student/course` show the same used-hour total.
9. Confirm a fixed-hours plan rejects a class that exceeds the allocation.
10. Confirm a minimum-hours plan displays additional hours after its minimum is fulfilled.
11. Update a milestone and confirm `/student/course` shows the new status.
12. Upload a test file and confirm only the assigned student can download it.
13. Hide the test file and confirm it disappears from the student portal.
14. Create portal credentials and confirm the temporary password is shown once.
15. Confirm first sign-in requires a new password before `/student` opens.
