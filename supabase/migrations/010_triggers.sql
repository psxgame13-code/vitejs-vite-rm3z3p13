-- Trava o próprio papel, a escola e o código.
-- Tentativa, nota e conquista não se corrigem pela mão do cliente.
-- O seed pode usar set_config('nexo.skip_audit', 'on', true) para não sujar a trilha.

create or replace function public.actor_id()
returns uuid
language plpgsql
volatile
set search_path = public
as $fn$
declare
  v_setting text;
begin
  if auth.uid() is not null then
    return auth.uid();
  end if;

  v_setting := current_setting('nexo.actor_id', true);
  if v_setting is null or btrim(v_setting) = '' then
    return null;
  end if;

  return btrim(v_setting)::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$fn$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

create or replace function public.assert_actor_can_administer(p_target uuid)
returns void
language plpgsql
volatile
set search_path = public
as $fn$
begin
  if public.actor_id() is not null
     and p_target is not null
     and public.actor_id() = p_target then
    raise exception 'Você não pode alterar o próprio papel, a escola, o código ou a situação da conta.';
  end if;

  if current_user in ('postgres', 'supabase_admin') then
    if public.actor_id() is not null and not exists (
      select 1
      from public.profiles author
      where author.id = public.actor_id()
        and author.role = 'admin'
        and author.active = true
    ) then
      raise exception 'O autor informado não é um admin ativo.';
    end if;
    return;
  end if;

  if current_user = 'service_role' then
    if public.actor_id() is null then
      raise exception 'A operação de servidor precisa identificar o admin.';
    end if;
    if not exists (
      select 1
      from public.profiles author
      where author.id = public.actor_id()
        and author.role = 'admin'
        and author.active = true
    ) then
      raise exception 'O autor informado não é um admin ativo.';
    end if;
    return;
  end if;

  if not exists (
    select 1
    from public.profiles author
    where author.id = auth.uid()
      and author.role = 'admin'
      and author.active = true
  ) then
    raise exception 'Somente um admin ativo pode alterar este cadastro.';
  end if;
end;
$fn$;

create or replace function public.should_skip_audit()
returns boolean
language sql
volatile
set search_path = public
as $$
  select current_setting('nexo.skip_audit', true) = 'on'
$$;

create or replace function public.block_delete_use_active()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Este cadastro não é apagado. Desative o registro.';
  end if;
  return old;
end;
$fn$;

create or replace function public.guard_org_write()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if tg_op = 'DELETE' then
    return public.block_delete_use_active();
  end if;

  perform public.assert_actor_can_administer(null);
  return new;
end;
$fn$;

create or replace function public.guard_profile()
returns trigger
language plpgsql
set search_path = public
as $fn$
declare
  v_school_municipality uuid;
  v_sensitive boolean;
begin
  if tg_op = 'DELETE' then
    if current_user not in ('postgres', 'supabase_admin') then
      raise exception 'Conta não é apagada por aqui. Desative o perfil.';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
    if new.id is distinct from old.id then
      raise exception 'O identificador do perfil é fixo.';
    end if;
    v_sensitive :=
      new.role is distinct from old.role
      or new.school_id is distinct from old.school_id
      or new.municipality_id is distinct from old.municipality_id
      or new.internal_code is distinct from old.internal_code
      or new.active is distinct from old.active;
  else
    v_sensitive := true;
  end if;

  if new.school_id is not null then
    select school.municipality_id
      into v_school_municipality
    from public.schools school
    where school.id = new.school_id;

    if v_school_municipality is null then
      raise exception 'Escola não encontrada.';
    end if;

    if new.municipality_id is distinct from v_school_municipality then
      raise exception 'O município do perfil precisa ser o da escola.';
    end if;
  end if;

  if v_sensitive then
    perform public.assert_actor_can_administer(new.id);
  end if;

  return new;
end;
$fn$;

create or replace function public.guard_class_teacher()
returns trigger
language plpgsql
set search_path = public
as $fn$
declare
  v_role public.user_role;
  v_teacher_school uuid;
  v_class_school uuid;
