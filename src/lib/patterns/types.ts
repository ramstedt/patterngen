import type { TranslationKey } from '../../../i18n/translations';
import type { Measurements, Profile, ProfileType } from '../../types/measurements';

export type PatternOption = 'straightSkirt' | 'bodiceWithoutDarts';
export type PatternCategory = 'skirts' | 'bodices';

export type PatternSectionKey =
  | 'basicMeasurements'
  | 'controlMeasurements'
  | 'fixedMeasurements'
  | 'dartPlacement'
  | 'dartWidth'
  | 'sideLine';

export type PatternCalculation = {
  id: string;
  label: string;
  value: number;
  description?: string;
  explanation?: string;
  section?: PatternSectionKey;
};

export type DraftPoint = {
  id: string;
  x: number;
  y: number;
};

export type DraftMarker = {
  id: string;
  pointId: string;
  radius: number;
  fill: string;
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

export type DraftRenderable = {
  width: number;
  height: number;
  points: DraftPoint[];
  markers?: DraftMarker[];
  lines: DraftLine[];
  paths: DraftPath[];
  labels: DraftLabel[];
  highlightPathIds?: string[];
  baseOpacity?: number;
};

export type DraftNote = {
  id: string;
  text: string;
  severity?: 'info' | 'warning';
};

export type PatternDraft = DraftRenderable & {
  units: 'mm';
  notes?: DraftNote[];
};

export type PatternFirstPageInstructions = {
  title?: string;
  items?: string[];
  leftMm?: number;
  topMm?: number;
  widthMm?: number;
  lineHeightMm?: number;
};

export type PatternPrintConfig = {
  enabled: boolean;
  calibrationSquareMm?: number;
  calibrationLabel?: string;
  pageMarginMm?: number;
  pageOverlapMm?: number;
  patternPaddingXMm?: number;
  patternPaddingBottomMm?: number;
  firstPageTopReservedMm?: number;
  calibrationSquareTopMm?: number;
  calibrationSquareLeftMm?: number;
  firstPageInstructions?: PatternFirstPageInstructions;
};

export type Translate = (key: TranslationKey) => string;
export type PatternSettings = {
  movementEase?: number;
};

export type PatternDefinition = {
  id: PatternOption;
  category: PatternCategory;
  supportedProfileTypes: ProfileType[];
  requiredMeasurements: (keyof Measurements)[];
  printConfig?: PatternPrintConfig;
  buildPrintConfig?: (profile: Profile, t: Translate) => PatternPrintConfig;
  calculate: (
    profile: Profile,
    t: Translate,
    settings?: PatternSettings,
  ) => PatternCalculation[];
  buildDraft: (
    profile: Profile,
    t: Translate,
    settings?: PatternSettings,
  ) => PatternDraft;
};
