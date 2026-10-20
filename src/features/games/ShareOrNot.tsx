import { useState } from 'react'
import { SHARE_ITEMS, shareOrNotScore } from '../../lib/scoring'
import type { GameProps, RubricOption, RubricScene } from './types'
import { ChoiceButton, FeedbackLine, GameFrame, useFinishOnce, useStopwatch } from './GameFrame'

function choiceNote(points: RubricOption['points']): string {
  if (points === 100) return 'Este caminho confere: checar a fonte, ou não espalhar o que já é falso.'
  if (points === 70) return 'Checar ajuda. Neste item, não compartilhar valia mais, porque o conteúdo já era falso.'
  if (points === 50) return 'Não espalhar segurou a notícia. Se ela pede verificação, checar a fonte vale mais.'
  return 'Compartilhar sem critério vale zero nesta missão.'
}

export function ShareOrNot({ difficulty, level, onFinish }: GameProps<RubricScene[]>) {
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
    const last = step >= SHARE_ITEMS - 1
    if (last) {
      finish(shareOrNotScore({ difficulty, chosenPoints, durationMs: clock.elapsedMs() }))
      return
    }
    setPicked(null)
    setStep((current) => current + 1)
  }

  return (
    <GameFrame
      kicker="Compartilho ou não?"
      stepLabel={`Item ${step + 1} de ${SHARE_ITEMS}`}
      prompt={scene.prompt}
    >
      <p className="text-sm leading-6 text-slate-600">
        Espalhar sem olhar a fonte não pontua. O critério é a decisão, não a pessoa.
      </p>
      {scene.options.map((option) => (
        <ChoiceButton key={option.id} onClick={() => choose(option)} disabled={picked != null}>
          {option.label}
        </ChoiceButton>
      ))}
      <FeedbackLine text={picked ? choiceNote(picked.points) : null} />
      {picked ? (
        <button className="nexo-btn" type="button" onClick={next}>
          {step >= SHARE_ITEMS - 1 ? 'Concluir' : 'Próximo item'}
        </button>
      ) : null}
    </GameFrame>
  )
}