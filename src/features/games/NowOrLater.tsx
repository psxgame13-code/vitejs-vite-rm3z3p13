import { useState } from 'react'
import { NOW_OR_LATER_CHOICES, nowOrLaterScore } from '../../lib/scoring'
import type { GameProps, LaterChoice } from './types'
import { ChoiceButton, FeedbackLine, GameFrame, useFinishOnce, useStopwatch } from './GameFrame'

export function NowOrLater({ difficulty, level, onFinish }: GameProps<LaterChoice[]>) {
  const clock = useStopwatch()
  const finish = useFinishOnce(onFinish)
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<'now' | 'later' | null>(null)
  const [choices, setChoices] = useState<Array<'now' | 'later'>>([])
  const scene = level[step]

  if (!scene) return null

  function choose(choice: 'now' | 'later') {
    if (picked) return
    setPicked(choice)
    setChoices((current) => [...current, choice])
  }

  function next() {
    if (!picked) return
    const last = step >= NOW_OR_LATER_CHOICES - 1
    if (last) {
      finish(nowOrLaterScore({ difficulty, choices, durationMs: clock.elapsedMs() }))
      return
    }
    setPicked(null)
    setStep((current) => current + 1)
  }

  return (
    <GameFrame
      kicker="Agora ou depois"
      stepLabel={`Escolha ${step + 1} de ${NOW_OR_LATER_CHOICES}`}
      prompt={scene.prompt}
    >
      <p className="text-sm leading-6 text-slate-600">
        O critério é o plano: a opção depois vale nesta missão. Escolher o agora não é um defeito.
      </p>
      <ChoiceButton onClick={() => choose('now')} disabled={picked != null}>
        {scene.nowLabel}
      </ChoiceButton>
      <ChoiceButton onClick={() => choose('later')} disabled={picked != null}>
        {scene.laterLabel}
      </ChoiceButton>
      <FeedbackLine text={picked ? 'Escolha anotada.' : null} />
      {picked ? (
        <button className="nexo-btn" type="button" onClick={next}>
          {step >= NOW_OR_LATER_CHOICES - 1 ? 'Concluir' : 'Próxima escolha'}
        </button>
      ) : null}
    </GameFrame>
  )
}