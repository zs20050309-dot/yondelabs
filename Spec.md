# YondeLabs Application Portal — Technical Specification
**Version:** 1.0 | **Date:** May 2026  
**Owner:** Assisi  
**Purpose:** This document is the authoritative technical reference for Cursor to implement the authentication portal. Every file path, function name, API route, and data contract is defined here. Cursor must not deviate from these specifications without explicit instruction.

> **⚠️ Doc currency (updated 2026-05-24):** Parts of this spec are now historical. For the current shipping state, the canonical sources in priority order are:
> 1. `progress.md` — every change since this spec was written
> 2. `docs/ai-context/current-project-ai-alignment.md` — current code-level snapshot
> 3. This file — original intent / unchanged sections
>
> Key deltas vs. this spec:
> - **Route protection** lives in `proxy.js`, not `middleware.js`.
> - **`pages/apply.jsx` + `pages/apply/[program].jsx`** exist — a native in-app form wizard replaced the planned Google-Form handoff.
> - **`applications.status`** now includes `'draft'` (added by `docs/sql/migrations/2026-05-24_add_draft_status.sql`).
> - Form rendering is **schema-driven** from `lib/forms/schema.js` — admin's detail view should reuse the same schema rather than the `FIELD_LABELS` dictionary in §7.5.
> - The admin panel (§4.4, §6.6, §7.4, §7.5, §8) is **still unimplemented** as of this date.

---

## 0. Ground Rules for Implementation

Before writing any code, Cursor must acknowledge these constraints:

1. **Framework:** Next.js with Pages Router (`pages/` directory). Do NOT use App Router (`app/` directory).
2. **Language:** JavaScript (.jsx / .js). Do NOT use TypeScript.
3. **Styling:** Plain CSS using existing CSS variables from `globals.css`. Do NOT introduce Tailwind, styled-components, or any other CSS library.
4. **Auth & Database:** Supabase only. Do NOT use NextAuth, Prisma, or any other auth/ORM library.
5. **No extra dependencies:** Do not `npm install` any package not listed in Section 2 without asking first.
6. **One file per task:** Implement exactly what the current task asks. Do not create extra files speculatively.
7. **No placeholder code:** Every function must be fully implemented. No `// TODO` or `// implement later` comments.

---

## 1. Project Structure

The final file structure for Assisi's scope. Files marked `[Ashlyn]` are owned by the other developer — do not create or modify them.

```
yondelabs/
│
├── pages/
│   ├── index.jsx                    [Ashlyn] — do not touch
│   ├── ra.jsx                       [Ashlyn] — do not touch
│   ├── irp.jsx                      [Ashlyn] — do not touch
│   ├── passion-project.jsx          [Ashlyn] — do not touch
│   ├── isef.jsx                     [Ashlyn] — do not touch
│   │
│   ├── login.jsx                    [Assisi] — login page
│   ├── register.jsx                 [Assisi] — registration page
│   ├── verify-email.jsx             [Assisi] — post-verification landing
│   ├── forgot-password.jsx          [Assisi] — password reset request
│   ├── reset-password.jsx           [Assisi] — password reset form (from email link)
│   ├── dashboard.jsx                [Assisi] — student status dashboard
│   │
│   ├── admin/
│   │   └── index.jsx                [Assisi] — admin panel
│   │
│   └── api/
│       └── admin/
│           └── update-status.js     [Assisi] — API route to update application status
│
├── components/
│   ├── Navbar.jsx                   [Ashlyn] — do not touch
│   ├── Footer.jsx                   [Ashlyn] — do not touch
│   │
│   ├── portal/
│   │   ├── AuthCard.jsx             [Assisi] — wrapper card for login/register forms
│   │   ├── StatusTracker.jsx        [Assisi] — application progress stepper component
│   │   └── ApplicationSummary.jsx   [Assisi] — read-only summary of submitted application
│   │
│   └── admin/
│       ├── ApplicationTable.jsx     [Assisi] — table of all applications
│       └── ApplicationDetail.jsx    [Assisi] — single application view + status editor
│
├── lib/
│   └── supabaseClient.js            [Assisi] — single shared Supabase client
│
├── middleware.js                    [Assisi] — route protection (shipped as `proxy.js`)
│
├── styles/
│   └── globals.css                  [Ashlyn] — do not touch; only READ for variables
│
└── .env.local                       [Assisi] — environment variables (never commit)
```

---

## 2. Dependencies

### 2.1 Install Command
Run this once at the start of the project:

```bash
npm install @supabase/supabase-js
```

No other packages are needed for Assisi's scope.

### 2.2 Required Environment Variables

