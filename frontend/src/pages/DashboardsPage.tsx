import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { PlusIcon, ChartBarIcon } from '../components/icons';
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

  if (!currentWorkspace) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <ChartBarIcon className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No workspace selected</h3>
        <p className="text-gray-500 mb-4">Please select a workspace first</p>
        <Link to="/workspaces" className="btn btn-primary">
          Go to Workspaces
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner size="large" className="mt-12" />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Dashboards</h2>
        <Link
          to="/dashboard/new"
          className="btn btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Create Dashboard</span>
        </Link>
      </div>

      {dashboards.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <ChartBarIcon className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No dashboards yet</h3>
          <p className="text-gray-500 mb-4">Create your first dashboard to visualize ClickUp data</p>
          <Link to="/dashboard/new" className="btn btn-primary">
            Create Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.map((dashboard) => (
            <Link
              key={dashboard.id}
              to={`/dashboard/${dashboard.id}`}
              className="card hover:shadow-medium transition-all hover:scale-105"
            >
              <h3 className="text-lg font-semibold mb-2">{dashboard.name}</h3>
              {dashboard.description && (
                <p className="text-gray-600 text-sm mb-4">{dashboard.description}</p>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">
                  {dashboard.widgets?.length || 0} widgets
                </span>
                <span className="text-gray-500">
                  {dashboard.last_refresh_at
                    ? `Updated ${new Date(dashboard.last_refresh_at).toLocaleDateString()}`
                    : 'Never updated'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardsPage;