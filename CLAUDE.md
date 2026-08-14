# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This extends the global ~/.claude/CLAUDE.md. If there is a conflict, this file takes precedence.

## Commands

- `npm run dev` — start the Next.js dev server
- `npm run build` — production build (this is the closest thing to a correctness check — there is **no lint script and no test suite/framework** in this repo; `npm run build` passing is the standard verification step used in `progress.md`)
- `npm run start` — run the production build locally
- `node scripts/render-sample-application-pdf.mjs` — standalone script to render a sample application PDF outside the Next.js app, useful when working on `lib/admin/applicationPdf.js` / offer-letter PDF generation without going through the admin UI

## Progress Tracking

**IMPORTANT: After EVERY change or task completion, update `progress.md`.**

This includes:
- New features, bug fixes, refactors
- Any file created, modified, or deleted
- Build/verification results
- Decisions to skip certain changes (with reasoning)
- Session dates and context summaries

The progress.md is the single source of truth for session continuity. When resuming a session, read progress.md first.

---

## ⚠️ CRITICAL: Two File Systems Coexist — Read This Before Touching Anything

This repo has **two completely separate sets of files**. One is live on yondelabs.com. The other is dead code. Editing the wrong set does nothing.

### LIVE (served by Vercel → Next.js build):

| What to change | Where to find it |
|---|---|
| Homepage layout, sections | `pages/index.js` + `components/home/*.jsx` |
| Homepage styles | `styles/home.module.css` |
| Navbar | `components/home/Navbar.jsx` |
| Footer | `components/home/Footer.jsx` |
| Hero, LabShowcase, Programs, etc. | `components/home/*.jsx` |
| Login / Register / Dashboard | `pages/login.jsx`, `pages/register.jsx`, `pages/dashboard.jsx` |
| Application wizard | `pages/apply/[program].jsx` + `components/apply/` |
| Admin portal (applications, offer letters, current students, course hours) | `pages/admin/index.jsx` + `components/admin/*.jsx` + `pages/api/admin/**` |
| Student portal (separate from applicant dashboard) | `pages/student/*.jsx` + `lib/portal/useStudentPortal.js` |
| Portal styles | `styles/portal.module.css`, `styles/dashboard.module.css`, `styles/admin.module.css`, `styles/studentPortal.module.css`, etc. |
| Static assets (images, logos) | `public/images/` |

### DEAD LEGACY (NOT served, NOT built, ignore completely):

| File | Why it exists |
|---|---|
| `index.html` | Old static site, predates Next.js migration |
| `research-website-styles.css` | CSS for the old static site |
| `research-website-script.js` | JS for the old static site |
| `images/` (root level) | Old static site assets — Next.js uses `public/images/` |
| `Lumiere Education.html` | Reference only |
| `COLOR_SCHEME*.txt` | Design reference notes |
| `PROJECT_INFO.txt` | Outdated project notes |

**Rule: NEVER edit `index.html`, `research-website-styles.css`, or `research-website-script.js`.** These files are not connected to the live site and edits to them have zero effect on yondelabs.com.

### Deployment

- **Repo:** `https://github.com/zs20050309-dot/yondelabs` (branch: `main`)
- **Deployed via:** Vercel — auto-deploys on every push to `main`
- **Live URL:** `yondelabs.com`
- **GitHub account for all git ops:** `zs20050309-dot / Jane99`
- Vercel runs `npm run build` and serves the Next.js output — static files at root are ignored

---

## Project Stack

- **Framework:** Next.js 16 (Pages Router — NOT App Router)
- **Language:** JavaScript / JSX (NOT TypeScript)
- **Styling:** Plain CSS Modules (NOT Tailwind, styled-components, etc.)
- **Auth & Database:** Supabase only
- **Shared client:** `lib/supabaseClient.js`
- **Middleware:** `proxy.js`

## No Extra Dependencies

Do not `npm install` anything not already in `package.json` without explicit instruction.

## Code Ownership

- **Assisi's scope:** All auth/portal files (login, register, dashboard, admin, portal components)
- **Ashlyn's scope (historical):** Homepage components originally belonged to Ashlyn, but have since been modified by Assisi as needed. The homepage (`components/home/`) is now shared territory — edit freely when user requests it.

## Active File Map

