import type { Profile } from '../../types/measurements';
import { bodiceWithoutDartsPattern } from './bodiceWithoutDarts';
import { straightSkirtPattern } from './straightSkirt';
import type {
  PatternCalculation,
  PatternCategory,
  PatternDefinition,
  PatternDraft,
  PatternOption,
  Translate,
} from './types';

const patternRegistry = {
  bodiceWithoutDarts: bodiceWithoutDartsPattern,
  straightSkirt: straightSkirtPattern,
} satisfies Record<string, PatternDefinition>;

export const PATTERN_OPTIONS = Object.keys(patternRegistry) as PatternOption[];
export const PATTERN_CATEGORIES: {
  category: PatternCategory;
  patterns: PatternOption[];
}[] = [
  { category: 'bodices', patterns: ['bodiceWithoutDarts'] },
  { category: 'skirts', patterns: ['straightSkirt'] },
];

export type {
  PatternCalculation,
  PatternCategory,
  PatternDefinition,
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

export function getPatternDefinition(pattern: PatternOption): PatternDefinition {
  return patternRegistry[pattern];
}
