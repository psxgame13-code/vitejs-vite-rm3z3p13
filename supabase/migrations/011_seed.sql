-- Dados fictícios para o piloto. Não há nome real de aluno.
-- Senha de todas as contas de teste: Nexo-teste-2026
--
-- admin@nexo.local                  ADM-0001
-- secretaria@nexo.local             SEC-0001
-- direcao.horizonte@nexo.local      DIR-0001
-- direcao.litoral@nexo.local        DIR-0002
-- prof.horizonte@nexo.local         PRO-0001
-- prof.litoral@nexo.local           PRO-0002
-- nx-1001@nexo.local … nx-1006      NX-1001 … NX-1006  (Horizonte)
-- nx-2001@nexo.local … nx-2005      NX-2001 … NX-2005  (Litoral)

do $$
begin
  perform set_config('nexo.skip_audit', 'on', true);
end $$;

create or replace function public.seed_auth_user(p_id uuid, p_email text)
returns void
language plpgsql
set search_path = public, auth, extensions
as $fn$
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt('Nexo-teste-2026', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    'email',
    p_id::text,
    now(),
    now(),
    now()
  );
end;
$fn$;

create table seed_people (
  id uuid primary key,
  email text not null,
  role public.user_role not null,
  school_id uuid,
  class_id uuid,
  internal_code text not null,
  display_name text not null
);

insert into public.municipalities (id, name, uf)
values ('11111111-1111-4111-8111-111111111111', 'Tramandaí', 'RS');

insert into public.schools (id, municipality_id, name)
values
  (
    '22222222-2222-4222-8222-222222222221',
    '11111111-1111-4111-8111-111111111111',
    'EMEF Horizonte'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'EMEF Litoral'
  );

insert into public.classes (id, school_id, name, grade, school_year)
values
  ('33333333-3333-4333-8333-333333333331', '22222222-2222-4222-8222-222222222221', '6º A', 6, 2026),
  ('33333333-3333-4333-8333-333333333332', '22222222-2222-4222-8222-222222222221', '7º A', 7, 2026),
  ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', '8º A', 8, 2026);

insert into seed_people (id, email, role, school_id, class_id, internal_code, display_name)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'admin@nexo.local', 'admin', null, null, 'ADM-0001', 'Administração'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'secretaria@nexo.local', 'secretary', null, null, 'SEC-0001', 'Secretaria Municipal'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'direcao.horizonte@nexo.local', 'principal', '22222222-2222-4222-8222-222222222221', null, 'DIR-0001', 'Direção Horizonte'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'direcao.litoral@nexo.local', 'principal', '22222222-2222-4222-8222-222222222222', null, 'DIR-0002', 'Direção Litoral'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'prof.horizonte@nexo.local', 'teacher', '22222222-2222-4222-8222-222222222221', null, 'PRO-0001', 'Prof. Horizonte'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', 'prof.litoral@nexo.local', 'teacher', '22222222-2222-4222-8222-222222222222', null, 'PRO-0002', 'Prof. Litoral'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001', 'nx-1001@nexo.local', 'student', '22222222-2222-4222-8222-222222222221', '33333333-3333-4333-8333-333333333331', 'NX-1001', 'NX-1001'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002', 'nx-1002@nexo.local', 'student', '22222222-2222-4222-8222-222222222221', '33333333-3333-4333-8333-333333333331', 'NX-1002', 'NX-1002'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0003', 'nx-1003@nexo.local', 'student', '22222222-2222-4222-8222-222222222221', '33333333-3333-4333-8333-333333333331', 'NX-1003', 'NX-1003'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0004', 'nx-1004@nexo.local', 'student', '22222222-2222-4222-8222-222222222221', '33333333-3333-4333-8333-333333333332', 'NX-1004', 'NX-1004'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0005', 'nx-1005@nexo.local', 'student', '22222222-2222-4222-8222-222222222221', '33333333-3333-4333-8333-333333333332', 'NX-1005', 'NX-1005'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0006', 'nx-1006@nexo.local', 'student', '22222222-2222-4222-8222-222222222221', '33333333-3333-4333-8333-333333333332', 'NX-1006', 'NX-1006'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb2001', 'nx-2001@nexo.local', 'student', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', 'NX-2001', 'NX-2001'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb2002', 'nx-2002@nexo.local', 'student', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', 'NX-2002', 'NX-2002'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb2003', 'nx-2003@nexo.local', 'student', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', 'NX-2003', 'NX-2003'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb2004', 'nx-2004@nexo.local', 'student', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', 'NX-2004', 'NX-2004'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb2005', 'nx-2005@nexo.local', 'student', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', 'NX-2005', 'NX-2005');

select public.seed_auth_user(person.id, person.email)
from seed_people person;

