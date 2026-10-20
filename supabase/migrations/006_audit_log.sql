-- Trilha das operações administrativas. Só entra linha nova.
-- O payload não leva senha, token nem e-mail.

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action public.audit_action not null,
  entity text not null,
  entity_id uuid,
  school_id uuid references public.schools (id) on delete set null,
  municipality_id uuid references public.municipalities (id) on delete set null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_log_entity check (
    entity in (
      'school',
      'class',
      'profile',
      'class_teacher',
      'class_student',
      'intervention',
      'permissions'
    )
  ),
  constraint audit_log_summary check (char_length(btrim(summary)) between 1 and 300),
  constraint audit_log_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint audit_log_no_secrets check (
    not jsonb_exists(payload, 'password')
    and not jsonb_exists(payload, 'service_role')
    and not jsonb_exists(payload, 'access_token')
    and not jsonb_exists(payload, 'email')
  )
);

create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id);
create index audit_log_school_idx on public.audit_log (school_id);
create index audit_log_action_idx on public.audit_log (action, created_at desc);

comment on table public.audit_log is
  'Append-only. Admin vê a rede; diretor vê a própria escola. Secretário não acessa.';
comment on column public.audit_log.payload is
  'Metadados mínimos, como código interno e papel. Sem nome real de aluno, senha ou e-mail.';

revoke all on table public.audit_log from anon, authenticated, public;

grant select on table public.audit_log to authenticated;
grant select, insert on table public.audit_log to service_role;