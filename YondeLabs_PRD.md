# YondeLabs Student Application Portal — Product Requirements Document (PRD)
**Version:** 1.0 | **Date:** May 2026  
**Owner:** Assisi  
**Status:** 🟡 Awaiting approval before development begins  
**Collaborator:** Ashlyn (Product Pages & Application Form)

---

## 1. Product Overview

### 1.1 Problem Statement

YondeLabs currently collects student applications via a Google Form. This creates three critical problems:

1. **No identity** — there is no account system, so students cannot return to check their status. Every follow-up requires a manual email.
2. **No visibility** — once a student submits, they have zero insight into what happens next. This increases anxiety and inbound support messages.
3. **No control** — the admissions team cannot update a student's status in a structured way; all communication is ad-hoc.

### 1.2 Solution

A full-stack student application portal that replaces the Google Form workflow with a professional, account-based system. Students register with their email, complete a structured application, and track their progress through the admissions pipeline — just like a university application portal or a corporate recruitment system (reference: ByteDance campus recruitment, Alibaba recruitment portal).

### 1.3 Product Positioning

> "The application experience should feel as credible as the program itself."

Students applying to YondeLabs are high-achieving international high schoolers and their parents. They have seen university application portals. A Google Form signals amateur. A professional portal with email verification, a progress dashboard, and clear stage transitions signals institutional seriousness — which is central to the YondeLabs brand.

### 1.4 Scope of This PRD

This PRD covers **Assisi's scope only**: the authentication system, student dashboard, and admin panel. Ashlyn's product pages and application form are a separate workstream but are documented at the integration points.

---

## 2. Users & Goals

### 2.1 User Personas

**Primary User — Applicant Student**
- International high school student, age 15–18
- Primarily from China, Southeast Asia, international schools
- English proficient
- Likely applying to multiple programs; used to forms and portals
- Goal: Submit application quickly, then get clear updates without having to email anyone

**Secondary User — Parent / Guardian**
- Often the one initiating the application process
- Wants reassurance that the process is legitimate and structured
- Goal: See that their child's application is "in the system"

**Internal User — YondeLabs Admissions Team (Admin)**
- Small team (1–3 people)
- Non-technical; cannot operate a database directly
- Goal: See all applications, change a student's status (Submitted → Interview → Offer/Rejected), and have that change be immediately visible to the student

### 2.2 User Goals by Role

| Role | Primary Goal | Secondary Goal |
|---|---|---|
| Student | Submit application, track status | Receive offer notification |
| Admin | Review applications, update status | See application data cleanly |
| Parent | (Passive) Know application was received | (None — no dedicated parent view in MVP) |

---

## 3. User Flows

### 3.1 New Student Registration Flow

```
Land on yondelabs.com
    ↓
Click "Apply Now" on any product page
    ↓
Redirect to /login
    ↓
Click "Create an account"
    ↓
/register — enter email + password
    ↓
Supabase sends verification email
    ↓
Student clicks link in email → email verified
    ↓
Redirect to /apply (application form — Ashlyn's scope)
    ↓
Student completes form, submits
    ↓
Redirect to /dashboard
    ↓
Status shown: "Application Submitted"
```

### 3.2 Returning Student Flow

```
Visit yondelabs.com or /login directly
    ↓
Enter email + password
    ↓
If verified → /dashboard
If not verified → prompt to resend verification email
    ↓
Dashboard shows current status
```

### 3.3 Admin Flow

```
Navigate to /admin (not linked from public nav)
    ↓
Login with admin credentials (separate from student accounts)
    ↓
See table of all applications
    ↓
Click a student → see their full application data
    ↓
Change status dropdown → Save
    ↓
Student's dashboard immediately reflects new status
```

### 3.4 Status Transition Map

```
[Submitted] → [Interview Scheduled] → [Offer Sent] 
                                     → [Rejected]
```

Admins can move a student forward or mark as rejected at any stage. Students can only read their status, never change it.

