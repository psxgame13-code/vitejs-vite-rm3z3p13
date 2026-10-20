import { useState } from 'react'
import { SCAM_MESSAGES, scamOrTruthScore } from '../../lib/scoring'
import type { GameProps, MessageCard } from './types'
import { ChoiceButton, FeedbackLine, GameFrame, useFinishOnce, useStopwatch } from './GameFrame'

function choiceNote(right: boolean, isScam: boolean): string {
  if (right && isScam) return 'Certo: era golpe. Pressa, prêmio e pedido de senha são sinais.'
  if (right) return 'Certo: era um recado. Ele aponta um canal da escola, sem cobrar taxa.'
  if (isScam) return 'Era golpe. Antes de acreditar, olhe a pressa e quem pede um dado.'
  return 'Era um recado. Não pedia senha, taxa nem dado pessoal.'
}

export function ScamOrTruth({ difficulty, level, onFinish }: GameProps<MessageCard[]>) {
  const clock = useStopwatch()
  const finish = useFinishOnce(onFinish)
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<'scam' | 'truth' | null>(null)
  const [correct, setCorrect] = useState<boolean[]>([])
  const card = level[step]

  if (!card) return null
  const right = picked == null ? null : (picked === 'scam') === card.isScam

  function choose(kind: 'scam' | 'truth') {
    if (picked) return
    setPicked(kind)
    setCorrect((current) => [...current, (kind === 'scam') === card.isScam])
  }

  function next() {
    if (!picked) return
    const last = step >= SCAM_MESSAGES - 1
    if (last) {
      finish(scamOrTruthScore({ difficulty, correct, durationMs: clock.elapsedMs() }))
      return
    }
    setPicked(null)
    setStep((current) => current + 1)
  }

  return (
    <GameFrame
      kicker="Golpe ou verdade?"
      stepLabel={`Mensagem ${step + 1} de ${SCAM_MESSAGES}`}
      prompt={card.text}
    >
      <p className="text-sm leading-6 text-slate-600">O tempo não muda a nota. Ler devagar ajuda.</p>
      <ChoiceButton onClick={() => choose('scam')} disabled={picked != null}>
        Golpe
      </ChoiceButton>
      <ChoiceButton onClick={() => choose('truth')} disabled={picked != null}>
        Recado verdadeiro
      </ChoiceButton>
      <FeedbackLine text={picked != null && right != null ? choiceNote(right, card.isScam) : null} />
      {picked ? (
        <button className="nexo-btn" type="button" onClick={next}>
          {step >= SCAM_MESSAGES - 1 ? 'Concluir' : 'Próxima mensagem'}
        </button>
      ) : null}
    </GameFrame>
  )
}