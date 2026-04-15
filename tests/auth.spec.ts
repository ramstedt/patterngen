import { test, expect, uniqueEmail, registerUser } from './setup.js';

test.describe('Auth', () => {
  test('register success', async ({ api }) => {
    const email = uniqueEmail();
    const res = await api.post('/api/auth/register', {
      data: { email, password: 'TestPass123!' },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.accountUser.email).toBe(email.toLowerCase());
  });

  test('register duplicate email returns 409', async ({ api }) => {
    const email = uniqueEmail();
    await api.post('/api/auth/register', {
      data: { email, password: 'TestPass123!' },
    });

    const res = await api.post('/api/auth/register', {
      data: { email, password: 'TestPass123!' },
    });

    expect(res.status()).toBe(409);
  });

  test('login success', async ({ api }) => {
    const { email, password } = await registerUser(api);

    const res = await api.post('/api/auth/login', {
      data: { email, password },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.accountUser.email).toBe(email.toLowerCase());
  });

  test('login with wrong password returns 401', async ({ api }) => {
    const { email } = await registerUser(api);

    const res = await api.post('/api/auth/login', {
      data: { email, password: 'WrongPassword!' },
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Invalid email or password.');
  });

  test('login with nonexistent email returns 401', async ({ api }) => {
    const res = await api.post('/api/auth/login', {
      data: { email: 'nobody@example.com', password: 'TestPass123!' },
    });

    expect(res.status()).toBe(401);
  });

  test('password reset flow', async ({ api }) => {
    const { email } = await registerUser(api);

    // 1. Request reset
    const reqRes = await api.post('/api/auth/request-password-reset', {
      data: { email },
    });
    expect(reqRes.status()).toBe(200);
    const { resetToken } = await reqRes.json();
    expect(resetToken).toBeTruthy();

    // 2. Reset password
    const newPassword = 'NewSecure456!';
    const resetRes = await api.post('/api/auth/reset-password', {
      data: { token: resetToken, password: newPassword },
    });
    expect(resetRes.status()).toBe(200);

    // 3. Old password no longer works
    const oldLoginRes = await api.post('/api/auth/login', {
      data: { email, password: 'TestPass123!' },
    });
    expect(oldLoginRes.status()).toBe(401);

    // 4. New password works
    const newLoginRes = await api.post('/api/auth/login', {
      data: { email, password: newPassword },
    });
    expect(newLoginRes.status()).toBe(200);
  });

  test('reset with invalid token returns 400', async ({ api }) => {
    const res = await api.post('/api/auth/reset-password', {
      data: { token: 'bogus', password: 'NewSecure456!' },
    });
    expect(res.status()).toBe(400);
  });
});
