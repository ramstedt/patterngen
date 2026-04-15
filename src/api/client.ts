const TOKEN_KEY = 'sewmetry.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? 'Request failed.');
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  status: number;
  constructor(
    status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ── Auth ─────────────────────────────────────

interface AuthResponse {
  token: string;
  accountUser: { id: string; email: string };
}

export interface CaptchaChallenge {
  question: string;
  token: string;
}

export function fetchCaptcha() {
  return request<CaptchaChallenge>('/api/auth/captcha');
}

export function register(
  email: string,
  password: string,
  captchaToken: string,
  captchaAnswer: number,
  website?: string,
) {
  return request<{ message: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, captchaToken, captchaAnswer, website }),
  });
}

export function login(email: string, password: string) {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function requestPasswordReset(email: string) {
  return request<{ message: string }>(
    '/api/auth/request-password-reset',
    { method: 'POST', body: JSON.stringify({ email }) },
  );
}

export function resetPassword(token: string, password: string) {
  return request<{ message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

// ── Account info ─────────────────────────────

export interface AccountInfo {
  id: string;
  email: string;
  loginCount: number;
  lastLoginAt: string | null;
  loginHistory: { timestamp: string; ip?: string; userAgent?: string }[];
  measurementProfileCount: number;
}

export function fetchMe() {
  return request<AccountInfo>('/api/me');
}

// ── Measurement profiles ─────────────────────

export interface MeasurementProfileData {
  _id: string;
  accountUserId: string;
  name: string;
  profileType: 'women' | 'men';
  notes?: string;
  measurements: Record<string, number | undefined>;
  createdAt: string;
  updatedAt: string;
}

export function fetchMeasurementProfiles() {
  return request<MeasurementProfileData[]>('/api/measurement-profiles');
}

export function createMeasurementProfile(
  data: Pick<MeasurementProfileData, 'name' | 'profileType' | 'notes' | 'measurements'>,
) {
  return request<MeasurementProfileData>('/api/measurement-profiles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateMeasurementProfile(
  id: string,
  data: Partial<Pick<MeasurementProfileData, 'name' | 'profileType' | 'notes' | 'measurements'>>,
) {
  return request<MeasurementProfileData>(
    `/api/measurement-profiles/${id}`,
    { method: 'PUT', body: JSON.stringify(data) },
  );
}

export function deleteMeasurementProfile(id: string) {
  return request<{ message: string }>(
    `/api/measurement-profiles/${id}`,
    { method: 'DELETE' },
  );
}

export function importMeasurementProfiles(
  profiles: Pick<MeasurementProfileData, 'name' | 'profileType' | 'notes' | 'measurements'>[],
) {
  return request<{ imported: number; skipped: number }>(
    '/api/measurement-profiles/import',
    { method: 'POST', body: JSON.stringify({ profiles }) },
  );
}
