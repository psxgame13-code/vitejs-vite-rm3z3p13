import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { GameEngine, isActivitySlug } from '../games/GameEngine'
import { useAuth } from '../../lib/auth'
import { DIFFICULTY_LABEL, ROUTES } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import type { AttemptResult, DifficultyLevel } from '../../lib/types'

type MissionPlayData = {
  title: string
  activityId: string
  slug: string
  level: DifficultyLevel
  active: boolean
}

export type MissionResultState = AttemptResult & {
  title: string
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function asLevel(value: number): DifficultyLevel {
  if (value === 2 || value === 3) return value
  return 1
}

export function MissionPlay() {
  const { missionId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [mission, setMission] = useState<MissionPlayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<AttemptResult | null>(null)
  const saved = useRef(false)
  const inserted = useRef(false)

  useEffect(() => {
    if (!profile || !supabase || !missionId) return
    let alive = true
    const client = supabase

    async function load() {
      setLoading(true)
      setError(null)
      const { data, error: loadError } = await client
        .from('student_missions')
        .select('status, missions(title, suggested_level, active, activities(id, slug))')
        .eq('student_id', profile!.id)
        .eq('mission_id', missionId!)
        .maybeSingle()

      if (!alive) return
      if (loadError || !data) {
        setMission(null)
        setError(loadError ? 'Não foi possível abrir esta missão.' : null)
        setLoading(false)
        return
      }

      const row = one(
        data.missions as {
          title: string
          suggested_level: number
          active: boolean
          activities: { id: string; slug: string } | { id: string; slug: string }[] | null
        } | null,
      )
      const activity = one(row?.activities ?? null)
      if (!row || !activity) {
        setMission(null)
        setLoading(false)
        return
      }

      setMission({
        title: row.title,
        activityId: activity.id,
        slug: activity.slug,
        level: asLevel(row.suggested_level),
        active: row.active,
      })
      setLoading(false)

      if (data.status === 'available') {
        await client
          .from('student_missions')
          .update({ status: 'in_progress', started_at: new Date().toISOString() })
          .eq('student_id', profile!.id)
          .eq('mission_id', missionId!)
          .eq('status', 'available')
      }
    }

    void load()
    return () => {
      alive = false
    }
  }, [missionId, profile])

  async function save(result: AttemptResult) {
    if (!profile || !supabase || !missionId || !mission || saved.current) return
    setPending(result)
    setSaving(true)
    setError(null)

    if (!inserted.current) {
      const { error: insertError } = await supabase.from('activity_attempts').insert({
        student_id: profile.id,
        activity_id: mission.activityId,
        mission_id: missionId,
        cycle_id: null,
        context: 'mission',
        difficulty: result.difficulty,
        score: result.score,
        hits: result.hits,
        rounds: result.rounds,
        duration_ms: result.duration_ms,
        feedback: result.feedback,
        detail: result.detail,
      })
      if (insertError) {
        setSaving(false)
        setError('Não foi possível guardar esta missão. Tente de novo.')
        return
      }
      inserted.current = true
    }

    const { error: refreshError } = await supabase.rpc('refresh_my_progress')
    if (refreshError) {
      setSaving(false)
      setError('A missão foi guardada, mas o progresso não atualizou. Tente de novo.')
      return
    }

    saved.current = true
    const state: MissionResultState = { ...result, title: mission.title }
    navigate(ROUTES.missionResult.replace(':missionId', missionId), { replace: true, state })
  }

  if (!profile) return null
  const canPlay = mission != null && mission.active && isActivitySlug(mission.slug)

  return (
    <AppShell>
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-extrabold text-brand-900">{mission?.title ?? 'Missão'}</h1>
          {mission ? <p className="mt-1 text-sm text-slate-600">{DIFFICULTY_LABEL[mission.level]}</p> : null}
        </header>

        {loading ? <p className="text-sm font-bold text-brand-800">Abrindo missão...</p> : null}

        {!loading && !mission && !error ? (
          <div className="nexo-card space-y-3">
            <p className="text-sm leading-6 text-slate-600">Esta missão não está na sua turma.</p>
            <Link className="nexo-btn" to={ROUTES.student}>
              Voltar às missões
            </Link>
          </div>
        ) : null}

        {mission && !mission.active ? (
          <p className="nexo-card text-sm leading-6 text-slate-600">Esta missão foi encerrada pela equipe.</p>
        ) : null}

        {mission && mission.active && !isActivitySlug(mission.slug) ? (
          <p className="nexo-card text-sm leading-6 text-slate-600">Esta atividade ainda não está disponível.</p>
        ) : null}

        {error ? (
          <div className="space-y-3">
            <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800" role="alert">
              {error}
            </p>
            {pending ? (
              <button className="nexo-btn" type="button" onClick={() => void save(pending)} disabled={saving}>
                Tentar guardar de novo
              </button>
            ) : null}
          </div>
        ) : null}

        {saving ? <p className="text-sm font-bold text-brand-800">Guardando sua missão...</p> : null}

        {canPlay && !pending ? (
          <GameEngine slug={mission.slug} difficulty={mission.level} onFinish={(result) => void save(result)} />
        ) : null}
      </div>
    </AppShell>
  )
}