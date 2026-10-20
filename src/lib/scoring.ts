import { LEVELS, MIN_ATTEMPTS_FOR_SCORE, THERMOMETER_BANDS } from './constants'
import type { AttemptResult, DifficultyLevel } from './types'

const MAX_DURATION_MS = 1_800_000

export const FIND_INTRUDER_LEVELS: Record<
  DifficultyLevel,
  { rounds: number; cells: number; timeCutMs: number | null; slowPoints: number }
> = {
  1: { rounds: 3, cells: 4, timeCutMs: null, slowPoints: 1 },
  2: { rounds: 3, cells: 6, timeCutMs: 12_000, slowPoints: 0.5 },
  3: { rounds: 3, cells: 9, timeCutMs: 8_000, slowPoints: 0.5 },
}

export const SEQUENCE_LENGTH: Record<DifficultyLevel, number> = {
  1: 3,
  2: 4,
  3: 5,
}

export const ORGANIZE_DAY_LEVELS: Record<
  DifficultyLevel,
  { tasks: number; limitMs: number; penalty: number }
> = {
  1: { tasks: 4, limitMs: 90_000, penalty: 10 },
  2: { tasks: 5, limitMs: 75_000, penalty: 10 },
  3: { tasks: 5, limitMs: 60_000, penalty: 10 },
}

export const NOW_OR_LATER_CHOICES = 3
export const RUBRIC_SCENES = 2
export const SCAM_MESSAGES = 4
export const SHARE_ITEMS = 3

function cleanDuration(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.min(MAX_DURATION_MS, Math.round(value))
}

function roundScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function orderedHits(expected: string[], answer: string[]): number {
  return expected.filter((item, index) => answer[index] === item).length
}

function bandFeedback(score: number, strong: string, middle: string, again: string): string {
  if (score >= 70) return strong
  if (score >= 40) return middle
  return again
}

export function levelFromXp(xp: number) {
  const safe = Math.max(0, Math.floor(xp))
  let current = LEVELS[0]
  for (const step of LEVELS) {
    if (safe >= step.min) current = step
  }
  const next = LEVELS.find((step) => step.min > current.min) ?? null
  const span = next ? next.min - current.min : 1
  const progress = next ? Math.min(1, (safe - current.min) / span) : 1
  return {
    level: current.level,
    xp: safe,
    nextXp: next?.min ?? null,
    progress,
  }
}

export function thermometerFor(score: number) {
  return (
    THERMOMETER_BANDS.find((band) => score >= band.min && score <= band.max) ??
    THERMOMETER_BANDS[0]
  )
}

export function meanOfAttempts(scores: number[]): number | null {
  if (scores.length < MIN_ATTEMPTS_FOR_SCORE) return null
  const total = scores.reduce((sum, score) => sum + score, 0)
  return roundScore(total / scores.length)
}

export function findIntruderScore(input: {
  difficulty: DifficultyLevel
  rounds: { correct: boolean; elapsedMs: number }[]
}): AttemptResult {
  const level = FIND_INTRUDER_LEVELS[input.difficulty]
  const played = input.rounds.slice(0, level.rounds)
  const points = Array.from({ length: level.rounds }, (_, index) => {
    const round = played[index]
    if (!round?.correct) return 0
    if (level.timeCutMs != null && round.elapsedMs > level.timeCutMs) return level.slowPoints
    return 1
  })
  const sum = points.reduce((total, point) => total + point, 0)
  const score = roundScore((100 * sum) / level.rounds)
  return {
    difficulty: input.difficulty,
    score,
    hits: points.filter((point) => point === 1).length,
    rounds: level.rounds,
    duration_ms: cleanDuration(played.reduce((total, round) => total + round.elapsedMs, 0)),
    feedback: bandFeedback(
      score,
      'Você separou o intruso com atenção. Dá para seguir para um desafio um pouco maior.',
      'Você achou parte dos intrusos. Na próxima, olhe a fileira inteira antes de escolher.',
      'Ainda não fechou as três rodadas. Vale tentar de novo, com calma, sem pressa.',
    ),
    detail: { points, cells: level.cells, time_cut_ms: level.timeCutMs },
  }
}

export function sequenceMemoryScore(input: {
  difficulty: DifficultyLevel
  expected: string[]
  answer: string[]
  durationMs: number
}): AttemptResult {
  const length = SEQUENCE_LENGTH[input.difficulty]
  const expected = input.expected.slice(0, length)
  const hits = orderedHits(expected, input.answer)
  const score = roundScore((100 * hits) / length)
  return {
    difficulty: input.difficulty,
    score,
    hits,
    rounds: length,
    duration_ms: cleanDuration(input.durationMs),
    feedback: bandFeedback(
      score,
      'A ordem ficou com você. Memória de trabalho rende quando a sequência é repetida com calma.',
      'Parte da ordem ficou certa. Tente nomear cada item em voz baixa antes de responder.',
      'A sequência escapou desta vez. Ver de novo, sem pressa, já é prática.',
    ),
    detail: { length, hits },
  }
}

