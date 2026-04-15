import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { PageLoader } from '../Layout/PageLoader';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const accountUser = useAuthStore((s) => s.accountUser);
  const loading = useAuthStore((s) => s.loading);
  const location = useLocation();

  if (loading) return <PageLoader />;

  if (!token || !accountUser) {
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
