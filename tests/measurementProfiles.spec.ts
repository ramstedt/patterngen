import { test, expect, registerUser, authHeader } from './setup.js';

test.describe('Measurement profiles', () => {
  test('create measurement profile', async ({ api }) => {
    const { token } = await registerUser(api);

    const res = await api.post('/api/measurement-profiles', {
      headers: authHeader(token),
      data: {
        name: 'My Profile',
        profileType: 'women',
        measurements: { bustCircumference: 90, waistCircumference: 70 },
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('My Profile');
    expect(body.measurements.bustCircumference).toBe(90);
  });

  test('list measurement profiles', async ({ api }) => {
    const { token } = await registerUser(api);

    await api.post('/api/measurement-profiles', {
      headers: authHeader(token),
      data: { name: 'Profile A', profileType: 'women', measurements: {} },
    });
    await api.post('/api/measurement-profiles', {
      headers: authHeader(token),
      data: { name: 'Profile B', profileType: 'men', measurements: {} },
    });

    const res = await api.get('/api/measurement-profiles', {
      headers: authHeader(token),
    });

    expect(res.status()).toBe(200);
    const profiles = await res.json();
    expect(profiles.length).toBe(2);
  });

  test('edit measurement profile', async ({ api }) => {
    const { token } = await registerUser(api);

    const createRes = await api.post('/api/measurement-profiles', {
      headers: authHeader(token),
      data: { name: 'Original', profileType: 'women', measurements: {} },
    });
    const { _id } = await createRes.json();

    const updateRes = await api.put(`/api/measurement-profiles/${_id}`, {
      headers: authHeader(token),
      data: { name: 'Updated', notes: 'edited' },
    });

    expect(updateRes.status()).toBe(200);
    const updated = await updateRes.json();
    expect(updated.name).toBe('Updated');
    expect(updated.notes).toBe('edited');
  });

  test('delete measurement profile', async ({ api }) => {
    const { token } = await registerUser(api);

    const createRes = await api.post('/api/measurement-profiles', {
      headers: authHeader(token),
      data: { name: 'ToDelete', profileType: 'women', measurements: {} },
    });
    const { _id } = await createRes.json();

    const delRes = await api.delete(`/api/measurement-profiles/${_id}`, {
      headers: authHeader(token),
    });
    expect(delRes.status()).toBe(200);

    // Confirm it's gone
    const listRes = await api.get('/api/measurement-profiles', {
      headers: authHeader(token),
    });
    const profiles = await listRes.json();
    expect(profiles.find((p: { _id: string }) => p._id === _id)).toBeUndefined();
  });

  test('cannot create 11th measurement profile', async ({ api }) => {
    const { token } = await registerUser(api);

    // Create 10 profiles
    for (let i = 1; i <= 10; i++) {
      const res = await api.post('/api/measurement-profiles', {
        headers: authHeader(token),
        data: {
          name: `Profile ${i}`,
          profileType: 'women',
          measurements: {},
        },
      });
      expect(res.status()).toBe(201);
    }

    // 11th should fail
    const res = await api.post('/api/measurement-profiles', {
      headers: authHeader(token),
      data: {
        name: 'Profile 11',
        profileType: 'women',
        measurements: {},
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('at most 10');
  });

  test('cannot access another account user\'s measurement profiles', async ({
    api,
  }) => {
    // User A creates a profile
    const userA = await registerUser(api);
    const createRes = await api.post('/api/measurement-profiles', {
      headers: authHeader(userA.token),
      data: {
        name: 'A-Private',
        profileType: 'women',
        measurements: {},
      },
    });
    const { _id: profileId } = await createRes.json();

    // User B should not see it
    const userB = await registerUser(api);

    // List — should be empty for B
    const listRes = await api.get('/api/measurement-profiles', {
      headers: authHeader(userB.token),
    });
    const bProfiles = await listRes.json();
    expect(bProfiles.length).toBe(0);

    // Direct access — should 404
    const getRes = await api.put(`/api/measurement-profiles/${profileId}`, {
      headers: authHeader(userB.token),
      data: { name: 'hacked' },
    });
    expect(getRes.status()).toBe(404);

    // Delete — should 404
    const delRes = await api.delete(`/api/measurement-profiles/${profileId}`, {
      headers: authHeader(userB.token),
    });
    expect(delRes.status()).toBe(404);
  });

  test('unauthenticated request returns 401', async ({ api }) => {
    const res = await api.get('/api/measurement-profiles');
    expect(res.status()).toBe(401);
  });
});