begin
  if tg_op = 'DELETE' then
    perform public.assert_actor_can_administer(old.teacher_id);
    return old;
  end if;

  perform public.assert_actor_can_administer(new.teacher_id);

  select profile.role, profile.school_id
    into v_role, v_teacher_school
  from public.profiles profile
  where profile.id = new.teacher_id;

  select class_row.school_id
    into v_class_school
  from public.classes class_row
  where class_row.id = new.class_id;

  if v_role is distinct from 'teacher'::public.user_role then
    raise exception 'Só um professor pode ser vinculado à turma.';
  end if;

  if v_teacher_school is null or v_teacher_school is distinct from v_class_school then
    raise exception 'O professor precisa ser da mesma escola da turma.';
  end if;

  return new;
end;
$fn$;

create or replace function public.guard_class_student()
returns trigger
language plpgsql
set search_path = public
as $fn$
declare
  v_role public.user_role;
  v_student_school uuid;
  v_class_school uuid;
begin
  if tg_op = 'DELETE' then
    perform public.assert_actor_can_administer(null);
    return old;
  end if;

  perform public.assert_actor_can_administer(null);

  select profile.role, profile.school_id
    into v_role, v_student_school
  from public.profiles profile
  where profile.id = new.student_id;

  select class_row.school_id
    into v_class_school
  from public.classes class_row
  where class_row.id = new.class_id;

  if v_role is distinct from 'student'::public.user_role then
    raise exception 'Só um aluno pode ser vinculado à turma.';
  end if;

  if v_student_school is null or v_student_school is distinct from v_class_school then
    raise exception 'O aluno precisa ser da mesma escola da turma.';
  end if;

  return new;
end;
$fn$;

create or replace function public.guard_class_school_move()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if tg_op = 'UPDATE' and new.school_id is distinct from old.school_id then
    if exists (
      select 1
      from public.class_students enrollment
      join public.profiles student on student.id = enrollment.student_id
      where enrollment.class_id = new.id
        and student.school_id is distinct from new.school_id
    ) or exists (
      select 1
      from public.class_teachers link
      join public.profiles teacher on teacher.id = link.teacher_id
      where link.class_id = new.id
        and teacher.school_id is distinct from new.school_id
    ) then
      raise exception 'Há pessoas de outra escola nesta turma.';
    end if;
  end if;

  return new;
end;
$fn$;

create or replace function public.freeze_created_by()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if tg_op = 'UPDATE' and new.created_by is distinct from old.created_by then
    raise exception 'O autor original não pode ser trocado.';
  end if;
  return new;
end;
$fn$;

create or replace function public.guard_attempt()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if tg_op <> 'INSERT' then
    if current_user not in ('postgres', 'supabase_admin') then
      raise exception 'Tentativas não podem ser alteradas nem apagadas.';
    end if;
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if current_user not in ('postgres', 'supabase_admin') then
    if auth.uid() is null or new.student_id is distinct from auth.uid() then
      raise exception 'A tentativa só pode ser registrada para o aluno da sessão.';
    end if;
    if public.current_nexo_role() is distinct from 'student'::public.user_role then
      raise exception 'Somente o aluno registra tentativa.';
    end if;
  end if;

  return new;
end;
$fn$;

create or replace function public.guard_student_mission()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if tg_op = 'DELETE' then
    if current_user not in ('postgres', 'supabase_admin') then
      raise exception 'O vínculo da missão não pode ser apagado por aqui.';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
    if new.student_id is distinct from old.student_id
       or new.mission_id is distinct from old.mission_id then
      raise exception 'O vínculo da missão não pode ser trocado.';
    end if;
  end if;

  if current_user not in ('postgres', 'supabase_admin') then
    if new.status = 'completed'::public.mission_status
       or new.best_score is not null
       or new.completed_at is not null then
      raise exception 'A conclusão da missão é calculada pelo sistema.';
    end if;
  end if;

  return new;
end;
$fn$;

create or replace function public.guard_system_row()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Este dado só é gravado pela regra do sistema.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$fn$;

create or replace function public.guard_audit_log()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  raise exception 'A trilha de auditoria é imutável.';
end;
$fn$;

