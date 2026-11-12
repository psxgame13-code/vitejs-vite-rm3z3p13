import { PILLARS, type ActivitySlug } from '../../lib/constants'
import type { DifficultyLevel, PillarKey } from '../../lib/types'
import { GAME_CONTENT } from '../games/content'

const PILLAR_OF: Record<ActivitySlug, PillarKey> = {
  'find-intruder': 'focus',
  'sequence-memory': 'focus',
  'organize-day': 'self_regulation',
  'now-or-later': 'self_regulation',
  'recess-conflict': 'emotional_intelligence',
  'other-viewpoint': 'emotional_intelligence',
  'scam-or-truth': 'digital_culture',
  'share-or-not': 'digital_culture',
}

const SLUG_ORDER: ActivitySlug[] = [
  'find-intruder',
  'sequence-memory',
  'organize-day',
  'now-or-later',
  'recess-conflict',
  'other-viewpoint',
  'scam-or-truth',
  'share-or-not',
]

export const QUESTIONS_PER_PILLAR = 5
export const LOCK_DAYS = 5

export type StudentQuestion = {
  id: string
  slug: ActivitySlug
  pillar: PillarKey
  difficulty: DifficultyLevel
  index: number | null
  title: string
}

function clip(value: string): string {
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length > 90 ? `${text.slice(0, 87)}...` : text
}

function titlesFor(slug: ActivitySlug, level: DifficultyLevel): string[] {
  if (slug === 'sequence-memory') return [`Repetir a sequência do nível ${level}`]
  if (slug === 'organize-day') return [`Organizar o dia, nível ${level}`]
  if (slug === 'find-intruder') {
    return GAME_CONTENT[slug][level].map((item) => clip(`Qual não combina: ${item.cells.slice(0, 3).join(', ')}`))
  }
  if (slug === 'scam-or-truth') return GAME_CONTENT[slug][level].map((item) => clip(item.text))
  if (slug === 'now-or-later') return GAME_CONTENT[slug][level].map((item) => clip(item.prompt))
  return GAME_CONTENT[slug][level].map((item) => clip(item.prompt))
}

export function allQuestions(): StudentQuestion[] {
  const questions: StudentQuestion[] = []
  for (const slug of SLUG_ORDER) {
    for (const difficulty of [1, 2, 3] as DifficultyLevel[]) {
      const titles = titlesFor(slug, difficulty)
      const wholeLevel = slug === 'sequence-memory' || slug === 'organize-day'
      titles.forEach((title, index) => {
        questions.push({
          id: wholeLevel ? `${slug}-${difficulty}` : `${slug}-${difficulty}-${index}`,
          slug,
          pillar: PILLAR_OF[slug],
          difficulty,
          index: wholeLevel ? null : index,
          title,
        })
      })
    }
  }
  return questions
}

export function questionById(id: string): StudentQuestion | null {
  return allQuestions().find((question) => question.id === id) ?? null
}

export type WaveState =
  | { status: 'open'; wave: number; questions: StudentQuestion[] }
  | { status: 'locked'; wave: number; lockedUntil: number }
  | { status: 'done' }

export function currentWave(answeredAt: Map<string, number>, now = Date.now()): WaveState {
  const questions = allQuestions()
  const byPillar = new Map<PillarKey, StudentQuestion[]>()
  for (const question of questions) {
    const list = byPillar.get(question.pillar) ?? []
    list.push(question)
    byPillar.set(question.pillar, list)
  }

  for (let wave = 0; wave < 50; wave += 1) {
    const batch: StudentQuestion[] = []
    for (const pillar of PILLARS) {
      const list = byPillar.get(pillar.key) ?? []
      batch.push(...list.slice(wave * QUESTIONS_PER_PILLAR, wave * QUESTIONS_PER_PILLAR + QUESTIONS_PER_PILLAR))
    }
    if (batch.length === 0) return { status: 'done' }
    const pending = batch.filter((question) => !answeredAt.has(question.id))
    if (pending.length > 0) return { status: 'open', wave, questions: pending }
    const finishedAt = Math.max(...batch.map((question) => answeredAt.get(question.id) ?? 0))
    const lockedUntil = finishedAt + LOCK_DAYS * 24 * 60 * 60 * 1000
    if (now < lockedUntil) return { status: 'locked', wave, lockedUntil }
  }
  return { status: 'done' }
}