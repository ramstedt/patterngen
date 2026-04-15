import { useCallback, useEffect, useState } from 'react';
import type { Measurements, Profile } from '../types/measurements';
import { normalizeMeasurements } from '../lib/measurements';
import { useAuthStore } from '../stores/authStore';
import {
  loadProfiles as loadLocalProfiles,
  upsertProfile as upsertLocalProfile,
  deleteProfile as deleteLocalProfile,
  subscribeProfiles,
} from '../storage/profiles';
import {
  fetchMeasurementProfiles,
  createMeasurementProfile,
  updateMeasurementProfile,
  deleteMeasurementProfile,
  type MeasurementProfileData,
} from '../api/client';

// ── Converters ───────────────────────────────

function apiToProfile(data: MeasurementProfileData): Profile {
  return {
    id: data._id,
    name: data.name,
    profileType: data.profileType,
    measurements: normalizeMeasurements(
      data.measurements as Partial<Measurements>,
    ),
    createdAt: new Date(data.createdAt).getTime(),
    updatedAt: new Date(data.updatedAt).getTime(),
  };
}

function profileToApiData(
  profile: Profile,
): Pick<MeasurementProfileData, 'name' | 'profileType' | 'notes' | 'measurements'> {
  return {
    name: profile.name,
    profileType: profile.profileType,
    notes: undefined,
    measurements: profile.measurements,
  };
}

// ── Hook ─────────────────────────────────────

export function useProfiles() {
  const token = useAuthStore((s) => s.token);
  const accountUser = useAuthStore((s) => s.accountUser);
  const isLoggedIn = !!token && !!accountUser;

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (isLoggedIn) {
      try {
        const data = await fetchMeasurementProfiles();
        setProfiles(data.map(apiToProfile));
      } catch {
        setProfiles([]);
      }
    } else {
      setProfiles(loadLocalProfiles());
    }
    setLoading(false);
  }, [isLoggedIn]);

  useEffect(() => {
    load();
  }, [load]);

  // Subscribe to localStorage changes when not logged in
  useEffect(() => {
    if (isLoggedIn) return;
    return subscribeProfiles(() => setProfiles(loadLocalProfiles()));
  }, [isLoggedIn]);

  async function upsert(profile: Profile) {
    if (isLoggedIn) {
      const apiData = profileToApiData(profile);
      // Check if this is an update (profile has a DB id) or a create
      const existing = profiles.find((p) => p.id === profile.id);
      if (existing) {
        const updated = await updateMeasurementProfile(profile.id, apiData);
        const converted = apiToProfile(updated);
        setProfiles((prev) =>
          prev.map((p) => (p.id === profile.id ? converted : p)),
        );
        return converted;
      } else {
        const created = await createMeasurementProfile(apiData);
        const converted = apiToProfile(created);
        setProfiles((prev) => [converted, ...prev]);
        return converted;
      }
    } else {
      upsertLocalProfile(profile);
      setProfiles(loadLocalProfiles());
      return profile;
    }
  }

  async function remove(id: string) {
    if (isLoggedIn) {
      await deleteMeasurementProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    } else {
      deleteLocalProfile(id);
      setProfiles(loadLocalProfiles());
    }
  }

  return { profiles, loading, reload: load, upsert, remove };
}
