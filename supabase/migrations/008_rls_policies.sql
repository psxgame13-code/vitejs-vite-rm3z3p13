-- RLS em todas as tabelas. Sem política, não há linha.
-- O secretário é barrado aqui. Dado agregado só na migração 009.
-- Troca de role e de school_id fica travada na migração 010.

create or replace function public.not_secretary()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_nexo_role() is distinct from 'secretary'
$$;

create or replace function public.student_can_log_attempt(
  p_cycle uuid,
  p_mission uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_nexo_role() = 'student'
    and (
      p_cycle is null
      or exists (
        select 1
        from public.assessment_cycles cycle
        where cycle.id = p_cycle
          and public.student_in_class(cycle.class_id)
      )
    )
    and (
      p_mission is null
      or exists (
        select 1
        from public.student_missions assigned
        where assigned.mission_id = p_mission
          and assigned.student_id = auth.uid()
      )
    )
$$;

create or replace function public.staff_can_assign_mission(
  p_mission uuid,
  p_student uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.missions mission
    join public.class_students enrollment
      on enrollment.class_id = mission.class_id
     and enrollment.student_id = p_student
    join public.profiles student on student.id = p_student
    where mission.id = p_mission
      and student.role = 'student'
      and student.active = true
      and (
        public.is_admin()
        or public.teacher_has_class(mission.class_id)
        or (
          public.current_nexo_role() = 'principal'
          and public.class_visible(mission.class_id)
        )
      )
  )
$$;

revoke all on function public.not_secretary() from public, anon;
revoke all on function public.student_can_log_attempt(uuid, uuid) from public, anon;
revoke all on function public.staff_can_assign_mission(uuid, uuid) from public, anon;

grant execute on function public.not_secretary() to authenticated;
grant execute on function public.student_can_log_attempt(uuid, uuid) to authenticated;
grant execute on function public.staff_can_assign_mission(uuid, uuid) to authenticated;

alter table public.municipalities enable row level security;
alter table public.schools enable row level security;
alter table public.classes enable row level security;
alter table public.profiles enable row level security;
alter table public.class_teachers enable row level security;
alter table public.class_students enable row level security;
alter table public.pillars enable row level security;
alter table public.skills enable row level security;
alter table public.activities enable row level security;
alter table public.assessment_cycles enable row level security;
alter table public.activity_attempts enable row level security;
alter table public.pillar_scores enable row level security;
alter table public.missions enable row level security;
alter table public.student_missions enable row level security;
alter table public.achievements enable row level security;
alter table public.student_achievements enable row level security;
alter table public.interventions enable row level security;
alter table public.audit_log enable row level security;

alter table public.municipalities force row level security;
alter table public.schools force row level security;
alter table public.classes force row level security;
alter table public.profiles force row level security;
alter table public.class_teachers force row level security;
alter table public.class_students force row level security;
alter table public.pillars force row level security;
alter table public.skills force row level security;
alter table public.activities force row level security;
alter table public.assessment_cycles force row level security;
alter table public.activity_attempts force row level security;
alter table public.pillar_scores force row level security;
alter table public.missions force row level security;
alter table public.student_missions force row level security;
alter table public.achievements force row level security;
alter table public.student_achievements force row level security;
alter table public.interventions force row level security;
alter table public.audit_log force row level security;

create policy profiles_block_secretary
on public.profiles
as restrictive
for all
to authenticated
using (public.not_secretary() or id = auth.uid())
with check (public.not_secretary());

create policy municipalities_block_secretary on public.municipalities as restrictive for all to authenticated using (public.not_secretary()) with check (public.not_secretary());
create policy schools_block_secretary on public.schools as restrictive for all to authenticated using (public.not_secretary()) with check (public.not_secretary());
create policy classes_block_secretary on public.classes as restrictive for all to authenticated using (public.not_secretary()) with check (public.not_secretary());
create policy class_teachers_block_secretary on public.class_teachers as restrictive for all to authenticated using (public.not_secretary()) with check (public.not_secretary());
create policy class_students_block_secretary on public.class_students as restrictive for all to authenticated using (public.not_secretary()) with check (public.not_secretary());
create policy pillars_block_secretary on public.pillars as restrictive for all to authenticated using (public.not_secretary()) with check (public.not_secretary());
create policy skills_block_secretary on public.skills as restrictive for all to authenticated using (public.not_secretary()) with check (public.not_secretary());
create policy activities_block_secretary on public.activities as restrictive for all to authenticated using (public.not_secretary()) with check (public.not_secretary());
create policy cycles_block_secretary on public.assessment_cycles as restrictive for all to authenticated using (public.not_secretary()) with check (public.not_secretary());
create policy attempts_block_secretary on public.activity_attempts as restrictive for all to authenticated using (public.not_secretary()) with check (public.not_secretary());
create policy scores_block_secretary on public.pillar_scores as restrictive for all to authenticated using (public.not_secretary()) with check (public.not_secretary());
create policy missions_block_secretary on public.missions as restrictive for all to authenticated using (public.not_secretary()) with check (public.not_secretary());
create policy student_missions_block_secretary on public.student_missions as restrictive for all to authenticated using (public.not_secretary()) with check (public.not_secretary());
create policy achievements_block_secretary on public.achievements as restrictive for all to authenticated using (public.not_secretary()) with check (public.not_secretary());
create policy student_achievements_block_secretary on public.student_achievements as restrictive for all to authenticated using (public.not_secretary()) with check (public.not_secretary());
create policy interventions_block_secretary on public.interventions as restrictive for all to authenticated using (public.not_secretary()) with check (public.not_secretary());
create policy audit_block_secretary on public.audit_log as restrictive for all to authenticated using (public.not_secretary()) with check (public.not_secretary());

create policy municipalities_select
on public.municipalities
for select
to authenticated
using (public.municipality_visible(id));

create policy municipalities_admin
on public.municipalities
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy schools_select
on public.schools
for select
to authenticated
using (public.school_visible(id));

create policy schools_admin
on public.schools
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy classes_select
on public.classes
for select
to authenticated
using (public.class_visible(id));

create policy classes_admin
on public.classes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_select_admin
on public.profiles
for select
to authenticated
using (public.is_admin());

create policy profiles_select_school
on public.profiles
for select
to authenticated
using (
  public.current_nexo_role() = 'principal'
  and school_id = public.current_school_id()
);

create policy profiles_select_teacher
on public.profiles
for select
to authenticated
using (
  public.current_nexo_role() = 'teacher'
  and public.can_read_student(id)
);

create policy profiles_select_my_teachers
on public.profiles
for select
to authenticated
using (
  public.current_nexo_role() = 'student'
  and exists (
    select 1
    from public.class_teachers link
    join public.class_students enrollment on enrollment.class_id = link.class_id
    where link.teacher_id = id
      and enrollment.student_id = auth.uid()
  )
);

create policy profiles_admin_update
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy class_teachers_select
on public.class_teachers
for select
to authenticated
using (public.class_visible(class_id));

create policy class_teachers_admin_insert
on public.class_teachers
for insert
to authenticated
with check (public.is_admin());

create policy class_teachers_admin_delete
on public.class_teachers
for delete
to authenticated
using (public.is_admin());

create policy class_students_select
on public.class_students
for select
to authenticated
using (
  student_id = auth.uid()
  or public.is_admin()
  or public.teacher_has_class(class_id)
  or (
    public.current_nexo_role() = 'principal'
    and public.class_visible(class_id)
  )
);

create policy class_students_admin_insert
on public.class_students
for insert
to authenticated
with check (public.is_admin());

create policy class_students_admin_delete
on public.class_students
for delete
to authenticated
using (public.is_admin());

create policy pillars_select
on public.pillars
for select
to authenticated
using (
  public.current_nexo_role() = any (
    array['student', 'teacher', 'principal', 'admin']::public.user_role[]
  )
);

create policy pillars_admin
on public.pillars
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy skills_select
on public.skills
for select
to authenticated
using (
  public.current_nexo_role() = any (
    array['student', 'teacher', 'principal', 'admin']::public.user_role[]
  )
);

create policy skills_admin
on public.skills
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy activities_select
on public.activities
for select
to authenticated
using (
  public.current_nexo_role() = any (
    array['student', 'teacher', 'principal', 'admin']::public.user_role[]
  )
);

create policy activities_admin
on public.activities
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy achievements_select
on public.achievements
for select
to authenticated
using (
  public.current_nexo_role() = any (
    array['student', 'teacher', 'principal', 'admin']::public.user_role[]
  )
);

create policy achievements_admin
on public.achievements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy cycles_select
on public.assessment_cycles
for select
to authenticated
using (public.class_visible(class_id));

create policy cycles_staff_insert
on public.assessment_cycles
for insert
to authenticated
with check (
  public.is_admin()
  or public.teacher_has_class(class_id)
  or (
    public.current_nexo_role() = 'principal'
    and public.class_visible(class_id)
  )
);

create policy cycles_staff_update
on public.assessment_cycles
for update
to authenticated
using (
  public.is_admin()
  or public.teacher_has_class(class_id)
  or (
    public.current_nexo_role() = 'principal'
    and public.class_visible(class_id)
  )
)
with check (
  public.is_admin()
  or public.teacher_has_class(class_id)
  or (
    public.current_nexo_role() = 'principal'
    and public.class_visible(class_id)
  )
);

create policy attempts_select
on public.activity_attempts
for select
to authenticated
using (
  public.is_admin()
  or student_id = auth.uid()
  or public.can_read_student(student_id)
);

create policy attempts_insert_own
on public.activity_attempts
for insert
to authenticated
with check (
  student_id = auth.uid()
  and public.student_can_log_attempt(cycle_id, mission_id)
);

create policy scores_select
on public.pillar_scores
for select
to authenticated
using (
  public.is_admin()
  or public.can_read_student(student_id)
);

create policy missions_select
on public.missions
for select
to authenticated
using (public.class_visible(class_id));

create policy missions_staff_insert
on public.missions
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.is_admin()
    or public.teacher_has_class(class_id)
    or (
      public.current_nexo_role() = 'principal'
      and public.class_visible(class_id)
    )
  )
);

