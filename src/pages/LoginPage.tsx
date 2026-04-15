import { Navigate, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n/useI18n';
import { useAuthStore } from '../stores/authStore';
import { AuthPage } from '../components/Auth/AuthPage';
import { PageLoader } from '../components/Layout/PageLoader';
import { PageShell } from '../components/Layout/PageShell';

export function LoginPage() {
  const { t } = useI18n();
  const token = useAuthStore((s) => s.token);
  const accountUser = useAuthStore((s) => s.accountUser);
  const loading = useAuthStore((s) => s.loading);
  const location = useLocation();

  if (loading) return <PageLoader />;

  if (token && accountUser) {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/profiles';
    return <Navigate to={from} replace />;
  }

  return (
    <PageShell
      kicker={t('loginPageNav')}
      title={t('authLogIn')}
      description={t('loginPageBody')}
    >
      <AuthPage initialView='login' />
    </PageShell>
  );
}
