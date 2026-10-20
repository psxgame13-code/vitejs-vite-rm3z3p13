import { useState } from 'react'
import { ORGANIZE_DAY_LEVELS, organizeDayScore } from '../../lib/scoring'
import type { DayTask, GameProps } from './types'
import { ChoiceButton, GameFrame, shuffled, useFinishOnce, useStopwatch } from './GameFrame'

function mixedTasks(tasks: DayTask[]): DayTask[] {
  const next = shuffled(tasks)
  const same = next.every((task, index) => task.id === tasks[index]?.id)
  if (same && tasks.length > 1) return shuffled(tasks)
  return next
}

function formatLimit(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds} segundos`
  if (seconds === 0) return minutes === 1 ? '1 minuto' : `${minutes} minutos`
  return `${minutes} min ${seconds} s`
}

export function OrganizeDay({ difficulty, level, onFinish }: GameProps<DayTask[]>) {
  const clock = useStopwatch()
  const finish = useFinishOnce(onFinish)
  const [pool] = useState(() => mixedTasks(level))
  const [answer, setAnswer] = useState<DayTask[]>([])
  const limit = ORGANIZE_DAY_LEVELS[difficulty].limitMs
  const remaining = pool.filter((task) => !answer.some((item) => item.id === task.id))

  function add(task: DayTask) {
    if (answer.some((item) => item.id === task.id)) return
    setAnswer((current) => [...current, task])
  }

  function undo() {
    setAnswer((current) => current.slice(0, -1))
  }

  function conclude() {
    if (answer.length !== level.length) return
    finish(
      organizeDayScore({
        difficulty,
        expectedIds: level.map((task) => task.id),
        answerIds: answer.map((task) => task.id),
        durationMs: clock.elapsedMs(),
      }),
    )
  }

  return (
    <GameFrame
      kicker="Organize seu dia"
      stepLabel={`${level.length} tarefas`}
      prompt="Toque as tarefas na ordem em que precisam acontecer."
    >
      <p className="text-sm leading-6 text-slate-600">
        Se passar de {formatLimit(limit)}, a ordem continua valendo, com 10 pontos a menos.
      </p>
      <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
        {answer.length === 0
          ? 'Nenhuma tarefa na ordem ainda.'
          : answer.map((task, index) => `${index + 1}. ${task.label}`).join(' · ')}
      </p>
      {remaining.map((task) => (
        <ChoiceButton key={task.id} onClick={() => add(task)}>
          {task.label}
        </ChoiceButton>
      ))}
      <div className="flex flex-wrap gap-2">
        <button className="nexo-btn-ghost" type="button" onClick={undo} disabled={answer.length === 0}>
          Apagar a última
        </button>
        <button className="nexo-btn" type="button" onClick={conclude} disabled={answer.length !== level.length}>
          Concluir
        </button>
      </div>
    </GameFrame>
  )
}