create or replace function public.audit_school()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if public.should_skip_audit() then
    return null;
  end if;

  if tg_op = 'INSERT' then
    perform public.write_audit(
      public.actor_id(),
      'create_school',
      'school',
      new.id,
      new.id,
      new.municipality_id,
      'Cadastrou uma escola.',
      jsonb_build_object('name', new.name, 'active', new.active)
    );
  else
    perform public.write_audit(
      public.actor_id(),
      'update_school',
      'school',
      new.id,
      new.id,
      new.municipality_id,
      'Atualizou uma escola.',
      jsonb_build_object('name', new.name, 'active', new.active)
    );
  end if;

  return null;
end;
$fn$;

create or replace function public.audit_class()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_municipality uuid;
begin
  if public.should_skip_audit() then
    return null;
  end if;

  select school.municipality_id
    into v_municipality
  from public.schools school
  where school.id = new.school_id;

  perform public.write_audit(
    public.actor_id(),
    case when tg_op = 'INSERT' then 'create_class'::public.audit_action else 'update_class'::public.audit_action end,
    'class',
    new.id,
    new.school_id,
    v_municipality,
    case when tg_op = 'INSERT' then 'Cadastrou uma turma.' else 'Atualizou uma turma.' end,
    jsonb_build_object(
      'name', new.name,
      'grade', new.grade,
      'school_year', new.school_year,
      'active', new.active
    )
  );

  return null;
end;
$fn$;

create or replace function public.audit_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_action public.audit_action;
  v_entity text;
  v_summary text;
begin
  if public.should_skip_audit() then
    return null;
  end if;

  if tg_op = 'INSERT' then
    v_action := 'create_user';
    v_entity := 'profile';
    v_summary := 'Cadastrou um usuário.';
  elsif new.role is distinct from old.role then
    v_action := 'update_permissions';
    v_entity := 'permissions';
    v_summary := 'Alterou o papel de um usuário.';
  elsif new.active is distinct from old.active then
    v_action := 'set_active';
    v_entity := 'profile';
    v_summary := 'Alterou a situação de uma conta.';
  else
    v_action := 'update_user';
    v_entity := 'profile';
    v_summary := 'Atualizou um usuário.';
  end if;

  perform public.write_audit(
    public.actor_id(),
    v_action,
    v_entity,
    new.id,
    new.school_id,
    new.municipality_id,
    v_summary,
    jsonb_build_object(
      'role', new.role,
      'internal_code', new.internal_code,
      'active', new.active,
      'school_id', new.school_id
    )
  );

  return null;
end;
$fn$;

create or replace function public.audit_class_teacher()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_class uuid;
  v_teacher uuid;
  v_school uuid;
  v_municipality uuid;
  v_action public.audit_action;
begin
  if public.should_skip_audit() then
    return null;
  end if;

  if tg_op = 'DELETE' then
    v_class := old.class_id;
    v_teacher := old.teacher_id;
    v_action := 'unlink_teacher';
  else
    v_class := new.class_id;
    v_teacher := new.teacher_id;
    v_action := 'link_teacher';
  end if;

  select class_row.school_id, school.municipality_id
    into v_school, v_municipality
  from public.classes class_row
  join public.schools school on school.id = class_row.school_id
  where class_row.id = v_class;

  perform public.write_audit(
    public.actor_id(),
    v_action,
    'class_teacher',
    v_class,
    v_school,
    v_municipality,
    case
      when v_action = 'link_teacher' then 'Vinculou um professor à turma.'
      else 'Removeu um professor da turma.'
    end,
    jsonb_build_object('class_id', v_class, 'teacher_id', v_teacher)
  );

  return null;
end;
$fn$;

create or replace function public.audit_class_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_class uuid;
  v_student uuid;
  v_school uuid;
  v_municipality uuid;
  v_code text;
  v_action public.audit_action;
begin
  if public.should_skip_audit() then
    return null;
  end if;

  if tg_op = 'DELETE' then
    v_class := old.class_id;
    v_student := old.student_id;
    v_action := 'unlink_student';
  else
    v_class := new.class_id;
    v_student := new.student_id;
    v_action := 'link_student';
  end if;

  select class_row.school_id, school.municipality_id
    into v_school, v_municipality
  from public.classes class_row
  join public.schools school on school.id = class_row.school_id
  where class_row.id = v_class;

  select profile.internal_code
    into v_code
  from public.profiles profile
  where profile.id = v_student;

  perform public.write_audit(
    public.actor_id(),
    v_action,
    'class_student',
    v_class,
    v_school,
    v_municipality,
    case
      when v_action = 'link_student' then 'Vinculou um aluno à turma.'
      else 'Removeu um aluno da turma.'
    end,
    jsonb_build_object('class_id', v_class, 'internal_code', v_code)
  );

  return null;
