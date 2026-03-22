import type { Profile } from '../../types/measurements';
import { straightSkirtPattern } from './straightSkirt';
import type {
  PatternCalculation,
  PatternDraft,
  PatternOption,
  Translate,
} from './types';

const patternRegistry = {
  straightSkirt: straightSkirtPattern,
} satisfies Record<string, { id: PatternOption }>;

export const PATTERN_OPTIONS = Object.keys(patternRegistry) as PatternOption[];

export type {
  PatternCalculation,
  PatternDraft,
  PatternOption,
  PatternSectionKey,
} from './types';

export function calculatePattern(
  pattern: PatternOption,
  profile: Profile,
  t: Translate,
): PatternCalculation[] {
  return patternRegistry[pattern].calculate(profile, t);
}

export function buildPatternDraft(
  pattern: PatternOption,
  profile: Profile,
  t: Translate,
): PatternDraft {
  return patternRegistry[pattern].buildDraft(profile, t);
}
