# Private student files setup

This feature lets admins upload course files for an individual enrolled student.
Students see only their own visible files under **Files and Materials** in the
student dashboard.

## Apply the migration

Run this file in the Supabase SQL Editor after the course-hours migration:

```text
docs/sql/migrations/2026-07-30_add_student_files.sql
```

The migration creates:

- a private `student-files` Storage bucket
- the `student_files` metadata table
- a 20 MB file limit
- a restricted document/image MIME allowlist
- admin upload, update, download, and delete policies
- student read policies tied to application ownership and course enrollment

The bucket must remain private. Do not enable **Public bucket** in Supabase.

## Admin workflow

1. Open `/admin`.
2. Open a student profile.
3. Assign a course plan if the student does not have an enrollment.
4. Open **Files and materials**.
5. Choose the course enrollment if the student has more than one.
6. Choose a file, title, description, and student visibility.
7. Select **Upload file**.

Admins can download, hide/show, or permanently delete each uploaded file.

## Student workflow

The student dashboard shows **Files and materials** only after a course
enrollment exists. Visible files show their title, course, size, date,
description, and Download action.

Downloads use short-lived signed URLs. Students cannot list or download:

- another student's files
- hidden files
- files from a public bucket URL

## Allowed files

- PDF
- JPEG, PNG, and WebP images
- plain text and CSV
- Word documents
- Excel spreadsheets
- PowerPoint presentations

Each file must be 20 MB or smaller.

## Verification

1. Upload a test PDF for one enrolled student.
2. Confirm it appears in that student's dashboard.
3. Sign in as a different student and confirm it is not visible.
4. Hide the file in admin and confirm it disappears for the assigned student.
5. Show it again and confirm Download works.
6. Delete it and confirm both the metadata row and Storage object are removed.
