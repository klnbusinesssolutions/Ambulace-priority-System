import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import ActiveEmergencies from '../pages/ActiveEmergencies';
import LiveTracking from '../pages/LiveTracking';
import EmergencyDetails from '../pages/EmergencyDetails';
import AmbulanceRegistration from '../pages/AmbulanceRegistration';
import Analytics from '../pages/Analytics';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from './ProtectedRoute';
import MyDrivers from '../pages/MyDrivers';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ambulances/register" element={<AmbulanceRegistration />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/emergencies" element={<ActiveEmergencies />} />
        <Route path="/tracking" element={<LiveTracking />} />
        <Route path="/my-drivers" element={<MyDrivers />} />
        <Route path="/emergency/:id" element={<EmergencyDetails />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
