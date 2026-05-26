# CLAUDE.md — YondeLabs Web

This extends the global ~/.claude/CLAUDE.md. If there is a conflict, this file takes precedence.

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
| Portal styles | `styles/portal.module.css`, `styles/dashboard.module.css`, etc. |
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
  dashboard.jsx         ← Student dashboard
  apply.jsx             ← Program selection
  apply/[program].jsx   ← Application wizard
  auth/callback.jsx

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
  admin/                ← NOT YET IMPLEMENTED

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

lib/
  supabaseClient.js     ← Single shared Supabase client
  forms/
    schema.js           ← Form schema source of truth (RA / IRP / PP)
    useDraft.js         ← Draft auto-save hook
    countries.js
    validators.js

public/images/          ← Static assets for Next.js (logos, photos, lab images)
proxy.js                ← Route protection middleware
supabase/functions/     ← Edge Functions (email notifications)
docs/                   ← Guides, SQL migrations, AI context
```

## Key Conventions

- CSS variables defined in `styles/globals.css` — read but don't modify
- Supabase schema: `applications` table with RLS policies
- Admin role set via `user_metadata.role === 'admin'`
- Password minimum 8 characters
- Status flow: `draft` → `submitted` → `interview` → `offer` (or `rejected`)
- Form schema: `lib/forms/schema.js` is the single source of truth — admin renderer should iterate over `schema.steps[].fields[]`
- Language: site is English-only. `LocalizedText.jsx` / `Lang` component exists but `styles.en` class is hardcoded on the homepage wrapper so only English renders.

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
- [x] Code review optimizations (2026-05-06 session)

## Currently Pending

- [ ] **Run Supabase migration** for `draft` status — `docs/sql/migrations/2026-05-24_add_draft_status.sql`, guide at `docs/supabase-migration-guide.md`. New form submissions will fail at the DB CHECK constraint until this is run.
- [ ] Admin panel (`pages/admin/index.jsx`, `components/admin/ApplicationTable.jsx`, `components/admin/ApplicationDetail.jsx`, `pages/api/admin/update-status.js`) — should reuse `lib/forms/schema.js` to render application details
- [ ] Status-change email notifications (Supabase Edge Functions — code written, needs Resend + DNS setup)
- [ ] Conditional form logic / auto-classification rules (deferred — needs rule spec)
- [ ] File uploads (transcripts, portfolios) — Supabase Storage hookups not built