insert into public.profiles (
  id,
  role,
  school_id,
  municipality_id,
  internal_code,
  display_name,
  active
)
select
  person.id,
  person.role,
  person.school_id,
  '11111111-1111-4111-8111-111111111111',
  person.internal_code,
  case when person.role = 'student' then person.internal_code else person.display_name end,
  true
from seed_people person;

insert into public.class_teachers (class_id, teacher_id)
values
  ('33333333-3333-4333-8333-333333333331', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'),
  ('33333333-3333-4333-8333-333333333332', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'),
  ('33333333-3333-4333-8333-333333333333', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6');

insert into public.class_students (class_id, student_id)
select person.class_id, person.id
from seed_people person
where person.role = 'student';

insert into public.assessment_cycles (id, class_id, kind, label, starts_on, ends_on)
values
  ('44444444-4444-4444-8444-444444444441', '33333333-3333-4333-8333-333333333331', 'initial', 'Avaliação inicial', date '2026-03-02', date '2026-03-20'),
  ('44444444-4444-4444-8444-444444444442', '33333333-3333-4333-8333-333333333331', 'intermediate', 'Avaliação intermediária', date '2026-06-01', date '2026-06-19'),
  ('44444444-4444-4444-8444-444444444443', '33333333-3333-4333-8333-333333333332', 'initial', 'Avaliação inicial', date '2026-03-02', date '2026-03-20'),
  ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333332', 'intermediate', 'Avaliação intermediária', date '2026-06-01', date '2026-06-19'),
  ('44444444-4444-4444-8444-444444444445', '33333333-3333-4333-8333-333333333333', 'initial', 'Avaliação inicial', date '2026-03-02', date '2026-03-20'),
  ('44444444-4444-4444-8444-444444444446', '33333333-3333-4333-8333-333333333333', 'intermediate', 'Avaliação intermediária', date '2026-06-01', date '2026-06-19');

insert into public.missions (
  id,
  class_id,
  activity_id,
  title,
  starts_on,
  ends_on,
  suggested_level,
  created_by
)
select
  mission.id,
  mission.class_id,
  activity.id,
  mission.title,
  date '2026-04-01',
  date '2026-04-30',
  1,
  mission.teacher_id
from (
  values
    (
      '55555555-5555-4555-8555-555555555551'::uuid,
      '33333333-3333-4333-8333-333333333331'::uuid,
      'find-intruder',
      'Missão: Encontre o intruso',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'::uuid
    ),
    (
      '55555555-5555-4555-8555-555555555552'::uuid,
      '33333333-3333-4333-8333-333333333332'::uuid,
      'organize-day',
      'Missão: Organize seu dia',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'::uuid
    ),
    (
      '55555555-5555-4555-8555-555555555553'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      'scam-or-truth',
      'Missão: Golpe ou verdade?',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6'::uuid
    )
) as mission(id, class_id, slug, title, teacher_id)
join public.activities activity on activity.slug = mission.slug;

insert into public.student_missions (
  mission_id,
  student_id,
  status,
  started_at,
  completed_at,
  best_score
)
select
  mission.id,
  enrollment.student_id,
  'completed',
  timestamp '2026-04-02 13:00:00+00',
  timestamp '2026-04-02 13:08:00+00',
  80
from public.missions mission
join public.class_students enrollment on enrollment.class_id = mission.class_id;

insert into public.activity_attempts (
  student_id,
  activity_id,
  mission_id,
  context,
  difficulty,
  score,
  hits,
  rounds,
  duration_ms,
  feedback,
  detail,
  created_at
)
select
  enrollment.student_id,
  mission.activity_id,
  mission.id,
  'mission',
  1,
  80,
  3,
  4,
  180000,
  'Missão concluída. O próximo passo é repetir com um pouco mais de calma.',
  '{"source":"seed","kind":"mission"}'::jsonb,
  timestamp '2026-04-02 13:08:00+00'
from public.missions mission
join public.class_students enrollment on enrollment.class_id = mission.class_id;

insert into public.activity_attempts (
  student_id,
  activity_id,
  cycle_id,
  context,
  difficulty,
  score,
  hits,
  rounds,
  duration_ms,
  feedback,
  detail,
  created_at
)
select
  student.id,
  activity.id,
  cycle.id,
  'assessment',
  case when series.attempt_no = 2 then 2 else 1 end,
  scored.score,
  least(4, greatest(0, round(scored.score / 25.0)))::smallint,
  4,
  20000 + series.attempt_no * 3000,
  'Prática deste ciclo. Um resultado isolado não define o pilar.',
  jsonb_build_object('source', 'seed', 'attempt_no', series.attempt_no),
  (cycle.starts_on + series.attempt_no)::timestamptz
from public.class_students enrollment
join public.profiles student on student.id = enrollment.student_id
join public.assessment_cycles cycle on cycle.class_id = enrollment.class_id
join public.activities activity
  on activity.slug in ('find-intruder', 'organize-day', 'recess-conflict', 'scam-or-truth')
join generate_series(1, 2) as series(attempt_no) on true
cross join lateral (
  select (
    48
    + case when cycle.kind = 'intermediate' then 14 else 0 end
    + right(student.internal_code, 1)::integer
    + series.attempt_no * 3
  )::smallint as score
) scored;

insert into public.pillar_scores (
  student_id,
  cycle_id,
  pillar_id,
  score,
  attempt_count,
  computed_at
)
select
  attempt.student_id,
  attempt.cycle_id,
  activity.pillar_id,
  round(avg(attempt.score)::numeric, 2),
  count(*)::integer,
  now()
from public.activity_attempts attempt
join public.activities activity on activity.id = attempt.activity_id
where attempt.context = 'assessment'
  and attempt.cycle_id is not null
group by attempt.student_id, attempt.cycle_id, activity.pillar_id
having count(*) >= 2;

insert into public.student_achievements (student_id, achievement_id, note)
select student.id, achievement.id, rule.note
from public.profiles student
join public.achievements achievement on true
join (
  values
    ('first-step'::text, 'Você concluiu sua primeira missão.'::text),
    ('steady-practice', 'Você praticou três vezes no mesmo pilar.'),
    ('level-two', 'Você concluiu uma atividade no nível 2 ou mais.'),
    ('own-path', 'Seu indicador subiu em relação a um ciclo anterior.'),
    ('full-round', 'Você tem tentativas de avaliação nos quatro pilares.')
) as rule(slug, note) on rule.slug = achievement.slug
where student.role = 'student'
  and (
    (
      achievement.slug = 'first-step'
      and exists (
        select 1
        from public.student_missions done_mission
        where done_mission.student_id = student.id
          and done_mission.status = 'completed'
      )
    )
    or (
      achievement.slug = 'steady-practice'
      and exists (
        select 1
        from public.activity_attempts attempt
        join public.activities activity on activity.id = attempt.activity_id
        where attempt.student_id = student.id
        group by activity.pillar_id
        having count(*) >= 3
      )
    )
    or (
      achievement.slug = 'level-two'
      and exists (
        select 1
        from public.activity_attempts attempt
        where attempt.student_id = student.id
          and attempt.difficulty >= 2
      )
    )
    or (
      achievement.slug = 'own-path'
      and exists (
        select 1
        from public.pillar_scores newer
        join public.assessment_cycles newer_cycle on newer_cycle.id = newer.cycle_id
        join public.pillar_scores older
          on older.student_id = newer.student_id
         and older.pillar_id = newer.pillar_id
         and older.cycle_id <> newer.cycle_id
        join public.assessment_cycles older_cycle on older_cycle.id = older.cycle_id
        where newer.student_id = student.id
          and newer_cycle.starts_on > older_cycle.starts_on
          and newer.score > older.score
      )
    )
    or (
      achievement.slug = 'full-round'
      and (
        select count(distinct activity.pillar_id)
        from public.activity_attempts attempt
        join public.activities activity on activity.id = attempt.activity_id
        where attempt.student_id = student.id
          and attempt.context = 'assessment'
      ) >= 4
    )
  );

insert into public.interventions (
  id,
  class_id,
  pillar_id,
  month_start,
  note,
  created_by
)
select
  item.id,
  item.class_id,
  pillar.id,
  date '2026-04-01',
  item.note,
  item.teacher_id
from (
  values
    (
      '66666666-6666-4666-8666-666666666661'::uuid,
      '33333333-3333-4333-8333-333333333331'::uuid,
      'focus'::public.pillar_key,
      'Pilar prioritário de abril: foco. Recorte pedagógico da turma, não é diagnóstico.',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'::uuid
    ),
    (
      '66666666-6666-4666-8666-666666666662'::uuid,
      '33333333-3333-4333-8333-333333333332'::uuid,
      'self_regulation'::public.pillar_key,
      'Pilar prioritário de abril: autorregulação. Recorte pedagógico da turma, não é diagnóstico.',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'::uuid
    ),
    (
      '66666666-6666-4666-8666-666666666663'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      'digital_culture'::public.pillar_key,
      'Pilar prioritário de abril: cultura digital. Recorte pedagógico da turma, não é diagnóstico.',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6'::uuid
    )
) as item(id, class_id, pillar_key, note, teacher_id)
join public.pillars pillar on pillar.key = item.pillar_key;

drop function public.seed_auth_user(uuid, text);
drop table seed_people;