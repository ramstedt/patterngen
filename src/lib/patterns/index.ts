import type { Profile } from '../../types/measurements';
import { bodiceWithoutDartsPattern } from './bodiceWithoutDarts';
import { straightSkirtPattern } from './straightSkirt';
import type {
  PatternCalculation,
  PatternCategory,
  PatternDefinition,
  PatternDraft,
  PatternOption,
  PatternPrintConfig,
  PatternSettings,
  Translate,
} from './types';

const patternRegistry = {
  bodiceWithoutDarts: bodiceWithoutDartsPattern,
  straightSkirt: straightSkirtPattern,
} satisfies Record<string, PatternDefinition>;

export const PATTERN_OPTIONS: PatternOption[] = [
  'straightSkirt',
  'bodiceWithoutDarts',
];
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
  PatternPrintConfig,
  PatternSettings,
  PatternSectionKey,
} from './types';

export function calculatePattern(
  pattern: PatternOption,
  profile: Profile,
  t: Translate,
  settings?: PatternSettings,
): PatternCalculation[] {
  return patternRegistry[pattern].calculate(profile, t, settings);
}

export function buildPatternDraft(
  pattern: PatternOption,
  profile: Profile,
  t: Translate,
  settings?: PatternSettings,
): PatternDraft {
  return patternRegistry[pattern].buildDraft(profile, t, settings);
}

export function getPatternDefinition(pattern: PatternOption): PatternDefinition {
  return patternRegistry[pattern];
}

export function getPatternPrintConfig(
  pattern: PatternOption,
  profile?: Profile,
  t?: Translate,
): PatternPrintConfig | undefined {
  const definition = patternRegistry[pattern];

  if (definition.buildPrintConfig && profile && t) {
    return definition.buildPrintConfig(profile, t);
  }

  return definition.printConfig;
}
