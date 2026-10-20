import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { PedagogicalNotice } from '../../components/PedagogicalNotice'
import { StatCard } from '../../components/StatCard'
import { useAuth } from '../../lib/auth'
import { ROUTES } from '../../lib/constants'
import { supabase } from '../../lib/supabase'

type ClassCard = {
  id: string
  name: string
  grade: number
  schoolYear: number
  schoolName: string
  students: number
  missions: number
  participants: number
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export function TeacherHome() {
  const { profile } = useAuth()
  const [classes, setClasses] = useState<ClassCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile || !supabase) return
    let alive = true
    const client = supabase

    async function load() {
      setLoading(true)
      setError(null)
      const classResult = await client
        .from('class_teachers')
        .select('class_id, classes(id, name, grade, school_year, active, schools(name))')
        .eq('teacher_id', profile!.id)

      if (!alive) return
      if (classResult.error) {
        setError('Não foi possível carregar as turmas.')
        setLoading(false)
        return
      }

      const base: ClassCard[] = []
      for (const row of classResult.data ?? []) {
        const schoolClass = one(
          row.classes as
            | { id: string; name: string; grade: number; school_year: number; active: boolean; schools: { name: string } | { name: string }[] | null }
            | { id: string; name: string; grade: number; school_year: number; active: boolean; schools: { name: string } | { name: string }[] | null }[]
            | null,
        )
        if (!schoolClass || !schoolClass.active) continue
        const school = one(schoolClass.schools)
        base.push({
          id: schoolClass.id,
          name: schoolClass.name,
          grade: schoolClass.grade,
          schoolYear: schoolClass.school_year,
          schoolName: school?.name ?? 'Escola',
          students: 0,
          missions: 0,
          participants: 0,
        })
      }

      const classIds = base.map((item) => item.id)
      if (classIds.length === 0) {
        setClasses([])
        setLoading(false)
        return
      }

      const [studentResult, missionResult] = await Promise.all([
        client.from('class_students').select('class_id, student_id').in('class_id', classIds),
        client.from('missions').select('id, class_id').in('class_id', classIds).eq('active', true),
      ])

      if (!alive) return
      if (studentResult.error || missionResult.error) {
        setError('Não foi possível carregar as turmas.')
        setLoading(false)
        return
      }

      const studentsByClass = new Map<string, string[]>()
      for (const row of studentResult.data ?? []) {
        const list = studentsByClass.get(row.class_id) ?? []
        list.push(row.student_id)
        studentsByClass.set(row.class_id, list)
      }
      const studentIds = [...new Set((studentResult.data ?? []).map((row) => row.student_id))]
      const attemptResult = studentIds.length
        ? await client.from('activity_attempts').select('student_id').in('student_id', studentIds)
        : { data: [], error: null }

      if (!alive) return
      if (attemptResult.error) {
        setError('Não foi possível carregar as turmas.')
        setLoading(false)
        return
      }

      const played = new Set((attemptResult.data ?? []).map((row) => row.student_id))
      for (const card of base) {
        const students = studentsByClass.get(card.id) ?? []
        card.students = students.length
        card.missions = (missionResult.data ?? []).filter((row) => row.class_id === card.id).length
        card.participants = students.filter((id) => played.has(id)).length
      }

      base.sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name, 'pt-BR'))
      setClasses(base)
      setLoading(false)
    }

    void load()
    return () => {
      alive = false
    }
  }, [profile])

  if (!profile) return null
  const students = classes.reduce((sum, item) => sum + item.students, 0)
  const participants = classes.reduce((sum, item) => sum + item.participants, 0)

  return (
    <AppShell>
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-extrabold text-brand-900">Minhas turmas</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Acompanhe a prática das turmas ligadas a você. Não há ranking de alunos.
          </p>
        </header>
        <PedagogicalNotice />
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Turmas" value={classes.length} />
          <StatCard label="Alunos" value={students} hint="Pelo código interno, não pelo nome." />
          <StatCard
            label="Com alguma partida"
            value={students === 0 ? '—' : `${participants} de ${students}`}
            hint="Participação não é nota do pilar."
          />
        </div>
        {loading ? <p className="text-sm font-bold text-brand-800">Carregando turmas...</p> : null}
        {error ? (
          <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error && classes.length === 0 ? (
          <p className="nexo-card text-sm leading-6 text-slate-600">
            Nenhuma turma ligada a este perfil. A administração faz esse vínculo.
          </p>
        ) : null}
        <ul className="grid gap-3">
          {classes.map((item) => (
            <li key={item.id} className="nexo-card flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-brand-900">
                  {item.grade}º {item.name}
                </h2>
                <p className="text-sm text-slate-600">
                  {item.schoolName} · {item.schoolYear}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {item.students} alunos · {item.missions} missões abertas · {item.participants} com partida
                </p>
              </div>
              <Link className="nexo-btn" to={ROUTES.teacherClass.replace(':classId', item.id)}>
                Abrir turma
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  )
}