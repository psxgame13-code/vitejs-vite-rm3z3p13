-- Tentativas, ciclos, missões, conquistas e pilar prioritário do mês.
-- pillar_scores só nasce com 2 ou mais tentativas de avaliação.

create table public.assessment_cycles (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  kind public.cycle_kind not null,
  label text not null,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  constraint assessment_cycles_label_not_blank check (char_length(btrim(label)) > 0),
  constraint assessment_cycles_dates check (ends_on >= starts_on)
);

create table public.activity_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete restrict,
  cycle_id uuid references public.assessment_cycles (id) on delete restrict,
  context public.attempt_context not null,
  difficulty smallint not null,
  score smallint not null,
  hits smallint not null,
  rounds smallint not null,
  duration_ms integer not null,
  feedback text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint activity_attempts_difficulty check (difficulty between 1 and 3),
  constraint activity_attempts_score check (score between 0 and 100),
  constraint activity_attempts_rounds check (rounds > 0 and hits between 0 and rounds),
  constraint activity_attempts_duration check (duration_ms between 0 and 1800000),
  constraint activity_attempts_feedback_len check (char_length(btrim(feedback)) between 1 and 500),
  constraint activity_attempts_detail_object check (jsonb_typeof(detail) = 'object'),
  constraint activity_attempts_assessment_has_cycle check (
    context <> 'assessment' or cycle_id is not null
  )
);

create table public.pillar_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  cycle_id uuid not null references public.assessment_cycles (id) on delete cascade,
  pillar_id uuid not null references public.pillars (id) on delete restrict,
  score numeric(5, 2) not null,
  attempt_count integer not null,
  computed_at timestamptz not null default now(),
  constraint pillar_scores_unique unique (student_id, cycle_id, pillar_id),
  constraint pillar_scores_score check (score >= 0 and score <= 100),
  constraint pillar_scores_several_attempts check (attempt_count >= 2)
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete restrict,
  cycle_id uuid references public.assessment_cycles (id) on delete set null,
  title text not null,
  starts_on date not null,
  ends_on date not null,
  suggested_level smallint not null default 1,
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint missions_title check (char_length(btrim(title)) > 0),
  constraint missions_dates check (ends_on >= starts_on),
  constraint missions_level check (suggested_level between 1 and 3)
);

create table public.student_missions (
  mission_id uuid not null references public.missions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status public.mission_status not null default 'available',
  started_at timestamptz,
  completed_at timestamptz,
  best_score smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (mission_id, student_id),
  constraint student_missions_score check (best_score is null or best_score between 0 and 100),
  constraint student_missions_completion check (
    (status <> 'completed' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  )
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  xp integer not null,
  rule jsonb not null,
  created_at timestamptz not null default now(),
  constraint achievements_slug check (slug ~ '^[a-z0-9-]{3,64}$'),
  constraint achievements_xp check (xp between 0 and 100),
  constraint achievements_rule check (
    rule ->> 'version' = '1'
    and jsonb_typeof(rule -> 'kind') = 'string'
    and (rule ->> 'minimum')::integer >= 1
  )
);

create table public.student_achievements (
  student_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete restrict,
  unlocked_at timestamptz not null default now(),
  note text not null,
  primary key (student_id, achievement_id),
  constraint student_achievements_note check (char_length(btrim(note)) between 1 and 200)
);

create table public.interventions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  pillar_id uuid not null references public.pillars (id) on delete restrict,
  cycle_id uuid references public.assessment_cycles (id) on delete set null,
  month_start date not null,
  note text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint interventions_month_start check (extract(day from month_start) = 1),
  constraint interventions_note check (char_length(btrim(note)) between 1 and 400),
  constraint interventions_one_priority unique (class_id, month_start)
);

create index activity_attempts_student_created_idx
  on public.activity_attempts (student_id, created_at desc);
create index activity_attempts_cycle_idx
  on public.activity_attempts (cycle_id, activity_id);
create index pillar_scores_cycle_idx
  on public.pillar_scores (cycle_id, pillar_id);
create index missions_class_idx on public.missions (class_id, starts_on);
create index student_missions_student_idx on public.student_missions (student_id);
create index interventions_class_idx on public.interventions (class_id, month_start);

comment on table public.activity_attempts is
  'Uma linha por tentativa: acertos, rodadas, tempo, nível, nota e feedback exibido.';
comment on table public.pillar_scores is
  'Média das tentativas de avaliação do ciclo. Não existe linha com uma tentativa só.';
comment on column public.achievements.xp is
  'Soma só do próprio aluno. Nível 1: 0-49. Nível 2: 50-119. Nível 3: 120-219. Nível 4: 220 ou mais. Sem ranking.';
comment on table public.interventions is
  'Pilar prioritário do mês na turma. Apoio pedagógico, não diagnóstico.';
comment on table public.student_achievements is
  'Conquista individual. A migração 007 só libera quem cumpriu a regra.';

insert into public.achievements (slug, name, description, xp, rule)
values
  (
    'first-step',
    'Primeiro passo',
    'Concluiu a primeira missão.',
    20,
    '{"version":"1","kind":"completed_missions","minimum":1}'::jsonb
  ),
  (
    'steady-practice',
    'Prática constante',
    'Fez pelo menos três tentativas no mesmo pilar.',
    15,
    '{"version":"1","kind":"attempts_in_one_pillar","minimum":3}'::jsonb
  ),
  (
    'level-two',
    'Subiu um nível',
    'Concluiu uma atividade no nível 2 ou mais.',
    25,
    '{"version":"1","kind":"max_difficulty","minimum":2}'::jsonb
  ),
  (
    'own-path',
    'Meu caminho',
    'Melhorou o próprio indicador de um pilar entre dois ciclos.',
    40,
    '{"version":"1","kind":"pillar_improved","minimum":1}'::jsonb
  ),
  (
    'full-round',
    'Volta completa',
    'Tem tentativa de avaliação nos quatro pilares.',
    30,
    '{"version":"1","kind":"assessment_pillars","minimum":4}'::jsonb
  );

revoke all on table public.assessment_cycles from anon, authenticated, public;
revoke all on table public.activity_attempts from anon, authenticated, public;
revoke all on table public.pillar_scores from anon, authenticated, public;
revoke all on table public.missions from anon, authenticated, public;
revoke all on table public.student_missions from anon, authenticated, public;
revoke all on table public.achievements from anon, authenticated, public;
revoke all on table public.student_achievements from anon, authenticated, public;
revoke all on table public.interventions from anon, authenticated, public;

grant select, insert, update on table public.assessment_cycles to authenticated;
grant select, insert on table public.activity_attempts to authenticated;
grant select on table public.pillar_scores to authenticated;
grant select, insert, update on table public.missions to authenticated;
grant select, insert, update on table public.student_missions to authenticated;
grant select on table public.achievements to authenticated;
grant select on table public.student_achievements to authenticated;
grant select, insert, update on table public.interventions to authenticated;

grant select, insert, update, delete on table public.assessment_cycles to service_role;
grant select, insert, update, delete on table public.activity_attempts to service_role;
grant select, insert, update, delete on table public.pillar_scores to service_role;
grant select, insert, update, delete on table public.missions to service_role;
grant select, insert, update, delete on table public.student_missions to service_role;
grant select, insert, update, delete on table public.achievements to service_role;
grant select, insert, update, delete on table public.student_achievements to service_role;
grant select, insert, update, delete on table public.interventions to service_role;