```
pages/
  index.js              ← Homepage (Next.js, served at /)
  login.jsx             ← Login
  register.jsx
  forgot-password.jsx
  reset-password.jsx
  dashboard.jsx         ← Student (applicant) dashboard
  apply.jsx             ← Program selection
  apply/[program].jsx   ← Application wizard
  auth/callback.jsx
  admin/index.jsx       ← Admin portal (applications, offer letters, current students, course hours)
  student/              ← Separate student portal (enrolled students, not applicants)
    index.jsx, course.jsx, files.jsx, login.jsx, set-password.jsx
  api/admin/
    applications/[id]/{pdf,offer-letter,offer-letter-preview,delete,portal-access}.js
    current-students/[id]/portal-access.js
    ← Server-side only; use SUPABASE_SERVICE_ROLE_KEY
  api/applications/[id]/submission-notification.js

components/
  home/                 ← All homepage sections (live on yondelabs.com)
    Navbar.jsx
    Hero.jsx
    AnnouncementBanner.jsx
    LabShowcase.jsx
    Programs.jsx
    ResearchAreas.jsx
    Achievements.jsx
    PartnerSections.jsx
    ProcessAndValue.jsx
    Footer.jsx
    LocalizedText.jsx   ← cx() helper + Lang component for i18n
    WeChatModal.jsx     ← Kept but not rendered
  portal/               ← Auth/dashboard UI components
    AuthCard.jsx
    PasswordInput.jsx
    PortalNavbar.jsx
    StatusTracker.jsx
    ApplicationSummary.jsx
  apply/                ← Application wizard components
    FormWizard.jsx
    FormStep.jsx
    ReviewStep.jsx
    FieldRenderer.jsx
    fields/*.jsx
  admin/                ← Admin portal UI (implemented)
    AdminShell.jsx                  ← Sidebar + topbar layout shell; owns theme toggle placement
    ConfirmProvider.jsx             ← useConfirm() — in-app modal replacing window.confirm/prompt everywhere in admin
    ToastProvider.jsx               ← useToast() — success/error toasts for admin actions
    ThemeToggle.jsx / icons.jsx / Spinner.jsx ← Shared admin UI primitives (no icon library — hand-rolled inline SVG)
    ApplicationDetail.jsx           ← Renders one application; iterates lib/forms/schema.js
    OfferLetterSender.jsx           ← Drives lib/admin/offerLetterPdf.js / offerLetterTemplates.js
    CurrentStudents.jsx             ← Roster of enrolled (non-applicant) students
    MentorAssignments.jsx           ← Assign mentors to a student + per-milestone payment schedule
    MentorPayments.jsx              ← Mentor payments ledger tab
    StudentPortalAccess.jsx         ← Create/reset student-portal credentials
    StudentFiles.jsx                ← Per-student files (transcripts, etc.)
    StudentCourseHours.jsx / CoursePlanManager.jsx ← Course hour allocation/tracking

styles/
  globals.css           ← CSS variables — read but don't modify
  home.module.css       ← Homepage styles (the live ones)
  portal.module.css     ← Login portal styles
  dashboard.module.css
  statusTracker.module.css
  portalNavbar.module.css
  apply.module.css
  wizard.module.css
  callback.module.css
  admin.module.css
  studentPortal.module.css
  applicationSummary.module.css
  courseHours.module.css
  studentFiles.module.css

lib/
  supabaseClient.js     ← Single shared Supabase client (browser, anon key)
  forms/
    schema.js           ← Form schema source of truth (RA / IRP / PP)
    useDraft.js         ← Draft auto-save hook
    countries.js
    validators.js
  admin/
    stages.js                       ← Status/stage transition logic, incl. conversion to current student
    applicationPdf.js, offerLetterPdf.js, offerLetterTemplates.js ← PDF generation (pdf-lib)
    currentStudents.js
  portal/
    useStudentPortal.js  ← Data hook for the separate /student portal
  courseHours.js, studentFiles.js, studentPortalCredentials.js

public/images/          ← Static assets for Next.js (logos, photos, lab images)
proxy.js                ← Route protection middleware — three separate auth domains: general/auth routes, admin role, and a distinct `student_portal` role gating /student/*
supabase/functions/     ← Edge Functions (email notifications)
docs/                   ← Guides, SQL migrations, AI context
```

## Key Conventions

