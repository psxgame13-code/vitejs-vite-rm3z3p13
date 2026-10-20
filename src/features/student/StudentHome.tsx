import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { StatCard } from '../../components/StatCard'
import { useAuth } from '../../lib/auth'
import { DIFFICULTY_LABEL, ROUTES } from '../../lib/constants'
import { levelFromXp } from '../../lib/scoring'
import { supabase } from '../../lib/supabase'
import type { DifficultyLevel, MissionStatus } from '../../lib/types'

type MissionCard = {
  missionId: string
  status: MissionStatus
  bestScore: number | null
  title: string
  summary: string
  pillarName: string
  suggestedLevel: DifficultyLevel
  startsOn: string
  endsOn: string
  active: boolean
}

const STATUS_LABEL: Record<MissionStatus, string> = {
  available: 'Aberta',
  in_progress: 'Em andamento',
  completed: 'Concluída',
}

const STATUS_ORDER: Record<MissionStatus, number> = {
  available: 0,
  in_progress: 1,
  completed: 2,
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function asLevel(value: number): DifficultyLevel {
  if (value === 2 || value === 3) return value
  return 1
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

export function StudentHome() {
  const { profile } = useAuth()
  const [missions, setMissions] = useState<MissionCard[]>([])
  const [xp, setXp] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile || !supabase) return
    let alive = true
    const client = supabase

    async function load() {
      setLoading(true)
      setError(null)
      const [missionResult, achievementResult] = await Promise.all([
        client
          .from('student_missions')
          .select(
            'mission_id, status, best_score, missions(title, starts_on, ends_on, suggested_level, active, activities(summary, pillars(name)))',
          )
          .eq('student_id', profile!.id),
        client.from('student_achievements').select('achievements(xp)').eq('student_id', profile!.id),
      ])

      if (!alive) return
      if (missionResult.error || achievementResult.error) {
        setError('Não foi possível carregar as missões.')
        setLoading(false)
        return
      }

      const cards: MissionCard[] = []
      for (const row of missionResult.data ?? []) {
        const mission = one(row.missions as {
          title: string
          starts_on: string
          ends_on: string
          suggested_level: number
          active: boolean
          activities:
            | { summary: string; pillars: { name: string } | { name: string }[] | null }
            | { summary: string; pillars: { name: string } | { name: string }[] | null }[]
            | null
        } | null)
        const activity = one(mission?.activities ?? null)
        const pillar = one(activity?.pillars ?? null)
        if (!mission || !activity || !pillar) continue
        cards.push({
          missionId: row.mission_id,
          status: row.status as MissionStatus,
          bestScore: row.best_score,
          title: mission.title,
          summary: activity.summary,
          pillarName: pillar.name,
          suggestedLevel: asLevel(mission.suggested_level),
          startsOn: mission.starts_on,
          endsOn: mission.ends_on,
          active: mission.active,
        })
      }
      cards.sort(
        (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.endsOn.localeCompare(b.endsOn),
      )

      const total = (achievementResult.data ?? []).reduce((sum, row) => {
        const achievement = one(row.achievements as { xp: number } | { xp: number }[] | null)
        return sum + (achievement?.xp ?? 0)
      }, 0)

      setMissions(cards)
      setXp(total)
      setLoading(false)
    }

    void load()
    return () => {
      alive = false
    }
  }, [profile])

  if (!profile) return null
  const level = levelFromXp(xp)

  return (
    <AppShell>
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-extrabold text-brand-900">Olá, {profile.display_name}</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Pratique no seu ritmo. Não existe ranking, e uma missão não diz como você é.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Seu nível" value={level.level} hint="Sobe só com o seu XP." />
          <StatCard label="Seu XP" value={xp} hint={level.nextXp ? `Próximo nível em ${level.nextXp} XP.` : 'Nível mais alto desta trilha.'} />
          <StatCard label="Missões abertas" value={missions.filter((item) => item.status !== 'completed').length} />
        </div>

        <Link className="nexo-btn-ghost" to={ROUTES.studentProgress}>
          Ver meu progresso
        </Link>

        {loading ? <p className="text-sm font-bold text-brand-800">Carregando missões...</p> : null}
        {error ? (
          <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !error && missions.length === 0 ? (
          <p className="nexo-card text-sm leading-6 text-slate-600">
            Nenhuma missão nesta turma ainda. Quando a equipe publicar, ela aparece aqui.
          </p>
        ) : null}

        <ul className="grid gap-3">
          {missions.map((mission) => (
            <li key={mission.missionId} className="nexo-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {mission.pillarName} · {DIFFICULTY_LABEL[mission.suggestedLevel]}
                  </p>
                  <h2 className="mt-1 text-lg font-extrabold text-brand-900">{mission.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{mission.summary}</p>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-800">
                  {mission.active ? STATUS_LABEL[mission.status] : 'Encerrada'}
                </span>
              </div>
              <p className="mt-3 text-xs font-bold text-slate-500">
                {formatDay(mission.startsOn)} a {formatDay(mission.endsOn)}
                {mission.bestScore != null ? ` · Melhor nota ${mission.bestScore}` : ''}
              </p>
              <Link className="nexo-btn mt-4" to={ROUTES.mission.replace(':missionId', mission.missionId)}>
                {mission.status === 'completed' ? 'Jogar de novo' : mission.status === 'in_progress' ? 'Continuar' : 'Começar'}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  )
}