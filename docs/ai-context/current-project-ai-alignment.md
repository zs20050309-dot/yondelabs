# YondeLabs Current Project AI Alignment Context

Updated: 2026-05-11  
Project path: `/Users/ben99/Desktop/Vibecoding/yondelabs_web/yondelabs-main`  
Purpose: handoff context for another AI that cannot inspect the full source tree.

This document reflects the current codebase, not only the older PRD/spec docs. Some older docs are now stale in specific places, especially around the homepage and `/apply`.

---

## 1. One-Line Summary

YondeLabs is a Next.js Pages Router website plus student application portal. The current app contains a migrated marketing homepage, Supabase auth pages, a program-selection `/apply` flow, and a student `/dashboard`; admin review/update tools are still planned but not implemented.

---

## 2. Core Stack and Hard Constraints

Use these as non-negotiable project rules:

- Framework: Next.js `16.2.4`, Pages Router only.
- React: `19.2.4`.
- Language: JavaScript / JSX only. Do not introduce TypeScript.
- Styling: plain CSS Modules plus `styles/globals.css`. Do not introduce Tailwind, styled-components, or a UI framework.
- Auth/database: Supabase only.
- Shared browser Supabase client: `lib/supabaseClient.js`.
- Route protection: `proxy.js`.
- No new npm dependencies unless explicitly approved.
- Keep `progress.md` updated after every meaningful change.
- Do not expose `.env.local` values. Only the env var names are safe to mention.

Installed dependencies:

```json
{
  "@supabase/auth-helpers-nextjs": "^0.14.0",
  "@supabase/ssr": "^0.10.2",
  "@supabase/supabase-js": "^2.105.1",
  "next": "16.2.4",
  "react": "19.2.4",
  "react-dom": "19.2.4"
}
```

