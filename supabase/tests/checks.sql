-- Conferências somente leitura, depois do 011_seed.sql.
-- No SQL Editor, este script deve terminar com a mensagem "NEXO ok".

do $$
declare
  activity_count integer;
  student_count integer;
  school_count integer;
  class_count integer;
  cycle_count integer;
  missing_attempt uuid;
  missing_mission uuid;
  unlocked_table text;
  missing_slug text;
  missing_function text;
begin
  select count(*) into activity_count from public.activities;
  if activity_count <> 8 then
    raise exception 'Esperava 8 atividades e encontrou %.', activity_count;
  end if;

  select slug into missing_slug
  from (
    select unnest(array[
      'find-intruder',
      'sequence-memory',
      'organize-day',
      'now-or-later',
      'recess-conflict',
      'other-viewpoint',
      'scam-or-truth',
      'share-or-not'
    ]) as slug
  ) expected
  where not exists (
    select 1 from public.activities a where a.slug = expected.slug
  )
  limit 1;
  if missing_slug is not null then
    raise exception 'Atividade ausente: %.', missing_slug;
  end if;

  if (select count(*) from public.pillars) <> 4 then
    raise exception 'Esperava 4 pilares.';
  end if;

  select count(*) into student_count from public.profiles where role = 'student' and active;
  if student_count <> 11 then
    raise exception 'Esperava 11 alunos ativos e encontrou %.', student_count;
  end if;

  if (select count(*) from public.profiles where role = 'teacher' and active) <> 2 then
    raise exception 'Esperava 2 professores ativos.';
  end if;
  if (select count(*) from public.profiles where role = 'principal' and active) <> 2 then
    raise exception 'Esperava 2 direções ativas.';
  end if;
  if (select count(*) from public.profiles where role = 'secretary' and active) <> 1 then
    raise exception 'Esperava 1 secretaria ativa.';
  end if;
  if (select count(*) from public.profiles where role = 'admin' and active) <> 1 then
    raise exception 'Esperava 1 administração ativa.';
  end if;

  select count(*) into school_count from public.schools where active;
  if school_count <> 2 then
    raise exception 'Esperava 2 escolas ativas e encontrou %.', school_count;
  end if;

  select count(*) into class_count from public.classes where active;
  if class_count <> 3 then
    raise exception 'Esperava 3 turmas ativas e encontrou %.', class_count;
  end if;

  select count(*) into cycle_count from public.assessment_cycles;
  if cycle_count < 6 then
    raise exception 'Esperava pelo menos 6 ciclos de avaliação e encontrou %.', cycle_count;
  end if;

  select p.id into missing_attempt
  from public.profiles p
  where p.role = 'student'
    and (
      select count(*)
      from public.activity_attempts a
      where a.student_id = p.id
        and a.context = 'assessment'
    ) < 2
  limit 1;
  if missing_attempt is not null then
    raise exception 'Aluno % sem duas tentativas de avaliação.', missing_attempt;
  end if;

  if (select count(*) from public.pillar_scores) < 1 then
    raise exception 'Nenhuma média de pilar foi calculada.';
  end if;

  select p.id into missing_mission
  from public.profiles p
  where p.role = 'student'
    and not exists (
      select 1 from public.student_missions sm where sm.student_id = p.id
    )
  limit 1;
  if missing_mission is not null then
    raise exception 'Aluno % sem missão atribuída.', missing_mission;
  end if;

  if (select count(*) from public.interventions) < 1 then
    raise exception 'Nenhuma prioridade pedagógica de mês.';
  end if;

  select c.relname into unlocked_table
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity = false
    and c.relname in (
      'profiles',
      'schools',
      'classes',
      'class_students',
      'class_teachers',
      'activities',
      'missions',
      'student_missions',
      'activity_attempts',
      'pillar_scores',
      'assessment_cycles',
      'interventions',
      'audit_log',
      'achievements',
      'student_achievements'
    )
  limit 1;
  if unlocked_table is not null then
    raise exception 'RLS desligado em %.', unlocked_table;
  end if;

  select expected.name into missing_function
  from (
    select unnest(array[
      'current_nexo_role',
      'refresh_my_progress',
      'network_overview',
      'network_participation',
      'network_school_pillars',
      'network_cycle_pillars',
      'network_interventions'
    ]) as name
  ) expected
  where not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = expected.name
  )
  limit 1;
  if missing_function is not null then
    raise exception 'Função ausente: %.', missing_function;
  end if;

  if exists (
    select 1
    from public.profiles
    where role = 'student'
      and display_name <> internal_code
  ) then
    raise exception 'Aluno com nome de exibição diferente do código interno.';
  end if;

  raise notice 'NEXO ok';
end $$;