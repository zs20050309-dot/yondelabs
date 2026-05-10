# YondeLabs — Team Alignment Document
**Version:** 1.0 | **Date:** May 2026  
**Authors:** Assisi (Login System) · Ashlyn (Product Pages)  
**Status:** 🟢 Active Reference — both teammates must read before writing any code

---

## 1. What We Are Building

YondeLabs needs a professional student application platform to replace the current Google Forms workflow. The full product has two parts built by two people in one shared repository.

**The end-to-end student journey:**

```
yondelabs.com (marketing)  →  Login / Register  →  Fill Application  →  View Progress Dashboard
      [Ashlyn]                    [Assisi]             [Ashlyn]              [Assisi]
```

Students land on the marketing site, click "Apply Now", get directed to the login system, complete their application form, then return to their personal dashboard to track their status (Submitted → Interview → Offer).

---

## 2. Division of Work

### Assisi — Authentication & Portal

| Scope | Details |
|---|---|
| Login page | Email + password, magic link option |
| Register page | Email verification via Supabase |
| Student dashboard | Application status tracker (Submitted / Interview / Offer) |
| Admin dashboard | Internal panel to review applications, update status, send offers |
| Database schema | Define and maintain all Supabase tables |
| Auth middleware | Protect portal routes from unauthenticated access |

### Ashlyn — Marketing Site & Application Form

| Scope | Details |
|---|---|
| Main homepage | Brand intro + overview of all 4 programs |
| 4 product pages | `/ra`, `/irp`, `/passion-project`, `/isef` |
| Application form | Multi-step form embedded in product pages |
| Form submission | POSTs data to Supabase (coordinate schema with Assisi) |
| Shared components | Navbar, Footer (both must use the same components) |

### Shared Responsibility

| Item | Owner | Notes |
|---|---|---|
| `components/Navbar.jsx` | Ashlyn builds first | Assisi uses as-is, do not duplicate |
| `components/Footer.jsx` | Ashlyn builds first | Same as above |
| `styles/globals.css` | Ashlyn owns | Assisi imports, does not override |
| Supabase `applications` table schema | Assisi defines | Ashlyn must match field names exactly when submitting |
| Vercel deployment | Either | One shared project on Vercel, connected to the same GitHub repo |

---

## 3. Shared Technical Architecture

### Tech Stack (Final, No Debate)

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js** (Pages Router) | Ashlyn's existing direction, both must use this |
| Auth + Database | **Supabase** | Handles email verification, auth, and PostgreSQL DB |
| Styling | **Existing CSS** (`globals.css`) + Ocean Blues token system | Do not introduce Tailwind or other CSS frameworks |
| Deployment | **Vercel** | Connected to GitHub, auto-deploys on push to `main` |
| Language | **JavaScript (.jsx)** | Not TypeScript — keep it accessible for both teammates |

### File Structure (Agreed)

```
yondelabs/
├── components/
│   ├── Navbar.jsx              ← Ashlyn owns, Assisi imports
│   ├── Footer.jsx              ← Ashlyn owns, Assisi imports
│   └── LanguageContext.jsx     ← REMOVED (site is English-only now)
│
├── pages/
│   ├── index.jsx               ← Brand homepage [Ashlyn]
│   ├── ra.jsx                  ← RA product page [Ashlyn]
│   ├── irp.jsx                 ← IRP product page [Ashlyn]
│   ├── passion-project.jsx     ← Passion Project page [Ashlyn]
│   ├── isef.jsx                ← ISEF page [Ashlyn]
│   │
│   ├── login.jsx               ← [Assisi]
│   ├── register.jsx            ← [Assisi]
│   ├── dashboard.jsx           ← Student status dashboard [Assisi]
│   └── admin/
│       └── index.jsx           ← Admin panel [Assisi]
│
├── lib/
│   └── supabaseClient.js       ← Single shared Supabase client [Assisi creates]
│
├── styles/
│   └── globals.css             ← Single source of truth for all styling [Ashlyn owns]
│
└── public/
    └── images/                 ← All static images
```

### Design Token System (Must Follow — No Exceptions)

All colors come from the Ocean Blues palette defined in `globals.css`. Neither teammate introduces new colors outside this system.

```css
--color-navy-deepest:  #03256C   /* Footer, dark backgrounds */
--color-navy-primary:  #2541B2   /* Primary buttons, headings */
--color-blue-medium:   #3266A6   /* Secondary elements, links */
--color-cyan-bright:   #06BEE1   /* Accents, icons, interactive */
--color-white:         #FFFFFF
--color-gray-light:    #F5F7FA   /* Backgrounds, dividers */
--color-text-dark:     #1A1A1A   /* Body text */
```

---

## 4. Integration Contract (Critical — Read Before Writing Any Code)

