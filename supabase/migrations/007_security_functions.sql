-- Funções SECURITY DEFINER para o RLS não ler as mesmas tabelas e entrar em loop.
-- current_role() sem schema é do Postgres. Aqui o papel do NEXO é public.current_nexo_role().
-- Nenhuma função abaixo entrega dado individual ao secretário.

alter table public.activity_attempts
  add column mission_id uuid references public.missions (id) on delete set null;

alter table public.activity_attempts
  add constraint activity_attempts_mission_context check (
    (context = 'mission' and mission_id is not null)
    or (context <> 'mission' and mission_id is null)
  );

create index activity_attempts_mission_idx on public.activity_attempts (mission_id);

comment on column public.activity_attempts.mission_id is
  'Obrigatório só quando o contexto é missão. Avaliação e prática não usam esta coluna.';

create or replace function public.current_nexo_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.active = true
$$;

create or replace function public.current_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.school_id
  from public.profiles p
  where p.id = auth.uid()
    and p.active = true
$$;

create or replace function public.current_municipality_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.municipality_id
  from public.profiles p
  where p.id = auth.uid()
    and p.active = true
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.active = true
  )
$$;

create or replace function public.teacher_has_class(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.class_teachers ct
    join public.profiles p on p.id = ct.teacher_id
    where ct.class_id = target_class
      and ct.teacher_id = auth.uid()
      and p.role = 'teacher'
      and p.active = true
  )
$$;

create or replace function public.student_in_class(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.class_students cs
    join public.profiles p on p.id = cs.student_id
    where cs.class_id = target_class
      and cs.student_id = auth.uid()
      and p.role = 'student'
      and p.active = true
  )
$$;

