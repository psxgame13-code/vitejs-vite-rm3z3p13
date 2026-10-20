import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { PedagogicalNotice } from '../../components/PedagogicalNotice'
import { RadarChart, type RadarSeries } from '../../components/RadarChart'
import { Thermometer } from '../../components/Thermometer'
import { useAuth } from '../../lib/auth'
import { CYCLE_LABEL, PILLARS, ROLE_HOME, ROUTES } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import type { AttemptContext, CycleKind, MissionStatus, PillarKey } from '../../lib/types'

type ScoreRow = {
  pillarKey: PillarKey
  cycleKind: CycleKind
  startsOn: string
  score: number
  attemptCount: number
}

type AttemptRow = {
  id: string
  title: string
  score: number
  hits: number
  rounds: number
  context: AttemptContext
  feedback: string
  createdAt: string
}

type MissionRow = {
  id: string
  title: string
  status: MissionStatus
  bestScore: number | null
}

const STATUS_LABEL: Record<MissionStatus, string> = {
  available: 'Aberta',
  in_progress: 'Em andamento',
  completed: 'Concluída',
}

const CONTEXT_LABEL: Record<AttemptContext, string> = {
  assessment: 'Avaliação',
  mission: 'Missão',
  practice: 'Prática',
}

const PERIOD_COLORS = ['#1d4ed8', '#b45309', '#0f766e']

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function asPillar(value: string): PillarKey | null {
  return PILLARS.some((pillar) => pillar.key === value) ? (value as PillarKey) : null
}

function asCycle(value: string): CycleKind | null {
  if (value === 'initial' || value === 'intermediate' || value === 'final') return value
  return null
}

function asStatus(value: string): MissionStatus {
  if (value === 'in_progress' || value === 'completed') return value
  return 'available'
}

function asContext(value: string): AttemptContext {
  if (value === 'assessment' || value === 'practice') return value
  return 'mission'
}

function asScore(value: number | string): number {
  const score = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(score) ? Math.round(score) : 0
}

