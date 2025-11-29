import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  PlusIcon,
  ChartBarIcon,
  LayersIcon,
  ClockIcon,
  SparklesIcon,
} from '../components/icons';
import apiService from '../services/api';
import useStore from '../store/useStore';
import LoadingSpinner from '../components/LoadingSpinner';

const DashboardsPage: React.FC = () => {
  const { currentWorkspace, dashboards, setDashboards } = useStore();

  const { isLoading } = useQuery(
    ['dashboards', currentWorkspace?.id],
    () => apiService.getDashboards({ workspaceId: currentWorkspace?.id }),
    {
      enabled: !!currentWorkspace,
      onSuccess: (data) => {
        if (data.success) {
          setDashboards(data.dashboards);
        }
      },
    }
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!currentWorkspace) {
    return (
      <div className="empty-state h-full animate-fadeIn" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="empty-state-icon">
          <ChartBarIcon className="w-12 h-12" />
        </div>
        <h3 className="empty-state-title">No workspace selected</h3>
        <p className="empty-state-description">
          Select a workspace to view your dashboards and data visualizations.
        </p>
        <Link to="/workspaces" className="btn btn-primary btn-lg">
          <LayersIcon className="w-5 h-5" />
          Go to Workspaces
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4" style={{ color: 'var(--text-muted)' }}>Loading dashboards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 lg:p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Dashboards
          </h1>
          <p style={{ color: 'var(--text-secondary)' }} className="mt-1">
            Visualize and track your ClickUp data in real-time
          </p>
        </div>
        <Link to="/dashboard/new" className="btn btn-primary">
          <PlusIcon className="w-4 h-4" />
          Create Dashboard
        </Link>
      </div>

      {dashboards.length === 0 ? (
        <div
          className="empty-state rounded-2xl py-16 animate-fadeIn"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="empty-state-icon">
            <SparklesIcon className="w-12 h-12" />
          </div>
          <h3 className="empty-state-title">Create your first dashboard</h3>
          <p className="empty-state-description">
            Build custom dashboards with charts, KPIs, and tables to monitor your team's performance.
          </p>
          <Link to="/dashboard/new" className="btn btn-primary btn-lg">
            <PlusIcon className="w-5 h-5" />
            Create Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.map((dashboard, index) => (
            <Link
              key={dashboard.id}
              to={`/dashboard/${dashboard.id}`}
              className="dashboard-card animate-fadeInUp"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Card Header */}
              <div className="dashboard-card-header">
                <div className="dashboard-card-icon">
                  <ChartBarIcon className="w-6 h-6" />
                </div>
              </div>

              {/* Card Content */}
              <h3 className="dashboard-card-title">{dashboard.name}</h3>
              {dashboard.description ? (
                <p className="dashboard-card-description">{dashboard.description}</p>
              ) : (
                <p className="dashboard-card-description italic" style={{ color: 'var(--text-muted)' }}>
                  No description
                </p>
              )}

              {/* Card Meta */}
              <div className="dashboard-card-meta">
                <div className="dashboard-card-stat">
                  <LayersIcon className="w-4 h-4" />
                  <span>{dashboard.widgets?.length || 0} widgets</span>
                </div>
                <div className="dashboard-card-stat">
                  <ClockIcon className="w-4 h-4" />
                  <span>{formatDate(dashboard.last_refresh_at)}</span>
                </div>
              </div>
            </Link>
          ))}

          {/* Create New Dashboard Card */}
          <Link
            to="/dashboard/new"
            className="flex flex-col items-center justify-center min-h-[200px] rounded-xl border-2 border-dashed transition-all duration-300 hover:-translate-y-1"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'transparent',
              animationDelay: `${dashboards.length * 0.05}s`,
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <PlusIcon className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
            </div>
            <span className="font-medium transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
              New Dashboard
            </span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default DashboardsPage;
