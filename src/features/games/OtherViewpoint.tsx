import { useState } from 'react'
import { RUBRIC_SCENES, otherViewpointScore } from '../../lib/scoring'
import type { GameProps, RubricOption, RubricScene } from './types'
import { ChoiceButton, FeedbackLine, GameFrame, useFinishOnce, useStopwatch } from './GameFrame'

function choiceNote(points: RubricOption['points']): string {
  if (points === 100) return 'Este caminho reconhece o lado da outra pessoa antes de reagir.'
  if (points === 50) return 'A resposta é respeitosa, mas ainda parte só de você.'
  return 'Zoar ou desqualificar não entra neste critério. Não há um sentimento único certo.'
}

export function OtherViewpoint({ difficulty, level, onFinish }: GameProps<RubricScene[]>) {
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
      finish(otherViewpointScore({ difficulty, chosenPoints, durationMs: clock.elapsedMs() }))
      return
    }
    setPicked(null)
    setStep((current) => current + 1)
  }

  return (
    <GameFrame
      kicker="O outro lado"
      stepLabel={`Cena ${step + 1} de ${RUBRIC_SCENES}`}
      prompt={scene.prompt}
    >
      <p className="text-sm leading-6 text-slate-600">
        Não existe um sentimento certo. O critério é reconhecer o ponto de vista da outra pessoa.
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