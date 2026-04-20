import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import AuthLayout from '../components/layout/AuthLayout';
import PrivateRoute from '../components/auth/PrivateRoute.jsx';
import { ORGANIZER_ONLY_ROLES } from '../auth/routeAccess.js';
import EventsPage from '../pages/EventsPage';
import EventDetailPage from '../pages/EventDetailPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import FavoritesPage from '../pages/FavoritesPage';
import BookingsPage from '../pages/BookingsPage';
import ProfilePage from '../pages/ProfilePage';
import ProfileAccountEditPage from '../pages/ProfileAccountEditPage.jsx';
import OrganizerPage from '../pages/OrganizerPage';
import OrganizerCreateEventPage from '../pages/OrganizerCreateEventPage';
import OrganizerProfileFormPage from '../pages/OrganizerProfileFormPage.jsx';
import OrganizerProfileViewPage from '../pages/OrganizerProfileViewPage.jsx';
import OrganizerPublicProfilePage from '../pages/OrganizerPublicProfilePage.jsx';
import MapPage from '../pages/MapPage';

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/events" replace />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/organizers/:userId" element={<OrganizerPublicProfilePage />} />
        <Route path="/mapa" element={<MapPage />} />

        <Route element={<PrivateRoute />}>
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<ProfileAccountEditPage />} />
        </Route>

        <Route path="/zostan-organizatorem" element={<Navigate to="/organizer/register" replace />} />

        <Route path="/organizer/register" element={<PrivateRoute />}>
          <Route index element={<OrganizerProfileFormPage />} />
        </Route>

        <Route element={<PrivateRoute allowedRoles={ORGANIZER_ONLY_ROLES} />}>
          <Route path="/organizer" element={<OrganizerPage />} />
          <Route path="/organizer/profile" element={<OrganizerProfileViewPage />} />
          <Route path="/organizer/profile/edit" element={<OrganizerProfileFormPage />} />
          <Route path="/organizer/events/create" element={<OrganizerCreateEventPage />} />
          <Route path="/organizer/events/:eventId/edit" element={<OrganizerCreateEventPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/events" replace />} />
      </Route>
    </Routes>
  );
}
