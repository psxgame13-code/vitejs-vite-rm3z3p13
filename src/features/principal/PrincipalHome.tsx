import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { PedagogicalNotice } from '../../components/PedagogicalNotice'
import { RadarChart, type RadarSeries } from '../../components/RadarChart'
import { StatCard } from '../../components/StatCard'
import { useAuth } from '../../lib/auth'
import { CYCLE_LABEL, PILLARS, ROUTES } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import type { CycleKind, PillarKey } from '../../lib/types'

type ClassCard = {
  id: string
  name: string
  grade: number
  schoolYear: number
  students: { id: string; code: string }[]
}

type ScorePoint = {
  classId: string
  studentId: string
  pillarKey: PillarKey
  cycleKind: CycleKind
  startsOn: string
  score: number
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

function asScore(value: number | string): number {
  const score = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(score) ? score : 0
}

export function PrincipalHome() {
  const { profile } = useAuth()
  const [schoolName, setSchoolName] = useState('')
  const [classes, setClasses] = useState<ClassCard[]>([])
  const [scores, setScores] = useState<ScorePoint[]>([])
  const [participants, setParticipants] = useState(0)
  const [priorities, setPriorities] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile || !supabase) return
    if (!profile.school_id) {
      setLoading(false)
      return
    }
    let alive = true
    const client = supabase
    const schoolId = profile.school_id

    async function load() {
      setLoading(true)
      setError(null)
      const [schoolResult, classResult] = await Promise.all([
        client.from('schools').select('name').eq('id', schoolId).maybeSingle(),
        client.from('classes').select('id, name, grade, school_year').eq('school_id', schoolId).eq('active', true),
      ])
      if (!alive) return
      if (schoolResult.error || classResult.error) {
        setError('Não foi possível carregar a escola.')
        setLoading(false)
        return
      }
      setSchoolName(schoolResult.data?.name ?? 'Escola')
      const classIds = (classResult.data ?? []).map((row) => row.id)
      if (classIds.length === 0) {
        setClasses([])
        setLoading(false)
        return
      }

      const [studentResult, priorityResult] = await Promise.all([
        client.from('class_students').select('class_id, student_id, profiles(internal_code, active)').in('class_id', classIds),
        client.from('interventions').select('id').in('class_id', classIds),
      ])
      if (!alive) return
      if (studentResult.error || priorityResult.error) {
        setError('Não foi possível carregar a escola.')
        setLoading(false)
        return
      }

      const cards: ClassCard[] = (classResult.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        grade: row.grade,
        schoolYear: row.school_year,
        students: [],
      }))
      const classByStudent = new Map<string, string>()
      for (const row of studentResult.data ?? []) {
        const student = one(
          row.profiles as { internal_code: string; active: boolean } | { internal_code: string; active: boolean }[] | null,
        )
        if (!student?.active) continue
        const card = cards.find((item) => item.id === row.class_id)
        card?.students.push({ id: row.student_id, code: student.internal_code })
        classByStudent.set(row.student_id, row.class_id)
      }
      for (const card of cards) card.students.sort((a, b) => a.code.localeCompare(b.code, 'pt-BR'))
      cards.sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name, 'pt-BR'))

      const studentIds = [...classByStudent.keys()]
      const [scoreResult, attemptResult] = await Promise.all([
        studentIds.length
          ? client
              .from('pillar_scores')
              .select('student_id, score, pillars(key), assessment_cycles(kind, starts_on, class_id)')
              .in('student_id', studentIds)
          : Promise.resolve({ data: [], error: null }),
        studentIds.length
          ? client.from('activity_attempts').select('student_id').in('student_id', studentIds)
          : Promise.resolve({ data: [], error: null }),
      ])
      if (!alive) return
      if (scoreResult.error || attemptResult.error) {
        setError('Não foi possível carregar a escola.')
        setLoading(false)
        return
      }

      const points: ScorePoint[] = []
      for (const row of scoreResult.data ?? []) {
        const pillar = one(row.pillars as { key: string } | { key: string }[] | null)
        const cycle = one(
          row.assessment_cycles as
            | { kind: string; starts_on: string; class_id: string }
            | { kind: string; starts_on: string; class_id: string }[]
            | null,
        )
        const pillarKey = pillar ? asPillar(pillar.key) : null
        const cycleKind = cycle ? asCycle(cycle.kind) : null
        const classId = classByStudent.get(row.student_id)
        if (!pillarKey || !cycle || !cycleKind || !classId || cycle.class_id !== classId) continue
        points.push({
          classId,
          studentId: row.student_id,
          pillarKey,
          cycleKind,
          startsOn: cycle.starts_on,
          score: asScore(row.score as number | string),
        })
      }

      setClasses(cards)
      setScores(points)
      setParticipants(new Set((attemptResult.data ?? []).map((row) => row.student_id)).size)
      setPriorities(priorityResult.data?.length ?? 0)
      setLoading(false)
    }

    void load()
    return () => {
      alive = false
    }
  }, [profile])

  if (!profile) return null
  const studentCount = classes.reduce((sum, item) => sum + item.students.length, 0)
  const periods = [...new Set(scores.map((item) => `${item.cycleKind}|${item.startsOn}`))].sort()
  const series: RadarSeries[] = periods.slice(-3).map((period, index) => {
    const [cycleKind, startsOn] = period.split('|')
    const rows = scores.filter((item) => item.cycleKind === cycleKind && item.startsOn === startsOn)
    const values: RadarSeries['values'] = {}
    for (const pillar of PILLARS) {
      const group = rows.filter((item) => item.pillarKey === pillar.key)
      if (group.length === 0) continue
      values[pillar.key] = Math.round(group.reduce((sum, item) => sum + item.score, 0) / group.length)
    }
    return {
      key: period,
      label: CYCLE_LABEL[cycleKind as CycleKind],
      color: PERIOD_COLORS[index] ?? PERIOD_COLORS[0],
      values,
    }
  })

  return (
    <AppShell>
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-extrabold text-brand-900">{schoolName || 'Escola'}</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Visão da sua escola, por turma e por código. Sem ranking de alunos.
          </p>
        </header>
        <PedagogicalNotice />
        {!profile.school_id ? (
          <p className="nexo-card text-sm leading-6 text-slate-600">Este perfil de direção não está ligado a uma escola.</p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Turmas" value={classes.length} />
          <StatCard label="Alunos" value={studentCount} />
          <StatCard
            label="Com alguma partida"
            value={studentCount === 0 ? '—' : `${participants} de ${studentCount}`}
            hint={`${priorities} prioridades de mês registradas.`}
          />
        </div>
        {loading ? <p className="text-sm font-bold text-brand-800">Carregando escola...</p> : null}
        {error ? (
          <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800" role="alert">
            {error}
          </p>
        ) : null}
        {profile.school_id && !loading && !error ? <RadarChart series={series} title="Média da escola por período" /> : null}
        <ul className="grid gap-3">
          {classes.map((item) => {
            const played = new Set(scores.filter((score) => score.classId === item.id).map((score) => score.studentId))
            return (
              <li key={item.id} className="nexo-card space-y-3">
                <div>
                  <h2 className="text-lg font-extrabold text-brand-900">
                    {item.grade}º {item.name}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {item.schoolYear} · {item.students.length} alunos · {played.size} com indicador
                  </p>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {item.students.map((student) => (
                    <li key={student.id}>
                      <Link
                        className="inline-flex min-h-[44px] items-center rounded-2xl bg-brand-50 px-3 text-sm font-extrabold text-brand-800"
                        to={ROUTES.teacherStudent.replace(':studentId', student.id)}
                      >
                        {student.code}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      </div>
    </AppShell>
  )
}