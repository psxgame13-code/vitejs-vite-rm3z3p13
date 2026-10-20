-- Relatórios da secretaria. Não há nome, código, turma nem tentativa.
-- Grupo com menos de 5 alunos é omitido, para não reidentificar ninguém.
-- O município sai da sessão. O cliente não escolhe o recorte.

create or replace function public.report_municipality_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_id uuid;
  v_count integer;
begin
  if public.current_nexo_role() = 'secretary' then
    v_id := public.current_municipality_id();
    if v_id is null then
      raise exception 'Município não vinculado.';
    end if;
    return v_id;
  end if;

  if public.is_admin() then
    v_id := public.current_municipality_id();
    if v_id is not null then
      return v_id;
    end if;

    select count(*)::integer into v_count from public.municipalities;
    if v_count = 1 then
      select id into v_id from public.municipalities limit 1;
      return v_id;
    end if;

    raise exception 'Admin sem município: vincule o perfil para ver a rede.';
  end if;

  raise exception 'Relatório agregado disponível só para a secretaria.';
end;
$fn$;

create or replace function public.network_overview()
returns table (
  municipality_name text,
  school_count integer,
  class_count integer,
  student_count integer,
  participant_count integer,
  participation_pct numeric,
  metrics_hidden boolean
)
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_municipality uuid;
  v_students integer;
  v_participants integer;
begin
  v_municipality := public.report_municipality_id();

  select count(*)::integer into v_students
  from public.profiles student
  where student.municipality_id = v_municipality
    and student.role = 'student'
    and student.active = true;

  select count(distinct attempt.student_id)::integer into v_participants
  from public.activity_attempts attempt
  join public.profiles student on student.id = attempt.student_id
  where student.municipality_id = v_municipality
    and student.role = 'student'
    and student.active = true;

  return query
  select
    municipality.name,
    (
      select count(*)::integer
      from public.schools school
      where school.municipality_id = municipality.id
        and school.active = true
    ),
    (
      select count(*)::integer
      from public.classes class_row
      join public.schools school on school.id = class_row.school_id
      where school.municipality_id = municipality.id
        and school.active = true
        and class_row.active = true
    ),
    case when v_students >= 5 then v_students else null end,
    case when v_students >= 5 then v_participants else null end,
    case
      when v_students >= 5 then round(100.0 * v_participants / v_students, 2)
      else null
    end,
    v_students < 5
  from public.municipalities municipality
  where municipality.id = v_municipality;
end;
$fn$;

create or replace function public.network_participation()
returns table (
  school_name text,
  class_count integer,
  student_count integer,
  participant_count integer,
  participation_pct numeric
)
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_municipality uuid;
begin
  v_municipality := public.report_municipality_id();

  return query
  select
    school.name,
    (
      select count(*)::integer
      from public.classes class_row
      where class_row.school_id = school.id
        and class_row.active = true
    ),
    count(student.id)::integer,
    count(student.id) filter (
      where exists (
        select 1
        from public.activity_attempts attempt
        where attempt.student_id = student.id
      )
    )::integer,
    round(
      100.0 * count(student.id) filter (
        where exists (
          select 1
          from public.activity_attempts attempt
          where attempt.student_id = student.id
        )
      ) / nullif(count(student.id), 0),
      2
    )
  from public.schools school
  join public.profiles student
    on student.school_id = school.id
   and student.role = 'student'
   and student.active = true
  where school.municipality_id = v_municipality
    and school.active = true
  group by school.id, school.name
  having count(student.id) >= 5
  order by school.name;
end;
$fn$;

