import { useState } from 'react'
import { sequenceMemoryScore } from '../../lib/scoring'
import type { GameProps } from './types'
import { ChoiceButton, GameFrame, shuffled, useFinishOnce, useStopwatch } from './GameFrame'

function recallOrder(items: string[]): string[] {
  const next = shuffled(items)
  const same = next.every((item, index) => item === items[index])
  if (same && items.length > 1) return shuffled(items)
  return next
}

export function SequenceMemory({ difficulty, level, onFinish }: GameProps<string[]>) {
  const clock = useStopwatch()
  const finish = useFinishOnce(onFinish)
  const [phase, setPhase] = useState<'look' | 'recall'>('look')
  const [pool] = useState(() => recallOrder(level))
  const [answer, setAnswer] = useState<string[]>([])
  const remaining = pool.filter((item) => !answer.includes(item))

  function add(item: string) {
    if (phase !== 'recall' || answer.includes(item)) return
    setAnswer((current) => [...current, item])
  }

  function undo() {
    setAnswer((current) => current.slice(0, -1))
  }

  function conclude() {
    if (answer.length !== level.length) return
    finish(
      sequenceMemoryScore({
        difficulty,
        expected: level,
        answer,
        durationMs: clock.elapsedMs(),
      }),
    )
  }

  return (
    <GameFrame
      kicker="Sequência"
      stepLabel={`${level.length} itens`}
      prompt={
        phase === 'look'
          ? 'Olhe a ordem com calma. O tempo não muda a nota.'
          : 'Toque os itens na mesma ordem.'
      }
    >
      {phase === 'look' ? (
        <>
          <ol className="grid gap-2">
            {level.map((item, index) => (
              <li key={item} className="rounded-2xl bg-brand-50 px-3 py-3 text-sm font-extrabold text-brand-900">
                {index + 1}. {item}
              </li>
            ))}
          </ol>
          <button className="nexo-btn" type="button" onClick={() => setPhase('recall')}>
            Memorizei
          </button>
        </>
      ) : (
        <>
          <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
            {answer.length === 0 ? 'Nenhum item ainda.' : answer.map((item, index) => `${index + 1}. ${item}`).join(' · ')}
          </p>
          {remaining.map((item) => (
            <ChoiceButton key={item} onClick={() => add(item)}>
              {item}
            </ChoiceButton>
          ))}
          <div className="flex flex-wrap gap-2">
            <button className="nexo-btn-ghost" type="button" onClick={undo} disabled={answer.length === 0}>
              Apagar o último
            </button>
            <button className="nexo-btn" type="button" onClick={conclude} disabled={answer.length !== level.length}>
              Concluir
            </button>
          </div>
        </>
      )}
    </GameFrame>
  )
}