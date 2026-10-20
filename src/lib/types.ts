export type UserRole = 'student' | 'teacher' | 'principal' | 'secretary' | 'admin'

export type PillarKey =
  | 'focus'
  | 'self_regulation'
  | 'emotional_intelligence'
  | 'digital_culture'

export type CycleKind = 'initial' | 'intermediate' | 'final'

export type AttemptContext = 'assessment' | 'mission' | 'practice'

export type MissionStatus = 'available' | 'in_progress' | 'completed'

export type DifficultyLevel = 1 | 2 | 3

export type AuditAction =
  | 'create_school'
  | 'update_school'
  | 'create_class'
  | 'update_class'
  | 'create_user'
  | 'update_user'
  | 'set_active'
  | 'link_teacher'
  | 'unlink_teacher'
  | 'link_student'
  | 'unlink_student'
  | 'set_intervention'
  | 'update_permissions'

export type AuditEntity =
  | 'school'
  | 'class'
  | 'profile'
  | 'class_teacher'
  | 'class_student'
  | 'intervention'
  | 'permissions'

export type Profile = {
  id: string
  role: UserRole
  school_id: string | null
  municipality_id: string | null
  internal_code: string
  display_name: string
  active: boolean
  created_at: string
  updated_at: string
}

export type Municipality = {
  id: string
  name: string
  uf: string
  created_at: string
  updated_at: string
}

export type School = {
  id: string
  municipality_id: string
  name: string
  active: boolean
  created_at: string
  updated_at: string
}

export type SchoolClass = {
  id: string
  school_id: string
  name: string
  grade: number
  school_year: number
  active: boolean
  created_at: string
  updated_at: string
}

export type Pillar = {
  id: string
  key: PillarKey
  name: string
  description: string
  sort_order: number
  created_at: string
}

export type Skill = {
  id: string
  pillar_id: string
  slug: string
  name: string
  description: string
  created_at: string
}

export type ActivityCriteria = {
  version: string
  score_min: number
  score_max: number
  formula: string
  levels: Record<string, Record<string, unknown>>
  rubric?: Record<string, string>
}

export type Activity = {
  id: string
  pillar_id: string
  skill_id: string
  slug: string
  title: string
  summary: string
  criteria: ActivityCriteria
  active: boolean
  created_at: string
  updated_at: string
}

export type AssessmentCycle = {
  id: string
  class_id: string
  kind: CycleKind
  label: string
  starts_on: string
  ends_on: string
  created_at: string
}

export type AttemptResult = {
  score: number
  hits: number
  rounds: number
  duration_ms: number
  feedback: string
  detail: Record<string, unknown>
  difficulty: DifficultyLevel
}

export type ActivityAttempt = AttemptResult & {
  id: string
  student_id: string
  activity_id: string
  cycle_id: string | null
  mission_id: string | null
  context: AttemptContext
  created_at: string
}

export type PillarScore = {
  id: string
  student_id: string
  cycle_id: string
  pillar_id: string
  score: number
  attempt_count: number
  computed_at: string
}

export type Mission = {
  id: string
  class_id: string
  activity_id: string
  cycle_id: string | null
  title: string
  starts_on: string
  ends_on: string
  suggested_level: DifficultyLevel
  active: boolean
  created_by: string | null
  created_at: string
}

export type StudentMission = {
  mission_id: string
  student_id: string
  status: MissionStatus
  started_at: string | null
  completed_at: string | null
  best_score: number | null
  created_at: string
  updated_at: string
}

export type AchievementRule = {
  version: string
  kind: string
  minimum: number
}

export type Achievement = {
  id: string
  slug: string
  name: string
  description: string
  xp: number
  rule: AchievementRule
  created_at: string
}

export type StudentAchievement = {
  student_id: string
  achievement_id: string
  unlocked_at: string
  note: string
}

export type Intervention = {
  id: string
  class_id: string
  pillar_id: string
  cycle_id: string | null
  month_start: string
  note: string
  created_by: string | null
  created_at: string
}

export type AuditLog = {
  id: string
  actor_id: string | null
  action: AuditAction
  entity: AuditEntity
  entity_id: string | null
  school_id: string | null
  municipality_id: string | null
  summary: string
  payload: Record<string, unknown>
  created_at: string
}

export type ProgressRefresh = {
  pillar_scores: number
  achievements_unlocked: number
}

export type NetworkOverview = {
  municipality_name: string
  school_count: number
  class_count: number
  student_count: number | null
  participant_count: number | null
  participation_pct: number | null
  metrics_hidden: boolean
}

export type NetworkParticipation = {
  school_name: string
  class_count: number
  student_count: number
  participant_count: number
  participation_pct: number
}

export type NetworkSchoolPillar = {
  school_name: string
  cycle_kind: CycleKind
  pillar_key: PillarKey
  pillar_name: string
  mean_score: number
  student_count: number
}

export type NetworkCyclePillar = {
  cycle_kind: CycleKind
  pillar_key: PillarKey
  pillar_name: string
  mean_score: number
  student_count: number
}

export type NetworkIntervention = {
  school_name: string
  month_start: string
  pillar_key: PillarKey
  pillar_name: string
  class_count: number
}