Create `.env.local` in the project root. These values come from the Supabase project dashboard (Settings → API).

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

`NEXT_PUBLIC_` prefix = safe to expose to the browser.  
`SUPABASE_SERVICE_ROLE_KEY` = server-side only, never used in client components.

---

## 3. Supabase Setup

### 3.1 Run This SQL in Supabase SQL Editor

```sql
-- Create the applications table
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

-- Enable Row Level Security
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Students can read their own application only
CREATE POLICY "student_read_own"
  ON applications FOR SELECT
  USING (auth.uid() = user_id);

-- Students can insert their own application only
CREATE POLICY "student_insert_own"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all applications
CREATE POLICY "admin_read_all"
  ON applications FOR SELECT
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );

-- Admins can update status on any application
CREATE POLICY "admin_update_status"
  ON applications FOR UPDATE
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );

-- Auto-update updated_at timestamp on status change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.2 Create an Admin Account

After creating an admin account through the normal registration flow, run this in the Supabase SQL Editor to grant admin role:

```sql
-- Replace the email with the actual admin email
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@yondelabs.com';
```

---

## 4. Shared Supabase Client

**File:** `lib/supabaseClient.js`

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

This is the only Supabase client in the project. Both Assisi and Ashlyn import from here.

---

## 5. Route Protection (Middleware)

**File:** `proxy.js` at project root. (Originally specced as `middleware.js`, shipped as `proxy.js` — Next.js 16 calls the exported function `proxy`. The protected-route list now also covers `/apply/:path*` for the native form wizard.)

This file runs before every page request and handles redirects for unauthenticated users.

```js
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

// Routes that require a logged-in user
const PROTECTED_ROUTES = ['/dashboard', '/apply', '/admin']

