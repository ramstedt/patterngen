/**
 * Shared test fixtures and helpers for API tests.
 *
 * The server is started once via globalSetup.ts.
 * TEST_BASE_URL is set in the environment by globalSetup.
 */
import { test as base, type APIRequestContext } from '@playwright/test';

/** Expose the dynamic base URL and an API context to every test. */
export const test = base.extend<{ api: APIRequestContext; url: string }>({
  url: async ({}, use) => {
    await use(process.env.TEST_BASE_URL!);
  },
  api: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.TEST_BASE_URL!,
    });
    await use(ctx);
    await ctx.dispose();
  },
});

export { expect } from '@playwright/test';

// ── Helpers ──────────────────────────────────

let counter = 0;

/** Generate a unique email for test isolation. */
export function uniqueEmail() {
  return `test_${Date.now()}_${++counter}@example.com`;
}

/** Register + return { token, email, password }. */
export async function registerUser(
  api: APIRequestContext,
  email?: string,
  password = 'TestPass123!',
) {
  const e = email ?? uniqueEmail();
  const res = await api.post('/api/auth/register', {
    data: { email: e, password },
  });
  const body = await res.json();
  return { token: body.token as string, email: e, password };
}

/** Convenience: auth header object. */
export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
