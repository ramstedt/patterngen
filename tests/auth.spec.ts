import { test, expect, uniqueEmail, registerUser } from './setup.js';

interface SentEmail {
  to: string;
  subject: string;
  text: string;
}

test.describe('Auth', () => {
  test.beforeEach(async ({ api }) => {
    await api.delete('/api/test/emails');
  });

  test('register success', async ({ api }) => {
    const email = uniqueEmail();
    const res = await api.post('/api/auth/register', {
      data: { email, password: 'TestPass123!' },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.message).toBeTruthy();
    // Should NOT return a token (no auto-login)
    expect(body.token).toBeUndefined();
  });

  test('register sends welcome email', async ({ api }) => {
    const email = uniqueEmail();
    await api.post('/api/auth/register', {
      data: { email, password: 'TestPass123!' },
    });

    // Wait briefly for fire-and-forget email to be logged
    await new Promise((r) => setTimeout(r, 200));

    const emails: SentEmail[] = await (await api.get('/api/test/emails')).json();
    const welcome = emails.find((e) => e.to === email.toLowerCase());
    expect(welcome).toBeDefined();
    expect(welcome!.subject).toContain('Welcome');
    expect(welcome!.text).toContain(email.toLowerCase());
    expect(welcome!.text).toContain('sewmetry.io');
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
    await api.delete('/api/test/emails');

    // 1. Request reset
    const reqRes = await api.post('/api/auth/request-password-reset', {
      data: { email },
    });
    expect(reqRes.status()).toBe(200);

    // Extract token from the logged email
    const emails: SentEmail[] = await (await api.get('/api/test/emails')).json();
    const resetEmail = emails.find(
      (e) => e.to === email.toLowerCase() && e.subject.includes('Password reset'),
    );
    expect(resetEmail).toBeDefined();
    const tokenMatch = resetEmail!.text.match(/Your reset token:\n(\S+)/);
    expect(tokenMatch).toBeTruthy();
    const resetToken = tokenMatch![1];

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

  test('password reset sends email with token', async ({ api }) => {
    const { email } = await registerUser(api);
    await api.delete('/api/test/emails');

    await api.post('/api/auth/request-password-reset', {
      data: { email },
    });

    const emails: SentEmail[] = await (await api.get('/api/test/emails')).json();
    const resetEmail = emails.find(
      (e) => e.to === email.toLowerCase() && e.subject.includes('Password reset'),
    );
    expect(resetEmail).toBeDefined();
    expect(resetEmail!.text).toContain('reset token');
  });

  test('reset with invalid token returns 400', async ({ api }) => {
    const res = await api.post('/api/auth/reset-password', {
      data: { token: 'bogus', password: 'NewSecure456!' },
    });
    expect(res.status()).toBe(400);
  });
});
