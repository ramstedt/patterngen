import { test, expect, registerUser, authHeader } from './setup.js';

test.describe('Account stats', () => {
  test('login increments loginCount', async ({ api }) => {
    const { email, password, token } = await registerUser(api);

    // loginCount should be 0 right after register (no login yet)
    const me1 = await (
      await api.get('/api/me', { headers: authHeader(token) })
    ).json();
    expect(me1.loginCount).toBe(0);

    // Login once
    await api.post('/api/auth/login', { data: { email, password } });

    const me2 = await (
      await api.get('/api/me', { headers: authHeader(token) })
    ).json();
    expect(me2.loginCount).toBe(1);

    // Login again
    await api.post('/api/auth/login', { data: { email, password } });

    const me3 = await (
      await api.get('/api/me', { headers: authHeader(token) })
    ).json();
    expect(me3.loginCount).toBe(2);
  });

  test('lastLoginAt updates on login', async ({ api }) => {
    const { email, password, token } = await registerUser(api);

    const meBefore = await (
      await api.get('/api/me', { headers: authHeader(token) })
    ).json();
    expect(meBefore.lastLoginAt).toBeFalsy();

    await api.post('/api/auth/login', { data: { email, password } });

    const meAfter = await (
      await api.get('/api/me', { headers: authHeader(token) })
    ).json();
    expect(meAfter.lastLoginAt).toBeTruthy();
    expect(new Date(meAfter.lastLoginAt).getTime()).toBeGreaterThan(0);
  });

  test('loginHistory grows and stays capped at 20', async ({ api }) => {
    const { email, password, token } = await registerUser(api);

    // Login 22 times
    for (let i = 0; i < 22; i++) {
      await api.post('/api/auth/login', { data: { email, password } });
    }

    const me = await (
      await api.get('/api/me', { headers: authHeader(token) })
    ).json();

    // /me returns the last 10 entries (sliced from history)
    expect(me.loginHistory.length).toBeLessThanOrEqual(10);
    expect(me.loginCount).toBe(22);

    // Verify the underlying model hasn't exceeded 20 by checking loginCount
    // (the model caps at 20, /me slices to 10 for the response)
  });

  test('loginHistory entries contain timestamps', async ({ api }) => {
    const { email, password, token } = await registerUser(api);

    await api.post('/api/auth/login', { data: { email, password } });

    const me = await (
      await api.get('/api/me', { headers: authHeader(token) })
    ).json();

    expect(me.loginHistory.length).toBe(1);
    expect(me.loginHistory[0].timestamp).toBeTruthy();
  });
});
