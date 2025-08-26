import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import Layout from './components/Layout';
import WorkspacesPage from './pages/WorkspacesPage';
import DashboardsPage from './pages/DashboardsPage';
import DashboardPage from './pages/DashboardPage';
import SharedDashboardPage from './pages/SharedDashboardPage';
import TasksPage from './pages/TasksPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import LoadingSpinner from './components/LoadingSpinner';
import apiService from './services/api';
import useStore from './store/useStore';

function App() {
  const { setWorkspaces, currentWorkspace } = useStore();

  // Fetch workspaces on app load
  const { data: workspacesData, isLoading } = useQuery(
    'workspaces',
    () => apiService.getWorkspaces(),
    {
      onSuccess: (data) => {
        if (data.success && data.workspaces) {
          setWorkspaces(data.workspaces);
        }
      },
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/workspaces" replace />} />
        <Route path="workspaces" element={<WorkspacesPage />} />
        <Route path="dashboards" element={<DashboardsPage />} />
        <Route path="dashboard/:id" element={<DashboardPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/shared/:shareToken" element={<SharedDashboardPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;