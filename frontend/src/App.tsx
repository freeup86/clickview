import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import WorkspacesPage from './pages/WorkspacesPage';
import DashboardsPage from './pages/DashboardsPage';
import DashboardPage from './pages/DashboardPage';
import SharedDashboardPage from './pages/SharedDashboardPage';
import TasksPage from './pages/TasksPage';
import SettingsPage from './pages/SettingsPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import NotFoundPage from './pages/NotFoundPage';
import LoadingSpinner from './components/LoadingSpinner';
import { useAuth } from './contexts/AuthContext';
import apiService from './services/api';
import useStore from './store/useStore';

function App() {
  const { setWorkspaces, currentWorkspace } = useStore();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Fetch workspaces on app load (only when authenticated)
  const { data: workspacesData, isLoading: workspacesLoading } = useQuery(
    'workspaces',
    () => apiService.getWorkspaces(),
    {
      enabled: isAuthenticated, // Only fetch when user is authenticated
      onSuccess: (data) => {
        if (data.success && data.workspaces) {
          setWorkspaces(data.workspaces);
        }
      },
    }
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Loading ClickView...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/shared/:shareToken" element={<SharedDashboardPage />} />

      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/workspaces" replace />} />
        <Route path="workspaces" element={<WorkspacesPage />} />
        <Route path="dashboards" element={<DashboardsPage />} />
        <Route path="dashboard/:id" element={<DashboardPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;