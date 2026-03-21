import type { Profile } from '../types/measurements';
import { normalizeMeasurements } from '../lib/measurements';

const STORAGE_KEY = 'patterngen.profiles.v1';
const PROFILES_UPDATED_EVENT = 'patterngen:profiles-updated';

type LegacyProfile = Omit<Profile, 'measurements'> & {
  measurements: Partial<Profile['measurements']> & {
    shoulderHeight?: number;
    shoulderHeightBackFront?: number;
  };
};

function normalizeProfile(profile: LegacyProfile): Profile {
  return {
    ...profile,
    measurements: normalizeMeasurements(profile.measurements),
  };
}

function safeParse(json: string | null): Profile[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((profile) => normalizeProfile(profile as LegacyProfile));
  } catch {
    return [];
  }
}

export function loadProfiles(): Profile[] {
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

export function saveProfiles(profiles: Profile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  window.dispatchEvent(new Event(PROFILES_UPDATED_EVENT));
}

export function upsertProfile(profile: Profile) {
  const profiles = loadProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) profiles[idx] = profile;
  else profiles.unshift(profile);
  saveProfiles(profiles);
}

export function deleteProfile(id: string) {
  const profiles = loadProfiles().filter((p) => p.id !== id);
  saveProfiles(profiles);
}

export function subscribeProfiles(listener: () => void) {
  window.addEventListener(PROFILES_UPDATED_EVENT, listener);
  window.addEventListener('storage', listener);

  return () => {
    window.removeEventListener(PROFILES_UPDATED_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}
