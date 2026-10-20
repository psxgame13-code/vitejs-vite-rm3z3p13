import type { ActivitySlug } from '../../lib/constants';
import type { AttemptResult, DifficultyLevel } from '../../lib/types';

export type LevelPack<T> = Record<DifficultyLevel, T>;

export type IntruderRound = {
  cells: string[];
  intruderIndex: number;
};

export type DayTask = {
  id: string;
  label: string;
};

export type LaterChoice = {
  prompt: string;
  nowLabel: string;
  laterLabel: string;
};

export type RubricPoints = 0 | 50 | 70 | 100;

export type RubricOption = {
  id: string;
  label: string;
  points: RubricPoints;
};

export type RubricScene = {
  prompt: string;
  options: RubricOption[];
};

export type MessageCard = {
  text: string;
  isScam: boolean;
};

export type GameContent = {
  'find-intruder': LevelPack<IntruderRound[]>;
  'sequence-memory': LevelPack<string[]>;
  'organize-day': LevelPack<DayTask[]>;
  'now-or-later': LevelPack<LaterChoice[]>;
  'recess-conflict': LevelPack<RubricScene[]>;
  'other-viewpoint': LevelPack<RubricScene[]>;
  'scam-or-truth': LevelPack<MessageCard[]>;
  'share-or-not': LevelPack<RubricScene[]>;
};

export type GameProps<T> = {
  difficulty: DifficultyLevel;
  level: T;
  onFinish: (result: AttemptResult) => void;
};

export type ContentFor<TSlug extends ActivitySlug> = GameContent[TSlug];