---

## 4. Feature Requirements

### 4.1 Authentication System

#### FR-AUTH-01: Email Registration
- Student enters email + password
- Password minimum: 8 characters
- Supabase Auth handles password hashing — no custom crypto
- On submit: Supabase sends a verification email automatically
- Student cannot access `/dashboard` or `/apply` until email is verified
- If unverified student tries to access protected pages: redirect to `/login` with message "Please verify your email first. [Resend verification email]"

#### FR-AUTH-02: Email Verification
- Verification link in email redirects to `/dashboard` upon success
- Link expires after 24 hours (Supabase default)
- Student can request a new verification email from the login page

#### FR-AUTH-03: Login
- Email + password login
- Failed login: show generic "Incorrect email or password" (never specify which is wrong — security best practice)
- After 5 failed attempts: show "Too many attempts, please try again in a few minutes" (Supabase handles rate limiting)
- Successful login: redirect to `/dashboard`

#### FR-AUTH-04: Password Reset
- "Forgot password?" link on login page
- Student enters email → Supabase sends reset link
- Reset link valid for 1 hour

#### FR-AUTH-05: Session Management
- Sessions persist across browser refreshes (Supabase default)
- "Log out" button in dashboard header
- Protected routes (`/dashboard`, `/apply`, `/admin`) redirect to `/login` if session is absent

### 4.2 Student Dashboard (`/dashboard`)

#### FR-DASH-01: Application Status Display
The dashboard is the student's single source of truth. It must show:

**Status Progress Tracker** — a horizontal stepper with 4 stages:
```
● Submitted  →  ○ Interview  →  ○ Offer  →  ○ Complete
```
The active stage is highlighted. Completed stages use a filled/checked state.

**Status stage definitions:**

| Status (DB value) | Display Label | Message shown to student |
|---|---|---|
| `submitted` | Application Submitted | "We've received your application. Our team will review it and reach out within 2 weeks." |
| `interview` | Interview Scheduled | "Congratulations! You've been selected for an interview. Our team will contact you shortly to schedule." |
| `offer` | Offer Sent | "You've been admitted! Please check your email for your official offer and next steps." |
| `rejected` | Application Reviewed | "Thank you for applying. After careful review, we are unable to offer you a place at this time." |

Note: `rejected` uses a neutral label. Do not display the word "Rejected" to the student.

#### FR-DASH-02: Application Summary
Below the status tracker, show a read-only summary of what the student submitted:
- Program applied for (e.g., "Research Scholar Program — Summer 2026")
- Submission date
- Application email on file
- A note: "To make changes to your application, please contact us at [email]"

#### FR-DASH-03: No Application State
If a logged-in student has not yet submitted an application:
- Show: "You haven't submitted an application yet."
- CTA button: "Start Your Application" → links to `/apply`

#### FR-DASH-04: Header
- YondeLabs logo (top left)
- Student's preferred name or email (top right)
- "Log out" link

### 4.3 Application Form Integration (Ashlyn's Scope — Interface Only)

This section documents the contract between Assisi and Ashlyn's work.

#### FR-FORM-01: Pre-filled Email Field
The application form (built by Ashlyn) must read the logged-in user's email from Supabase Auth and pre-populate the email field. The field remains editable — it is a suggestion, not a lock.

Implementation: Ashlyn calls `supabase.auth.getUser()` on form load and sets the email field's default value from `user.email`.

#### FR-FORM-02: Form Submission → Database Write
On submit, Ashlyn's form writes to the `applications` table with the following required fields:

```js
{
  user_id: supabase.auth.getUser().id,   // auto-linked to the account
  program: 'ra',                          // or 'irp', 'passion-project', 'isef'
  status: 'submitted',                    // always 'submitted' on first insert
  submitted_at: new Date().toISOString(),
  form_data: { /* all form answers as JSON */ }
}
```

