-- Tipos estáveis do NEXO. A dificuldade 1, 2 ou 3 entra depois como smallint.
-- Nenhum destes valores representa diagnóstico clínico.

create extension if not exists pgcrypto with schema extensions;

create type public.user_role as enum (
  'student',
  'teacher',
  'principal',
  'secretary',
  'admin'
);

create type public.pillar_key as enum (
  'focus',
  'self_regulation',
  'emotional_intelligence',
  'digital_culture'
);

create type public.cycle_kind as enum (
  'initial',
  'intermediate',
  'final'
);

create type public.attempt_context as enum (
  'assessment',
  'mission',
  'practice'
);

create type public.mission_status as enum (
  'available',
  'in_progress',
  'completed'
);

create type public.audit_action as enum (
  'create_school',
  'update_school',
  'create_class',
  'update_class',
  'create_user',
  'update_user',
  'set_active',
  'link_teacher',
  'unlink_teacher',
  'link_student',
  'unlink_student',
  'set_intervention',
  'update_permissions'
);

comment on type public.user_role is
  'Perfis do NEXO. O próprio usuário não pode alterar o seu role.';

comment on type public.pillar_key is
  'Quatro pilares de apoio pedagógico, não de diagnóstico.';

comment on type public.cycle_kind is
  'Avaliação inicial, intermediária ou final de um ciclo comparável.';

comment on type public.attempt_context is
  'Origem da tentativa: avaliação, missão ou prática.';

comment on type public.mission_status is
  'Andamento individual da missão. Não existe ranking público.';

comment on type public.audit_action is
  'Operações administrativas gravadas em audit_log.';

grant usage on type public.user_role to anon, authenticated, service_role;
grant usage on type public.pillar_key to anon, authenticated, service_role;
grant usage on type public.cycle_kind to anon, authenticated, service_role;
grant usage on type public.attempt_context to anon, authenticated, service_role;
grant usage on type public.mission_status to anon, authenticated, service_role;
grant usage on type public.audit_action to anon, authenticated, service_role;