import { useState } from 'react'
import { RUBRIC_SCENES, recessConflictScore } from '../../lib/scoring'
import type { GameProps, RubricOption, RubricScene } from './types'
import { ChoiceButton, FeedbackLine, GameFrame, useFinishOnce, useStopwatch } from './GameFrame'

function choiceNote(points: RubricOption['points']): string {
  if (points === 100) return 'Este caminho cuida da convivência e não humilha.'
  if (points === 50) return 'Este caminho evita o pior, mas ainda não cuida da situação.'
  return 'Este caminho aumenta o conflito. A cena é sobre a escolha, não sobre a pessoa.'
}

export function RecessConflict({ difficulty, level, onFinish }: GameProps<RubricScene[]>) {
  const clock = useStopwatch()
  const finish = useFinishOnce(onFinish)
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<RubricOption | null>(null)
  const [chosenPoints, setChosenPoints] = useState<number[]>([])
  const scene = level[step]

  if (!scene) return null

  function choose(option: RubricOption) {
    if (picked) return
    setPicked(option)
    setChosenPoints((current) => [...current, option.points])
  }

  function next() {
    if (!picked) return
    const last = step >= RUBRIC_SCENES - 1
    if (last) {
      finish(recessConflictScore({ difficulty, chosenPoints, durationMs: clock.elapsedMs() }))
      return
    }
    setPicked(null)
    setStep((current) => current + 1)
  }

  return (
    <GameFrame
      kicker="Conflito no intervalo"
      stepLabel={`Cena ${step + 1} de ${RUBRIC_SCENES}`}
      prompt={scene.prompt}
    >
      <p className="text-sm leading-6 text-slate-600">
        Não existe emoção certa. O critério é não humilhar e não aumentar o conflito.
      </p>
      {scene.options.map((option) => (
        <ChoiceButton key={option.id} onClick={() => choose(option)} disabled={picked != null}>
          {option.label}
        </ChoiceButton>
      ))}
      <FeedbackLine text={picked ? choiceNote(picked.points) : null} />
      {picked ? (
        <button className="nexo-btn" type="button" onClick={next}>
          {step >= RUBRIC_SCENES - 1 ? 'Concluir' : 'Próxima cena'}
        </button>
      ) : null}
    </GameFrame>
  )
}