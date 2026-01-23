import type { Profile } from '../types/measurements';

const STORAGE_KEY = 'patterngen.profiles.v1';

function safeParse(json: string | null): Profile[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed as Profile[];
  } catch {
    return [];
  }
}

export function loadProfiles(): Profile[] {
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

export function saveProfiles(profiles: Profile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
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