create or replace function public.class_visible(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or public.teacher_has_class(target_class)
    or public.student_in_class(target_class)
    or exists (
      select 1
      from public.classes c
      join public.profiles p on p.id = auth.uid()
      where c.id = target_class
        and p.role = 'principal'
        and p.active = true
        and p.school_id = c.school_id
    )
$$;

create or replace function public.school_visible(target_school uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or (
      public.current_school_id() = target_school
      and public.current_nexo_role() in ('student', 'teacher', 'principal')
    )
$$;

create or replace function public.municipality_visible(target_municipality uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or (
      public.current_municipality_id() = target_municipality
      and public.current_nexo_role() in ('student', 'teacher', 'principal')
    )
$$;

create or replace function public.can_read_student(target_student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.profiles student
      where student.id = target_student
        and student.role = 'student'
        and (
          student.id = auth.uid()
          or (
            public.current_nexo_role() = 'principal'
            and student.school_id = public.current_school_id()
          )
          or exists (
            select 1
            from public.class_students cs
            where cs.student_id = student.id
              and public.teacher_has_class(cs.class_id)
          )
        )
    )
$$;

create or replace function public.write_audit(
  p_actor uuid,
  p_action public.audit_action,
  p_entity text,
  p_entity_id uuid,
  p_school_id uuid,
  p_municipality_id uuid,
  p_summary text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.audit_log (
    actor_id,
    action,
    entity,
    entity_id,
    school_id,
    municipality_id,
    summary,
    payload
  )
  values (
    p_actor,
    p_action,
    p_entity,
    p_entity_id,
    p_school_id,
    p_municipality_id,
    btrim(p_summary),
    coalesce(p_payload, '{}'::jsonb)
  );
end;
$fn$;

create or replace function public.refresh_my_progress()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_student uuid;
  v_scores integer := 0;
  v_unlocked integer := 0;
begin
  v_student := auth.uid();

  if v_student is null then
    raise exception 'Sessão ausente.';
  end if;

  if public.current_nexo_role() is distinct from 'student' then
    raise exception 'Somente o aluno atualiza o próprio progresso.';
  end if;

  update public.student_missions sm
  set
    best_score = sub.max_score,
    status = 'completed',
    started_at = coalesce(sm.started_at, sub.first_at),
    completed_at = coalesce(sm.completed_at, sub.last_at),
    updated_at = now()
  from (
    select
      mission_id,
      max(score)::smallint as max_score,
      min(created_at) as first_at,
      max(created_at) as last_at
    from public.activity_attempts
    where student_id = v_student
      and context = 'mission'
      and mission_id is not null
    group by mission_id
  ) sub
  where sm.student_id = v_student
    and sm.mission_id = sub.mission_id
    and (
      sm.status <> 'completed'
      or sm.best_score is distinct from sub.max_score
    );

  with aggregated as (
    select
      attempt.cycle_id,
      act.pillar_id,
      round(avg(attempt.score)::numeric, 2) as score,
      count(*)::integer as attempt_count
    from public.activity_attempts attempt
    join public.activities act on act.id = attempt.activity_id
    where attempt.student_id = v_student
      and attempt.context = 'assessment'
      and attempt.cycle_id is not null
    group by attempt.cycle_id, act.pillar_id
    having count(*) >= 2
  ),
  upserted as (
    insert into public.pillar_scores (
      student_id,
      cycle_id,
      pillar_id,
      score,
      attempt_count,
      computed_at
    )
    select v_student, cycle_id, pillar_id, score, attempt_count, now()
    from aggregated
    on conflict on constraint pillar_scores_unique
    do update set
      score = excluded.score,
      attempt_count = excluded.attempt_count,
      computed_at = now()
    returning 1
  )
  select count(*)::integer into v_scores from upserted;

  delete from public.pillar_scores ps
  where ps.student_id = v_student
    and not exists (
      select 1
      from public.activity_attempts attempt
      join public.activities act on act.id = attempt.activity_id
      where attempt.student_id = ps.student_id
        and attempt.cycle_id = ps.cycle_id
        and act.pillar_id = ps.pillar_id
        and attempt.context = 'assessment'
      having count(*) >= 2
    );

  with inserted as (
    insert into public.student_achievements (student_id, achievement_id, note)
    select v_student, achievement.id, rule.note
    from public.achievements achievement
    join (
      values
        ('first-step'::text, 'Você concluiu sua primeira missão.'::text),
        ('steady-practice', 'Você praticou três vezes no mesmo pilar.'),
        ('level-two', 'Você concluiu uma atividade no nível 2 ou mais.'),
        ('own-path', 'Seu indicador subiu em relação a um ciclo anterior.'),
        ('full-round', 'Você tem tentativas de avaliação nos quatro pilares.')
    ) as rule(slug, note) on rule.slug = achievement.slug
    where
      (
        achievement.slug = 'first-step'
        and (
          select count(*)
          from public.student_missions
          where student_id = v_student
            and status = 'completed'
        ) >= 1
      )
      or (
        achievement.slug = 'steady-practice'
        and exists (
          select 1
          from public.activity_attempts attempt
          join public.activities act on act.id = attempt.activity_id
          where attempt.student_id = v_student
          group by act.pillar_id
          having count(*) >= 3
        )
      )
      or (
        achievement.slug = 'level-two'
        and exists (
          select 1
          from public.activity_attempts attempt
          where attempt.student_id = v_student
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
          where newer.student_id = v_student
            and newer_cycle.starts_on > older_cycle.starts_on
            and newer.score > older.score
        )
      )
      or (
        achievement.slug = 'full-round'
        and (
          select count(distinct act.pillar_id)
          from public.activity_attempts attempt
          join public.activities act on act.id = attempt.activity_id
          where attempt.student_id = v_student
            and attempt.context = 'assessment'
        ) >= 4
      )
    on conflict do nothing
    returning 1
  )
  select count(*)::integer into v_unlocked from inserted;

  return jsonb_build_object(
    'pillar_scores', v_scores,
    'achievements_unlocked', v_unlocked
  );
end;
$fn$;

comment on function public.current_nexo_role() is
  'Papel ativo do usuário logado. Não é o current_role() do Postgres.';
comment on function public.can_read_student(uuid) is
  'Aluno vê a si. Professor vê a turma vinculada. Diretor vê a escola. Admin vê a rede. Secretário não.';
comment on function public.refresh_my_progress() is
  'Recalcula só o aluno da sessão. Média do pilar exige 2 avaliações. Conquista segue a regra do catálogo.';

revoke all on function public.current_nexo_role() from public, anon;
revoke all on function public.current_school_id() from public, anon;
revoke all on function public.current_municipality_id() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.teacher_has_class(uuid) from public, anon;
revoke all on function public.student_in_class(uuid) from public, anon;
revoke all on function public.class_visible(uuid) from public, anon;
revoke all on function public.school_visible(uuid) from public, anon;
revoke all on function public.municipality_visible(uuid) from public, anon;
revoke all on function public.can_read_student(uuid) from public, anon;
revoke all on function public.write_audit(uuid, public.audit_action, text, uuid, uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.refresh_my_progress() from public, anon;

grant execute on function public.current_nexo_role() to authenticated, service_role;
grant execute on function public.current_school_id() to authenticated, service_role;
grant execute on function public.current_municipality_id() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.teacher_has_class(uuid) to authenticated, service_role;
grant execute on function public.student_in_class(uuid) to authenticated, service_role;
grant execute on function public.class_visible(uuid) to authenticated, service_role;
grant execute on function public.school_visible(uuid) to authenticated, service_role;
grant execute on function public.municipality_visible(uuid) to authenticated, service_role;
grant execute on function public.can_read_student(uuid) to authenticated, service_role;
grant execute on function public.write_audit(uuid, public.audit_action, text, uuid, uuid, uuid, text, jsonb) to service_role;
grant execute on function public.refresh_my_progress() to authenticated;