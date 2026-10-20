import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { PedagogicalNotice } from '../../components/PedagogicalNotice'
import { RadarChart, type RadarSeries } from '../../components/RadarChart'
import { StatCard } from '../../components/StatCard'
import { useAuth } from '../../lib/auth'
import { CYCLE_LABEL, MIN_GROUP_SIZE, PILLARS } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import type { CycleKind, PillarKey } from '../../lib/types'

type ClassCard = {
  id: string
  name: string
  grade: number
  studentCount: number
  participantCount: number | null
  hidden: boolean
}

type PillarPoint = {
  cycleKind: CycleKind
  pillarKey: PillarKey
  mean: number
}

type SchoolClassRow = {
  class_id: string
  class_name: string
  grade: number | string
  student_count: number | string
  participant_count: number | string | null
  metrics_hidden: boolean
}

type SchoolPillarRow = {
  cycle_kind: string
  pillar_key: string
  mean_score: number | string | null
}

const PERIOD_COLORS = ['#1d4ed8', '#b45309', '#0f766e']
const CYCLE_ORDER: CycleKind[] = ['initial', 'intermediate', 'final']

function asPillar(value: string): PillarKey | null {
  return PILLARS.some((pillar) => pillar.key === value) ? (value as PillarKey) : null
}

function asCycle(value: string): CycleKind | null {
  if (value === 'initial' || value === 'intermediate' || value === 'final') return value
  return null
}

function asNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

export function PrincipalHome() {
  const { profile } = useAuth()
  const [schoolName, setSchoolName] = useState('')
  const [classes, setClasses] = useState<ClassCard[]>([])
  const [points, setPoints] = useState<PillarPoint[]>([])
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
      const [schoolResult, classResult, pillarResult] = await Promise.all([
        client.from('schools').select('name').eq('id', schoolId).maybeSingle(),
        client.rpc('school_classes'),
        client.rpc('school_pillars'),
      ])
      if (!alive) return
      if (schoolResult.error || classResult.error || pillarResult.error) {
        setError('Não foi possível carregar a escola.')
        setLoading(false)
        return
      }
      setSchoolName(schoolResult.data?.name ?? 'Escola')

      const cards: ClassCard[] = ((classResult.data ?? []) as SchoolClassRow[]).map((row) => ({
        id: row.class_id,
        name: row.class_name,
        grade: asNumber(row.grade) ?? 0,
        studentCount: asNumber(row.student_count) ?? 0,
        participantCount: asNumber(row.participant_count),
        hidden: row.metrics_hidden,
      }))

      const rows: PillarPoint[] = []
      for (const row of (pillarResult.data ?? []) as SchoolPillarRow[]) {
        const cycleKind = asCycle(row.cycle_kind)
        const pillarKey = asPillar(row.pillar_key)
        const mean = asNumber(row.mean_score)
        if (!cycleKind || !pillarKey || mean == null) continue
        rows.push({ cycleKind, pillarKey, mean })
      }

      let priorityCount = 0
      if (cards.length > 0) {
        const priorityResult = await client
          .from('interventions')
          .select('id')
          .in(
            'class_id',
            cards.map((card) => card.id),
          )
        if (!alive) return
        if (priorityResult.error) {
          setError('Não foi possível carregar a escola.')
          setLoading(false)
          return
        }
        priorityCount = priorityResult.data?.length ?? 0
      }

      setClasses(cards)
      setPoints(rows)
      setPriorities(priorityCount)
      setLoading(false)
    }

    void load()
    return () => {
      alive = false
    }
  }, [profile])

  if (!profile) return null

  const studentCount = classes.reduce((sum, item) => sum + item.studentCount, 0)
  const visibleClasses = classes.filter((item) => !item.hidden)
  const visibleStudents = visibleClasses.reduce((sum, item) => sum + item.studentCount, 0)
  const participants = visibleClasses.reduce((sum, item) => sum + (item.participantCount ?? 0), 0)
  const hiddenCount = classes.length - visibleClasses.length

  const periods = CYCLE_ORDER.filter((kind) => points.some((item) => item.cycleKind === kind))
  const series: RadarSeries[] = periods.slice(-3).map((kind, index) => {
    const values: RadarSeries['values'] = {}
    for (const item of points) {
      if (item.cycleKind === kind) values[item.pillarKey] = Math.round(item.mean)
    }
    return {
      key: kind,
      label: CYCLE_LABEL[kind],
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
            Visão agregada da escola, por turma. Nenhum dado individual de aluno aparece aqui.
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
            value={visibleStudents === 0 ? '—' : `${participants} de ${visibleStudents}`}
            hint={`${priorities} prioridades de mês registradas.${
              hiddenCount > 0 ? ` Não inclui ${hiddenCount} turma(s) com menos de ${MIN_GROUP_SIZE} alunos.` : ''
            }`}
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
          {classes.map((item) => (
            <li key={item.id} className="nexo-card space-y-1">
              <h2 className="text-lg font-extrabold text-brand-900">
                {item.grade}º {item.name}
              </h2>
              <p className="text-sm text-slate-600">
                {item.studentCount} alunos
                {item.hidden || item.participantCount == null
                  ? ` · dados ocultos (turma com menos de ${MIN_GROUP_SIZE} alunos)`
                  : ` · ${item.participantCount} com alguma partida`}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  )
}