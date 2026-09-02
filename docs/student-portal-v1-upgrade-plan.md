# Student Portal V1 Upgrade — Implementation Plan

Status: planned, not started. Written 2026-09-02 from the "Yonde Student Portal
V1 Upgrade" product spec.

## Goal

Turn `/student` from a two-card launcher into one coherent, editorial page that
answers, in ~30 seconds: what am I learning, where am I in the project, who
supports me, what has happened, where are my materials.

Explicitly **not** an LMS. See "Non-goals" at the bottom before adding anything.

## Decisions already taken

| Decision | Choice | Consequence |
|---|---|---|
| Course hours in the student view | **Keep the full hours page** | `/student/course` and `CourseHours.jsx` survive untouched as a separate page. The new journey page does not show hours. |
| Four-student seed | **On hold** | `docs/sql/seeds/2026-09-02_add_four_current_students.sql` is not to be run until the Weici / Alex Han question is resolved (see Open questions). |

## Gap analysis

| Spec section | Exists today | Work |
|---|---|---|
| Program Overview | Program name only, via `PROGRAM_LABELS` | New program + student fields |
| Your Learning Map | Nothing. `course_modules` is hours-based (`planned_minutes`), not knowledge-based | New tables + admin CRUD |
| Project Journey | `course_milestones` + `student_milestone_progress`, flat, no phases or durations | Phase layer above the existing milestones |
| Your Team | `mentors.name` + `student_mentor_assignments.role` | Add `responsibility`, `timezone` |
| Session Notes | `class_sessions.notes` exists but is admin-internal and feeds mentor payments | New table — do not reuse |
| Additional Materials | `student_files` + `StudentFiles.jsx`, fully working | Keep; restyle only |

## Architecture principle

Mirror the pattern the schema already uses — **plan-level definition +
per-student progress** (`course_milestones` → `student_milestone_progress`) —
rather than inventing a second one.

- **Program-level**, on `course_plans`: learning objective, capstone goal,
  cadence, start/end dates, Learning Map, Project Journey phases. The three
  students in Prof. Gu's program share this; it is authored once.
- **Student-level**: project area, project goal, milestone/phase status.
- **Phase status is derived, never stored**: a phase is `completed` when all its
  milestones are complete, `current` for the first phase that is not. Avoids a
  second source of truth that can drift from milestone progress.

## Migration sketch

One migration, `docs/sql/migrations/YYYY-MM-DD_add_student_journey.sql`:

```
course_plans        + learning_objective, capstone_goal, cadence,
                      starts_on, expected_end_on
current_students    + project_area, project_goal
mentors             + responsibility, timezone
course_milestones   + phase_id (nullable fk -> project_phases)

learning_map_categories (id, course_plan_id, name, display_order)
learning_map_topics     (id, category_id, name, display_order)
project_phases          (id, course_plan_id, name, estimated_duration text,
                         indicative_focus text, display_order)
session_notes           (id, enrollment_id, session_date, title, mentor_id,
                         notes, created_by, created_at)
```

RLS follows the existing split exactly: admin `for all using (is_yonde_admin())`,
plus a `student_portal` read policy scoped through the student's own enrollment,
matching `students_read_assigned_milestones` in the 2026-08-01 migration.

`estimated_duration` is **text** ("~4–6 weeks"), not a date range — the spec
deliberately avoids calendar commitments.

## Student page structure

`/student` becomes one page, sections in this fixed order:

1. Program Overview
2. Your Learning Map
3. Project Journey
4. Your Team
5. Session Notes
6. Additional Materials (renders the existing `StudentFiles`)

`/student/course` (hours) and `/student/files` remain as pages so existing links
keep working; `PortalNavbar.jsx` keeps all three entries.

New components under `components/portal/`: `ProgramOverview.jsx`,
`LearningMap.jsx`, `ProjectJourney.jsx`, `YourTeam.jsx`, `SessionNotes.jsx`.
New `styles/studentJourney.module.css` — do not extend `courseHours.module.css`,
whose student-facing classes are a separate visual system per CLAUDE.md.

## Admin authoring

All new content needs a staff surface or it is invisible. In
`components/admin/`: extend `CoursePlanManager.jsx` with Learning Map and
Project Journey editors (add / rename / delete / reorder for both levels), add
program-overview fields to the plan form, add `responsibility` + `timezone` to
`MentorAssignments.jsx`, and a new `SessionNotes.jsx` panel in the student
detail view.

## Build order

1. Migration + admin authoring — nothing is student-visible until staff can
   enter content.
2. Restructure `/student` into the six-section page, existing Files section
   dropped in unchanged.
3. Learning Map, Project Journey, Your Team.
4. Session Notes accordion, then restyle Files to match.

Each step ends with `npm run build`, the repo's only correctness check.

## Empty states

Never render `NULL`, `N/A`, or `undefined`. Use "Exploring Project Direction",
"No session notes yet", and hide a section entirely when it has no meaningful
content. Alex's project goal is deliberately unset and must read
"Exploring Project Direction".

## Responsive

Learning Map: visual on desktop, clean vertical nesting on mobile — never a
horizontal mindmap canvas. Project Journey: vertical timeline on mobile, current
phase visually dominant. Team: multi-column to stacked. Session Notes: accordion
on both.

## Open questions

1. **Is "Weici" a student or a TA?** The spec lists "Weici — TA, Product &
   Prototype" in the team, while the seed has a student "Alex HanWeici" holding
   `annalisazwc@gmail.com`. The cohort in the spec is three students (CC, Emily,
   Alex). Likely `Alex Han` (student) and `Weici` (mentor) are two people, and
   the email may be Weici's. Blocks the seed.
2. **Who is "CC"** — Cici Fu or Clementine Li? The spec names three students;
   four were requested.
3. **Program enum.** "Entrepreneurship Program with Prof. Gu" is a course-plan
   name, not a value in `CURRENT_STUDENT_PROGRAMS`. Plan: leave
   `current_students.program` null (per the 2026-09-02 migration) and source the
   displayed program name from the course plan.
4. Professor Gu's timezone is "Pacific Time — confirm before production"; Tom
   Tang and Weici are TBD.

## Non-goals (from the spec — do not build)

Chat, messaging, email, meeting scheduling, calendar, Zoom integration,
automatic transcripts, homework, assignment submission, grading, attendance,
task management, Kanban, Gantt, complex dependencies, AI-generated curriculum or
Learning Maps, automated milestone planning.