This section defines exactly how Assisi and Ashlyn's work connects. Violating these contracts breaks the other person's work.

### Contract 1: The "Apply Now" Button

**Ashlyn's product pages** must direct users to Assisi's login page.

```jsx
// In every product page CTA — Ashlyn implements this
<a href="/login?redirect=/dashboard">Apply Now</a>
// After login, Supabase auth redirects back to /dashboard
```

Do not hardcode a Google Form URL anywhere. All CTAs go to `/login`.

### Contract 2: The Supabase `applications` Table

Assisi defines this table. Ashlyn's form must submit data using **exactly** these field names. Changing either side without telling the other breaks the pipeline.

```
applications table (defined by Assisi, used by Ashlyn):
─────────────────────────────────────────────────────
id              uuid        primary key (auto)
user_id         uuid        foreign key → auth.users.id
program         text        values: 'ra' | 'irp' | 'passion-project' | 'isef'
status          text        values: 'submitted' | 'interview' | 'offer' | 'rejected'
submitted_at    timestamp   auto-set on insert
form_data       jsonb       Ashlyn stores all form answers here as JSON
─────────────────────────────────────────────────────
```

**Why `form_data` is jsonb:** Ashlyn's form questions are still being finalized for 3 of the 4 programs. Using a JSON blob means the schema does not need to change every time a form question is added or modified. When forms are finalized, we revisit this.

### Contract 3: Post-Submission Flow

When Ashlyn's form is submitted successfully, redirect the student to Assisi's dashboard:

```jsx
// Ashlyn's form submit handler — last line
router.push('/dashboard')
```

The dashboard reads `status` from the `applications` table and renders the progress tracker.

### Contract 4: Shared Supabase Client

One file, one client. Both teammates import from the same place.

```js
// lib/supabaseClient.js — Assisi creates this file
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Both Ashlyn and Assisi import like this:
import { supabase } from '../lib/supabaseClient'
```

Never create a second Supabase client. If connection settings need to change, change them in one place.

---

## 5. Development Rules (Both Must Follow)

**Rule 1 — Never merge to `main` without testing locally first.**  
Run `npm run dev` and verify your pages load before pushing.

**Rule 2 — Feature branches, not direct pushes to `main`.**  
Ashlyn works on `feature/product-pages`. Assisi works on `feature/auth-portal`. Merge via Pull Request.

**Rule 3 — Never duplicate a component.**  
If you need a button style that doesn't exist, add it to `globals.css`. Do not create a one-off inline style that overrides the design system.

**Rule 4 — Coordinate before changing shared files.**  
`globals.css`, `Navbar.jsx`, `Footer.jsx`, `supabaseClient.js` — text the other person before touching these.

**Rule 5 — English only.**  
The site is English-only. `LanguageContext.jsx` is not needed and should not be built.

---

## 6. What Is Intentionally Left Open (Interfaces to Build Later)

These items are **not in scope for MVP** but the architecture above already accommodates them. Do not build them now, but do not make decisions that would block them later.

| Item | Status | Notes |
|---|---|---|
| Application form questions for IRP, Passion Project, ISEF | ⏳ Pending | Ashlyn: placeholder form for now, real questions added later |
| Email notifications (status change emails) | ⏳ Pending | Supabase Edge Functions — hook is ready, not triggered yet |
| File uploads (transcripts, etc.) | ⏳ Pending | Supabase Storage is available, not implemented yet |
| Student dashboard detailed design | ⏳ Pending | Assisi + Ashlyn to co-design after auth MVP is working |
| Admin dashboard UI | ⏳ Pending | Assisi builds after student portal is done |

---

## 7. MVP Definition (What "Done" Looks Like)

MVP is complete when a student can do all of the following without help:

1. Visit `yondelabs.com`, browse a product page
2. Click "Apply Now" and land on the login page
3. Register a new account with their email and verify it
4. Log in and be redirected to the application form (at minimum, the RA form)
5. Submit the form and see their dashboard with status = "Submitted"
6. Assisi can log into the admin panel, see the submission, and change status to "Interview"
7. Student refreshes dashboard and sees updated status

Everything beyond this is Phase 2.

---

## 8. Quick Reference: Who To Ask

| Question | Ask |
|---|---|
| "What color should this button be?" | Check `globals.css` first, then Ashlyn |
| "How do I connect to the database?" | Assisi |
| "What fields does the form need?" | Ashlyn |
| "How do I protect a page so only logged-in users see it?" | Assisi |
| "How do I submit form data to Supabase?" | Assisi (provides code snippet) |
| "The Navbar looks wrong on mobile" | Ashlyn |
| "A user can't log in" | Assisi |

---

*This document is the single source of truth for team alignment. If something in your code contradicts this document, the document wins — update your code or propose a change to this document with a reason.*
