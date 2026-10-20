import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { PedagogicalNotice } from '../../components/PedagogicalNotice'
import { RadarChart, type RadarSeries } from '../../components/RadarChart'
import { StatCard } from '../../components/StatCard'
import { Thermometer } from '../../components/Thermometer'
import { useAuth } from '../../lib/auth'
import { CYCLE_LABEL, PILLARS } from '../../lib/constants'
import { levelFromXp } from '../../lib/scoring'
import { supabase } from '../../lib/supabase'
import type { AttemptContext, CycleKind, PillarKey } from '../../lib/types'

type ScoreRow = {
  pillarKey: PillarKey
  cycleKind: CycleKind
  cycleLabel: string
  startsOn: string
  score: number
  attemptCount: number
}

type Badge = {
  id: string
  name: string
  description: string
  xp: number
  note: string
}

type HistoryRow = {
  id: string
  title: string
  score: number
  context: AttemptContext
  createdAt: string
}

const CONTEXT_LABEL: Record<AttemptContext, string> = {
  assessment: 'Avaliação',
  mission: 'Missão',
  practice: 'Prática',
}

const PERIOD_COLORS = ['#1d4ed8', '#b45309']

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function asPillar(value: string): PillarKey | null {
  if (
    value === 'focus' ||
    value === 'self_regulation' ||
    value === 'emotional_intelligence' ||
    value === 'digital_culture'
  ) {
    return value
  }
  return null
}

function asCycle(value: string): CycleKind | null {
  if (value === 'initial' || value === 'intermediate' || value === 'final') return value
  return null
}

function asContext(value: string): AttemptContext {
  if (value === 'assessment' || value === 'practice') return value
  return 'mission'
}

function asScore(value: number | string): number {
  const score = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(score) ? score : 0
}

function formatWhen(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export function StudentProgress() {
  const { profile } = useAuth()
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile || !supabase) return
    let alive = true
    const client = supabase

    async function load() {
      setLoading(true)
      setError(null)
      const [scoreResult, badgeResult, historyResult] = await Promise.all([
        client
          .from('pillar_scores')
          .select('score, attempt_count, pillars(key), assessment_cycles(kind, label, starts_on)')
          .eq('student_id', profile!.id),
        client
          .from('student_achievements')
          .select('note, achievements(id, name, description, xp)')
          .eq('student_id', profile!.id),
        client
          .from('activity_attempts')
          .select('id, score, context, created_at, activities(title)')
          .eq('student_id', profile!.id)
          .order('created_at', { ascending: false })
          .limit(8),
      ])

      if (!alive) return
      if (scoreResult.error || badgeResult.error || historyResult.error) {
        setError('Não foi possível carregar o seu progresso.')
        setLoading(false)
        return
      }

      const nextScores: ScoreRow[] = []
      for (const row of scoreResult.data ?? []) {
        const pillar = one(row.pillars as { key: string } | { key: string }[] | null)
        const cycle = one(
          row.assessment_cycles as
            | { kind: string; label: string; starts_on: string }
            | { kind: string; label: string; starts_on: string }[]
            | null,
        )
        const pillarKey = pillar ? asPillar(pillar.key) : null
        const cycleKind = cycle ? asCycle(cycle.kind) : null
        if (!pillarKey || !cycle || !cycleKind) continue
        nextScores.push({
          pillarKey,
          cycleKind,
          cycleLabel: cycle.label,
          startsOn: cycle.starts_on,
          score: asScore(row.score as number | string),
          attemptCount: row.attempt_count,
        })
      }

      const nextBadges: Badge[] = []
      for (const row of badgeResult.data ?? []) {
        const achievement = one(
          row.achievements as
            | { id: string; name: string; description: string; xp: number }
            | { id: string; name: string; description: string; xp: number }[]
            | null,
        )
        if (!achievement) continue
        nextBadges.push({ ...achievement, note: row.note })
      }

      const nextHistory: HistoryRow[] = []
      for (const row of historyResult.data ?? []) {
        const activity = one(row.activities as { title: string } | { title: string }[] | null)
        if (!activity) continue
        nextHistory.push({
          id: row.id,
          title: activity.title,
          score: row.score,
          context: asContext(row.context),
          createdAt: row.created_at,
        })
      }

      setScores(nextScores)
      setBadges(nextBadges)
      setHistory(nextHistory)
      setLoading(false)
    }

    void load()
    return () => {
      alive = false
    }
  }, [profile])

  if (!profile) return null

  const xp = badges.reduce((sum, badge) => sum + badge.xp, 0)
  const level = levelFromXp(xp)
  const periods = [...new Set(scores.map((row) => row.startsOn))].sort()
  const visiblePeriods = periods.slice(-2)
  const series: RadarSeries[] = visiblePeriods.map((startsOn, index) => {
    const rows = scores.filter((row) => row.startsOn === startsOn)
    const sample = rows[0]
    return {
      key: startsOn,
      label: sample ? `${CYCLE_LABEL[sample.cycleKind]}` : 'Período',
      color: PERIOD_COLORS[index] ?? PERIOD_COLORS[0],
      values: Object.fromEntries(rows.map((row) => [row.pillarKey, row.score])),
    }
  })
  const latest = visiblePeriods[visiblePeriods.length - 1]

  return (
    <AppShell>
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-extrabold text-brand-900">Meu progresso</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Só os seus números. A média do pilar pede pelo menos duas tentativas de avaliação.
          </p>
        </header>

        <PedagogicalNotice />

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Nível" value={level.level} hint="Conta só o seu XP." />
          <StatCard
            label="XP"
            value={xp}
            hint={level.nextXp ? `Próximo nível em ${level.nextXp} XP.` : 'Nível mais alto desta trilha.'}
          />
          <StatCard label="Conquistas" value={badges.length} hint="Cada uma explica o que você praticou." />
        </div>

        {loading ? <p className="text-sm font-bold text-brand-800">Carregando progresso...</p> : null}
        {error ? (
          <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !error ? <RadarChart series={series} title="Meus pilares" /> : null}

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
          <h2 className="text-lg font-extrabold text-brand-900">Conquistas</h2>
          {badges.length === 0 && !loading ? (
            <p className="nexo-card text-sm leading-6 text-slate-600">
              Ainda não há conquista. Elas aparecem pela sua prática, sem comparação com a turma.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {badges.map((badge) => (
                <li key={badge.id} className="nexo-card">
                  <p className="text-sm font-extrabold text-brand-900">
                    {badge.name} · {badge.xp} XP
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{badge.description}</p>
                  <p className="mt-2 text-sm text-slate-500">{badge.note}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-extrabold text-brand-900">Últimas partidas</h2>
          {history.length === 0 && !loading ? (
            <p className="nexo-card text-sm leading-6 text-slate-600">Nenhuma partida ainda.</p>
          ) : (
            <ul className="grid gap-2">
              {history.map((item) => (
                <li key={item.id} className="nexo-card flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-extrabold text-brand-900">{item.title}</p>
                    <p className="text-xs font-bold text-slate-500">
                      {CONTEXT_LABEL[item.context]} · {formatWhen(item.createdAt)}
                    </p>
                  </div>
                  <p className="text-lg font-extrabold text-slate-800">{item.score}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  )
}