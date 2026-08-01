-- Convert accepted applications into current students without deleting admissions history.
-- Apply after 2026-08-01_add_current_students.sql.

alter table public.current_students
  drop constraint if exists current_students_program_check;
alter table public.current_students
  add constraint current_students_program_check check (
    program in ('ra', 'isef', 'irp', 'passion-project', 'portfolio-project')
  );

alter table public.applications
  add column if not exists converted_current_student_id uuid unique
    references public.current_students(id) on delete set null;

alter table public.applications
  add column if not exists converted_to_current_student_at timestamptz;

create index if not exists idx_applications_unconverted_status
  on public.applications (status, submitted_at desc)
  where converted_current_student_id is null;

create or replace function public.convert_application_to_current_student(
  p_application_id uuid
)
returns public.current_students
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.applications;
  v_student public.current_students;
  v_name text;
  v_email text;
begin
  if not public.is_yonde_admin() then
    raise exception 'Admin access required';
  end if;

  select * into v_application
  from public.applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Application not found';
  end if;

  if v_application.converted_current_student_id is not null then
    select * into v_student
    from public.current_students
    where id = v_application.converted_current_student_id;
    return v_student;
  end if;

  if v_application.status <> 'offer' then
    raise exception 'Only applications at Offer sent can become current students';
  end if;

  v_name := coalesce(
    nullif(trim(v_application.form_data ->> 'preferred_name'), ''),
    nullif(trim(v_application.form_data ->> 'full_name'), ''),
    nullif(trim(v_application.contact_email), ''),
    'Unnamed student'
  );
  v_email := coalesce(
    nullif(lower(trim(v_application.contact_email)), ''),
    nullif(lower(trim(v_application.form_data ->> 'email')), '')
  );

  if v_email is not null and exists (
    select 1 from public.current_students
    where lower(contact_email) = v_email
  ) then
    raise exception 'A current student already uses this email address';
  end if;

  insert into public.current_students (
    full_name,
    contact_email,
    program,
    status,
    source,
    created_by
  ) values (
    v_name,
    v_email,
    v_application.program,
    'active',
    'application_conversion',
    auth.uid()
  )
  returning * into v_student;

  update public.student_course_enrollments
  set application_id = null,
      current_student_id = v_student.id,
      updated_at = now()
  where application_id = p_application_id;

  update public.student_portal_accounts
  set application_id = null,
      current_student_id = v_student.id,
      updated_at = now()
  where application_id = p_application_id;

  update public.applications
  set converted_current_student_id = v_student.id,
      converted_to_current_student_at = now(),
      updated_at = now()
  where id = p_application_id;

  return v_student;
end;
$$;

revoke all on function public.convert_application_to_current_student(uuid) from public;
grant execute on function public.convert_application_to_current_student(uuid) to authenticated;

notify pgrst, 'reload schema';
