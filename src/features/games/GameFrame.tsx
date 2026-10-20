import { useRef, type ReactNode } from 'react'
import type { AttemptResult } from '../../lib/types'

export function useStopwatch() {
  const startedAt = useRef(Date.now())
  const lapStartedAt = useRef(Date.now())

  function elapsedMs() {
    return Date.now() - startedAt.current
  }

  function lapMs() {
    return Date.now() - lapStartedAt.current
  }

  function resetLap() {
    lapStartedAt.current = Date.now()
  }

  return { elapsedMs, lapMs, resetLap }
}

export function useFinishOnce(onFinish: (result: AttemptResult) => void) {
  const sent = useRef(false)

  return (result: AttemptResult) => {
    if (sent.current) return
    sent.current = true
    onFinish(result)
  }
}

export function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    const current = copy[index]
    copy[index] = copy[swap]
    copy[swap] = current
  }
  return copy
}

export function GameFrame({
  kicker,
  stepLabel,
  prompt,
  children,
}: {
  kicker: string
  stepLabel: string
  prompt: string
  children: ReactNode
}) {
  return (
    <section className="nexo-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{kicker}</p>
        <p className="text-xs font-extrabold text-brand-800">{stepLabel}</p>
      </div>
      <h2 className="text-lg font-extrabold leading-7 text-brand-900">{prompt}</h2>
      <div className="grid gap-2">{children}</div>
    </section>
  )
}

export function ChoiceButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button className="nexo-btn-ghost w-full text-left" type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function FeedbackLine({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p className="rounded-2xl bg-brand-50 px-3 py-2 text-sm font-bold leading-6 text-brand-900" role="status">
      {text}
    </p>
  )
}