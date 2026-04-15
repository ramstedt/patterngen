import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useI18n } from '../../../i18n/useI18n';
import { useAuthStore } from '../../stores/authStore';
import {
  requestPasswordReset,
  resetPassword,
  fetchCaptcha,
  ApiError,
} from '../../api/client';

type AuthView = 'login' | 'register' | 'forgot' | 'reset';

function useServerCaptcha() {
  const [question, setQuestion] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCaptcha();
      setQuestion(data.question);
      setToken(data.token);
    } catch {
      setQuestion('');
      setToken('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { question, token, loading, refresh: load };
}

export function AuthPage({ initialView = 'login' }: { initialView?: AuthView }) {
  const [view, setView] = useState<AuthView>(initialView);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const navigate = useNavigate();

  return (
    <Box>
      {view === 'login' && (
        <LoginForm
          error={error}
          setError={setError}
          onForgot={() => {
            setError('');
            setView('forgot');
          }}
          onSwitchToRegister={() => {
            setError('');
            navigate('/register');
          }}
        />
      )}
      {view === 'register' && (
        <RegisterForm
          error={error}
          setError={setError}
          onSwitchToLogin={() => {
            setError('');
            navigate('/login');
          }}
          onRegistered={() => {
            setError('');
            setInfo(t('authRegistrationSuccess'));
            navigate('/login');
          }}
        />
      )}
      {view === 'forgot' && (
        <ForgotPasswordForm
          error={error}
          info={info}
          setError={setError}
          setInfo={setInfo}
          onBack={() => {
            setError('');
            setInfo('');
            setView('login');
          }}
          onTokenReceived={() => {
            setError('');
            setInfo('');
            setView('reset');
          }}
        />
      )}
      {view === 'reset' && (
        <ResetPasswordForm
          error={error}
          info={info}
          setError={setError}
          setInfo={setInfo}
          onBack={() => {
            setError('');
            setInfo('');
            setView('login');
          }}
        />
      )}
    </Box>
  );
}

// ── Login ────────────────────────────────────

function LoginForm({
  error,
  setError,
  onForgot,
  onSwitchToRegister,
}: {
  error: string;
  setError: (e: string) => void;
  onForgot: () => void;
  onSwitchToRegister: () => void;
}) {
  const { t } = useI18n();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const data = new FormData(e.currentTarget);
    try {
      await login(data.get('email') as string, data.get('password') as string);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('authLoginFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack spacing={2}>
        <TextField name="email" label={t('authEmail')} type="email" required autoFocus />
        <TextField name="password" label={t('authPassword')} type="password" required />
        <Button type="submit" variant="contained" disabled={loading}>
          {loading ? t('authLoggingIn') : t('authLogIn')}
        </Button>
        <Button size="small" onClick={onForgot}>
          {t('authForgotPassword')}
        </Button>
        <Button size="small" onClick={onSwitchToRegister}>
          {t('authCreateAccount')}
        </Button>
      </Stack>
    </form>
  );
}

// ── Register ─────────────────────────────────

function RegisterForm({
  error,
  setError,
  onSwitchToLogin,
  onRegistered,
}: {
  error: string;
  setError: (e: string) => void;
  onSwitchToLogin: () => void;
  onRegistered: () => void;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const captcha = useServerCaptcha();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const data = new FormData(e.currentTarget);
    const password = data.get('password') as string;
    const confirmPassword = data.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError(t('authPasswordMismatch'));
      return;
    }

    const captchaAnswer = Number(data.get('captcha'));
    if (Number.isNaN(captchaAnswer)) {
      setError(t('authCaptchaFailed'));
      captcha.refresh();
      return;
    }

    setLoading(true);
    try {
      await register(
        data.get('email') as string,
        password,
        captcha.token,
        captchaAnswer,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('authRegistrationFailed'));
      captcha.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack spacing={2}>
        <TextField name="email" label={t('authEmail')} type="email" required autoFocus />
        <TextField
          name="password"
          label={t('authPassword')}
          type="password"
          required
          inputProps={{ minLength: 8 }}
          helperText={t('authMinChars')}
        />
        <TextField
          name="confirmPassword"
          label={t('authConfirmPassword')}
          type="password"
          required
          inputProps={{ minLength: 8 }}
        />
        {/* Honeypot - invisible to humans, bots auto-fill it */}
        <Box
          component="input"
          name="website"
          type="text"
          autoComplete="off"
          tabIndex={-1}
          aria-hidden="true"
          sx={{
            position: 'absolute',
            left: -9999,
            width: 1,
            height: 1,
            opacity: 0,
            overflow: 'hidden',
          }}
        />
        <TextField
          name="captcha"
          label={t('authCaptchaLabel')}
          helperText={
            captcha.loading
              ? '…'
              : `${t('authCaptchaSolve')} ${captcha.question}`
          }
          required
          type="number"
          disabled={captcha.loading}
          inputProps={{ inputMode: 'numeric' }}
        />
        <Button type="submit" variant="contained" disabled={loading || captcha.loading}>
          {loading ? t('authCreatingAccount') : t('authCreateAccount')}
        </Button>
        <Button size="small" onClick={onSwitchToLogin}>
          {t('authAlreadyHaveAccount')}
        </Button>
      </Stack>
    </form>
  );
}

// ── Forgot password ──────────────────────────

function ForgotPasswordForm({
  error,
  info,
  setError,
  setInfo,
  onBack,
  onTokenReceived,
}: {
  error: string;
  info: string;
  setError: (e: string) => void;
  setInfo: (i: string) => void;
  onBack: () => void;
  onTokenReceived: () => void;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    const data = new FormData(e.currentTarget);
    try {
      await requestPasswordReset(data.get('email') as string);
      setInfo(t('authResetEmailSent'));
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('authRequestFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}
      <Stack spacing={2}>
        <TextField name="email" label={t('authEmail')} type="email" required autoFocus disabled={sent} />
        <Button type="submit" variant="contained" disabled={loading || sent}>
          {loading ? t('authSending') : t('authSendResetLink')}
        </Button>
        {sent && (
          <Button variant="outlined" onClick={onTokenReceived}>
            {t('authHaveResetToken')}
          </Button>
        )}
        <Button size="small" onClick={onBack}>
          {t('authBackToLogin')}
        </Button>
      </Stack>
    </form>
  );
}

// ── Reset password (with token) ──────────────

function ResetPasswordForm({
  error,
  info,
  setError,
  setInfo,
  onBack,
}: {
  error: string;
  info: string;
  setError: (e: string) => void;
  setInfo: (i: string) => void;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    const data = new FormData(e.currentTarget);
    try {
      await resetPassword(
        data.get('token') as string,
        data.get('password') as string,
      );
      setInfo(t('authResetSuccess'));
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('authResetFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}
      <Stack spacing={2}>
        <TextField name="token" label={t('authResetToken')} required autoFocus />
        <TextField
          name="password"
          label={t('authNewPassword')}
          type="password"
          required
          inputProps={{ minLength: 8 }}
        />
        <Button type="submit" variant="contained" disabled={loading}>
          {loading ? t('authResetting') : t('authResetPassword')}
        </Button>
        <Button size="small" onClick={onBack}>
          {t('authBackToLogin')}
        </Button>
      </Stack>
    </form>
  );
}