#### FR-FORM-03: Post-Submission Redirect
After successful database write, Ashlyn's form redirects to `/dashboard`.

### 4.4 Admin Panel (`/admin`)

#### FR-ADMIN-01: Access Control
- Admin accounts are separate Supabase Auth users with a role flag
- Admin login uses the same `/login` page but redirects to `/admin` instead of `/dashboard` based on role
- No public link to `/admin` exists anywhere on the site
- Non-admin users who navigate to `/admin` are redirected to `/dashboard`

#### FR-ADMIN-02: Application List View
A table showing all applications with columns:
- Student name (from `form_data.preferred_name` or `full_name`)
- Email
- Program applied for
- Submission date
- Current status (color-coded badge)
- Action button: "View / Edit"

Default sort: newest submission first.

#### FR-ADMIN-03: Application Detail View
Clicking a student opens a detail panel (or new page) showing:
- All form fields rendered in a readable format (not raw JSON)
- Current status
- Status change dropdown: `Submitted | Interview Scheduled | Offer Sent | Rejected`
- "Save Status" button
- Change is written immediately to the `applications` table

#### FR-ADMIN-04: Admin UI Quality Expectation
The admin panel does not need to be beautiful. It needs to be functional, readable, and impossible to break accidentally. Priority: clarity over aesthetics.

---

## 5. Database Schema

Managed by Assisi in Supabase. This is the single source of truth.

### `applications` table

```sql
CREATE TABLE applications (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  program       TEXT NOT NULL CHECK (program IN ('ra', 'irp', 'passion-project', 'isef')),
  status        TEXT NOT NULL DEFAULT 'submitted' 
                  CHECK (status IN ('submitted', 'interview', 'offer', 'rejected')),
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  form_data     JSONB NOT NULL DEFAULT '{}'
);
```

### `form_data` JSONB field — expected keys (RA program)

The following keys are expected inside `form_data` for the RA application. Ashlyn must use these exact key names.

```json
{
  "full_name": "string",
  "preferred_name": "string",
  "gender": "string",
  "birthdate": "YYYY-MM-DD",
  "school": "string",
  "grade": "string",
  "graduation_year": "number",
  "email": "string",
  "messaging_platform": "string",
  "country_of_residence": "string",
  "citizenship": "string",
  "city": "string",
  "timezone": "string",
  "cohort": "2026 Summer Cohort | 2026 Fall Cohort | Other",
  "intended_period": "string",
  "research_area": "string",
  "specific_interests": "string",
  "why_interested": "string",
  "why_fit": "string",
  "gpa": "string",
  "standardized_tests": "string",
  "how_heard": "string",
  "us_visa": "yes | no",
  "preferred_university_lab": "string",
  "english_proficiency": "string",
  "parent_name": "string",
  "parent_email": "string",
  "additional_notes": "string"
}
```

### Row-Level Security (RLS) Policies

```sql
-- Students can only read their own application
CREATE POLICY "student_read_own" ON applications
  FOR SELECT USING (auth.uid() = user_id);

-- Students can only insert their own application  
CREATE POLICY "student_insert_own" ON applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can read all applications (admin role check via custom claim)
CREATE POLICY "admin_read_all" ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Admins can update status only
CREATE POLICY "admin_update_status" ON applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users  
      WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    )
  );
```

---

## 6. Non-Functional Requirements

### 6.1 Performance
- Dashboard must load within 2 seconds on a standard broadband connection
- No requirement for offline support

### 6.2 Security
- All routes that require authentication must verify session server-side (Next.js `getServerSideProps` or middleware)
- Never trust client-side session state alone for access control
- Admin routes protected by both session check AND role check
- Supabase RLS enforced as a second layer of protection

### 6.3 Accessibility
- All form fields have associated `<label>` elements
- Error messages are announced to screen readers (use `role="alert"`)
- Keyboard navigable: tab order follows visual order
- Color is never the only indicator of state (status tracker uses both color + icon + text)

