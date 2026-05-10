# Student Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework `/dashboard` into the student-facing dashboard specified on 2026-05-08 while preserving the existing Supabase data flow.

**Architecture:** Keep the page logic in `pages/dashboard.jsx`, reuse `StatusTracker` for the stepper, and keep styling in the existing CSS Modules. Do not touch `lib/supabaseClient.js` or `proxy.js`.

**Tech Stack:** Next.js Pages Router, JavaScript/JSX, React, Supabase client, CSS Modules.

---

### Task 1: Source-Level RED Checks

**Files:**
- Read: `pages/dashboard.jsx`
- Read: `components/portal/StatusTracker.jsx`

- [x] **Step 1: Run checks expected to fail before implementation**

```bash
node - <<'NODE'
const fs = require('fs')
const dashboard = fs.readFileSync('pages/dashboard.jsx', 'utf8')
const tracker = fs.readFileSync('components/portal/StatusTracker.jsx', 'utf8')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(!dashboard.includes('href="/apply"'), 'dashboard must not link to /apply')
assert(dashboard.includes("router.replace('/login')"), 'logout and unauthenticated redirects must use router.replace')
assert(dashboard.includes('Welcome back,'), 'dashboard must render welcome card copy')
assert(dashboard.includes('currentStatus'), 'dashboard must calculate a status badge view model')
assert(tracker.includes('submittedAt'), 'StatusTracker must accept submittedAt for sub-label dates')
assert(tracker.includes('Application Progress'), 'StatusTracker must render the progress card title')
assert(!tracker.includes('Rejected'), 'visible tracker copy must not include Rejected')
NODE
```

Expected: FAIL because the current dashboard still links to `/apply` and does not yet contain the new welcome/progress structure.

### Task 2: Dashboard Page Refactor

**Files:**
- Modify: `pages/dashboard.jsx`

- [x] **Step 1: Preserve the existing data query**

Keep this query exactly:

```js
const { data, error } = await supabase
  .from('applications')
  .select('*')
  .eq('user_id', u.id)
  .order('submitted_at', { ascending: false })
  .limit(1)
  .maybeSingle()
```

- [x] **Step 2: Add display helpers**

Add local helpers for `formatDate`, `PROGRAM_LABELS`, `STATUS_LABELS`, and `statusClass`.

- [x] **Step 3: Update redirects and logout**

Use `router.replace('/login')` for unauthenticated redirect and logout.

- [x] **Step 4: Replace old hero/dashboard layout**

Render the new structure:

```text
Header
Main container
  Welcome card
  Submitted-only info banner
  Progress card via StatusTracker
  Email notification line
Footer
```

- [x] **Step 5: Remove no-application CTA**

Empty state must greet the user and explain no application exists, without linking to `/apply`.

### Task 3: Status Tracker Update

**Files:**
- Modify: `components/portal/StatusTracker.jsx`
- Modify: `styles/statusTracker.module.css`

- [x] **Step 1: Keep exactly three stages**

Stages:

```js
[
  { key: 'submitted', label: 'Application Submitted' },
  { key: 'interview', label: 'Interview Scheduled' },
  { key: 'offer', label: 'Offer Sent' },
]
```

- [x] **Step 2: Implement step states**

`submitted`: step 1 completed, steps 2-3 inactive.

`interview`: step 1 completed, step 2 active, step 3 inactive.

`offer`: steps 1-2 completed, step 3 active/completed.

`rejected`: freeze at step 1 completed and show the muted review message.

- [x] **Step 3: Add submitted date sub-label**

Step 1 sub-label uses the formatted submitted date. Inactive future steps say `Pending`.

### Task 4: CSS Modules

**Files:**
- Modify: `styles/dashboard.module.css`
- Modify: `styles/statusTracker.module.css`

- [x] **Step 1: Dashboard CSS**

Implement the white 64px nav, gray page background, content max-width, welcome card, four-column info grid, status badges, submitted info banner, empty/error cards, and email notification line.

- [x] **Step 2: Responsive CSS**

At `max-width: 768px`, stack the welcome card sections and change the info grid to one or two columns. Preserve the mobile StatusTracker behavior at 375px.

### Task 5: Verification

**Files:**
- Verify: `pages/dashboard.jsx`
- Verify: `components/portal/StatusTracker.jsx`
- Verify: `styles/dashboard.module.css`
- Verify: `styles/statusTracker.module.css`

- [x] **Step 1: Re-run source-level checks**

```bash
node - <<'NODE'
const fs = require('fs')
const dashboard = fs.readFileSync('pages/dashboard.jsx', 'utf8')
const tracker = fs.readFileSync('components/portal/StatusTracker.jsx', 'utf8')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(!dashboard.includes('href="/apply"'), 'dashboard must not link to /apply')
assert(dashboard.includes("router.replace('/login')"), 'logout and unauthenticated redirects must use router.replace')
assert(dashboard.includes('Welcome back,'), 'dashboard must render welcome card copy')
assert(dashboard.includes('currentStatus'), 'dashboard must calculate a status badge view model')
assert(tracker.includes('submittedAt'), 'StatusTracker must accept submittedAt for sub-label dates')
assert(tracker.includes('Application Progress'), 'StatusTracker must render the progress card title')
assert(!tracker.includes('Rejected'), 'visible tracker copy must not include Rejected')
NODE
```

Expected: PASS.

- [x] **Step 2: Build**

```bash
npm run build
```

Expected: exits with code 0.

- [x] **Step 3: Update progress log**

Add a dated dashboard implementation entry to `progress.md` with files changed and verification result.
