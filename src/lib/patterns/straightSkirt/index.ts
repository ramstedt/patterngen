import type { Profile } from '../../../types/measurements';
import { calculateStraightSkirt } from './calculations';
import { buildStraightSkirtDraft } from './draft';
import type {
  PatternCalculation,
  PatternDraft,
  PatternOption,
  Translate,
} from '../types';

export type PatternDefinition = {
  id: PatternOption;
  calculate: (profile: Profile, t: Translate) => PatternCalculation[];
  buildDraft: (profile: Profile, t: Translate) => PatternDraft;
};

export const straightSkirtPattern: PatternDefinition = {
  id: 'straightSkirt',
  calculate(profile, t) {
    return calculateStraightSkirt(profile, t);
  },
  buildDraft(profile, t) {
    const calculations = calculateStraightSkirt(profile, t);
    return buildStraightSkirtDraft(profile, t, calculations);
  },
};
