import { Navigate, Outlet, useLocation } from 'react-router-dom';
import PageLoader from '../feedback/PageLoader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getStoredToken } from '../../services/api.js';
import { DEFAULT_PRIVATE_ROLES } from '../../auth/routeAccess.js';

/**
 * Chroni trasy: brak tokenu lub użytkownika → redirect na `/login` z `state.from` (bieżąca lokalizacja).
 * Opcjonalnie `allowedRoles` — rola musi być na liście (np. tylko `organizer` dla panelu).
 *
 * @param {{ allowedRoles?: string[] }} props
 */
export default function PrivateRoute({ allowedRoles = DEFAULT_PRIVATE_ROLES }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (!getStoredToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (loading) {
    return <PageLoader label="Ładowanie konta" />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = user.role != null && user.role !== '' ? String(user.role) : 'user';
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/events" replace />;
  }

  return <Outlet />;
}
