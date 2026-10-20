import { useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppShell } from '../../components/AppShell'
import { PedagogicalNotice } from '../../components/PedagogicalNotice'
import { useAuth } from '../../lib/auth'
import { CYCLE_LABEL, MIN_GROUP_SIZE, PILLARS, ROLE_LABEL } from '../../lib/constants'
import { downloadCsv, toCsv } from '../../lib/csv'
import { supabase } from '../../lib/supabase'
import type { CycleKind, PillarKey, UserRole } from '../../lib/types'

type ParticipationRow = {
  school_name: string
  class_count: number
  student_count: number
  participant_count: number
  participation_pct: number | null
}
type SchoolPillarRow = {
  school_name: string
  cycle_kind: string
  pillar_name: string
  mean_score: number | null
  student_count: number
}
type InterventionRow = {
  school_name: string
  month_start: string
  pillar_name: string
  class_count: number
}

type ClassInfo = { id: string; label: string; schoolName: string; grade: number }
type StudentInfo = { id: string; code: string; classId: string }
type ScoreInfo = {
  studentId: string
  pillarKey: PillarKey
  cycleKind: CycleKind
  startsOn: string
  score: number
  attemptCount: number
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function asPillar(value: string): PillarKey | null {
  return PILLARS.some((pillar) => pillar.key === value) ? (value as PillarKey) : null
}

function asCycle(value: string): CycleKind | null {
  if (value === 'initial' || value === 'intermediate' || value === 'final') return value
  return null
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

async function loadClasses(role: UserRole, profileId: string, schoolId: string | null): Promise<ClassInfo[]> {
  if (!supabase) return []
  if (role === 'teacher') {
    const linked = await supabase.from('class_teachers').select('class_id').eq('teacher_id', profileId)
    if (linked.error) throw new Error('turmas')
    const ids = (linked.data ?? []).map((row) => row.class_id)
    if (ids.length === 0) return []
    const result = await supabase.from('classes').select('id, name, grade, schools(name)').in('id', ids).eq('active', true)
    if (result.error) throw new Error('turmas')
    return (result.data ?? []).map(mapClass)
  }
  if (!schoolId) return []
  const result = await supabase
    .from('classes')
    .select('id, name, grade, schools(name)')
    .eq('school_id', schoolId)
    .eq('active', true)
  if (result.error) throw new Error('turmas')
  return (result.data ?? []).map(mapClass)
}

function mapClass(row: { id: string; name: string; grade: number; schools: { name: string } | { name: string }[] | null }): ClassInfo {
  const school = one(row.schools)
  return { id: row.id, label: `${row.grade}º ${row.name}`, schoolName: school?.name ?? 'Escola', grade: row.grade }
}

async function loadRoster(classes: ClassInfo[]) {
  if (!supabase || classes.length === 0) return { students: [] as StudentInfo[], attempts: new Map<string, number>(), scores: [] as ScoreInfo[] }
  const classIds = classes.map((item) => item.id)
  const studentResult = await supabase
    .from('class_students')
    .select('class_id, student_id, profiles(internal_code, active)')
    .in('class_id', classIds)
  if (studentResult.error) throw new Error('alunos')
  const students: StudentInfo[] = []
  for (const row of studentResult.data ?? []) {
    const profile = one(row.profiles as { internal_code: string; active: boolean } | { internal_code: string; active: boolean }[] | null)
    if (!profile?.active) continue
    students.push({ id: row.student_id, code: profile.internal_code, classId: row.class_id })
  }
  const ids = students.map((item) => item.id)
  const [attemptResult, scoreResult] = await Promise.all([
    ids.length ? supabase.from('activity_attempts').select('student_id').in('student_id', ids) : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase.from('pillar_scores').select('student_id, score, attempt_count, pillars(key), assessment_cycles(class_id, kind, starts_on)').in('student_id', ids)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (attemptResult.error || scoreResult.error) throw new Error('indicadores')
  const attempts = new Map<string, number>()
  for (const row of attemptResult.data ?? []) attempts.set(row.student_id, (attempts.get(row.student_id) ?? 0) + 1)
  const classByStudent = new Map(students.map((item) => [item.id, item.classId]))
  const scores: ScoreInfo[] = []
  for (const row of scoreResult.data ?? []) {
    const pillar = one(row.pillars as { key: string } | { key: string }[] | null)
    const cycle = one(row.assessment_cycles as { class_id: string; kind: string; starts_on: string } | { class_id: string; kind: string; starts_on: string }[] | null)
    const pillarKey = pillar ? asPillar(pillar.key) : null
    const cycleKind = cycle ? asCycle(cycle.kind) : null
    if (!pillarKey || !cycle || !cycleKind || classByStudent.get(row.student_id) !== cycle.class_id) continue
    scores.push({
      studentId: row.student_id,
      pillarKey,
      cycleKind,
      startsOn: cycle.starts_on,
      score: Math.round(asNumber(row.score) ?? 0),
      attemptCount: row.attempt_count,
    })
  }
  return { students, attempts, scores }
}

function ScopeReports({ role }: { role: 'teacher' | 'principal' }) {
  const { profile } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function run(kind: 'classes' | 'students' | 'periods') {
    if (!profile || !supabase) return
    setBusy(kind)
    setError(null)
    try {
      const classes = await loadClasses(role, profile.id, profile.school_id)
      const { students, attempts, scores } = await loadRoster(classes)
      const byId = new Map(classes.map((item) => [item.id, item]))
      if (kind === 'classes') {
        downloadCsv(`nexo-turmas-${stamp()}`, toCsv(
          ['Escola', 'Turma', 'Alunos', 'Com alguma partida'],
          classes
            .sort((a, b) => a.grade - b.grade || a.label.localeCompare(b.label, 'pt-BR'))
            .map((item) => {
              const roster = students.filter((student) => student.classId === item.id)
              const played = roster.filter((student) => (attempts.get(student.id) ?? 0) > 0).length
              return [item.schoolName, item.label, roster.length, played]
            }),
        ))
      }
      if (kind === 'students') {
        const latestByClass = new Map<string, string>()
        for (const score of scores) {
          const classId = students.find((student) => student.id === score.studentId)?.classId
          if (!classId) continue
          const current = latestByClass.get(classId)
          if (!current || score.startsOn > current) latestByClass.set(classId, score.startsOn)
        }
        downloadCsv(`nexo-alunos-${stamp()}`, toCsv(
          ['Código', 'Turma', 'Partidas', ...PILLARS.map((pillar) => pillar.name)],
          [...students]
            .sort((a, b) => a.code.localeCompare(b.code, 'pt-BR'))
            .map((student) => {
              const schoolClass = byId.get(student.classId)
              const latest = latestByClass.get(student.classId)
              return [
                student.code,
                schoolClass?.label ?? '',
                attempts.get(student.id) ?? 0,
                ...PILLARS.map((pillar) => {
                  const found = scores.find((score) => score.studentId === student.id && score.pillarKey === pillar.key && score.startsOn === latest)
                  return found ? found.score : ''
                }),
              ]
            }),
        ))
      }
      if (kind === 'periods') {
        downloadCsv(`nexo-periodos-${stamp()}`, toCsv(
          ['Código', 'Turma', 'Período', 'Pilar', 'Média', 'Tentativas de avaliação'],
          scores
            .map((score) => {
              const student = students.find((item) => item.id === score.studentId)
              const schoolClass = student ? byId.get(student.classId) : undefined
              return {
                code: student?.code ?? '',
                label: schoolClass?.label ?? '',
                period: CYCLE_LABEL[score.cycleKind],
                startsOn: score.startsOn,
                pillar: PILLARS.find((pillar) => pillar.key === score.pillarKey)?.name ?? score.pillarKey,
                score: score.score,
                attempts: score.attemptCount,
              }
            })
            .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR') || a.code.localeCompare(b.code, 'pt-BR') || a.startsOn.localeCompare(b.startsOn))
            .map((row) => [row.code, row.label, row.period, row.pillar, row.score, row.attempts]),
        ))
      }
    } catch {
      setError('Não foi possível montar o relatório.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-3">
      <ReportCard title="Turmas" text="Escola, turma, quantidade de alunos e quantos têm alguma partida." busy={busy === 'classes'} onClick={() => void run('classes')} />
      <ReportCard title="Alunos no período mais recente" text="Código interno e média de cada pilar. A ordem é a do código, não a da nota. Sem média, a célula fica vazia." busy={busy === 'students'} onClick={() => void run('students')} />
      <ReportCard title="Médias por período" text="Uma linha por código, período e pilar, com a quantidade de tentativas de avaliação." busy={busy === 'periods'} onClick={() => void run('periods')} />
      {error ? <p className="text-sm font-bold text-rose-800">{error}</p> : null}
    </div>
  )
}

function SecretaryReports() {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [lines, setLines] = useState<{ period: string; focus: number | null; self_regulation: number | null; emotional_intelligence: number | null; digital_culture: number | null }[]>([])

  async function loadCycles() {
    if (!supabase) return []
    const result = await supabase.rpc('network_cycle_pillars')
    if (result.error) throw new Error('rede')
    const rows = (result.data ?? []) as { cycle_kind: string; pillar_key: string; mean_score: number | string }[]
    const kinds = [...new Set(rows.map((row) => row.cycle_kind))]
    return kinds.map((kind) => {
      const cycleKind = asCycle(kind)
      const point = {
        period: cycleKind ? CYCLE_LABEL[cycleKind] : kind,
        focus: null as number | null,
        self_regulation: null as number | null,
        emotional_intelligence: null as number | null,
        digital_culture: null as number | null,
      }
      for (const row of rows.filter((item) => item.cycle_kind === kind)) {
        const key = asPillar(row.pillar_key)
        if (!key) continue
        point[key] = asNumber(row.mean_score)
      }
      return point
    })
  }

  async function run(kind: 'overview' | 'participation' | 'schools' | 'cycles' | 'priorities') {
    if (!supabase) return
    setBusy(kind)
    setError(null)
    try {
      if (kind === 'overview') {
        const result = await supabase.rpc('network_overview')
        if (result.error) throw new Error('rede')
        const row = result.data?.[0]
        downloadCsv(`nexo-rede-${stamp()}`, toCsv(
          ['Município', 'Escolas', 'Turmas', 'Alunos', 'Com partida', 'Participação (%)', 'Métricas ocultas'],
          [[
            row?.municipality_name ?? '',
            row?.school_count ?? '',
            row?.class_count ?? '',
            row?.student_count ?? '',
            row?.participant_count ?? '',
            row?.participation_pct ?? '',
            row?.metrics_hidden ? 'sim' : 'não',
          ]],
        ))
      }
      if (kind === 'participation') {
        const result = await supabase.rpc('network_participation')
        if (result.error) throw new Error('rede')
        downloadCsv(`nexo-participacao-${stamp()}`, toCsv(
          ['Escola', 'Turmas', 'Alunos', 'Com partida', 'Participação (%)'],
          ((result.data ?? []) as ParticipationRow[]).map((row) => [row.school_name, row.class_count, row.student_count, row.participant_count, row.participation_pct]),
        ))
      }
      if (kind === 'schools') {
        const result = await supabase.rpc('network_school_pillars')
        if (result.error) throw new Error('rede')
        downloadCsv(`nexo-escolas-pilares-${stamp()}`, toCsv(
          ['Escola', 'Período', 'Pilar', 'Média', 'Alunos no grupo'],
          ((result.data ?? []) as SchoolPillarRow[]).map((row) => [row.school_name, CYCLE_LABEL[row.cycle_kind as CycleKind] ?? row.cycle_kind, row.pillar_name, row.mean_score, row.student_count]),
        ))
      }
      if (kind === 'cycles') {
        const points = await loadCycles()
        setLines(points)
        downloadCsv(`nexo-rede-periodos-${stamp()}`, toCsv(
          ['Período', ...PILLARS.map((pillar) => pillar.name)],
          points.map((point) => [point.period, point.focus, point.self_regulation, point.emotional_intelligence, point.digital_culture]),
        ))
      }
      if (kind === 'priorities') {
        const result = await supabase.rpc('network_interventions')
        if (result.error) throw new Error('rede')
        downloadCsv(`nexo-prioridades-${stamp()}`, toCsv(
          ['Escola', 'Mês', 'Pilar', 'Turmas'],
          ((result.data ?? []) as InterventionRow[]).map((row) => [row.school_name, formatDay(row.month_start), row.pillar_name, row.class_count]),
        ))
      }
    } catch {
      setError('Não foi possível montar o agregado da rede.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-slate-600">
        Grupos com menos de {MIN_GROUP_SIZE} alunos não entram. Este relatório não tem código de aluno.
      </p>
      <div className="grid gap-3">
        <ReportCard title="Visão da rede" text="Totais do município. A participação some se o grupo for pequeno demais." busy={busy === 'overview'} onClick={() => void run('overview')} />
        <ReportCard title="Participação por escola" text="Porcentagem de alunos com alguma partida, sem dizer quem." busy={busy === 'participation'} onClick={() => void run('participation')} />
        <ReportCard title="Médias por escola" text="Média, período, pilar e tamanho do grupo." busy={busy === 'schools'} onClick={() => void run('schools')} />
        <ReportCard title="Médias da rede por período" text="Uma coluna por pilar. O gráfico de linhas usa o mesmo recorte." busy={busy === 'cycles'} onClick={() => void run('cycles')} />
        <ReportCard title="Prioridades do mês" text="Escola, mês, pilar e quantidade de turmas." busy={busy === 'priorities'} onClick={() => void run('priorities')} />
      </div>
      {lines.length > 0 ? (
        <section className="nexo-card">
          <h2 className="mb-2 text-sm font-extrabold text-brand-900">Evolução da rede</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lines}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {PILLARS.map((pillar) => (
                  <Line key={pillar.key} type="monotone" dataKey={pillar.key} name={pillar.name} stroke={pillar.color} strokeWidth={2} connectNulls={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}
      {error ? <p className="text-sm font-bold text-rose-800">{error}</p> : null}
    </div>
  )
}

function AdminReports() {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function run(kind: 'people' | 'classes' | 'audit') {
    if (!supabase) return
    setBusy(kind)
    setError(null)
    try {
      if (kind === 'people') {
        const [people, schools] = await Promise.all([
          supabase.from('profiles').select('internal_code, display_name, role, school_id, active').order('internal_code'),
          supabase.from('schools').select('id, name'),
        ])
        if (people.error || schools.error) throw new Error('pessoas')
        const names = new Map((schools.data ?? []).map((school) => [school.id, school.name]))
        downloadCsv(`nexo-pessoas-${stamp()}`, toCsv(
          ['Código', 'Exibição', 'Papel', 'Escola', 'Situação'],
          (people.data ?? []).map((row) => [
            row.internal_code,
            row.display_name,
            ROLE_LABEL[row.role as UserRole] ?? row.role,
            row.school_id ? names.get(row.school_id) ?? '' : '',
            row.active ? 'Ativa' : 'Desativada',
          ]),
        ))
      }
      if (kind === 'classes') {
        const result = await supabase.from('classes').select('name, grade, school_year, active, schools(name)').order('grade')
        if (result.error) throw new Error('turmas')
        downloadCsv(`nexo-cadastro-turmas-${stamp()}`, toCsv(
          ['Escola', 'Ano', 'Turma', 'Ano letivo', 'Situação'],
          (result.data ?? []).map((row) => {
            const school = one(row.schools as { name: string } | { name: string }[] | null)
            return [school?.name ?? '', row.grade, row.name, row.school_year, row.active ? 'Ativa' : 'Desativada']
          }),
        ))
      }
      if (kind === 'audit') {
        const result = await supabase.from('audit_log').select('created_at, action, summary').order('created_at', { ascending: false }).limit(200)
        if (result.error) throw new Error('auditoria')
        downloadCsv(`nexo-auditoria-${stamp()}`, toCsv(
          ['Quando', 'Ação', 'Resumo'],
          (result.data ?? []).map((row) => [formatDay(row.created_at.slice(0, 10)), row.action, row.summary]),
        ))
      }
    } catch {
      setError('Não foi possível montar o relatório.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-3">
      <ReportCard title="Pessoas" text="Código, papel, escola e situação. O e-mail não entra neste arquivo." busy={busy === 'people'} onClick={() => void run('people')} />
      <ReportCard title="Turmas" text="Cadastro de turmas, sem lista de alunos." busy={busy === 'classes'} onClick={() => void run('classes')} />
      <ReportCard title="Auditoria" text="As 200 ações mais recentes, só com data, ação e resumo." busy={busy === 'audit'} onClick={() => void run('audit')} />
      {error ? <p className="text-sm font-bold text-rose-800">{error}</p> : null}
    </div>
  )
}

function ReportCard({ title, text, busy, onClick }: { title: string; text: string; busy: boolean; onClick: () => void }) {
  return (
    <article className="nexo-card flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-extrabold text-brand-900">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
      </div>
      <button className="nexo-btn" type="button" onClick={onClick} disabled={busy}>
        {busy ? 'Gerando...' : 'Baixar CSV'}
      </button>
    </article>
  )
}

export function ReportsPage() {
  const { profile } = useAuth()
  if (!profile) return null

  return (
    <AppShell>
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-extrabold text-brand-900">Relatórios</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            O arquivo sai no seu computador. Não inclui e-mail, nome civil nem diagnóstico.
          </p>
        </header>
        <PedagogicalNotice />
        {profile.role === 'teacher' || profile.role === 'principal' ? <ScopeReports role={profile.role} /> : null}
        {profile.role === 'secretary' ? <SecretaryReports /> : null}
        {profile.role === 'admin' ? <AdminReports /> : null}
      </div>
    </AppShell>
  )
}