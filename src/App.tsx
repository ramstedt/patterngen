import { type ReactNode, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { AppLayout } from './components/Layout/AppLayout';
import { RequireAuth } from './components/Auth/RequireAuth';
import { StartPage } from './pages/StartPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AccountPage } from './pages/AccountPage';
import { ProfilesPage } from './pages/ProfilesPage';
import { PatternsPage } from './pages/PatternsPage';

function AuthInit({ children }: { children: ReactNode }) {
  const init = useAuthStore((s) => s.init);
  useEffect(() => { init(); }, [init]);
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthInit>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path='/' element={<StartPage />} />
            <Route path='/login' element={<LoginPage />} />
            <Route path='/register' element={<RegisterPage />} />
            <Route
              path='/profiles'
              element={
                <RequireAuth>
                  <ProfilesPage />
                </RequireAuth>
              }
            />
            <Route
              path='/patterns'
              element={
                <RequireAuth>
                  <PatternsPage />
                </RequireAuth>
              }
            />
            <Route
              path='/account'
              element={
                <RequireAuth>
                  <AccountPage />
                </RequireAuth>
              }
            />
            <Route path='*' element={<Navigate to='/' replace />} />
          </Route>
        </Routes>
      </AuthInit>
    </BrowserRouter>
  );
}
