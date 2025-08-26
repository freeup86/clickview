import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import GridLayout from 'react-grid-layout';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  RefreshIcon,
  CogIcon,
  TrashIcon,
  PencilIcon,
  XIcon,
} from '../components/icons';
import apiService from '../services/api';
import useStore from '../store/useStore';
import LoadingSpinner from '../components/LoadingSpinner';
import WidgetRenderer from '../components/widgets/WidgetRenderer';
import AddWidgetModal from '../components/modals/AddWidgetModal';
import WidgetConfigModal from '../components/modals/WidgetConfigModal';
import DashboardSettingsModal from '../components/modals/DashboardSettingsModal';
import FilterPanel from '../components/FilterPanel';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface Widget {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: any;
  data_config: any;
  filters: any;
  data?: any;
}

const DashboardPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNewDashboard = id === 'new';

  const {
    currentDashboard,
    setCurrentDashboard,
    isDashboardEditMode,
    setDashboardEditMode,
    currentWorkspace,
    setCurrentWorkspace,
    globalFilters,
    setGlobalFilters,
  } = useStore();

  const [layout, setLayout] = useState<any[]>([]);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitiatedCreation, setHasInitiatedCreation] = useState(false);

  // Fetch dashboard data
  const { isLoading, refetch } = useQuery(
    ['dashboard', id],
    () => apiService.getDashboard(id!),
    {
      enabled: !isNewDashboard && !!id,
      staleTime: 0, // Always treat dashboard data as stale
      cacheTime: 0, // Don't cache dashboard data
      onSuccess: (data) => {
        if (data.success && data.dashboard) {
          setCurrentDashboard(data.dashboard);
          // Convert widgets to layout format
          const layoutItems = data.dashboard.widgets?.map((widget: Widget) => ({
            i: widget.id,
            x: widget.position.x || 0,
            y: widget.position.y || 0,
            w: widget.position.w || (widget.type === 'kpi_card' ? 3 : 6),
            h: widget.position.h || (widget.type === 'data_table' ? 6 : 4),
          })) || [];
          console.log('Initial layout from dashboard:', layoutItems);
          setLayout(layoutItems);
        }
      },
      onError: () => {
        toast.error('Failed to load dashboard');
        navigate('/dashboards');
      },
    }
  );

  // Create dashboard mutation
  const createDashboardMutation = useMutation(
    (data: any) => apiService.createDashboard(data),
    {
      onSuccess: (data) => {
        toast.success('Dashboard created successfully');
        queryClient.invalidateQueries(['dashboards']);
        navigate(`/dashboard/${data.dashboard.id}`);
      },
      onError: () => {
        toast.error('Failed to create dashboard');
      },
    }
  );

  // Update dashboard mutation
  const updateDashboardMutation = useMutation(
    (data: any) => apiService.updateDashboard(id!, data),
    {
      onSuccess: () => {
        toast.success('Dashboard updated');
        queryClient.invalidateQueries(['dashboard', id]);
      },
    }
  );

  // Delete dashboard mutation
  const deleteDashboardMutation = useMutation(
    () => apiService.deleteDashboard(id!),
    {
      onSuccess: () => {
        toast.success('Dashboard deleted');
        queryClient.invalidateQueries(['dashboards']);
        navigate('/dashboards');
      },
    }
  );

  // Create widget mutation
  const createWidgetMutation = useMutation(
    (data: any) => apiService.createWidget(data),
    {
      onSuccess: () => {
        toast.success('Widget added');
        refetch();
      },
    }
  );

  // Update widget mutation
  const updateWidgetMutation = useMutation(
    ({ widgetId, data }: { widgetId: string; data: any }) =>
      apiService.updateWidget(widgetId, data),
    {
      onSuccess: () => {
        toast.success('Widget updated');
        refetch();
        // Also invalidate all widget data queries to force refresh
        queryClient.invalidateQueries(['widget-data']);
      },
    }
  );

  // Delete widget mutation
  const deleteWidgetMutation = useMutation(
    (widgetId: string) => apiService.deleteWidget(widgetId),
    {
      onSuccess: () => {
        toast.success('Widget removed');
        refetch();
      },
    }
  );

  // Batch update widget positions
  const batchUpdatePositionsMutation = useMutation(
    (widgets: any[]) => apiService.batchUpdateWidgets(widgets),
    {
      onSuccess: () => {
        console.log('Widget positions updated');
      },
    }
  );

  // Handle new dashboard creation
  useEffect(() => {
    if (isNewDashboard && !hasInitiatedCreation && !createDashboardMutation.isLoading) {
      setHasInitiatedCreation(true);
      
      // Check if we have a workspace selected
      if (!currentWorkspace) {
        // Get the first available workspace or redirect to workspace creation
        const fetchWorkspaces = async () => {
          try {
            const response = await apiService.getWorkspaces();
            if (response.workspaces && response.workspaces.length > 0) {
              // Set the first workspace as current
              setCurrentWorkspace(response.workspaces[0]);
              
              // Create dashboard with the fetched workspace
              const defaultDashboard = {
                name: 'New Dashboard',
                workspaceId: response.workspaces[0].id,
                layoutConfig: [],
                globalFilters: {},
              };
              createDashboardMutation.mutate(defaultDashboard);
            } else {
              // No workspaces available, redirect to workspace creation
              toast.error('Please create a workspace first');
              navigate('/workspaces');
            }
          } catch (error) {
            toast.error('Failed to fetch workspaces');
            navigate('/');
          }
        };
        fetchWorkspaces();
      } else {
        // We have a workspace, create the dashboard
        const defaultDashboard = {
          name: 'New Dashboard',
          workspaceId: currentWorkspace.id,
          layoutConfig: [],
          globalFilters: {},
        };
        createDashboardMutation.mutate(defaultDashboard);
      }
    }
  }, [isNewDashboard, hasInitiatedCreation, currentWorkspace, createDashboardMutation, navigate, setCurrentWorkspace]);

  // Handle layout change
  const handleLayoutChange = useCallback((newLayout: any[]) => {
    setLayout(newLayout);
    
    // Only update widget positions in backend when in edit mode
    // This prevents unnecessary updates that might reset positions
    if (isDashboardEditMode && currentDashboard?.widgets) {
      const updates = newLayout.map((item) => ({
        id: item.i,
        position: { x: item.x, y: item.y, w: item.w, h: item.h },
      }));
      console.log('Saving layout changes:', JSON.stringify(updates.map(u => ({ 
        id: u.id.substring(0, 8), 
        ...u.position 
      })), null, 2));
      batchUpdatePositionsMutation.mutate(updates);
    }
  }, [currentDashboard, isDashboardEditMode, batchUpdatePositionsMutation]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await apiService.refreshData(currentWorkspace!.id, id);
      await refetch();
      toast.success('Dashboard refreshed');
    } catch (error) {
      toast.error('Failed to refresh dashboard');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle add widget
  const handleAddWidget = (widgetConfig: any) => {
    const newWidget = {
      dashboardId: id,
      ...widgetConfig,
      position: {
        x: 0,
        y: layout.length * 3,
        w: widgetConfig.type === 'kpi_card' ? 3 : 6,
        h: widgetConfig.type === 'data_table' ? 6 : 4,
      },
    };
    createWidgetMutation.mutate(newWidget);
  };

  // Handle widget edit
  const handleEditWidget = (widget: Widget) => {
    // Find the fresh widget data from currentDashboard
    const freshWidget = currentDashboard?.widgets?.find((w: Widget) => w.id === widget.id);
    setEditingWidget(freshWidget || widget);
  };

  // Handle widget delete
  const handleDeleteWidget = (widgetId: string) => {
    if (confirm('Are you sure you want to delete this widget?')) {
      deleteWidgetMutation.mutate(widgetId);
    }
  };

  // Handle dashboard settings update
  const handleUpdateDashboard = (updates: any) => {
    updateDashboardMutation.mutate(updates);
  };

  // Handle dashboard delete
  const handleDeleteDashboard = () => {
    if (confirm('Are you sure you want to delete this dashboard?')) {
      deleteDashboardMutation.mutate();
    }
  };

  // Handle chart click for drill-down
  const handleChartClick = (data: any) => {
    if (data && data.payload) {
      const clickedData = data.payload;
      // For now, just show a message - filtering implementation can be added later
      const dayClicked = clickedData.group || clickedData.day || clickedData.week;
      toast.success(`Clicked on ${dayClicked}: Forecast=${clickedData.forecast || 0}, Actual=${clickedData.actual || 0}`);
    }
  };

  if (isLoading || isNewDashboard) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!currentDashboard) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-4">Dashboard not found</h2>
        <button
          onClick={() => navigate('/dashboards')}
          className="btn btn-primary"
        >
          Back to Dashboards
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Dashboard Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{currentDashboard.name}</h1>
            {currentDashboard.description && (
              <p className="text-sm text-gray-500 mt-1">{currentDashboard.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`}
            >
              Filters
            </button>
            <button
              onClick={() => setDashboardEditMode(!isDashboardEditMode)}
              className={`btn ${isDashboardEditMode ? 'btn-primary' : 'btn-outline'}`}
            >
              {isDashboardEditMode ? 'Done Editing' : 'Edit Layout'}
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn btn-outline"
              title="Refresh data from ClickUp"
            >
              <RefreshIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                queryClient.invalidateQueries();
                refetch();
                toast.success('Cache cleared and data refreshed');
              }}
              className="btn btn-outline"
              title="Clear cache and force refresh"
            >
              Clear Cache
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="btn btn-outline"
            >
              <CogIcon className="w-4 h-4" />
            </button>
            {isDashboardEditMode && (
              <button
                onClick={() => setShowAddWidget(true)}
                className="btn btn-primary"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Widget
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <FilterPanel
          filters={globalFilters}
          onFiltersChange={setGlobalFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Dashboard Grid */}
      <div className="flex-1 p-6 overflow-auto bg-gradient-to-br from-gray-50 via-gray-50 to-indigo-50/20">
        {currentDashboard.widgets && currentDashboard.widgets.length > 0 ? (
          <GridLayout
            className="layout"
            layout={layout}
            cols={12}
            rowHeight={60}
            width={1200}
            isDraggable={isDashboardEditMode}
            isResizable={isDashboardEditMode}
            onLayoutChange={isDashboardEditMode ? handleLayoutChange : undefined}
            draggableHandle=".widget-drag-handle"
          >
            {currentDashboard.widgets.map((widget: Widget) => (
              <div key={widget.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden border border-gray-100">
                {/* Widget Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 widget-drag-handle cursor-move flex items-center">
                    <span className="w-1 h-4 bg-indigo-600 rounded-full mr-2"></span>
                    {widget.title}
                  </h3>
                  {isDashboardEditMode && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditWidget(widget)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <PencilIcon className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteWidget(widget.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <TrashIcon className="w-4 h-4 text-error" />
                      </button>
                    </div>
                  )}
                </div>
                {/* Widget Content */}
                <div className="p-4 h-[calc(100%-56px)]">
                  <WidgetRenderer
                    widget={widget}
                    globalFilters={globalFilters}
                    workspaceId={currentWorkspace?.id}
                    onChartClick={handleChartClick}
                  />
                </div>
              </div>
            ))}
          </GridLayout>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <PlusIcon className="w-16 h-16 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                No widgets yet
              </h3>
              <p className="text-gray-500 mb-6">
                Add widgets to visualize your ClickUp data
              </p>
              <button
                onClick={() => {
                  setDashboardEditMode(true);
                  setShowAddWidget(true);
                }}
                className="btn btn-primary"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add First Widget
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddWidget && (
        <AddWidgetModal
          isOpen={showAddWidget}
          onClose={() => setShowAddWidget(false)}
          onAdd={handleAddWidget}
          workspaceId={currentWorkspace?.id}
        />
      )}

      {editingWidget && (
        <WidgetConfigModal
          isOpen={!!editingWidget}
          widget={editingWidget}
          onClose={() => setEditingWidget(null)}
          onUpdate={(updates) => {
            updateWidgetMutation.mutate({
              widgetId: editingWidget.id,
              data: updates,
            });
            setEditingWidget(null);
          }}
          workspaceId={currentWorkspace?.id}
        />
      )}

      {showSettings && (
        <DashboardSettingsModal
          isOpen={showSettings}
          dashboard={currentDashboard}
          onClose={() => setShowSettings(false)}
          onUpdate={handleUpdateDashboard}
          onDelete={handleDeleteDashboard}
        />
      )}
    </div>
  );
};

export default DashboardPage;