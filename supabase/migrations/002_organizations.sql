-- Município, escolas e turmas. Sem dados de alunos.
-- O RLS entra na migração 008. Estas tabelas nascem sem política.

create table public.municipalities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  uf char(2) not null default 'RS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint municipalities_name_not_blank check (char_length(btrim(name)) > 0),
  constraint municipalities_uf_format check (uf ~ '^[A-Z]{2}$')
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities (id) on delete restrict,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schools_name_not_blank check (char_length(btrim(name)) > 0),
  constraint schools_name_unique_per_municipality unique (municipality_id, name)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete restrict,
  name text not null,
  grade smallint not null,
  school_year smallint not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classes_name_not_blank check (char_length(btrim(name)) > 0),
  constraint classes_grade_fundamental_2 check (grade between 6 and 9),
  constraint classes_school_year_range check (school_year between 2024 and 2100),
  constraint classes_name_unique_per_school_year unique (school_id, name, school_year)
);

create index schools_municipality_id_idx on public.schools (municipality_id);
create index classes_school_id_idx on public.classes (school_id);

comment on table public.municipalities is 'Rede municipal atendida pelo NEXO.';
comment on table public.schools is 'Escola. O diretor enxerga apenas a sua.';
comment on table public.classes is 'Turma do 6º ao 9º ano. Sem lista nominal de alunos.';

revoke all on table public.municipalities from anon, authenticated, public;
revoke all on table public.schools from anon, authenticated, public;
revoke all on table public.classes from anon, authenticated, public;

grant select, insert, update, delete on table public.municipalities to authenticated, service_role;
grant select, insert, update, delete on table public.schools to authenticated, service_role;
grant select, insert, update, delete on table public.classes to authenticated, service_role;