end;
$fn$;

create or replace function public.audit_intervention()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_school uuid;
  v_municipality uuid;
  v_pillar public.pillar_key;
begin
  if public.should_skip_audit() then
    return null;
  end if;

  select class_row.school_id, school.municipality_id
    into v_school, v_municipality
  from public.classes class_row
  join public.schools school on school.id = class_row.school_id
  where class_row.id = new.class_id;

  select pillar.key
    into v_pillar
  from public.pillars pillar
  where pillar.id = new.pillar_id;

  perform public.write_audit(
    public.actor_id(),
    'set_intervention',
    'intervention',
    new.id,
    v_school,
    v_municipality,
    'Definiu o pilar prioritário do mês.',
    jsonb_build_object(
      'class_id', new.class_id,
      'pillar_key', v_pillar,
      'month_start', new.month_start
    )
  );

  return null;
end;
$fn$;

create or replace function public.create_profile_as_admin(
  p_actor uuid,
  p_user_id uuid,
  p_role public.user_role,
  p_school_id uuid,
  p_municipality_id uuid,
  p_internal_code text,
  p_display_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if p_actor is null or p_user_id is null then
    raise exception 'Autor e usuário são obrigatórios.';
  end if;
  if p_actor = p_user_id then
    raise exception 'Você não pode alterar o próprio papel, a escola, o código ou a situação da conta.';
  end if;
  if not exists (
    select 1
    from public.profiles author
    where author.id = p_actor
      and author.role = 'admin'
      and author.active = true
  ) then
    raise exception 'Somente um admin ativo pode fazer este cadastro.';
  end if;

  if p_role = 'student' then
    p_display_name := p_internal_code;
  end if;

  perform set_config('nexo.actor_id', p_actor::text, true);

  insert into public.profiles (
    id,
    role,
    school_id,
    municipality_id,
    internal_code,
    display_name,
    active
  )
  values (
    p_user_id,
    p_role,
    p_school_id,
    p_municipality_id,
    p_internal_code,
    p_display_name,
    true
  );
end;
$fn$;

create or replace function public.update_profile_as_admin(
  p_actor uuid,
  p_user_id uuid,
  p_role public.user_role,
  p_school_id uuid,
  p_municipality_id uuid,
  p_internal_code text,
  p_display_name text,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if p_actor is null or p_user_id is null then
    raise exception 'Autor e usuário são obrigatórios.';
  end if;
  if p_actor = p_user_id then
    raise exception 'Você não pode alterar o próprio papel, a escola, o código ou a situação da conta.';
  end if;
  if not exists (
    select 1
    from public.profiles author
    where author.id = p_actor
      and author.role = 'admin'
      and author.active = true
  ) then
    raise exception 'Somente um admin ativo pode alterar este cadastro.';
  end if;

  if p_role = 'student' then
    p_display_name := p_internal_code;
  end if;

  perform set_config('nexo.actor_id', p_actor::text, true);

  update public.profiles
  set
    role = p_role,
    school_id = p_school_id,
    municipality_id = p_municipality_id,
    internal_code = p_internal_code,
    display_name = p_display_name,
    active = p_active
  where id = p_user_id;

  if not found then
    raise exception 'Perfil não encontrado.';
  end if;
end;
$fn$;

create trigger municipalities_touch
before update on public.municipalities
for each row execute function public.touch_updated_at();

create trigger municipalities_guard
before insert or update or delete on public.municipalities
for each row execute function public.guard_org_write();

create trigger schools_touch
before update on public.schools
for each row execute function public.touch_updated_at();

create trigger schools_guard
before insert or update or delete on public.schools
for each row execute function public.guard_org_write();

create trigger schools_audit
after insert or update on public.schools
for each row execute function public.audit_school();

create trigger classes_touch
before update on public.classes
for each row execute function public.touch_updated_at();

create trigger classes_guard
before insert or update or delete on public.classes
for each row execute function public.guard_org_write();

create trigger classes_same_school
before update on public.classes
for each row execute function public.guard_class_school_move();

create trigger classes_audit
after insert or update on public.classes
for each row execute function public.audit_class();

create trigger profiles_guard
before insert or update or delete on public.profiles
for each row execute function public.guard_profile();

create trigger profiles_audit
after insert or update on public.profiles
for each row execute function public.audit_profile();

create trigger class_teachers_guard
before insert or delete on public.class_teachers
for each row execute function public.guard_class_teacher();

create trigger class_teachers_audit
after insert or delete on public.class_teachers
for each row execute function public.audit_class_teacher();

create trigger class_students_guard
before insert or delete on public.class_students
for each row execute function public.guard_class_student();

create trigger class_students_audit
after insert or delete on public.class_students
for each row execute function public.audit_class_student();

create trigger activities_touch
before update on public.activities
for each row execute function public.touch_updated_at();

create trigger missions_freeze_author
before update on public.missions
for each row execute function public.freeze_created_by();

create trigger interventions_freeze_author
before update on public.interventions
for each row execute function public.freeze_created_by();

create trigger interventions_audit
after insert or update on public.interventions
for each row execute function public.audit_intervention();

create trigger attempts_guard
before insert or update or delete on public.activity_attempts
for each row execute function public.guard_attempt();

create trigger student_missions_guard
before insert or update or delete on public.student_missions
for each row execute function public.guard_student_mission();

create trigger pillar_scores_guard
before insert or update or delete on public.pillar_scores
for each row execute function public.guard_system_row();

create trigger student_achievements_guard
before insert or update or delete on public.student_achievements
for each row execute function public.guard_system_row();

create trigger audit_log_guard
before update or delete on public.audit_log
for each row execute function public.guard_audit_log();

comment on function public.create_profile_as_admin(uuid, uuid, public.user_role, uuid, uuid, text, text) is
  'Chamada pela Netlify Function, com o id do admin. Não aceita autoalteração.';
comment on function public.update_profile_as_admin(uuid, uuid, public.user_role, uuid, uuid, text, text, boolean) is
  'Atualiza papel, escola, código e situação. O admin não pode usar isso em si mesmo.';

revoke all on function public.actor_id() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.assert_actor_can_administer(uuid) from public, anon, authenticated;
revoke all on function public.should_skip_audit() from public, anon, authenticated;
revoke all on function public.block_delete_use_active() from public, anon, authenticated;
revoke all on function public.guard_org_write() from public, anon, authenticated;
revoke all on function public.guard_profile() from public, anon, authenticated;
revoke all on function public.guard_class_teacher() from public, anon, authenticated;
revoke all on function public.guard_class_student() from public, anon, authenticated;
revoke all on function public.guard_class_school_move() from public, anon, authenticated;
revoke all on function public.freeze_created_by() from public, anon, authenticated;
revoke all on function public.guard_attempt() from public, anon, authenticated;
revoke all on function public.guard_student_mission() from public, anon, authenticated;
revoke all on function public.guard_system_row() from public, anon, authenticated;
revoke all on function public.guard_audit_log() from public, anon, authenticated;
revoke all on function public.audit_school() from public, anon, authenticated;
revoke all on function public.audit_class() from public, anon, authenticated;
revoke all on function public.audit_profile() from public, anon, authenticated;
revoke all on function public.audit_class_teacher() from public, anon, authenticated;
revoke all on function public.audit_class_student() from public, anon, authenticated;
revoke all on function public.audit_intervention() from public, anon, authenticated;
revoke all on function public.create_profile_as_admin(uuid, uuid, public.user_role, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.update_profile_as_admin(uuid, uuid, public.user_role, uuid, uuid, text, text, boolean) from public, anon, authenticated;

grant execute on function public.create_profile_as_admin(uuid, uuid, public.user_role, uuid, uuid, text, text) to service_role;
grant execute on function public.update_profile_as_admin(uuid, uuid, public.user_role, uuid, uuid, text, text, boolean) to service_role;