// Routes that logged-in users should NOT see (redirect to dashboard)
const AUTH_ROUTES = ['/login', '/register']

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const pathname = req.nextUrl.pathname

  // If user is not logged in and tries to access a protected route
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route)) && !session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('message', 'Please log in to continue.')
    return NextResponse.redirect(loginUrl)
  }

  // If user is already logged in and tries to access login/register
  if (AUTH_ROUTES.includes(pathname) && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Admin route protection: check role
  if (pathname.startsWith('/admin') && session) {
    const role = session.user.user_metadata?.role
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard', '/apply', '/admin', '/admin/:path*', '/login', '/register']
}
```

Note: This requires `@supabase/auth-helpers-nextjs`. Add to install command:
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

---

## 6. Page Specifications

### 6.1 Login Page (`pages/login.jsx`)

**Purpose:** Allow existing users to sign in. New users click through to register.

**URL:** `/login`

**Query params handled:**
- `?message=...` — display a message above the form (e.g., "Please log in to continue.")
- `?registered=true` — display "Account created! Please check your email to verify."

**State:**
```js
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
```

**Submit handler:**
```js
async function handleLogin(e) {
  e.preventDefault()
  setLoading(true)
  setError(null)

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    setError('Incorrect email or password. Please try again.')
    setLoading(false)
    return
  }

  // Check if admin → redirect to /admin, else /dashboard
  const role = data.user?.user_metadata?.role
  router.push(role === 'admin' ? '/admin' : '/dashboard')
}
```

**UI Elements (in order):**
1. YondeLabs logo (centered, links to `/`)
2. Heading: "Welcome back"
3. Subtext: "Sign in to check your application status."
4. If `router.query.message` exists: info banner with the message
5. If `router.query.registered`: success banner "Account created! Please verify your email."
6. Form:
   - Email input (type="email", required)
   - Password input (type="password", required)
   - "Forgot password?" link → `/forgot-password` (right-aligned, below password)
   - Submit button: "Sign In" (full width, disabled + shows "Signing in…" when loading)
7. Error message (if `error` state is set, shown in red above submit button)
8. Divider line
9. Text: "Don't have an account?" + link "Create one" → `/register`

**Layout:** Centered card (`AuthCard` component) on navy gradient background. Card width: 420px max.

---

### 6.2 Register Page (`pages/register.jsx`)

**Purpose:** Create a new student account. Triggers email verification.

**URL:** `/register`

**State:**
```js
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [confirmPassword, setConfirmPassword] = useState('')
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
```

**Client-side validation before submit:**
- Email must be a valid email format
- Password minimum 8 characters
- Confirm password must match password
- Show inline error for each failing field

**Submit handler:**
```js
async function handleRegister(e) {
  e.preventDefault()
  setLoading(true)
  setError(null)

  if (password !== confirmPassword) {
    setError('Passwords do not match.')
    setLoading(false)
    return
  }

  if (password.length < 8) {
    setError('Password must be at least 8 characters.')
    setLoading(false)
    return
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`
    }
  })

  if (error) {
    setError(error.message)
    setLoading(false)
    return
  }

  // Redirect to login with success message
  router.push('/login?registered=true')
}
```

**UI Elements (in order):**
1. YondeLabs logo (centered, links to `/`)
2. Heading: "Create your account"
3. Subtext: "Apply to the Yonde Research Scholar Program."
4. Form:
   - Email input (type="email", required)
   - Password input (type="password", required, hint: "Minimum 8 characters")
   - Confirm password input (type="password", required)
   - Submit button: "Create Account" (full width, loading state)
5. Error message (if set)
6. Divider line
7. Text: "Already have an account?" + link "Sign in" → `/login`

**Layout:** Same `AuthCard` centered on navy gradient. Same 420px max width.

---

### 6.3 Forgot Password Page (`pages/forgot-password.jsx`)

**URL:** `/forgot-password`

**State:** `email`, `loading`, `error`, `submitted` (boolean)

**Submit handler:**
```js
async function handleForgotPassword(e) {
  e.preventDefault()
  setLoading(true)

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })

  // Always show success — do not reveal if email exists (security)
  setSubmitted(true)
  setLoading(false)
}
```

**UI:** When `submitted` is false: show email form. When true: show "If an account exists for this email, you'll receive a password reset link shortly." No resend button needed for MVP.

---

### 6.4 Reset Password Page (`pages/reset-password.jsx`)

**URL:** `/reset-password` (user arrives here from email link)

**State:** `password`, `confirmPassword`, `loading`, `error`, `success`

**On page load:** Supabase automatically sets the session from the URL hash when the user arrives from the reset email. No additional setup needed.

**Submit handler:**
```js
async function handleReset(e) {
  e.preventDefault()

  if (password !== confirmPassword) {
    setError('Passwords do not match.')
    return
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    setError(error.message)
    return
  }

  setSuccess(true)
  setTimeout(() => router.push('/dashboard'), 2000)
}
```

---

### 6.5 Student Dashboard (`pages/dashboard.jsx`)

**URL:** `/dashboard`  
**Access:** Logged-in, verified students only (enforced by middleware)

**Data fetching (runs on page load):**
```js
useEffect(() => {
  async function fetchApplication() {
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = "no rows found" — this is expected if no application yet
      setFetchError('Something went wrong loading your application.')
    }

    setApplication(data || null)
    setUser(user)
    setLoading(false)
  }

  fetchApplication()
}, [])
```

**State:**
```js
const [application, setApplication] = useState(null)  // null = no application yet
const [user, setUser] = useState(null)
const [loading, setLoading] = useState(true)
const [fetchError, setFetchError] = useState(null)
```

**Render logic:**
- If `loading`: show spinner / skeleton
- If `fetchError`: show error message
- If `application === null`: show "No application yet" state with CTA → `/apply`
- If `application` exists: show `StatusTracker` + `ApplicationSummary`

**Page layout:**
1. Header bar: YondeLabs logo (left) | `user.user_metadata.preferred_name || user.email` (right) | "Log out" button
2. Page title: "My Application"
3. `StatusTracker` component (receives `status` prop)
4. `ApplicationSummary` component (receives `application` prop)
5. "Need help? Contact us at hello@yondelabs.com"

**Log out handler:**
```js
async function handleLogout() {
  await supabase.auth.signOut()
  router.push('/login')
}
```

---

### 6.6 Admin Panel (`pages/admin/index.jsx`)

**URL:** `/admin`  
**Access:** Admin role only (enforced by middleware)

**Data fetching:**
```js
const { data: applications, error } = await supabase
  .from('applications')
  .select('*')
  .order('submitted_at', { ascending: false })
```

**State:**
```js
const [applications, setApplications] = useState([])
const [selectedApplication, setSelectedApplication] = useState(null)
const [loading, setLoading] = useState(true)
```

**Page layout:**
1. Header: "YondeLabs Admin" | "Log out" button
2. Stats bar: Total applications | By status counts (badges)
3. `ApplicationTable` component → on row click: set `selectedApplication`
4. `ApplicationDetail` component (shows when `selectedApplication` is not null)

---

## 7. Component Specifications

### 7.1 `AuthCard` (`components/portal/AuthCard.jsx`)

A centered white card for login/register forms.

```jsx
export default function AuthCard({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        {children}
      </div>
    </div>
  )
}
```

CSS (add to `globals.css` or a `portal.css` file imported in `_app.jsx`):

```css
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #03256C 0%, #2541B2 60%, #06BEE1 100%);
  padding: 24px;
}

.auth-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 48px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(3, 37, 108, 0.3);
}

@media (max-width: 480px) {
  .auth-card {
    padding: 32px 24px;
  }
}
```

---

### 7.2 `StatusTracker` (`components/portal/StatusTracker.jsx`)

The application progress stepper shown on the student dashboard.

**Props:**
```js
// status: 'submitted' | 'interview' | 'offer' | 'rejected'
function StatusTracker({ status }) { ... }
```

**Stage definitions:**
```js
const STAGES = [
  {
    key: 'submitted',
    label: 'Application Submitted',
    message: "We've received your application. Our team will review it and reach out within 2 weeks."
  },
  {
    key: 'interview',
    label: 'Interview Scheduled',
    message: "Congratulations! You've been selected for an interview. Our team will contact you shortly to schedule."
  },
  {
    key: 'offer',
    label: 'Offer Sent',
    message: "You've been admitted! Please check your email for your official offer and next steps."
  }
]

// Rejected is handled separately — shown after submitted, with neutral message
const REJECTED_MESSAGE = "Thank you for applying. After careful review, we are unable to offer you a place at this time."
```

**Render logic:**
- Define an ordered array: `['submitted', 'interview', 'offer']`
- Current stage index = index of `status` in this array
- Stages before current index: completed state (filled circle + checkmark)
- Current stage: active state (highlighted, colored)
- Stages after current index: upcoming state (empty circle, gray)
- If `status === 'rejected'`: show special rejected UI below the tracker (not on the stepper itself)

**Do NOT show the word "Rejected" in the UI.** Use "Application Reviewed" as the display label.

---

### 7.3 `ApplicationSummary` (`components/portal/ApplicationSummary.jsx`)

Read-only summary card below the status tracker.

**Props:**
```js
function ApplicationSummary({ application }) { ... }
```

**Displays:**
```
Program:          Research Scholar Program (RA)
Applied for:      2026 Summer Cohort
Submitted on:     May 3, 2026
Email on file:    student@example.com

To update your application, contact hello@yondelabs.com
```

Format `submitted_at` using:
```js
new Date(application.submitted_at).toLocaleDateString('en-US', {
  year: 'numeric', month: 'long', day: 'numeric'
})
```

Map program key to display name:
```js
const PROGRAM_NAMES = {
  'ra': 'Research Scholar Program',
  'irp': 'Independent Research Program',
  'passion-project': 'Passion Project',
  'isef': 'ISEF Coaching'
}
```

---

### 7.4 `ApplicationTable` (`components/admin/ApplicationTable.jsx`)

**Props:**
```js
function ApplicationTable({ applications, onSelect }) { ... }
```

Table columns: Name | Email | Program | Submitted | Status | Action

Status badge colors:
```js
const STATUS_COLORS = {
  submitted: { bg: '#EFF6FF', text: '#2541B2' },
  interview: { bg: '#FFF7ED', text: '#B45309' },
  offer:     { bg: '#F0FDF4', text: '#166534' },
  rejected:  { bg: '#FEF2F2', text: '#991B1B' }
}
```

Each row has a "View" button that calls `onSelect(application)`.

---

### 7.5 `ApplicationDetail` (`components/admin/ApplicationDetail.jsx`)

**Props:**
```js
function ApplicationDetail({ application, onStatusUpdate }) { ... }
```

**Status update handler:**
```js
async function handleStatusUpdate(newStatus) {
  setSaving(true)

  const { error } = await supabase
    .from('applications')
    .update({ status: newStatus })
    .eq('id', application.id)

  if (!error) {
    onStatusUpdate(application.id, newStatus)  // update parent state
  } else {
    setError('Failed to update status. Please try again.')
  }

  setSaving(false)
}
```

**UI:**
- Back button ("← All Applications")
- Student name as heading
- All `form_data` fields rendered as label-value pairs
- Section break
- "Application Status" section: current status badge + dropdown to change + "Save" button
- Error message if save fails

**Render `form_data` fields:**
```js
const FIELD_LABELS = {
  full_name: 'Full Legal Name',
  preferred_name: 'Preferred Name',
  gender: 'Gender',
  birthdate: 'Date of Birth',
  school: 'School',
  grade: 'Grade',
  graduation_year: 'Graduation Year',
  email: 'Email',
  messaging_platform: 'Preferred Messaging',
  country_of_residence: 'Country of Residence',
  citizenship: 'Citizenship',
  city: 'City',
  timezone: 'Timezone',
  cohort: 'Applying For',
  intended_period: 'Intended Time Period',
  research_area: 'Research Area',
  specific_interests: 'Specific Research Interests',
  why_interested: 'Why Interested',
  why_fit: 'Why a Good Fit',
  gpa: 'GPA / Grade',
  standardized_tests: 'Standardized Tests',
  how_heard: 'How They Heard About Us',
  us_visa: 'US Visa Status',
  preferred_university_lab: 'Preferred University / Lab',
  english_proficiency: 'English Proficiency',
  parent_name: 'Parent / Guardian Name',
  parent_email: 'Parent / Guardian Email',
  additional_notes: 'Additional Notes'
}
```

Loop through `FIELD_LABELS` and render each as:
```jsx
<div className="field-row">
  <span className="field-label">{label}</span>
  <span className="field-value">{application.form_data[key] || '—'}</span>
</div>
```

---

## 8. API Route

### 8.1 `pages/api/admin/update-status.js`

This API route is an alternative server-side update method (backup for complex admin operations). For MVP, the direct Supabase client call from `ApplicationDetail.jsx` is sufficient. Build this route but it may not be called in MVP.

```js
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { applicationId, status } = req.body

  const validStatuses = ['submitted', 'interview', 'offer', 'rejected']
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' })
  }

  // Use service role key for server-side admin operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', applicationId)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ success: true })
}
```

---

## 9. Implementation Order

Cursor must implement in this exact order. Each task is a separate Cursor session.

| Task # | Task | Files Created/Modified | Depends On |
|---|---|---|---|
| 1 | Project setup + dependencies | `package.json`, `.env.local` | Nothing |
| 2 | Supabase setup | Run SQL in Supabase dashboard | Task 1 |
| 3 | Shared Supabase client | `lib/supabaseClient.js` | Task 2 |
| 4 | Route protection middleware | `middleware.js` | Task 3 |
| 5 | `AuthCard` component + portal CSS | `components/portal/AuthCard.jsx` | Task 1 |
| 6 | Register page | `pages/register.jsx` | Tasks 3, 5 |
| 7 | Login page | `pages/login.jsx` | Tasks 3, 5 |
| 8 | Forgot/Reset password pages | `pages/forgot-password.jsx`, `pages/reset-password.jsx` | Tasks 3, 5 |
| 9 | `StatusTracker` component | `components/portal/StatusTracker.jsx` | Task 1 |
| 10 | `ApplicationSummary` component | `components/portal/ApplicationSummary.jsx` | Task 1 |
| 11 | Student dashboard page | `pages/dashboard.jsx` | Tasks 3, 9, 10 |
| 12 | `ApplicationTable` component | `components/admin/ApplicationTable.jsx` | Task 1 |
| 13 | `ApplicationDetail` component | `components/admin/ApplicationDetail.jsx` | Tasks 3, 12 |
| 14 | Admin panel page | `pages/admin/index.jsx` | Tasks 3, 12, 13 |
| 15 | API route (backup) | `pages/api/admin/update-status.js` | Task 3 |
| 16 | End-to-end test + bug fixes | All files | All above |

---

## 10. Testing Checklist (Run After Task 16)

Before declaring MVP complete, manually verify every item:

**Authentication:**
- [ ] Register with a new email → verification email arrives
- [ ] Click verification link → redirected to `/dashboard`
- [ ] Log out → redirected to `/login`
- [ ] Log in with correct credentials → reach `/dashboard`
- [ ] Log in with wrong password → see error message, not a blank screen
- [ ] Navigate to `/dashboard` without logging in → redirected to `/login`
- [ ] Navigate to `/login` while logged in → redirected to `/dashboard`
- [ ] Forgot password → email arrives → link works → can set new password

**Student Dashboard:**
- [ ] Logged-in student with no application sees "Start Your Application" CTA
- [ ] After Ashlyn's form submits, student sees "Application Submitted" status
- [ ] Status tracker shows correct active stage
- [ ] Student cannot access `/admin`

**Admin Panel:**
- [ ] Admin logs in → redirected to `/admin`
- [ ] Admin sees list of all applications
- [ ] Admin clicks a student → sees all form fields
- [ ] Admin changes status → saves without error
- [ ] Student dashboard reflects new status on refresh
- [ ] Non-admin logged-in user navigating to `/admin` → redirected to `/dashboard`

**Mobile:**
- [ ] Login page renders correctly at 375px width
- [ ] Register page renders correctly at 375px width
- [ ] Dashboard renders correctly at 375px width

---

*End of Technical Specification. Cursor begins at Task 1 and does not skip steps.*