Environment variables used:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` exists in the local env, but the current frontend runtime should not expose or use it in browser code.

---

## 3. Source of Truth Documents

Read order for another AI:

1. `progress.md` - latest session state and change history.
2. `CLAUDE.md` - local development constraints and ownership notes.
3. This file - current codebase handoff summary.
4. `Spec.md` - intended portal/admin spec. Treat as design intent, not always current implementation.
5. `YondeLabs_PRD.md` - product requirements and database intent.
6. `YondeLabs_Team_Alignment_Doc.md` - team contract and original ownership division.
7. `docs/technical-alignment-report.md` - useful historical report, but stale in places.
8. `docs/ai-context/login-website-context-alignment.md` - focused context for login UI style.

Known stale points in older docs:

- Older docs may say `pages/index.js` is a coming-soon placeholder. Current code has a real componentized homepage.
- Older docs may say `/apply` is not implemented. Current code has `pages/apply.jsx`.
- Older docs may say admin login routes to `/admin`. Current code temporarily routes admin users to `/dashboard` because `/admin` does not exist yet.
- Older docs may mention `middleware.js`; current project uses `proxy.js`.

---

## 4. Directory and Ownership Map

```text
yondelabs-main/
├── pages/
│   ├── index.js                 Current marketing homepage
│   ├── login.jsx                Login
│   ├── register.jsx             Registration
│   ├── forgot-password.jsx      Password reset request
│   ├── reset-password.jsx       Password update after recovery callback
│   ├── auth/callback.jsx        Supabase email/recovery callback
│   ├── apply.jsx                Program selection + Supabase insert + Google Form handoff
│   └── dashboard.jsx            Student dashboard
├── components/
│   ├── home/                    Homepage sections and bilingual copy helpers
│   └── portal/                  Auth, apply/dashboard navbar, dashboard widgets
├── styles/                      CSS Modules and global tokens
├── lib/supabaseClient.js        Shared browser Supabase client
├── proxy.js                     Protected route/auth route logic
├── public/images/               Images used by Next app
├── docs/                        Alignment docs and implementation plans
├── index.html                   Legacy static homepage reference
├── research-website-*.css/js    Legacy static reference assets
└── progress.md                  Continuity log
```

Ownership from `CLAUDE.md`:

- Auth/portal files are Assisi scope: login, register, dashboard, admin, portal components.
- Homepage/program page work is Ashlyn scope. Be cautious editing `components/home/*`, `styles/home.module.css`, and homepage-facing behavior unless explicitly requested.
- `styles/globals.css` contains shared tokens. Read it, avoid casual changes.

---

## 5. Current Route Map

| Route | File | Auth | Current behavior |
|---|---|---|---|
| `/` | `pages/index.js` | public | Marketing homepage with bilingual language toggle, announcement banner, sections, CTAs to `/login`. |
| `/login` | `pages/login.jsx` | public/auth route | Email/password login. If already authed, `proxy.js` redirects to `/dashboard`. |
| `/register` | `pages/register.jsx` | public/auth route | Creates Supabase user with `role: student`, then sends user to `/login?registered=true`. |
| `/forgot-password` | `pages/forgot-password.jsx` | public | Sends Supabase recovery email. |
| `/reset-password` | `pages/reset-password.jsx` | session needed after recovery | Updates password through Supabase. |
| `/auth/callback` | `pages/auth/callback.jsx` | public callback | Handles Supabase hash tokens or code exchange; recovery goes to `/reset-password`, other success goes to `/dashboard`. |
| `/apply` | `pages/apply.jsx` | protected | Lets logged-in students choose RA/IRP/Passion Project/ISEF. Existing applicants redirect to `/dashboard`. |
| `/dashboard` | `pages/dashboard.jsx` | protected | Fetches latest `applications` row and displays application summary/status tracker. |
| `/admin` | not implemented | protected/admin planned | Protected by `proxy.js`, but no page exists. Non-admins redirect to `/dashboard`. |

Routes planned in docs but not implemented:

```text
/admin
/admin/* UI
/api/admin/update-status.js
/ra
/irp
/passion-project
/isef
/verify-email
```

---

## 6. Homepage Architecture

Entry: `pages/index.js`.

The homepage is built from `components/home/*` and styled mostly by `styles/home.module.css`.

Main sections/components:

- `AnnouncementBanner`
- `Navbar`
- `Hero`
- `PartnerUniversities`
- `LabShowcase`
- `PartnerLabs`
- `Programs`
- `ResearchAreas`
- `Achievements`
- `OurProcess`
- `LongTermValue`
- `FinalCta`
- `Footer`
- `WeChatModal`

Important behavior:

- `language` state is held in `pages/index.js`, defaulting to English (`'en'`).
- `LocalizedText.jsx` provides `Lang` and `cx` helpers.
- CSS shows/hides `.langZh` and `.langEn` based on page state.
- Navbar anchor clicks are handled manually for smooth scrolling with offset for announcement banner and fixed nav.
- Hero CTAs both link to `/login`.
- Apply button in homepage navbar links to `/login`.
- The WeChat modal is opened from the final CTA.

Static assets:

- Runtime images are in `public/images/...`.
- There is a mirrored `images/...` folder and legacy static files; current Next image URLs use `/images/...`, which resolves from `public/images`.

---

## 7. Portal Component Architecture

Portal/auth components live in `components/portal/`.

`AuthCard.jsx`

- Shared layout for login/register/forgot/reset pages.
- Left panel: brand image treatment, white YondeLabs logo, headline, partner institution marquee.
- Right panel: form card with colored YondeLabs logo, eyebrow/title/subtitle, children.
- Uses `styles/portal.module.css`.

`PasswordInput.jsx`

- Controlled password input with show/hide toggle.
- Used by login/register/reset pages.

`PortalNavbar.jsx`

- Shared logged-in navbar for `/apply` and `/dashboard`.
- Shows logo, user preferred name/email, logout button.
- Logo click routes to `/dashboard`.
- Logout calls `supabase.auth.signOut()` then `router.replace('/login')`.
- Uses `styles/portalNavbar.module.css`.

`StatusTracker.jsx`

- Dashboard progress tracker.
- Supports statuses: `submitted`, `interview`, `offer`, `rejected`.
- Desktop uses 3-column aligned step grid.
- Mobile uses vertical rail.
- Rejected status shows reviewed message rather than advancing to offer.

`ApplicationSummary.jsx`

- Older summary card component.
- Still exists but current `pages/dashboard.jsx` does not use it.

---

## 8. Supabase Client and Auth Call Patterns

Shared browser client:

```js
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
```

Use it everywhere as:

```js
import { supabase } from '../lib/supabaseClient'
```

or from nested routes:

```js
import { supabase } from '../../lib/supabaseClient'
```

Do not create a second browser Supabase client.

### Register

Used in `pages/register.jsx`:

```js
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: window.location.origin + '/auth/callback',
    data: { role: 'student' },
  },
})
```

Validation:

- Password must be at least 8 characters.
- Confirm password must match.
- On success, route to `/login?registered=true`.

### Login

Used in `pages/login.jsx`:

```js
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})
```

Routing after login:

- If `data.user.user_metadata?.role === 'admin'`, current code routes to `/dashboard` as a temporary safe path.
- Otherwise, query `applications` for the current user:

```js
const { data: existing, error: applicationError } = await supabase
  .from('applications')
  .select('id')
  .eq('user_id', data.user.id)
  .limit(1)
  .maybeSingle()
```

- Existing application -> `/dashboard`.
- No application -> `/apply`.

### Forgot Password

Used in `pages/forgot-password.jsx`:

```js
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: window.location.origin + '/auth/callback?type=recovery',
})
```

The UI intentionally shows a generic success message regardless of whether the email exists.

### Reset Password

Used in `pages/reset-password.jsx`:

```js
await supabase.auth.updateUser({ password })
```

On success, shows confirmation and redirects to `/login`.

### Auth Callback

Used in `pages/auth/callback.jsx`.

It supports both:

- hash token callbacks: `access_token` + `refresh_token`
- code exchange callbacks: `code`

Success routes:

- `type=recovery` -> `/reset-password`
- otherwise -> `/dashboard`

Failure routes:

- `/login?message=Verification+link+expired...`
- try/catch fallback to `/login?message=Something+went+wrong...`

---

## 9. Database Contract

Current frontend assumes a Supabase table named `applications`.

Canonical schema from `Spec.md` / PRD:

```sql
CREATE TABLE applications (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  program       TEXT NOT NULL CHECK (program IN ('ra', 'irp', 'passion-project', 'isef')),
  status        TEXT NOT NULL DEFAULT 'submitted'
                  CHECK (status IN ('submitted', 'interview', 'offer', 'rejected')),
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  form_data     JSONB NOT NULL DEFAULT '{}'
);
```

Expected RLS policies:

- Students can select their own rows.
- Students can insert their own rows.
- Admins can select all rows.
- Admins can update application status.

Role convention:

```js
user.user_metadata.role === 'admin'
```

Program values currently used:

```text
ra
irp
passion-project
isef
```

Status values currently used:

```text
submitted
interview
offer
rejected
```

Current `form_data` use:

- `/apply` inserts `{}` as a placeholder before redirecting to Google Form.
- `/dashboard` reads `application.form_data?.cohort || '—'`.
- Legacy `ApplicationSummary.jsx` also expects `form_data.email`, but current dashboard does not render that component.

Important product/architecture caveat:

- Current `/apply` creates the `applications` row before the student completes the external Google Form.
- This means `status: submitted` currently means "program selected and application record created", not necessarily "external form fully submitted".
- If later replacing Google Forms with native forms, write completed answers into `form_data` and then route to `/dashboard`.

---

## 10. `/apply` Program Selection Flow

File: `pages/apply.jsx`.

On load:

1. `supabase.auth.getUser()`.
2. If no user, route to `/login`.
3. If user exists, check for existing application:

```js
await supabase
  .from('applications')
  .select('id')
  .eq('user_id', currentUser.id)
  .limit(1)
  .maybeSingle()
```

4. If existing application exists, route to `/dashboard`.
5. Otherwise show program cards.

Program card behavior:

| Program key | Display title | Behavior |
|---|---|---|
| `ra` | In-Person Research Assistant | Insert application, then redirect to Google Form. |
| `irp` | Independent Research Program | Insert application, then redirect to Google Form. |
| `passion-project` | Passion Project | Insert application, then redirect to Google Form. |
| `isef` | ISEF Mentorship | Does not insert. Expands contact message with `mailto:info@yondelabs.com`. |

Insert pattern:

```js
await supabase
  .from('applications')
  .insert({
    user_id: user.id,
    program: programKey,
    status: 'submitted',
    form_data: {},
  })
```

Google Form URLs currently hardcoded:

```text
ra              https://forms.gle/io4J6YgvmUBCCbUUA
irp             https://forms.gle/tX6EtMNaW1zxGjCR6
passion-project https://forms.gle/jacuFwVv6SukLwTf6
```

External redirect:

```js
window.location.href = FORM_URLS[programKey]
```

---

## 11. Dashboard Data Flow

File: `pages/dashboard.jsx`.

On load:

1. `supabase.auth.getUser()`.
2. If no user, route to `/login`.
3. Fetch latest application:

```js
const { data: application, error } = await supabase
  .from('applications')
  .select('*')
  .eq('user_id', u.id)
  .order('submitted_at', { ascending: false })
  .limit(1)
  .maybeSingle()
```

Rendered states:

- Loading: full-page spinner.
- Fetch error: error box with generic contact message.
- No application: defensive "Application processing" empty state.
- Application exists: welcome card, program/cohort/date/status summary, optional submitted info banner, `StatusTracker`, email-notification note.

Current dashboard labels:

```js
const PROGRAM_LABELS = {
  ra: 'In-Person Research Assistant',
  irp: 'Independent Research Program',
  'passion-project': 'Passion Project',
  isef: 'ISEF Coaching',
}
```

---

## 12. Route Protection

File: `proxy.js`.

Protected route prefixes:

```js
const PROTECTED_ROUTES = ['/dashboard', '/apply', '/admin']
```

Auth routes:

```js
const AUTH_ROUTES = ['/login', '/register']
```

Behavior:

- Unauthenticated users visiting protected routes redirect to:

```text
/login?message=Please+log+in+to+continue.
```

- Authenticated users visiting `/login` or `/register` redirect to `/dashboard`.
- Authenticated non-admin users visiting `/admin` redirect to `/dashboard`.
- Admin detection uses `session.user.user_metadata?.role`.

Matcher:

```js
export const config = {
  matcher: [
    '/dashboard',
    '/apply',
    '/admin',
    '/admin/:path*',
    '/login',
    '/register',
  ],
}
```

---

## 13. Styling and Visual System

Global tokens are in `styles/globals.css`.

Important color tokens:

```css
--color-navy-deepest: #03256C;
--color-navy-primary: #2541B2;
--color-blue-medium: #3266A6;
--color-cyan-bright: #06BEE1;
--color-white: #FFFFFF;
--color-gray-light: #F5F7FA;
--color-text-dark: #1A1A1A;
```

Font loading:

- `_document.js` preconnects Google Fonts.
- Fonts loaded: Fraunces, Inter, Manrope.
- Global body uses Inter.

CSS module responsibilities:

| File | Purpose |
|---|---|
| `styles/home.module.css` | Homepage layout, language display, nav, hero, sections. |
| `styles/portal.module.css` | AuthCard and login/register/forgot/reset form styling. |
| `styles/apply.module.css` | Program-selection page. |
| `styles/dashboard.module.css` | Student dashboard layout and status summary. |
| `styles/statusTracker.module.css` | Desktop/mobile tracker visuals. |
| `styles/portalNavbar.module.css` | Shared logged-in navbar. |
| `styles/callback.module.css` | Callback loading screen. |
| `styles/applicationSummary.module.css` | Older unused ApplicationSummary card. |

Design intent:

- Academic/editorial, premium research program feel.
- Ocean blue/cyan brand system.
- Login portal has a darker visual left panel and clean form side.
- Dashboard is restrained and status-oriented.
- Avoid introducing unrelated visual systems or one-off palettes.

---

## 14. Current Progress Snapshot

Completed or mostly functional:

- Componentized Next homepage.
- Homepage bilingual language toggle.
- Homepage announcement, nav, hero, programs, labs, research areas, achievements, process/value, footer, WeChat modal.
- Login page.
- Register page.
- Forgot password.
- Reset password.
- Supabase callback handler.
- Shared Supabase browser client.
- `proxy.js` route protection.
- `/apply` program selection page.
- External Google Form handoff for RA/IRP/Passion Project.
- ISEF consultation-only card.
- Shared `PortalNavbar` for logged-in `/apply` and `/dashboard`.
- Student dashboard with status tracker.
- Responsive CSS for main portal pages.

Not implemented:

- Admin page UI.
- Admin components such as application table/detail.
- Admin status update API route.
- Native application form data capture.
- Product detail routes `/ra`, `/irp`, `/passion-project`, `/isef`.
- Email notification automation on status changes.
- File uploads / Supabase Storage.
- Full live manual QA against production Supabase data.

Recent verification history from `progress.md`:

- `npm run build` has repeatedly passed after the latest feature changes.
- Latest recorded route smoke check:
  - `/login` -> 200
  - `/register` -> 200
  - `/apply` unauthenticated -> 307 to `/login?message=Please+log+in+to+continue.`
  - `/dashboard` unauthenticated -> 307 to `/login?message=Please+log+in+to+continue.`

---

## 15. Known Risks and Cleanup Candidates

High priority:

- `/admin` is protected but not implemented. Do not route users there until the page exists.
- Admin status update API is missing.
- `/apply` writes an application row before Google Form completion; this may create incomplete applications if a user abandons the form.
- Live Supabase insert and Google Form redirect still need authenticated browser smoke tests with real test accounts.

Medium priority:

- `forgot-password.jsx` and `reset-password.jsx` have less try/catch hardening than login/apply/dashboard.
- `ApplicationSummary.jsx` is unused and may drift from dashboard labels.
- Older docs contain stale implementation status; this document should be treated as the newer handoff snapshot.
- Git/project publication workflow has special account preference in `progress.md`.

GitHub account preference from `progress.md`:

- For commits, pushes, PRs, and GitHub operations, default to `zs20050309-dot / Jane99`.
- If local git author or GitHub CLI account differs, fix or confirm before publishing.

---

## 16. Recommended Next Development Order

1. Admin MVP:
   - `pages/admin/index.jsx`
   - admin-only application list
   - application detail/status editor
   - `pages/api/admin/update-status.js` or equivalent secure update path

2. Application data integrity:
   - Decide whether current "insert before Google Form" flow is acceptable.
   - If not, either delay Supabase insert until native form completion or add a status/flag for selected-but-not-submitted.

3. Live QA:
   - Create student test account.
   - Verify registration email.
   - Login -> `/apply`.
   - Choose RA/IRP/Passion Project.
   - Confirm `applications` row exists.
   - Confirm `/dashboard` reads it.
   - Update status in Supabase manually and inspect dashboard states.

4. Product-route strategy:
   - Decide whether `/ra`, `/irp`, `/passion-project`, `/isef` are needed before launch.
   - If yes, build under homepage/Ashlyn visual system and keep CTAs pointed at `/login`.

5. Documentation hygiene:
   - Update or archive stale `docs/technical-alignment-report.md`.
   - Keep this file and `progress.md` current.

---

## 17. Suggested Prompt for Another AI

You can give the other AI this prompt:

```text
You are helping with the YondeLabs web project. You cannot inspect the full source tree, so use this alignment context as the source of truth.

Project stack: Next.js 16 Pages Router, React 19, JavaScript/JSX, CSS Modules, Supabase Auth/DB. Do not add dependencies, do not use TypeScript, do not create another Supabase client, and do not expose env values.

Current implemented routes: /, /login, /register, /forgot-password, /reset-password, /auth/callback, /apply, /dashboard. Admin is planned but not implemented.

Shared Supabase client: lib/supabaseClient.js. Applications table fields: id, user_id, program, status, submitted_at, updated_at, form_data. Program values: ra, irp, passion-project, isef. Status values: submitted, interview, offer, rejected.

Current flow: homepage CTAs go to /login. Register creates Supabase user with role student. Login routes admins temporarily to /dashboard; students with an application to /dashboard; students without an application to /apply. /apply inserts an applications row for RA/IRP/Passion Project and redirects to Google Forms; ISEF only shows contact info. /dashboard reads the latest applications row and renders status.

When proposing changes, distinguish between current implementation and older specs. If touching homepage files, treat them as Ashlyn/homepage scope. If touching auth/portal/dashboard/admin, treat them as Assisi/portal scope. Keep progress.md updated after changes.
```

---

## 18. Minimal API/Code Reference Snippets

Auth status:

```js
const {
  data: { user },
} = await supabase.auth.getUser()
```

Login:

```js
const { data, error } = await supabase.auth.signInWithPassword({ email, password })
```

Register:

```js
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: window.location.origin + '/auth/callback',
    data: { role: 'student' },
  },
})
```

Check whether current user has an application:

```js
const { data: existing, error } = await supabase
  .from('applications')
  .select('id')
  .eq('user_id', user.id)
  .limit(1)
  .maybeSingle()
```

Create application from `/apply`:

```js
const { error } = await supabase
  .from('applications')
  .insert({
    user_id: user.id,
    program: programKey,
    status: 'submitted',
    form_data: {},
  })
```

Fetch latest application for dashboard:

```js
const { data: application, error } = await supabase
  .from('applications')
  .select('*')
  .eq('user_id', user.id)
  .order('submitted_at', { ascending: false })
  .limit(1)
  .maybeSingle()
```

Logout:

```js
await supabase.auth.signOut()
router.replace('/login')
```
