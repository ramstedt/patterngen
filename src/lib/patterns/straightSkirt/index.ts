import { calculateStraightSkirt } from './calculations';
import { buildStraightSkirtDraft } from './draft';
import type {
  PatternDefinition,
} from '../types';

export const straightSkirtPattern: PatternDefinition = {
  id: 'straightSkirt',
  category: 'skirts',
  supportedProfileTypes: ['women'],
  requiredMeasurements: [
    'waistCircumference',
    'highHipCircumference',
    'hipCircumference',
    'hipHeight',
    'hipDepth',
    'kneeHeight',
  ],
  calculate(profile, t) {
    return calculateStraightSkirt(profile, t);
  },
  buildDraft(profile, t) {
    const calculations = calculateStraightSkirt(profile, t);
    return buildStraightSkirtDraft(profile, t, calculations);
  },
};