- CSS variables defined in `styles/globals.css` — read but don't modify
- Supabase schema: `applications` table with RLS policies
- Admin role set via `user_metadata.role === 'admin'`
- Password minimum 8 characters
- Status flow: `draft` → `submitted` → `interview` → `offer` (or `rejected`); an application at `offer` can additionally be **converted** into a `current_students` record (see `lib/admin/stages.js`), carrying over enrollment/milestones/files/portal account
- Form schema: `lib/forms/schema.js` is the single source of truth — the admin renderer iterates over `schema.steps[].fields[]`
- Language: site is English-only. `LocalizedText.jsx` / `Lang` component exists but `styles.en` class is hardcoded on the homepage wrapper so only English renders.
- Admin portal theming: CSS custom properties (colors/radii/shadows) are declared on `.shell` in `styles/admin.module.css` (light) and `.shell[data-theme='dark']` (dark) — never on `:root`/`<html>`, so they can't leak into the public site or other portals. `courseHours.module.css`/`studentFiles.module.css` reference the same token names (`var(--token, #fallback)`) in their admin-prefixed classes only; their student-portal-facing classes (`.studentSection`, `.studentFile`, etc.) intentionally use a different, untouched visual system. Never use `window.confirm`/`window.prompt`/`window.alert` in admin components — use `useConfirm()` from `ConfirmProvider.jsx`.
- Applicants and enrolled students are **separate identity domains**: applicant auth (`/login`, `/dashboard`) vs. student-portal auth (`/student/login`, role `student_portal`, gated separately in `proxy.js`). Don't conflate them.
- Privileged admin actions (PDF/offer-letter generation, deletion, portal-credential creation) go through `pages/api/admin/**` server routes using `SUPABASE_SERVICE_ROLE_KEY` — never call service-role logic from client code.

## Currently Completed (see progress.md for details)

- [x] Login portal: login, register, forgot-password, reset-password, auth/callback
- [x] Student dashboard with StatusTracker, info grid, drafts-in-progress list, resubmit-via-email guidance
- [x] Route protection middleware (proxy.js) covering /dashboard, /apply, /apply/*, /admin/*
- [x] Native in-app application form wizard at /apply/[program] (replaces Google Form handoff)
  - Schema-driven from `lib/forms/schema.js` (RA, IRP, PP)
  - Multi-step wizard with progress bar, review step, schema-driven field renderer
  - Draft auto-save via Supabase + localStorage double-write (`lib/forms/useDraft.js`)
  - Already-submitted screen with email-admin guidance
- [x] Homepage migrated to Next.js (all sections in `components/home/`)
- [x] Navbar: non-sticky (position: relative), English-only, no language switcher
- [x] Admin panel (`pages/admin/index.jsx` + `components/admin/*.jsx` + `pages/api/admin/**`) — application review/PDF export, offer-letter sending, current-students roster, portal-credential management, course-hour tracking
- [x] Separate student portal (`pages/student/*.jsx`) for enrolled (non-applicant) students, with its own `student_portal` auth role
- [x] Application archive/restore + guarded permanent deletion (admin-only, cascades private files/portal identity, preserves base Auth account)
- [x] Application → current-student conversion flow
- [x] Mentor payments: `mentor_payment_settings`/`mentor_milestone_rates`/`mentor_payment_records`, auto-generated from milestone completions and logged class sessions, admin-managed mentor assignments (`components/admin/MentorAssignments.jsx`), and a top-level "Mentor payments" ledger tab (`components/admin/MentorPayments.jsx`) — code complete, needs the migration run (see Pending). Each milestone has exactly one responsible mentor (`student_milestone_progress.assignment_id`, set from the Course hours milestone list) priced per (mentor assignment, milestone) — never split between co-mentors.
- [x] Code review optimizations (2026-05-06 session)

## Currently Pending

- [ ] **Run Supabase migration** for mentor payments — `docs/sql/migrations/2026-08-13_add_mentor_payments.sql` (after the 2026-08-12 migration). Mentor payment settings/records and the "Mentor payments" admin tab won't work until this is applied; each mentor assignment also needs a payment type + rate set before milestone/session logging generates payable lines.
- [ ] **Run Supabase migration** for `draft` status — `docs/sql/migrations/2026-05-24_add_draft_status.sql`, guide at `docs/supabase-migration-guide.md`. New form submissions will fail at the DB CHECK constraint until this is run.
- [ ] **Run Supabase migration** for `portfolio-project` program support — `docs/sql/migrations/2026-07-13_add_portfolio_project_program.sql`. New Portfolio Project submissions will fail at the DB CHECK constraint until this is run.
- [ ] **Run Supabase migration** for interview scheduling metadata — `docs/sql/migrations/2026-07-14_add_interview_scheduling_fields.sql`. Calendly interview automation relies on these columns.
- [ ] Email automations external setup — submission confirmation + interview scheduling code are written, but Resend / Supabase / Calendly secrets and webhooks still need to be configured in the dashboards
- [ ] Conditional form logic / auto-classification rules (deferred — needs rule spec)
- [ ] File uploads (transcripts, portfolios) — Supabase Storage hookups not built