export function organizeDayScore(input: {
  difficulty: DifficultyLevel
  expectedIds: string[]
  answerIds: string[]
  durationMs: number
}): AttemptResult {
  const level = ORGANIZE_DAY_LEVELS[input.difficulty]
  const expected = input.expectedIds.slice(0, level.tasks)
  const hits = orderedHits(expected, input.answerIds)
  const positionScore = roundScore((100 * hits) / expected.length)
  const overtime = input.durationMs > level.limitMs
  const score = overtime ? Math.max(0, positionScore - level.penalty) : positionScore
  return {
    difficulty: input.difficulty,
    score,
    hits,
    rounds: expected.length,
    duration_ms: cleanDuration(input.durationMs),
    feedback: overtime
      ? 'A ordem entrou na conta, com 10 pontos a menos porque o tempo acabou. Planejar começa por escolher o primeiro passo.'
      : bandFeedback(
          score,
          'O dia ficou em ordem. Isso é planejamento, não velocidade.',
          'Algumas tarefas já estão no lugar. Confira o que precisa acontecer antes.',
          'A ordem ainda não fechou. Escolha primeiro o que destrava o resto do dia.',
        ),
    detail: { hits, overtime, limit_ms: level.limitMs, penalty: overtime ? level.penalty : 0 },
  }
}

export function nowOrLaterScore(input: {
  difficulty: DifficultyLevel
  choices: Array<'now' | 'later'>
  durationMs: number
}): AttemptResult {
  const played = input.choices.slice(0, NOW_OR_LATER_CHOICES)
  const later = played.filter((choice) => choice === 'later').length
  const score = roundScore((100 * later) / NOW_OR_LATER_CHOICES)
  return {
    difficulty: input.difficulty,
    score,
    hits: later,
    rounds: NOW_OR_LATER_CHOICES,
    duration_ms: cleanDuration(input.durationMs),
    feedback:
      later === NOW_OR_LATER_CHOICES
        ? 'Você segurou o agora para ficar com o plano maior. Esperar também é uma escolha.'
        : 'Escolher o agora acontece. O critério desta missão é o plano: a opção depois vale mais quando a espera é combinada.',
    detail: { later, choices: played },
  }
}

function rubricResult(
  difficulty: DifficultyLevel,
  chosenPoints: number[],
  expectedCount: number,
  durationMs: number,
  feedback: { strong: string; middle: string; again: string },
): AttemptResult {
  const points = Array.from({ length: expectedCount }, (_, index) => {
    const value = chosenPoints[index]
    if (!Number.isFinite(value)) return 0
    return Math.max(0, Math.min(100, value))
  })
  const score = roundScore(points.reduce((total, point) => total + point, 0) / expectedCount)
  return {
    difficulty,
    score,
    hits: points.filter((point) => point === 100).length,
    rounds: expectedCount,
    duration_ms: cleanDuration(durationMs),
    feedback: bandFeedback(score, feedback.strong, feedback.middle, feedback.again),
    detail: { points },
  }
}

export function recessConflictScore(input: {
  difficulty: DifficultyLevel
  chosenPoints: number[]
  durationMs: number
}): AttemptResult {
  return rubricResult(input.difficulty, input.chosenPoints, RUBRIC_SCENES, input.durationMs, {
    strong: 'Você buscou um caminho sem humilhar. Não existe emoção certa: o critério é cuidar da convivência.',
    middle: 'Você evitou o pior. Ainda dá para cuidar da situação sem aumentar o conflito.',
    again: 'Dá para tentar de novo sem agredir nem excluir. O critério é não aumentar o conflito.',
  })
}

export function otherViewpointScore(input: {
  difficulty: DifficultyLevel
  chosenPoints: number[]
  durationMs: number
}): AttemptResult {
  return rubricResult(input.difficulty, input.chosenPoints, RUBRIC_SCENES, input.durationMs, {
    strong: 'Você nomeou o que a outra pessoa pode estar vendo antes de reagir. Isso é perspectiva, não diagnóstico.',
    middle: 'A resposta foi respeitosa. O próximo passo é dizer também o lado da outra pessoa.',
    again: 'Zombar ou desqualificar não entra neste critério. Dá para recomeçar reconhecendo o outro lado.',
  })
}

export function scamOrTruthScore(input: {
  difficulty: DifficultyLevel
  correct: boolean[]
  durationMs: number
}): AttemptResult {
  const answers = Array.from({ length: SCAM_MESSAGES }, (_, index) => input.correct[index] === true)
  const hits = answers.filter(Boolean).length
  const score = roundScore((100 * hits) / SCAM_MESSAGES)
  return {
    difficulty: input.difficulty,
    score,
    hits,
    rounds: SCAM_MESSAGES,
    duration_ms: cleanDuration(input.durationMs),
    feedback: bandFeedback(
      score,
      'Você separou golpe de recado com cuidado. O tempo não muda a nota: ler devagar ajuda.',
      'Parte das mensagens ficou certa. Procure pressa, prêmio e pedido de senha.',
      'O sinal ainda passou. Antes de acreditar, olhe o link, a pressa e quem está pedindo um dado.',
    ),
    detail: { hits },
  }
}

export function shareOrNotScore(input: {
  difficulty: DifficultyLevel
  chosenPoints: number[]
  durationMs: number
}): AttemptResult {
  return rubricResult(input.difficulty, input.chosenPoints, SHARE_ITEMS, input.durationMs, {
    strong: 'Você checou antes de espalhar. Compartilhar sem critério vale zero nesta missão.',
    middle: 'Parte das escolhas segurou a notícia. Quando o item pede verificação, checar a fonte vale mais.',
    again: 'Espalhar sem olhar a fonte não pontua. O próximo passo é checar antes de compartilhar.',
  })
}