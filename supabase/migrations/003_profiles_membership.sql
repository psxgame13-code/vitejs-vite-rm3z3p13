-- Perfil ligado a auth.users e os vínculos de turma.
-- Aluno não guarda nome real: display_name é o código interno.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  school_id uuid references public.schools (id) on delete restrict,
  municipality_id uuid references public.municipalities (id) on delete restrict,
  internal_code text not null,
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_internal_code_unique unique (internal_code),
  constraint profiles_internal_code_format check (internal_code ~ '^[A-Z0-9-]{4,32}$'),
  constraint profiles_display_name_not_blank check (char_length(btrim(display_name)) > 0),
  constraint profiles_student_code check (
    role <> 'student' or internal_code ~ '^NX-[0-9]{4}$'
  ),
  constraint profiles_student_has_no_real_name check (
    role <> 'student' or display_name = internal_code
  ),
  constraint profiles_role_scope check (
    (
      role in ('student', 'teacher', 'principal')
      and school_id is not null
      and municipality_id is not null
    )
    or (
      role = 'secretary'
      and school_id is null
      and municipality_id is not null
    )
    or role = 'admin'
  )
);

create table public.class_teachers (
  class_id uuid not null references public.classes (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, teacher_id)
);

create table public.class_students (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, student_id),
  constraint class_students_one_class unique (student_id)
);

create index profiles_school_id_idx on public.profiles (school_id);
create index profiles_municipality_id_idx on public.profiles (municipality_id);
create index profiles_role_idx on public.profiles (role);
create index class_teachers_teacher_id_idx on public.class_teachers (teacher_id);
create index class_students_class_id_idx on public.class_students (class_id);

comment on table public.profiles is
  'Papel e escopo. E-mail fica só em auth.users. Aluno usa código NX-0000.';
comment on table public.class_teachers is
  'Professor só acessa turmas desta tabela. A migração 010 confere o papel.';
comment on table public.class_students is
  'Um aluno em uma turma. Sem nome real.';
comment on column public.profiles.display_name is
  'Para aluno, igual ao internal_code. Para equipe, nome de tratamento, sem dado sensível.';

revoke all on table public.profiles from anon, authenticated, public;
revoke all on table public.class_teachers from anon, authenticated, public;
revoke all on table public.class_students from anon, authenticated, public;

grant select, insert, update, delete on table public.profiles to authenticated, service_role;
grant select, insert, update, delete on table public.class_teachers to authenticated, service_role;
grant select, insert, update, delete on table public.class_students to authenticated, service_role;