create policy missions_staff_update
on public.missions
for update
to authenticated
using (
  public.is_admin()
  or public.teacher_has_class(class_id)
  or (
    public.current_nexo_role() = 'principal'
    and public.class_visible(class_id)
  )
)
with check (
  public.is_admin()
  or public.teacher_has_class(class_id)
  or (
    public.current_nexo_role() = 'principal'
    and public.class_visible(class_id)
  )
);

create policy student_missions_select
on public.student_missions
for select
to authenticated
using (
  public.is_admin()
  or student_id = auth.uid()
  or public.can_read_student(student_id)
);

create policy student_missions_insert_staff
on public.student_missions
for insert
to authenticated
with check (public.staff_can_assign_mission(mission_id, student_id));

create policy student_missions_update_own
on public.student_missions
for update
to authenticated
using (
  student_id = auth.uid()
  and public.current_nexo_role() = 'student'
)
with check (
  student_id = auth.uid()
  and public.current_nexo_role() = 'student'
  and status = any (array['available', 'in_progress']::public.mission_status[])
  and best_score is null
  and completed_at is null
);

create policy student_achievements_select
on public.student_achievements
for select
to authenticated
using (
  public.is_admin()
  or public.can_read_student(student_id)
);

create policy interventions_select
on public.interventions
for select
to authenticated
using (public.class_visible(class_id));

create policy interventions_staff_insert
on public.interventions
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.is_admin()
    or public.teacher_has_class(class_id)
    or (
      public.current_nexo_role() = 'principal'
      and public.class_visible(class_id)
    )
  )
);

create policy interventions_staff_update
on public.interventions
for update
to authenticated
using (
  public.is_admin()
  or public.teacher_has_class(class_id)
  or (
    public.current_nexo_role() = 'principal'
    and public.class_visible(class_id)
  )
)
with check (
  public.is_admin()
  or public.teacher_has_class(class_id)
  or (
    public.current_nexo_role() = 'principal'
    and public.class_visible(class_id)
  )
);

create policy audit_select
on public.audit_log
for select
to authenticated
using (
  public.is_admin()
  or (
    public.current_nexo_role() = 'principal'
    and school_id is not null
    and school_id = public.current_school_id()
  )
);