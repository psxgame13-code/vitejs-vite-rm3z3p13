import { MIN_ATTEMPTS_FOR_SCORE, THERMOMETER_BANDS } from '../lib/constants'
import { thermometerFor } from '../lib/scoring'

export function Thermometer({
  label,
  score,
  color = '#1d4ed8',
  attempts,
}: {
  label: string
  score: number | null
  color?: string
  attempts?: number
}) {
  const ready = score != null && (attempts == null || attempts >= MIN_ATTEMPTS_FOR_SCORE)
  const safe = ready ? Math.max(0, Math.min(100, Math.round(score))) : null
  const band = safe == null ? null : thermometerFor(safe)

  return (
    <article className="nexo-card">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-extrabold text-brand-900">{label}</h3>
        <p className="text-lg font-extrabold text-slate-800">{safe == null ? '—' : safe}</p>
      </div>

      {safe == null || !band ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Sem média ainda. Este pilar só entra no termômetro com pelo menos duas tentativas de
          avaliação.
        </p>
      ) : (
        <>
          <div
            className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={safe}
            aria-valuetext={`${label}: ${safe} de 100, faixa ${band.label}. ${band.hint}`}
            aria-label={label}
          >
            <div className="h-full rounded-full" style={{ width: `${safe}%`, backgroundColor: color }} />
          </div>
          <ol className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {THERMOMETER_BANDS.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl px-2 py-1 font-bold ${
                  item.id === band.id ? 'bg-brand-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.label}
                <span className="mt-0.5 block font-semibold">
                  {item.min}–{item.max}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm leading-6 text-slate-600">{band.hint}</p>
        </>
      )}
    </article>
  )
}