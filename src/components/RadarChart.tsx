import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadar,
  ResponsiveContainer,
} from 'recharts'
import { PILLARS } from '../lib/constants'
import type { PillarKey } from '../lib/types'

export type RadarSeries = {
  key: string
  label: string
  color: string
  values: Partial<Record<PillarKey, number | null>>
}

function asNumber(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function RadarChart({
  series,
  title = 'Os quatro pilares',
}: {
  series: RadarSeries[]
  title?: string
}) {
  const rows = PILLARS.map((pillar) => {
    const row: Record<string, string | number | null> = { pillar: pillar.name }
    for (const item of series) {
      row[item.key] = asNumber(item.values[pillar.key])
    }
    return row
  })

  const hasValue = rows.some((row) => series.some((item) => typeof row[item.key] === 'number'))

  if (!hasValue) {
    return (
      <section className="nexo-card" aria-label={title}>
        <h3 className="text-sm font-extrabold text-brand-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Ainda não há média neste recorte. A média do pilar pede pelo menos duas tentativas de
          avaliação.
        </p>
      </section>
    )
  }

  return (
    <section className="nexo-card" aria-label={title}>
      <h3 className="mb-2 text-sm font-extrabold text-brand-900">{title}</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadar data={rows} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid />
            <PolarAngleAxis dataKey="pillar" tick={{ fill: '#0f172a', fontSize: 12 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
            {series.map((item) => (
              <Radar
                key={item.key}
                name={item.label}
                dataKey={item.key}
                stroke={item.color}
                fill={item.color}
                fillOpacity={0.18}
              />
            ))}
            <Legend />
          </RechartsRadar>
        </ResponsiveContainer>
      </div>
      <table className="mt-3 w-full text-left text-sm">
        <caption className="mb-2 text-left text-xs font-bold text-slate-500">
          Valores de 0 a 100. Cor e nome identificam cada série.
        </caption>
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-500">
            <th className="py-1 pr-3 font-bold">Pilar</th>
            {series.map((item) => (
              <th key={item.key} className="py-1 pr-3 font-bold" style={{ color: item.color }}>
                {item.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PILLARS.map((pillar) => (
            <tr key={pillar.key} className="border-t border-slate-100">
              <th className="py-1 pr-3 font-bold text-slate-800">{pillar.name}</th>
              {series.map((item) => {
                const value = asNumber(item.values[pillar.key])
                return (
                  <td key={item.key} className="py-1 pr-3">
                    {value == null ? 'Sem média' : value}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}