-- Seeds the Entrepreneurship Program with Prof. Gu and its first three students.
-- Data, not schema. Run AFTER:
--   2026-09-02_add_student_journey.sql
--   2026-09-02_add_student_school_stage.sql
--
-- Content is copied verbatim from the "Yonde Student Portal V1 Upgrade" spec.
-- Program-level content (overview, Learning Map, phases, milestones) is shared
-- by all three students; only school/stage/project fields differ per student.
--
-- Idempotent: re-running updates rather than duplicating. Safe to run twice.

do $$
declare
  v_plan_id uuid;
  v_phase1 uuid; v_phase2 uuid; v_phase3 uuid;
  v_cat uuid;
  v_gu uuid; v_tom uuid; v_weici uuid;
  v_student uuid;
  v_enrollment uuid;
  r record;
begin

  -- 1. Program ---------------------------------------------------------------

  select id into v_plan_id from public.course_plans
   where name = 'Entrepreneurship Program with Prof. Gu';

  if v_plan_id is null then
    insert into public.course_plans (name, description, allow_overage)
    values ('Entrepreneurship Program with Prof. Gu', null, true)
    returning id into v_plan_id;
  end if;

  update public.course_plans set
    learning_objective = 'Build the knowledge and capabilities to take an AI idea from concept to a validated, working venture — combining AI/ML foundations, hands-on building, and entrepreneurial thinking.',
    capstone_goal      = 'Build a working demo prototype for an AI-powered venture and present it as a final capstone.',
    cadence            = E'Professor session — once per month\nFormal TA sessions — 1–2 times per month\n1:1 office hours — scheduled separately by the student as needed',
    starts_on          = date '2026-09-01',
    expected_end_on    = date '2027-04-30',
    allow_overage      = true,
    updated_at         = now()
  where id = v_plan_id;

  -- 2. Learning Map ----------------------------------------------------------
  -- Rebuilt wholesale so re-running cannot leave stale or duplicate topics.

  delete from public.learning_map_categories where course_plan_id = v_plan_id;

  insert into public.learning_map_categories (course_plan_id, name, display_order)
  values (v_plan_id, 'AI & ML Foundations', 0) returning id into v_cat;
  insert into public.learning_map_topics (category_id, name, display_order) values
    (v_cat, 'How Machine Learning Works',            0),
    (v_cat, 'Supervised vs. Unsupervised Learning',  1),
    (v_cat, 'Regression & Classification',           2),
    (v_cat, 'Data & Probability Thinking',           3),
    (v_cat, 'Model Evaluation',                      4),
    (v_cat, 'Clustering',                            5),
    (v_cat, 'Dimensionality Reduction',              6),
    (v_cat, 'Recommendation Systems',                7);

  insert into public.learning_map_categories (course_plan_id, name, display_order)
  values (v_plan_id, 'Building with AI', 1) returning id into v_cat;
  insert into public.learning_map_topics (category_id, name, display_order) values
    (v_cat, 'From Problem to AI Solution',        0),
    (v_cat, 'Choosing the Right AI Approach',     1),
    (v_cat, 'Working with Data',                  2),
    (v_cat, 'AI Prototyping',                     3),
    (v_cat, 'Using Existing Models & APIs',       4),
    (v_cat, 'Evaluating AI Product Performance',  5),
    (v_cat, 'Technical Feasibility',              6);

  insert into public.learning_map_categories (course_plan_id, name, display_order)
  values (v_plan_id, 'AI Entrepreneurship', 2) returning id into v_cat;
  insert into public.learning_map_topics (category_id, name, display_order) values
    (v_cat, 'Problem Discovery',              0),
    (v_cat, 'Customer & User Understanding',  1),
    (v_cat, 'Market & Competitor Research',   2),
    (v_cat, 'Value Proposition',              3),
    (v_cat, 'MVP & Prototype',                4),
    (v_cat, 'Product Validation',             5),
    (v_cat, 'Business Model',                 6),
    (v_cat, 'Differentiation & Moat',         7),
    (v_cat, 'Go-to-Market',                   8),
    (v_cat, 'Pitch & Storytelling',           9);

  -- 3. Project Journey -------------------------------------------------------
  -- Phases are upserted by name so existing milestone links survive a re-run.

  select id into v_phase1 from public.project_phases
   where course_plan_id = v_plan_id and name = 'Foundations Building';
  if v_phase1 is null then
    insert into public.project_phases (course_plan_id, name, estimated_duration, indicative_focus, display_order)
    values (v_plan_id, 'Foundations Building', '~4–6 weeks',
      'Foundational AI/ML understanding, entrepreneurial thinking, and opportunity exploration. This is guidance, not a fixed checklist.', 0)
    returning id into v_phase1;
  end if;

  select id into v_phase2 from public.project_phases
   where course_plan_id = v_plan_id and name = 'Project Definition & Prototype';
  if v_phase2 is null then
    insert into public.project_phases (course_plan_id, name, estimated_duration, indicative_focus, display_order)
    values (v_plan_id, 'Project Definition & Prototype', '~8–12 weeks',
      'Problem definition, target-user identification, AI use-case definition, technical feasibility exploration, and initial prototype development. The exact path may evolve by student.', 1)
    returning id into v_phase2;
  end if;

  select id into v_phase3 from public.project_phases
   where course_plan_id = v_plan_id and name = 'Iterate, Validate & Go-to-Market';
  if v_phase3 is null then
    insert into public.project_phases (course_plan_id, name, estimated_duration, indicative_focus, display_order)
    values (v_plan_id, 'Iterate, Validate & Go-to-Market', '~12–16 weeks',
      'Product and technical iteration, user feedback, validation, positioning, go-to-market exploration, and preparation for the final presentation. The sequence and emphasis may vary by project.', 2)
    returning id into v_phase3;
  end if;

  -- 4. Milestones ------------------------------------------------------------
  -- Upserted by title: deleting them would destroy student_milestone_progress.

  for r in
    select * from (values
      ('Foundation Ready',           v_phase1, 0),
      ('Project Direction Confirmed', v_phase2, 1),
      ('Product Concept Defined',     v_phase2, 2),
      ('Prototype V0',                v_phase2, 3),
      ('Prototype V1',                v_phase3, 4),
      ('Validation',                  v_phase3, 5),
      ('GTM Strategy',                v_phase3, 6),
      ('Final Capstone',              v_phase3, 7)
    ) as t(title, phase_id, sort_order)
  loop
    if exists (select 1 from public.course_milestones
                where course_plan_id = v_plan_id and title = r.title) then
      update public.course_milestones
         set phase_id = r.phase_id, sort_order = r.sort_order, updated_at = now()
       where course_plan_id = v_plan_id and title = r.title;
    else
      insert into public.course_milestones (course_plan_id, title, phase_id, sort_order)
      values (v_plan_id, r.title, r.phase_id, r.sort_order);
    end if;
  end loop;

  -- 5. Team ------------------------------------------------------------------

  select id into v_gu from public.mentors where name = 'Professor Weiqing Gu';
  if v_gu is null then
    insert into public.mentors (name) values ('Professor Weiqing Gu') returning id into v_gu;
  end if;
  update public.mentors set
    responsibility = 'Leads the core teaching and mentorship of the program. Guides students through AI/ML foundations, technical thinking, project direction, and major project decisions.',
    timezone = 'Pacific Time',
    updated_at = now()
  where id = v_gu;

  select id into v_tom from public.mentors where name = 'Tom Tang';
  if v_tom is null then
    insert into public.mentors (name) values ('Tom Tang') returning id into v_tom;
  end if;
  update public.mentors set
    responsibility = 'Supports students with mathematical and machine learning concepts, technical questions, and implementation challenges during project development.',
    timezone = null,
    updated_at = now()
  where id = v_tom;

  select id into v_weici from public.mentors where name = 'Weici';
  if v_weici is null then
    insert into public.mentors (name) values ('Weici') returning id into v_weici;
  end if;
  update public.mentors set
    responsibility = 'Supports project development from the product side, including project guidance, product thinking, prototype development, and iterative feedback.',
    timezone = null,
    updated_at = now()
  where id = v_weici;

  -- 6. Students --------------------------------------------------------------

  for r in
    select * from (values
      ('Cici Fu',      'The Webb Schools', null,               'AI × Fashion',
       'Build a working demo prototype for an AI-powered fashion venture.'),
      ('Emily Wei',    'Appleby College',  'Rising Sophomore', 'AI × Fashion',
       'Build a working demo prototype for an AI-powered fashion venture.'),
      -- Alex Han: the spec gives a project area but no confirmed goal, so the
      -- goal is left null and the portal renders "Exploring Project Direction".
      ('Alex Han',      null,              null,               'AI × Rehabilitation', null)
    ) as t(full_name, school, stage, project_area, project_goal)
  loop
    -- These three were already entered in the admin portal, so the match is
    -- case-insensitive and trim-tolerant: a stray space or different casing
    -- must update the existing student, never create a second one.
    select id into v_student from public.current_students
     where lower(trim(full_name)) = lower(trim(r.full_name))
     order by created_at asc limit 1;

    if v_student is null then
      insert into public.current_students (full_name, program, status, source)
      values (r.full_name, null, 'active', 'manual')
      returning id into v_student;
      -- Surfaced deliberately: if this fires, the portal spelling differs from
      -- the spec and you now have two records to reconcile.
      raise notice 'Created new student "%" — no existing record matched.', r.full_name;
    else
      raise notice 'Updated existing student "%".', r.full_name;
    end if;

    update public.current_students set
      school = r.school, stage = r.stage,
      project_area = r.project_area, project_goal = r.project_goal,
      updated_at = now()
    where id = v_student;

    -- Enrollment is what links a student to the plan carrying the Learning Map
    -- and Project Journey, so every student needs one.
    select id into v_enrollment from public.student_course_enrollments
     where current_student_id = v_student and course_plan_id = v_plan_id;
    if v_enrollment is null then
      -- allocated_minutes is NOT NULL and must be > 0, but this program is not
      -- hours-based. 2400 (40h) with the plan's allow_overage = true makes it a
      -- non-binding minimum rather than a cap. Adjust if real hours are agreed.
      insert into public.student_course_enrollments
        (current_student_id, application_id, course_plan_id, allocated_minutes, status, started_at)
      values (v_student, null, v_plan_id, 2400, 'active', date '2026-09-01')
      returning id into v_enrollment;
    end if;

    insert into public.student_mentor_assignments (current_student_id, mentor_id, role, sort_order)
    values
      (v_student, v_gu,    'Core Mentor / Lead Instructor', 0),
      (v_student, v_tom,   'TA — Math & Machine Learning',  1),
      (v_student, v_weici, 'TA — Product & Prototype',      2)
    on conflict (current_student_id, mentor_id, role) do nothing;
  end loop;

end $$;

-- Verify:
-- select full_name, school, stage, project_area, project_goal
--   from public.current_students where source = 'manual' order by full_name;
