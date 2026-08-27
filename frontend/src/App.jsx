import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import OAuthCallback from './pages/auth/OAuthCallback';

// Main ERP Pages
import Dashboard from './pages/dashboard/Dashboard';
import TeachersList from './pages/teachers/TeachersList';
import TeacherDetails from './pages/teachers/TeacherDetails';
import DailyAttendance from './pages/attendance/DailyAttendance';
import AttendanceHistory from './pages/attendance/AttendanceHistory';
import AttendanceCalendar from './pages/attendance/AttendanceCalendar';
import LeaveManagement from './pages/leaves/LeaveManagement';
import SalaryManagement from './pages/salary/SalaryManagement';
import SalaryDetails from './pages/salary/SalaryDetails';
import AttendanceReports from './pages/reports/AttendanceReports';
import SalaryReports from './pages/reports/SalaryReports';
import Profile from './pages/profile/Profile';
import Settings from './pages/settings/Settings';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />

            {/* Protected ERP Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />

              {/* Teachers — Admin only for list/management; both can view details */}
              <Route
                path="teachers"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <TeachersList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="teachers/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                    <TeacherDetails />
                  </ProtectedRoute>
                }
              />

              {/* Attendance — Admin marks; Teacher views own calendar */}
              <Route
                path="attendance"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DailyAttendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="attendance/history"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AttendanceHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="attendance/calendar"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                    <AttendanceCalendar />
                  </ProtectedRoute>
                }
              />

              {/* Leaves — Admin approves; Teacher applies & views own */}
              <Route
                path="leaves"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                    <LeaveManagement />
                  </ProtectedRoute>
                }
              />

              {/* Salary — Admin manages payroll; Teacher views own */}
              <Route
                path="salary"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                    <SalaryManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="salary/:teacherId"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                    <SalaryDetails />
                  </ProtectedRoute>
                }
              />

              {/* Reports — Admin only */}
              <Route
                path="reports/attendance"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AttendanceReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="reports/salary"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SalaryReports />
                  </ProtectedRoute>
                }
              />

              {/* Profile & Settings */}
              <Route path="profile" element={<Profile />} />
              <Route
                path="settings"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;

