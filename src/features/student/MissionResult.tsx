import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { PedagogicalNotice } from '../../components/PedagogicalNotice'
import { useAuth } from '../../lib/auth'
import { DIFFICULTY_LABEL, ROUTES } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import type { DifficultyLevel } from '../../lib/types'
import type { MissionResultState } from './MissionPlay'

function isResultState(value: unknown): value is MissionResultState {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<MissionResultState>
  return (
    typeof row.score === 'number' &&
    typeof row.hits === 'number' &&
    typeof row.rounds === 'number' &&
    typeof row.feedback === 'string' &&
    typeof row.title === 'string' &&
    (row.difficulty === 1 || row.difficulty === 2 || row.difficulty === 3)
  )
}

function asLevel(value: number): DifficultyLevel {
  if (value === 2 || value === 3) return value
  return 1
}

export function MissionResult() {
  const { missionId } = useParams()
  const location = useLocation()
  const { profile } = useAuth()
  const initial = isResultState(location.state) ? location.state : null
  const [result, setResult] = useState<MissionResultState | null>(initial)
  const [loading, setLoading] = useState(!initial)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initial || !profile || !supabase || !missionId) return
    let alive = true
    const client = supabase

    async function load() {
      const [attemptResult, missionResult] = await Promise.all([
        client
          .from('activity_attempts')
          .select('score, hits, rounds, feedback, difficulty')
          .eq('student_id', profile!.id)
          .eq('mission_id', missionId!)
          .eq('context', 'mission')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        client.from('missions').select('title').eq('id', missionId!).maybeSingle(),
      ])

      if (!alive) return
      if (attemptResult.error || missionResult.error || !attemptResult.data || !missionResult.data) {
        setError(attemptResult.error || missionResult.error ? 'Não foi possível abrir o resultado.' : null)
        setLoading(false)
        return
      }

      setResult({
        title: missionResult.data.title,
        score: attemptResult.data.score,
        hits: attemptResult.data.hits,
        rounds: attemptResult.data.rounds,
        feedback: attemptResult.data.feedback,
        difficulty: asLevel(attemptResult.data.difficulty),
        duration_ms: 0,
        detail: {},
      })
      setLoading(false)
    }

    void load()
    return () => {
      alive = false
    }
  }, [initial, missionId, profile])

  if (!profile) return null

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4">
        <header>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Resultado da missão</p>
          <h1 className="mt-1 text-2xl font-extrabold text-brand-900">{result?.title ?? 'Missão'}</h1>
        </header>

        {loading ? <p className="text-sm font-bold text-brand-800">Carregando resultado...</p> : null}
        {error ? (
          <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !result && !error ? (
          <p className="nexo-card text-sm leading-6 text-slate-600">Ainda não há uma partida sua nesta missão.</p>
        ) : null}

        {result ? (
          <section className="nexo-card space-y-3">
            <p className="text-sm font-bold text-slate-500">{DIFFICULTY_LABEL[result.difficulty]}</p>
            <p className="text-5xl font-extrabold text-brand-900">{result.score}</p>
            <p className="text-sm font-bold text-slate-600">
              {result.hits} de {result.rounds} no critério desta atividade
            </p>
            <p className="text-sm leading-6 text-slate-700">{result.feedback}</p>
            <p className="text-sm leading-6 text-slate-500">
              Isto é o resultado de uma partida. Não define o pilar nem diz como você é.
            </p>
          </section>
        ) : null}

        <PedagogicalNotice />

        <div className="flex flex-wrap gap-2">
          <Link className="nexo-btn" to={ROUTES.student}>
            Voltar às missões
          </Link>
          {missionId ? (
            <Link className="nexo-btn-ghost" to={ROUTES.mission.replace(':missionId', missionId)}>
              Jogar de novo
            </Link>
          ) : null}
          <Link className="nexo-btn-ghost" to={ROUTES.studentProgress}>
            Ver meu progresso
          </Link>
        </div>
      </div>
    </AppShell>
  )
}