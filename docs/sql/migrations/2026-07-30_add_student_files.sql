-- Private per-student course files.
-- Apply after 2026-07-22_add_course_hours_tracking.sql.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'student-files',
  'student-files',
  false,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.student_files (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null
    references public.student_course_enrollments(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  visible_to_student boolean not null default true,
  uploaded_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_student_files_enrollment
  on public.student_files (enrollment_id, created_at desc);

alter table public.student_files enable row level security;

drop policy if exists "admins_manage_student_files" on public.student_files;
create policy "admins_manage_student_files"
  on public.student_files for all
  using (public.is_yonde_admin())
  with check (public.is_yonde_admin());

drop policy if exists "students_read_own_visible_files" on public.student_files;
create policy "students_read_own_visible_files"
  on public.student_files for select
  using (
    visible_to_student
    and exists (
      select 1
      from public.student_course_enrollments e
      join public.applications a on a.id = e.application_id
      where e.id = student_files.enrollment_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "admins_manage_student_file_objects" on storage.objects;
create policy "admins_manage_student_file_objects"
  on storage.objects for all
  using (
    bucket_id = 'student-files'
    and public.is_yonde_admin()
  )
  with check (
    bucket_id = 'student-files'
    and public.is_yonde_admin()
  );

drop policy if exists "students_read_own_file_objects" on storage.objects;
create policy "students_read_own_file_objects"
  on storage.objects for select
  using (
    bucket_id = 'student-files'
    and exists (
      select 1
      from public.student_files f
      join public.student_course_enrollments e on e.id = f.enrollment_id
      join public.applications a on a.id = e.application_id
      where f.storage_path = storage.objects.name
        and f.visible_to_student
        and a.user_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';

-- Verification: expect one private bucket and the student_files table.
select id, public, file_size_limit
from storage.buckets
where id = 'student-files';

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'student_files';
