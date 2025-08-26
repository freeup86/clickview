import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  ChartBarIcon, 
  ViewGridIcon, 
  CogIcon, 
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshIcon,
  PlusIcon,
  ClipboardListIcon
} from './icons';
import useStore from '../store/useStore';
import WorkspaceSelector from './WorkspaceSelector';

const Layout: React.FC = () => {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen, currentWorkspace } = useStore();

  const navigation = [
    { name: 'Workspaces', href: '/workspaces', icon: ViewGridIcon },
    { name: 'Dashboards', href: '/dashboards', icon: ChartBarIcon },
    { name: 'Tasks', href: '/tasks', icon: ClipboardListIcon },
    { name: 'Settings', href: '/settings', icon: CogIcon },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-white shadow-lg transition-all duration-300 flex flex-col`}
      >
        {/* Logo and Toggle */}
        <div className="flex items-center justify-between p-4 border-b">
          {sidebarOpen && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CV</span>
              </div>
              <span className="font-semibold text-lg">ClickView</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? (
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Workspace Selector */}
        {sidebarOpen && currentWorkspace && (
          <div className="p-4 border-b">
            <WorkspaceSelector />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive(item.href)
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {sidebarOpen && <span className="font-medium">{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t">
            <div className="text-xs text-gray-500">
              <p>© 2024 ClickView</p>
              <p className="mt-1">Version 1.0.0</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              {location.pathname === '/workspaces' && 'Workspaces'}
              {location.pathname === '/dashboards' && 'Dashboards'}
              {location.pathname.startsWith('/dashboard/') && 'Dashboard'}
              {location.pathname === '/settings' && 'Settings'}
            </h1>
            <div className="flex items-center space-x-4">
              {location.pathname === '/dashboards' && (
                <Link
                  to="/dashboard/new"
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>New Dashboard</span>
                </Link>
              )}
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <RefreshIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;