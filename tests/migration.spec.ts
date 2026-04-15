import { test, expect, registerUser, authHeader } from './setup.js';

test.describe('LocalStorage → DB migration', () => {
  test('import migrates localStorage profiles to DB', async ({ api }) => {
    const { token } = await registerUser(api);

    // Simulate what the frontend does: POST /import with localStorage profiles
    const localProfiles = [
      {
        name: 'Alice',
        profileType: 'women',
        measurements: { bustCircumference: 88, waistCircumference: 68 },
      },
      {
        name: 'Bob',
        profileType: 'men',
        measurements: { chestWidth: 40 },
      },
    ];

    const importRes = await api.post('/api/measurement-profiles/import', {
      headers: authHeader(token),
      data: { profiles: localProfiles },
    });

    expect(importRes.status()).toBe(200);
    const importBody = await importRes.json();
    expect(importBody.imported).toBe(2);
    expect(importBody.skipped).toBe(0);

    // Profiles should now be in DB
    const listRes = await api.get('/api/measurement-profiles', {
      headers: authHeader(token),
    });
    const dbProfiles = await listRes.json();
    expect(dbProfiles.length).toBe(2);

    const names = dbProfiles.map((p: { name: string }) => p.name).sort();
    expect(names).toEqual(['Alice', 'Bob']);
  });

  test('import skips when user already has DB profiles', async ({ api }) => {
    const { token } = await registerUser(api);

    // Create one profile in DB first
    await api.post('/api/measurement-profiles', {
      headers: authHeader(token),
      data: { name: 'Existing', profileType: 'women', measurements: {} },
    });

    // Now try to import
    const importRes = await api.post('/api/measurement-profiles/import', {
      headers: authHeader(token),
      data: {
        profiles: [
          { name: 'New', profileType: 'women', measurements: {} },
        ],
      },
    });

    const body = await importRes.json();
    expect(body.imported).toBe(0);
    expect(body.skipped).toBe(1);

    // DB should still have only the original profile
    const listRes = await api.get('/api/measurement-profiles', {
      headers: authHeader(token),
    });
    const dbProfiles = await listRes.json();
    expect(dbProfiles.length).toBe(1);
    expect(dbProfiles[0].name).toBe('Existing');
  });

  test('import respects max 10 profile limit', async ({ api }) => {
    const { token } = await registerUser(api);

    // Try to import 12 profiles - only 10 should be accepted
    const localProfiles = Array.from({ length: 12 }, (_, i) => ({
      name: `Profile ${i + 1}`,
      profileType: 'women' as const,
      measurements: {},
    }));

    const importRes = await api.post('/api/measurement-profiles/import', {
      headers: authHeader(token),
      data: { profiles: localProfiles },
    });

    const body = await importRes.json();
    expect(body.imported).toBe(10);
    expect(body.skipped).toBe(2);

    const listRes = await api.get('/api/measurement-profiles', {
      headers: authHeader(token),
    });
    const dbProfiles = await listRes.json();
    expect(dbProfiles.length).toBe(10);
  });

  test('import skips invalid entries (no name)', async ({ api }) => {
    const { token } = await registerUser(api);

    const importRes = await api.post('/api/measurement-profiles/import', {
      headers: authHeader(token),
      data: {
        profiles: [
          { name: 'Valid', profileType: 'women', measurements: {} },
          { profileType: 'women', measurements: {} }, // missing name
          42, // not an object
        ],
      },
    });

    const body = await importRes.json();
    expect(body.imported).toBe(1);
    expect(body.skipped).toBe(2);
  });

  test('import returns 400 if profiles is not an array', async ({ api }) => {
    const { token } = await registerUser(api);

    const res = await api.post('/api/measurement-profiles/import', {
      headers: authHeader(token),
      data: { profiles: 'not-an-array' },
    });

    expect(res.status()).toBe(400);
  });

  test('import requires authentication', async ({ api }) => {
    const res = await api.post('/api/measurement-profiles/import', {
      data: { profiles: [] },
    });

    expect(res.status()).toBe(401);
  });
});
