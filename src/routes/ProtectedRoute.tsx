import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ROLE_HOME, ROUTES } from '../lib/constants';
import { useAuth } from '../lib/auth';
import type { UserRole } from '../lib/types';

type ProtectedRouteProps = {
  roles: UserRole[];
  children: ReactNode;
};

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { loading, user, profile, configError } = useAuth();
  const location = useLocation();

  if (configError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center p-6">
        <p className="nexo-card text-sm font-bold text-brand-900">
          {configError}
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center text-brand-800">
        <p className="text-sm font-extrabold">Carregando sessão...</p>
      </main>
    );
  }

  if (!user || !profile) {
    return (
      <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />
    );
  }

  if (!roles.includes(profile.role)) {
    return <Navigate to={ROLE_HOME[profile.role]} replace />;
  }

  return children;
}