### 6.4 Mobile Responsiveness
- Login, Register, and Dashboard pages must be fully usable on mobile (375px viewport minimum)
- Admin panel: desktop-first, mobile is nice-to-have, not required for MVP

### 6.5 Browser Support
- Chrome, Safari, Firefox, Edge — latest 2 versions
- No IE support

---

## 7. Design Requirements

### 7.1 Brand Alignment
The portal pages (login, register, dashboard) must visually match the YondeLabs marketing site. Use only the Ocean Blues token system:

```
Primary navy:    #2541B2
Deep navy:       #03256C  
Cyan accent:     #06BEE1
Medium blue:     #3266A6
White:           #FFFFFF
Light gray bg:   #F5F7FA
Body text:       #1A1A1A
```

Font: Inter (already used on marketing site, loaded via Google Fonts)

### 7.2 Page Design References

**Login / Register pages:**  
Clean, centered card on a navy gradient background. Logo at top. Minimal form. Consistent with pioneer academics / Lumiere Education portal aesthetic — professional, not corporate-sterile.

**Student Dashboard:**  
White background. Clear status tracker at the top (the most important element). Application summary below. Inspired by ByteDance/Alibaba campus recruitment status pages — the student should feel like "this is real, I'm in the system."

**Admin Panel:**  
Functional table interface. No need to follow brand colors strictly — clarity is more important. Think: a clean data table with good typography.

### 7.3 Empty States & Error States
Every screen must have a designed empty state and error state. There must be no blank white screens.

---

## 8. Out of Scope for MVP

The following are explicitly **not** being built now. Architecture must not block them later.

| Feature | Why deferred | Interface preserved? |
|---|---|---|
| Email notifications on status change | Requires Supabase Edge Functions setup | ✅ `updated_at` field enables this later |
| File upload (transcripts, etc.) | Form questions not finalized | ✅ Supabase Storage ready to use |
| Application form for IRP, Passion Project, ISEF | Form questions not ready | ✅ `program` field supports all 4 |
| Student dashboard detailed UI (Ashlyn co-design) | Dependency on Ashlyn | ✅ `/dashboard` route reserved |
| Offer letter PDF generation | Complexity | ✅ `offer` status is the hook |
| Multi-language support | English-only for now | ❌ Not architected for i18n |

---

## 9. MVP Acceptance Criteria

MVP is shippable when all of the following are true:

- [ ] A new student can register with an email and receive a verification email
- [ ] A student can verify their email and be redirected to the dashboard
- [ ] A logged-in, verified student can navigate to `/apply` and submit the RA form
- [ ] After submission, the student is redirected to `/dashboard` and sees "Application Submitted"
- [ ] A student who returns and logs in again sees the same status
- [ ] An admin can log into `/admin` and see the student's submission
- [ ] An admin can change the status to "Interview Scheduled" and the student's dashboard reflects this on next refresh
- [ ] All protected routes (`/dashboard`, `/apply`, `/admin`) redirect unauthenticated users to `/login`
- [ ] Login, Register, and Dashboard pages render correctly on mobile (375px)
- [ ] No unhandled errors result in blank screens — all errors show a user-readable message

---

## 10. Open Questions (To Be Resolved Post-MVP)

| # | Question | Owner | Priority |
|---|---|---|---|
| Q1 | What email address should verification and system emails come from? | Assisi | Pre-launch |
| Q2 | Can a student submit multiple applications (e.g., reapply for a different cohort)? | Both | Post-MVP |
| Q3 | Should the admin be able to add notes to an application (internal comments)? | Assisi | Phase 2 |
| Q4 | What happens if a student submits, then wants to update their application? | Both | Phase 2 |
| Q5 | Form questions for IRP, Passion Project, ISEF? | Ashlyn | Before those pages launch |

---

*This PRD governs what gets built. Any feature not described here is out of scope. Any ambiguity gets resolved by asking, not by guessing.*
