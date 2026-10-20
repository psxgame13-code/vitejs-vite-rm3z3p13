import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppShell } from '../../components/AppShell'
import { DataTable, type DataColumn } from '../../components/DataTable'
import { PedagogicalNotice } from '../../components/PedagogicalNotice'
import { RadarChart, type RadarSeries } from '../../components/RadarChart'
import { StatCard } from '../../components/StatCard'
import { CYCLE_LABEL, MIN_GROUP_SIZE, PILLARS } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import type {
  CycleKind,
  NetworkCyclePillar,
  NetworkIntervention,
  NetworkOverview,
  NetworkParticipation,
  NetworkSchoolPillar,
  PillarKey,
} from '../../lib/types'

const PERIOD_COLORS = ['#1d4ed8', '#b45309', '#0f766e']

function asNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

function asCycle(value: string): CycleKind | null {
  if (value === 'initial' || value === 'intermediate' || value === 'final') return value
  return null
}

function asPillar(value: string): PillarKey | null {
  return PILLARS.some((pillar) => pillar.key === value) ? (value as PillarKey) : null
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

export function SecretaryHome() {
  const [overview, setOverview] = useState<NetworkOverview | null>(null)
  const [participation, setParticipation] = useState<NetworkParticipation[]>([])
  const [schoolPillars, setSchoolPillars] = useState<NetworkSchoolPillar[]>([])
  const [cyclePillars, setCyclePillars] = useState<NetworkCyclePillar[]>([])
  const [interventions, setInterventions] = useState<NetworkIntervention[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let alive = true
    const client = supabase

    async function load() {
      setLoading(true)
      setError(null)
      const [overviewResult, participationResult, schoolResult, cycleResult, interventionResult] = await Promise.all([
        client.rpc('network_overview'),
        client.rpc('network_participation'),
        client.rpc('network_school_pillars'),
        client.rpc('network_cycle_pillars'),
        client.rpc('network_interventions'),
      ])
      if (!alive) return
      if (
        overviewResult.error ||
        participationResult.error ||
        schoolResult.error ||
        cycleResult.error ||
        interventionResult.error
      ) {
        setError('Não foi possível carregar os agregados da rede.')
        setLoading(false)
        return
      }

      const first = (overviewResult.data?.[0] ?? null) as NetworkOverview | null
      setOverview(
        first
          ? {
              ...first,
              student_count: asNumber(first.student_count),
              participant_count: asNumber(first.participant_count),
              participation_pct: asNumber(first.participation_pct),
            }
          : null,
      )
      setParticipation(
        ((participationResult.data ?? []) as NetworkParticipation[]).map((row) => ({
          ...row,
          participation_pct: asNumber(row.participation_pct) ?? 0,
        })),
      )
      setSchoolPillars(
        ((schoolResult.data ?? []) as NetworkSchoolPillar[])
          .map((row) => ({ ...row, mean_score: asNumber(row.mean_score) ?? 0 }))
          .filter((row) => asCycle(row.cycle_kind) && asPillar(row.pillar_key)),
      )
      setCyclePillars(
        ((cycleResult.data ?? []) as NetworkCyclePillar[])
          .map((row) => ({ ...row, mean_score: asNumber(row.mean_score) ?? 0 }))
          .filter((row) => asCycle(row.cycle_kind) && asPillar(row.pillar_key)),
      )
      setInterventions((interventionResult.data ?? []) as NetworkIntervention[])
      setLoading(false)
    }

    void load()
    return () => {
      alive = false
    }
  }, [])

  const periods = [...new Set(cyclePillars.map((row) => row.cycle_kind))]
  const series: RadarSeries[] = periods.map((kind, index) => ({
    key: kind,
    label: CYCLE_LABEL[kind],
    color: PERIOD_COLORS[index] ?? PERIOD_COLORS[0],
    values: Object.fromEntries(
      cyclePillars.filter((row) => row.cycle_kind === kind).map((row) => [row.pillar_key, row.mean_score]),
    ),
  }))

  const schoolColumns: DataColumn<NetworkSchoolPillar>[] = [
    { key: 'school', header: 'Escola', render: (row) => row.school_name },
    { key: 'cycle', header: 'Período', render: (row) => CYCLE_LABEL[row.cycle_kind] },
    { key: 'pillar', header: 'Pilar', render: (row) => row.pillar_name },
    { key: 'mean', header: 'Média', render: (row) => row.mean_score },
    { key: 'students', header: 'Alunos no grupo', render: (row) => row.student_count },
  ]

  const interventionColumns: DataColumn<NetworkIntervention>[] = [
    { key: 'school', header: 'Escola', render: (row) => row.school_name },
    { key: 'month', header: 'Mês', render: (row) => formatDay(row.month_start) },
    { key: 'pillar', header: 'Pilar', render: (row) => row.pillar_name },
    { key: 'classes', header: 'Turmas', render: (row) => row.class_count },
  ]

  return (
    <AppShell>
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-extrabold text-brand-900">{overview?.municipality_name ?? 'Rede'}</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Só números da rede. Grupos com menos de {MIN_GROUP_SIZE} alunos não aparecem. Nenhum código individual entra aqui.
          </p>
        </header>
        <PedagogicalNotice />
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Escolas" value={overview?.school_count ?? '—'} />
          <StatCard label="Turmas" value={overview?.class_count ?? '—'} />
          <StatCard
            label="Participação"
            value={
              overview?.metrics_hidden || overview?.participation_pct == null ? '—' : `${overview.participation_pct}%`
            }
            hint={
              overview?.metrics_hidden
                ? `Oculta: a rede ainda não chega a ${MIN_GROUP_SIZE} alunos.`
                : 'Alunos com alguma partida, sem identificar quem.'
            }
          />
        </div>
        {loading ? <p className="text-sm font-bold text-brand-800">Carregando a rede...</p> : null}
        {error ? (
          <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !error ? <RadarChart series={series} title="Média da rede por período" /> : null}

        <section className="nexo-card">
          <h2 className="text-sm font-extrabold text-brand-900">Participação por escola</h2>
          {participation.length === 0 ? (
            <p className="mt-2 text-sm leading-6 text-slate-600">Nenhuma escola com grupo suficiente para exibir.</p>
          ) : (
            <>
              <div className="mt-3 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={participation}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="school_name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="participation_pct" name="Participação (%)" fill="#1d4ed8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="mt-3 w-full text-left text-sm">
                <caption className="mb-2 text-left text-xs font-bold text-slate-500">
                  Participação em porcentagem. O nome da escola identifica a barra.
                </caption>
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-1 pr-3 font-bold">Escola</th>
                    <th className="py-1 pr-3 font-bold">Turmas</th>
                    <th className="py-1 pr-3 font-bold">Alunos</th>
                    <th className="py-1 font-bold">Participação</th>
                  </tr>
                </thead>
                <tbody>
                  {participation.map((row) => (
                    <tr key={row.school_name} className="border-t border-slate-100">
                      <th className="py-1 pr-3 font-bold text-slate-800">{row.school_name}</th>
                      <td className="py-1 pr-3">{row.class_count}</td>
                      <td className="py-1 pr-3">{row.student_count}</td>
                      <td className="py-1">{row.participation_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>

        <DataTable
          caption="Médias por escola e pilar"
          columns={schoolColumns}
          rows={schoolPillars}
          rowKey={(row) => `${row.school_name}-${row.cycle_kind}-${row.pillar_key}`}
          empty={`Nenhum grupo com pelo menos ${MIN_GROUP_SIZE} alunos neste recorte.`}
        />
        <DataTable
          caption="Prioridades pedagógicas por escola"
          columns={interventionColumns}
          rows={interventions}
          rowKey={(row) => `${row.school_name}-${row.month_start}-${row.pillar_key}`}
          empty="Nenhuma prioridade de mês registrada na rede."
        />
      </div>
    </AppShell>
  )
}