function formatWhen(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export function StudentDetail() {
  const { studentId } = useParams()
  const { profile } = useAuth()
  const [code, setCode] = useState<string | null>(null)
  const [classId, setClassId] = useState<string | null>(null)
  const [classLabel, setClassLabel] = useState<string | null>(null)
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [missions, setMissions] = useState<MissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile || !supabase || !studentId) return
    let alive = true
    const client = supabase

    async function load() {
      setLoading(true)
      setError(null)
      setMissing(false)
      const studentResult = await client
        .from('profiles')
        .select('id, role, internal_code')
        .eq('id', studentId!)
        .maybeSingle()

      if (!alive) return
      if (studentResult.error) {
        setError('Não foi possível abrir este aluno.')
        setLoading(false)
        return
      }
      if (!studentResult.data || studentResult.data.role !== 'student') {
        setMissing(true)
        setLoading(false)
        return
      }

      setCode(studentResult.data.internal_code)
      const [classResult, scoreResult, attemptResult, missionResult] = await Promise.all([
        client
          .from('class_students')
          .select('class_id, classes(name, grade)')
          .eq('student_id', studentId!)
          .maybeSingle(),
        client
          .from('pillar_scores')
          .select('score, attempt_count, pillars(key), assessment_cycles(kind, starts_on)')
          .eq('student_id', studentId!),
        client
          .from('activity_attempts')
          .select('id, score, hits, rounds, context, feedback, created_at, activities(title)')
          .eq('student_id', studentId!)
          .order('created_at', { ascending: false })
          .limit(12),
        client
          .from('student_missions')
          .select('mission_id, status, best_score, missions(title)')
          .eq('student_id', studentId!),
      ])

      if (!alive) return
      if (classResult.error || scoreResult.error || attemptResult.error || missionResult.error) {
        setError('Não foi possível abrir este aluno.')
        setLoading(false)
        return
      }

      const schoolClass = one(
        classResult.data?.classes as { name: string; grade: number } | { name: string; grade: number }[] | null,
      )
      setClassId(classResult.data?.class_id ?? null)
      setClassLabel(schoolClass ? `${schoolClass.grade}º ${schoolClass.name}` : null)

      const nextScores: ScoreRow[] = []
      for (const row of scoreResult.data ?? []) {
        const pillar = one(row.pillars as { key: string } | { key: string }[] | null)
        const cycle = one(
          row.assessment_cycles as { kind: string; starts_on: string } | { kind: string; starts_on: string }[] | null,
        )
        const pillarKey = pillar ? asPillar(pillar.key) : null
        const cycleKind = cycle ? asCycle(cycle.kind) : null
        if (!pillarKey || !cycle || !cycleKind) continue
        nextScores.push({
          pillarKey,
          cycleKind,
          startsOn: cycle.starts_on,
          score: asScore(row.score as number | string),
          attemptCount: row.attempt_count,
        })
      }

      const nextAttempts: AttemptRow[] = []
      for (const row of attemptResult.data ?? []) {
        const activity = one(row.activities as { title: string } | { title: string }[] | null)
        if (!activity) continue
        nextAttempts.push({
          id: row.id,
          title: activity.title,
          score: row.score,
          hits: row.hits,
          rounds: row.rounds,
          context: asContext(row.context),
          feedback: row.feedback,
          createdAt: row.created_at,
        })
      }

      const nextMissions: MissionRow[] = []
      for (const row of missionResult.data ?? []) {
        const mission = one(row.missions as { title: string } | { title: string }[] | null)
        if (!mission) continue
        nextMissions.push({
          id: row.mission_id,
          title: mission.title,
          status: asStatus(row.status),
          bestScore: row.best_score,
        })
      }

      setScores(nextScores)
      setAttempts(nextAttempts)
      setMissions(nextMissions)
      setLoading(false)
    }

    void load()
    return () => {
      alive = false
    }
  }, [profile, studentId])

  if (!profile) return null

  const periods = [...new Set(scores.map((row) => row.startsOn))].sort()
  const series: RadarSeries[] = periods.slice(-3).map((startsOn, index) => {
    const rows = scores.filter((row) => row.startsOn === startsOn)
    return {
      key: startsOn,
      label: rows[0] ? CYCLE_LABEL[rows[0].cycleKind] : 'Período',
      color: PERIOD_COLORS[index] ?? PERIOD_COLORS[0],
      values: Object.fromEntries(rows.map((row) => [row.pillarKey, row.score])),
    }
  })
  const latest = periods.at(-1)
  const backTo =
    profile.role === 'teacher' && classId ? ROUTES.teacherClass.replace(':classId', classId) : ROLE_HOME[profile.role]

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Aluno</p>
            <h1 className="text-2xl font-extrabold text-brand-900">{code ?? 'Código'}</h1>
            {classLabel ? <p className="mt-1 text-sm text-slate-600">{classLabel}</p> : null}
          </div>
          <Link className="nexo-btn-ghost" to={backTo}>
            Voltar
          </Link>
        </header>
        <PedagogicalNotice />
        {loading ? <p className="text-sm font-bold text-brand-800">Carregando indicadores...</p> : null}
        {error ? (
          <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800" role="alert">
            {error}
          </p>
        ) : null}
        {missing ? (
          <p className="nexo-card text-sm leading-6 text-slate-600">Este aluno não está no seu alcance.</p>
        ) : null}

        {!loading && code ? (
          <>
            <RadarChart series={series} title="Indicadores por período" />
            <div className="grid gap-3 md:grid-cols-2">
              {PILLARS.map((pillar) => {
                const row = scores.find((item) => item.pillarKey === pillar.key && item.startsOn === latest)
                return (
                  <Thermometer
                    key={pillar.key}
                    label={pillar.name}
                    score={row?.score ?? null}
                    attempts={row?.attemptCount}
                    color={pillar.color}
                  />
                )
              })}
            </div>
            <section className="space-y-3">
              <h2 className="text-lg font-extrabold text-brand-900">Missões</h2>
              {missions.length === 0 ? (
                <p className="nexo-card text-sm text-slate-600">Nenhuma missão atribuída.</p>
              ) : (
                <ul className="grid gap-2">
                  {missions.map((mission) => (
                    <li key={mission.id} className="nexo-card flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-extrabold text-brand-900">{mission.title}</p>
                      <p className="text-sm font-bold text-slate-600">
                        {STATUS_LABEL[mission.status]}
                        {mission.bestScore != null ? ` · melhor ${mission.bestScore}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="space-y-3">
              <h2 className="text-lg font-extrabold text-brand-900">Partidas recentes</h2>
              {attempts.length === 0 ? (
                <p className="nexo-card text-sm text-slate-600">Nenhuma partida ainda.</p>
              ) : (
                <ul className="grid gap-2">
                  {attempts.map((item) => (
                    <li key={item.id} className="nexo-card">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-extrabold text-brand-900">{item.title}</p>
                        <p className="text-lg font-extrabold text-slate-800">{item.score}</p>
                      </div>
                      <p className="text-xs font-bold text-slate-500">
                        {CONTEXT_LABEL[item.context]} · {item.hits} de {item.rounds} · {formatWhen(item.createdAt)}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.feedback}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  )
}