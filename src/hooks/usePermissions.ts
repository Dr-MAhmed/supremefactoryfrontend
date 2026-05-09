import { useAuth } from '../components/AuthContext';

export function usePermissions() {
  const { user } = useAuth();

  return {
    user,
    canEdit: user?.role !== 'VIEWER',
    isAdmin: user?.role === 'ADMIN',
    isAccountant: user?.role === 'ACCOUNTANT',
    isViewer: user?.role === 'VIEWER'
  };
}
