import type { TranslationKey } from '../../../i18n/translations';

export type PatternOption = 'straightSkirt';

export type PatternSectionKey =
  | 'basicMeasurements'
  | 'dartPlacement'
  | 'dartWidth'
  | 'sideLine';

export type PatternCalculation = {
  id: string;
  label: string;
  value: number;
  description: string;
  section?: PatternSectionKey;
};

export type DraftPoint = {
  id: string;
  x: number;
  y: number;
};

export type DraftLine = {
  id: string;
  from: string;
  to: string;
  kind?: 'outline' | 'construction' | 'hidden' | 'grainline';
};

export type DraftLabel = {
  id: string;
  text: string;
  x: number;
  y: number;
  rotate?: number;
};

export type DraftPath = {
  id: string;
  d: string;
  kind?: 'outline' | 'construction' | 'hidden' | 'grainline';
};

export type PatternDraft = {
  units: 'mm';
  width: number;
  height: number;
  points: DraftPoint[];
  lines: DraftLine[];
  paths: DraftPath[];
  labels: DraftLabel[];
};

export type Translate = (key: TranslationKey) => string;
