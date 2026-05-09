import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface RoleGuardProps {
  allowedRoles: Array<'ADMIN' | 'ACCOUNTANT' | 'VIEWER'>;
  children: ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center">
        <p className="text-lg font-semibold text-rose-700">Access denied</p>
        <p className="mt-2 text-sm text-rose-600">
          You do not have permission to view this page. Contact an administrator if you need access.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
