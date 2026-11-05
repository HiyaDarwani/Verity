/**
 * ProtectedRoute.tsx
 * Frontend-only route guard for role-based navigation.
 *
 * This is a client-side navigation guard for a role-aware user experience.
 * The API independently authenticates and authorizes every protected request.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { UserRole } from '../types/user';

interface Props {
  allowedRole?: UserRole;
}

export function ProtectedRoute({ allowedRole }: Props) {
  const { authUser, isAuthReady } = useApp();

  if (!isAuthReady) return <div className="page-loading" role="status">Checking your session…</div>;

  if (!authUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && authUser.role !== allowedRole) {
    // Redirect to the user's appropriate role dashboard
    const roleRoutes: Record<UserRole, string> = {
      Student: '/student/dashboard',
      Examiner: '/examiner/dashboard',
      Administrator: '/admin/dashboard',
    };
    return <Navigate to={roleRoutes[authUser.role]} replace />;
  }

  return <Outlet />;
}
