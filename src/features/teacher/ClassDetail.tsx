import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { DataTable, type DataColumn } from '../../components/DataTable'
import { PedagogicalNotice } from '../../components/PedagogicalNotice'
import { RadarChart, type RadarSeries } from '../../components/RadarChart'
import { useAuth } from '../../lib/auth'
import { CYCLE_LABEL, PILLARS, ROUTES } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import type { CycleKind, PillarKey } from '../../lib/types'

type ClassInfo = {
  id: string
  name: string
  grade: number
  schoolYear: number
  schoolName: string
}

type StudentRow = {
  id: string
  code: string
  attempts: number
  pillars: number
}

type MissionRow = {
  id: string
  title: string
  startsOn: string
  endsOn: string
  level: number
  active: boolean
}

type ScorePoint = {
  studentId: string
  pillarKey: PillarKey
  cycleKind: CycleKind
  startsOn: string
  score: number
}

type Priority = {
  id: string
  pillarKey: PillarKey
  monthStart: string
  note: string
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
  return Number.isFinite(score) ? Math.round(score) : 0
}

function monthStart(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

export function ClassDetail() {
  const { classId } = useParams()
  const { profile } = useAuth()
  const [info, setInfo] = useState<ClassInfo | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [missions, setMissions] = useState<MissionRow[]>([])
  const [scores, setScores] = useState<ScorePoint[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [pillarIds, setPillarIds] = useState<Partial<Record<PillarKey, string>>>({})
  const [pillarKey, setPillarKey] = useState<PillarKey>('focus')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile || !supabase || !classId) return
    let alive = true
    const client = supabase

    async function load() {
      setLoading(true)
      setError(null)
      const classResult = await client
        .from('classes')
        .select('id, name, grade, school_year, schools(name)')
        .eq('id', classId!)
        .maybeSingle()

      if (!alive) return
      if (classResult.error || !classResult.data) {
        setInfo(null)
        setError(classResult.error ? 'Não foi possível abrir a turma.' : null)
        setLoading(false)
        return
      }

      const school = one(classResult.data.schools as { name: string } | { name: string }[] | null)
      setInfo({
        id: classResult.data.id,
        name: classResult.data.name,
        grade: classResult.data.grade,
        schoolYear: classResult.data.school_year,
        schoolName: school?.name ?? 'Escola',
      })

      const [studentResult, missionResult, pillarResult, priorityResult] = await Promise.all([
        client.from('class_students').select('student_id, profiles(internal_code, active)').eq('class_id', classId!),
        client.from('missions').select('id, title, starts_on, ends_on, suggested_level, active').eq('class_id', classId!),
        client.from('pillars').select('id, key'),
        client.from('interventions').select('id, month_start, note, pillars(key)').eq('class_id', classId!),
      ])

      if (!alive) return
      if (studentResult.error || missionResult.error || pillarResult.error || priorityResult.error) {
        setError('Não foi possível abrir a turma.')
        setLoading(false)
        return
      }

      const ids: Partial<Record<PillarKey, string>> = {}
      for (const pillar of pillarResult.data ?? []) {
        const key = asPillar(pillar.key)
        if (key) ids[key] = pillar.id
      }
      setPillarIds(ids)

      const roster: StudentRow[] = []
      for (const row of studentResult.data ?? []) {
        const student = one(
          row.profiles as { internal_code: string; active: boolean } | { internal_code: string; active: boolean }[] | null,
        )
        if (!student?.active) continue
        roster.push({ id: row.student_id, code: student.internal_code, attempts: 0, pillars: 0 })
      }

      const studentIds = roster.map((item) => item.id)
      const scoreResult = studentIds.length
        ? await client
            .from('pillar_scores')
            .select('student_id, score, pillars(key), assessment_cycles(class_id, kind, starts_on)')
            .in('student_id', studentIds)
        : { data: [], error: null }
      const attemptResult = studentIds.length
        ? await client.from('activity_attempts').select('student_id').in('student_id', studentIds)
        : { data: [], error: null }

      if (!alive) return
      if (scoreResult.error || attemptResult.error) {
        setError('Não foi possível abrir a turma.')
        setLoading(false)
        return
      }

      const points: ScorePoint[] = []
      for (const row of scoreResult.data ?? []) {
        const pillar = one(row.pillars as { key: string } | { key: string }[] | null)
        const cycle = one(
          row.assessment_cycles as
            | { class_id: string; kind: string; starts_on: string }
            | { class_id: string; kind: string; starts_on: string }[]
            | null,
        )
        const key = pillar ? asPillar(pillar.key) : null
        const kind = cycle ? asCycle(cycle.kind) : null
        if (!key || !cycle || !kind || cycle.class_id !== classId) continue
        points.push({
          studentId: row.student_id,
          pillarKey: key,
          cycleKind: kind,
          startsOn: cycle.starts_on,
          score: asScore(row.score as number | string),
        })
      }

      const attempts = new Map<string, number>()
      for (const row of attemptResult.data ?? []) {
        attempts.set(row.student_id, (attempts.get(row.student_id) ?? 0) + 1)
      }
      const latestStart = [...new Set(points.map((item) => item.startsOn))].sort().at(-1)
      for (const student of roster) {
        student.attempts = attempts.get(student.id) ?? 0
        student.pillars = new Set(
          points.filter((item) => item.studentId === student.id && item.startsOn === latestStart).map((item) => item.pillarKey),
        ).size
      }
      roster.sort((a, b) => a.code.localeCompare(b.code, 'pt-BR'))

      const nextPriorities: Priority[] = []
      for (const row of priorityResult.data ?? []) {
        const pillar = one(row.pillars as { key: string } | { key: string }[] | null)
        const key = pillar ? asPillar(pillar.key) : null
        if (!key) continue
        nextPriorities.push({ id: row.id, pillarKey: key, monthStart: row.month_start, note: row.note })
      }
      nextPriorities.sort((a, b) => b.monthStart.localeCompare(a.monthStart))
      const current = nextPriorities.find((item) => item.monthStart === monthStart())

      setStudents(roster)
      setScores(points)
      setMissions(
        (missionResult.data ?? [])
          .map((row) => ({
            id: row.id,
            title: row.title,
            startsOn: row.starts_on,
            endsOn: row.ends_on,
            level: row.suggested_level,
            active: row.active,
          }))
          .sort((a, b) => a.startsOn.localeCompare(b.startsOn)),
      )
      setPriorities(nextPriorities)
      if (current) {
        setPillarKey(current.pillarKey)
        setNote(current.note)
      }
      setLoading(false)
    }

    void load()
    return () => {
      alive = false
    }
  }, [classId, profile])

  async function savePriority(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !classId || !profile) return
    const text = note.trim()
    if (text.length < 1 || text.length > 400) {
      setFormError('Escreva uma nota de até 400 caracteres.')
      return
    }
    const pillarId = pillarIds[pillarKey]
    if (!pillarId) {
      setFormError('Pilar não encontrado.')
      return
    }
    setSaving(true)
    setFormError(null)
    const current = priorities.find((item) => item.monthStart === monthStart())
    const result = current
      ? await supabase.from('interventions').update({ pillar_id: pillarId, note: text }).eq('id', current.id)
      : await supabase.from('interventions').insert({
          class_id: classId,
          pillar_id: pillarId,
          month_start: monthStart(),
          note: text,
          created_by: profile.id,
        })
    if (result.error) {
      setFormError('Não foi possível guardar a prioridade deste mês.')
      setSaving(false)
      return
    }
    const savedId = current?.id ?? result.data?.[0]?.id
    setPriorities((items) => {
      const next = items.filter((item) => item.monthStart !== monthStart())
      next.unshift({ id: savedId ?? current?.id ?? 'current', pillarKey, monthStart: monthStart(), note: text })
      return next
    })
    setSaving(false)
  }

  if (!profile) return null

  const periods = [...new Set(scores.map((item) => item.startsOn))].sort()
  const series: RadarSeries[] = periods.slice(-3).map((startsOn, index) => {
    const rows = scores.filter((item) => item.startsOn === startsOn)
    const sample = rows[0]
    const values: RadarSeries['values'] = {}
    for (const pillar of PILLARS) {
      const group = rows.filter((item) => item.pillarKey === pillar.key)
      if (group.length === 0) continue
      values[pillar.key] = Math.round(group.reduce((sum, item) => sum + item.score, 0) / group.length)
    }
    return {
      key: startsOn,
      label: sample ? CYCLE_LABEL[sample.cycleKind] : 'Período',
      color: PERIOD_COLORS[index] ?? PERIOD_COLORS[0],
      values,
    }
  })

  const columns: DataColumn<StudentRow>[] = [
    {
      key: 'code',
      header: 'Código',
      render: (row) => (
        <Link className="font-extrabold text-brand-800 underline" to={ROUTES.teacherStudent.replace(':studentId', row.id)}>
          {row.code}
        </Link>
      ),
    },
    { key: 'attempts', header: 'Partidas', render: (row) => row.attempts },
    { key: 'pillars', header: 'Pilares com média', render: (row) => row.pillars },
  ]

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-brand-900">
              {info ? `${info.grade}º ${info.name}` : 'Turma'}
            </h1>
            {info ? (
              <p className="mt-1 text-sm text-slate-600">
                {info.schoolName} · {info.schoolYear}
              </p>
            ) : null}
          </div>
          <Link className="nexo-btn-ghost" to={ROUTES.teacher}>
            Voltar às turmas
          </Link>
        </header>
        <PedagogicalNotice />
        {loading ? <p className="text-sm font-bold text-brand-800">Carregando turma...</p> : null}
        {error ? (
          <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !info && !error ? (
          <p className="nexo-card text-sm leading-6 text-slate-600">Esta turma não está ligada ao seu perfil.</p>
        ) : null}

        {info ? (
          <>
            <RadarChart series={series} title="Média da turma por período" />
            <p className="text-sm leading-6 text-slate-600">
              Cada ponto é a média de quem já tem indicador naquele pilar. A lista abaixo não ordena por nota.
            </p>
            <DataTable
              caption="Alunos da turma"
              columns={columns}
              rows={students}
              rowKey={(row) => row.id}
              empty="Nenhum aluno ativo nesta turma."
            />
            <section className="space-y-3">
              <h2 className="text-lg font-extrabold text-brand-900">Missões</h2>
              {missions.length === 0 ? (
                <p className="nexo-card text-sm text-slate-600">Nenhuma missão publicada nesta turma.</p>
              ) : (
                <ul className="grid gap-2">
                  {missions.map((mission) => (
                    <li key={mission.id} className="nexo-card">
                      <p className="font-extrabold text-brand-900">{mission.title}</p>
                      <p className="text-sm text-slate-600">
                        Nível {mission.level} · {formatDay(mission.startsOn)} a {formatDay(mission.endsOn)} ·{' '}
                        {mission.active ? 'Aberta' : 'Encerrada'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="nexo-card space-y-3">
              <h2 className="text-lg font-extrabold text-brand-900">Prioridade pedagógica do mês</h2>
              <p className="text-sm leading-6 text-slate-600">
                Um pilar para orientar a prática da turma. Não é diagnóstico e não cita aluno.
              </p>
              <form className="space-y-3" onSubmit={(event) => void savePriority(event)}>
                <label className="nexo-label" htmlFor="pillar">
                  Pilar
                </label>
                <select
                  id="pillar"
                  className="nexo-input"
                  value={pillarKey}
                  onChange={(event) => setPillarKey(event.target.value as PillarKey)}
                >
                  {PILLARS.map((pillar) => (
                    <option key={pillar.key} value={pillar.key}>
                      {pillar.name}
                    </option>
                  ))}
                </select>
                <label className="nexo-label" htmlFor="note">
                  Nota do mês
                </label>
                <textarea
                  id="note"
                  className="nexo-input min-h-28 py-2"
                  maxLength={400}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                {formError ? (
                  <p className="text-sm font-bold text-rose-800" role="alert">
                    {formError}
                  </p>
                ) : null}
                <button className="nexo-btn" type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar prioridade'}
                </button>
              </form>
              {priorities.length > 0 ? (
                <ul className="space-y-2">
                  {priorities.map((item) => (
                    <li key={item.id} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-extrabold text-brand-900">
                        {formatDay(item.monthStart)} · {PILLARS.find((pillar) => pillar.key === item.pillarKey)?.name}
                      </span>
                      <p className="mt-1 leading-6 text-slate-600">{item.note}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  )
}