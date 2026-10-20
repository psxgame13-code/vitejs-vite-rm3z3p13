import { useState } from 'react'
import { findIntruderScore } from '../../lib/scoring'
import type { GameProps, IntruderRound } from './types'
import { ChoiceButton, FeedbackLine, GameFrame, useFinishOnce, useStopwatch } from './GameFrame'

export function FindIntruder({ difficulty, level, onFinish }: GameProps<IntruderRound[]>) {
  const clock = useStopwatch()
  const finish = useFinishOnce(onFinish)
  const [roundIndex, setRoundIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [answers, setAnswers] = useState<{ correct: boolean; elapsedMs: number }[]>([])
  const round = level[roundIndex]

  if (!round) return null

  const correct = picked != null && picked === round.intruderIndex
  const feedback =
    picked == null
      ? null
      : correct
        ? 'Esse era o item que não combinava.'
        : `Esse ainda combina com o grupo. O intruso era “${round.cells[round.intruderIndex]}”.`

  function choose(index: number) {
    if (picked != null) return
    const elapsedMs = clock.lapMs()
    setPicked(index)
    setAnswers((current) => [...current, { correct: index === round.intruderIndex, elapsedMs }])
  }

  function next() {
    if (picked == null) return
    const last = roundIndex >= level.length - 1
    if (last) {
      finish(findIntruderScore({ difficulty, rounds: answers }))
      return
    }
    clock.resetLap()
    setPicked(null)
    setRoundIndex((current) => current + 1)
  }

  return (
    <GameFrame
      kicker="Encontre o intruso"
      stepLabel={`Rodada ${roundIndex + 1} de ${level.length}`}
      prompt="Toque no item que não combina com os outros."
    >
      {round.cells.map((cell, index) => (
        <ChoiceButton key={`${roundIndex}-${cell}`} onClick={() => choose(index)} disabled={picked != null}>
          {cell}
        </ChoiceButton>
      ))}
      <FeedbackLine text={feedback} />
      {picked != null ? (
        <button className="nexo-btn" type="button" onClick={next}>
          {roundIndex >= level.length - 1 ? 'Concluir' : 'Próxima rodada'}
        </button>
      ) : null}
    </GameFrame>
  )
}