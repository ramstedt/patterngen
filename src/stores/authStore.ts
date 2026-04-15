import { create } from 'zustand';
import {
  getToken,
  setToken,
  clearToken,
  login as apiLogin,
  register as apiRegister,
  fetchMe,
  type AccountInfo,
} from '../api/client';
import { migrateLocalProfiles } from '../lib/migrateLocalProfiles';

interface AuthState {
  token: string | null;
  accountUser: AccountInfo | null;
  loading: boolean;

  /** Call once on app mount to restore session from localStorage. */
  init: () => Promise<void>;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, captchaToken: string, captchaAnswer: number) => Promise<void>;
  logout: () => void;

  /** Refresh account info from /me. */
  refreshAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getToken(),
  accountUser: null,
  loading: !!getToken(),

  async init() {
    const token = getToken();
    if (!token) {
      set({ loading: false });
      return;
    }

    try {
      const accountUser = await fetchMe();
      set({ token, accountUser, loading: false });
    } catch {
      // Token invalid / expired - clear it
      clearToken();
      set({ token: null, accountUser: null, loading: false });
    }
  },

  async login(email, password) {
    const res = await apiLogin(email, password);
    setToken(res.token);
    // Migrate localStorage profiles to DB (one-time, only if DB is empty)
    await migrateLocalProfiles().catch(() => {});
    const accountUser = await fetchMe();
    set({ token: res.token, accountUser });
  },

  async register(email, password, captchaToken, captchaAnswer) {
    const res = await apiRegister(email, password, captchaToken, captchaAnswer);
    setToken(res.token);
    await migrateLocalProfiles().catch(() => {});
    const accountUser = await fetchMe();
    set({ token: res.token, accountUser });
  },

  logout() {
    clearToken();
    set({ token: null, accountUser: null });
  },

  async refreshAccount() {
    if (!get().token) return;
    try {
      const accountUser = await fetchMe();
      set({ accountUser });
    } catch {
      // ignore
    }
  },
}));