create or replace function public.network_school_pillars()
returns table (
  school_name text,
  cycle_kind public.cycle_kind,
  pillar_key public.pillar_key,
  pillar_name text,
  mean_score numeric,
  student_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_municipality uuid;
begin
  v_municipality := public.report_municipality_id();

  return query
  select
    school.name,
    cycle.kind,
    pillar.key,
    pillar.name,
    round(avg(score.score), 2),
    count(distinct score.student_id)::integer
  from public.pillar_scores score
  join public.profiles student
    on student.id = score.student_id
   and student.role = 'student'
   and student.active = true
  join public.schools school on school.id = student.school_id
  join public.assessment_cycles cycle on cycle.id = score.cycle_id
  join public.pillars pillar on pillar.id = score.pillar_id
  where school.municipality_id = v_municipality
    and school.active = true
  group by school.id, school.name, cycle.kind, pillar.key, pillar.name, pillar.sort_order
  having count(distinct score.student_id) >= 5
  order by school.name, cycle.kind, pillar.sort_order;
end;
$fn$;

create or replace function public.network_cycle_pillars()
returns table (
  cycle_kind public.cycle_kind,
  pillar_key public.pillar_key,
  pillar_name text,
  mean_score numeric,
  student_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_municipality uuid;
begin
  v_municipality := public.report_municipality_id();

  return query
  select
    cycle.kind,
    pillar.key,
    pillar.name,
    round(avg(score.score), 2),
    count(distinct score.student_id)::integer
  from public.pillar_scores score
  join public.profiles student
    on student.id = score.student_id
   and student.role = 'student'
   and student.active = true
  join public.schools school on school.id = student.school_id
  join public.assessment_cycles cycle on cycle.id = score.cycle_id
  join public.pillars pillar on pillar.id = score.pillar_id
  where school.municipality_id = v_municipality
    and school.active = true
  group by cycle.kind, pillar.key, pillar.name, pillar.sort_order
  having count(distinct score.student_id) >= 5
  order by cycle.kind, pillar.sort_order;
end;
$fn$;

create or replace function public.network_interventions()
returns table (
  school_name text,
  month_start date,
  pillar_key public.pillar_key,
  pillar_name text,
  class_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_municipality uuid;
begin
  v_municipality := public.report_municipality_id();

  return query
  select
    school.name,
    intervention.month_start,
    pillar.key,
    pillar.name,
    count(distinct intervention.class_id)::integer
  from public.interventions intervention
  join public.classes class_row on class_row.id = intervention.class_id
  join public.schools school on school.id = class_row.school_id
  join public.pillars pillar on pillar.id = intervention.pillar_id
  where school.municipality_id = v_municipality
    and school.active = true
    and school.id in (
      select student.school_id
      from public.profiles student
      where student.municipality_id = v_municipality
        and student.role = 'student'
        and student.active = true
        and student.school_id is not null
      group by student.school_id
      having count(*) >= 5
    )
  group by
    school.id,
    school.name,
    intervention.month_start,
    pillar.key,
    pillar.name,
    pillar.sort_order
  order by school.name, intervention.month_start, pillar.sort_order;
end;
$fn$;

comment on function public.network_overview() is
  'Totais da rede. Alunos e participação somem se o município tiver menos de 5 estudantes.';
comment on function public.network_participation() is
  'Participação por escola. Escola com menos de 5 alunos não aparece.';
comment on function public.network_school_pillars() is
  'Média do pilar por escola e período. Só grupos com 5 ou mais alunos.';
comment on function public.network_cycle_pillars() is
  'Média da rede por período e pilar. Só grupos com 5 ou mais alunos.';
comment on function public.network_interventions() is
  'Quantas turmas tiveram pilar prioritário. Sem aluno e sem nome de turma.';

revoke all on function public.report_municipality_id() from public, anon, authenticated;
revoke all on function public.network_overview() from public, anon;
revoke all on function public.network_participation() from public, anon;
revoke all on function public.network_school_pillars() from public, anon;
revoke all on function public.network_cycle_pillars() from public, anon;
revoke all on function public.network_interventions() from public, anon;

grant execute on function public.network_overview() to authenticated;
grant execute on function public.network_participation() to authenticated;
grant execute on function public.network_school_pillars() to authenticated;
grant execute on function public.network_cycle_pillars() to authenticated;
grant execute on function public.network_interventions() to authenticated;