import { ACTIVITY_SLUGS, type ActivitySlug } from '../../lib/constants';
import type { AttemptResult, DifficultyLevel } from '../../lib/types';
import { GAME_CONTENT } from './content';
import { FindIntruder } from './FindIntruder';
import { NowOrLater } from './NowOrLater';
import { OrganizeDay } from './OrganizeDay';
import { OtherViewpoint } from './OtherViewpoint';
import { RecessConflict } from './RecessConflict';
import { ScamOrTruth } from './ScamOrTruth';
import { SequenceMemory } from './SequenceMemory';
import { ShareOrNot } from './ShareOrNot';

export function isActivitySlug(value: string): value is ActivitySlug {
  return (ACTIVITY_SLUGS as readonly string[]).includes(value);
}

export function GameEngine({
  slug,
  difficulty,
  onFinish,
}: {
  slug: ActivitySlug;
  difficulty: DifficultyLevel;
  onFinish: (result: AttemptResult) => void;
}) {
  if (slug === 'find-intruder') {
    return (
      <FindIntruder
        difficulty={difficulty}
        level={GAME_CONTENT[slug][difficulty]}
        onFinish={onFinish}
      />
    );
  }
  if (slug === 'sequence-memory') {
    return (
      <SequenceMemory
        difficulty={difficulty}
        level={GAME_CONTENT[slug][difficulty]}
        onFinish={onFinish}
      />
    );
  }
  if (slug === 'organize-day') {
    return (
      <OrganizeDay
        difficulty={difficulty}
        level={GAME_CONTENT[slug][difficulty]}
        onFinish={onFinish}
      />
    );
  }
  if (slug === 'now-or-later') {
    return (
      <NowOrLater
        difficulty={difficulty}
        level={GAME_CONTENT[slug][difficulty]}
        onFinish={onFinish}
      />
    );
  }
  if (slug === 'recess-conflict') {
    return (
      <RecessConflict
        difficulty={difficulty}
        level={GAME_CONTENT[slug][difficulty]}
        onFinish={onFinish}
      />
    );
  }
  if (slug === 'other-viewpoint') {
    return (
      <OtherViewpoint
        difficulty={difficulty}
        level={GAME_CONTENT[slug][difficulty]}
        onFinish={onFinish}
      />
    );
  }
  if (slug === 'scam-or-truth') {
    return (
      <ScamOrTruth
        difficulty={difficulty}
        level={GAME_CONTENT[slug][difficulty]}
        onFinish={onFinish}
      />
    );
  }
  return (
    <ShareOrNot
      difficulty={difficulty}
      level={GAME_CONTENT[slug][difficulty]}
      onFinish={onFinish}
    />
  );
}
