import { loadProfiles } from '../storage/profiles';
import {
  fetchMeasurementProfiles,
  importMeasurementProfiles,
} from '../api/client';

const STORAGE_KEY = 'patterngen.profiles.v1';

/**
 * One-time migration: move localStorage measurement profiles to the database.
 *
 * Runs only when:
 *  - The user has 0 profiles in the DB
 *  - There are profiles in localStorage
 *
 * After a successful import the localStorage profiles are cleared.
 */
export async function migrateLocalProfiles(): Promise<{
  imported: number;
  skipped: number;
} | null> {
  const localProfiles = loadProfiles();
  if (localProfiles.length === 0) return null;

  const dbProfiles = await fetchMeasurementProfiles();
  if (dbProfiles.length > 0) return null;

  const result = await importMeasurementProfiles(
    localProfiles.map((p) => ({
      name: p.name,
      profileType: p.profileType,
      measurements: p.measurements,
    })),
  );

  if (result.imported > 0) {
    localStorage.removeItem(STORAGE_KEY);
  }

  return result;
}
