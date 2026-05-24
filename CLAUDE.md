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
- **Ashlyn's scope:** DO NOT MODIFY — homepage, program pages, Navbar, Footer
- Files marked `[Ashlyn]` in `Spec.md` are off-limits

## Key Spec Reference

Full specification at `Spec.md` (partially historical — see the doc-currency callout at its top). Key conventions:
- CSS variables defined in `styles/globals.css` — read but don't modify
- Supabase schema: `applications` table with RLS policies
- Admin role set via `user_metadata.role === 'admin'`
- Password minimum 8 characters
- Status flow: `draft` → `submitted` → `interview` → `offer` (or `rejected`)
- Form schema: `lib/forms/schema.js` is the single source of truth — admin renderer should iterate over `schema.steps[].fields[]` rather than maintaining a parallel label dictionary

## Currently Completed (see progress.md for details)

- [x] Login portal: login, register, forgot-password, reset-password, auth/callback
- [x] Student dashboard with StatusTracker, info grid, drafts-in-progress list, resubmit-via-email guidance
- [x] Route protection middleware (proxy.js) covering /dashboard, /apply, /apply/*, /admin/*
- [x] Native in-app application form wizard at /apply/[program] (replaces Google Form handoff)
  - Schema-driven from `lib/forms/schema.js` (RA, IRP, PP)
  - Multi-step wizard with progress bar, review step, schema-driven field renderer
  - Draft auto-save via Supabase + localStorage double-write (`lib/forms/useDraft.js`)
  - Already-submitted screen with email-admin guidance
- [x] Code review optimizations (2026-05-06 session)

## Currently Pending

- [ ] **Run Supabase migration** for `draft` status — `docs/sql/migrations/2026-05-24_add_draft_status.sql`, guide at `docs/supabase-migration-guide.md`. New form submissions will fail at the DB CHECK constraint until this is run.
- [ ] Admin panel (`pages/admin/index.jsx`, `components/admin/ApplicationTable.jsx`, `components/admin/ApplicationDetail.jsx`, `pages/api/admin/update-status.js`) — should reuse `lib/forms/schema.js` to render application details
- [ ] Status-change email notifications (Supabase Edge Functions)
- [ ] Conditional form logic / auto-classification rules (deferred — needs rule spec)
- [ ] File uploads (transcripts, portfolios) — Supabase Storage hookups not built
- [ ] Homepage and program pages (Ashlyn) — site has single homepage, no separate /ra /irp /passion-project /isef product pages
