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

Full specification at `Spec.md`. Key conventions:
- CSS variables defined in `styles/globals.css` — read but don't modify
- Supabase schema: `applications` table with RLS policies
- Admin role set via `user_metadata.role === 'admin'`
- Password minimum 8 characters
- Status flow: `submitted` → `interview` → `offer` (or `rejected`)

## Currently Completed (see progress.md for details)

- [x] Login portal: login, register, forgot-password, reset-password, auth/callback
- [x] Student dashboard with StatusTracker + ApplicationSummary
- [x] Route protection middleware (proxy.js)
- [x] Code review optimizations (2026-05-06 session)

## Currently Pending

- [ ] Admin panel (`pages/admin/index.jsx`)
- [ ] Admin components (`ApplicationTable.jsx`, `ApplicationDetail.jsx`)
- [ ] API route (`pages/api/admin/update-status.js`)
- [ ] Homepage and program pages (Ashlyn)
- [ ] Application form page `/apply` (Ashlyn)
