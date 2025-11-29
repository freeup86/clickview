import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  FilterIcon,
  DownloadIcon,
  ShareIcon,
  UsersIcon,
  MessageSquareIcon,
  LayoutIcon,
  MoreHorizontalIcon,
  ChevronDownIcon,
  BookmarkIcon,
  ClockIcon,
  LayersIcon,
} from '../components/icons';
import apiService from '../services/api';
import useStore from '../store/useStore';
import LoadingSpinner from '../components/LoadingSpinner';
import WidgetRenderer from '../components/widgets/WidgetRenderer';
import AddWidgetModal from '../components/modals/AddWidgetModal';
import WidgetConfigModal from '../components/modals/WidgetConfigModal';
import DashboardSettingsModal from '../components/modals/DashboardSettingsModal';
import FilterPanel from '../components/FilterPanel';
import { ExportButton } from '../components/dashboard/ExportButton';
import { ExportOptionsModal } from '../components/modals/ExportOptionsModal';
import { ExportProgressBar, ExportProgress } from '../components/ExportProgressBar';
import { DownloadManager, ExportHistoryItem } from '../components/DownloadManager';
import { SaveAsTemplateModal } from '../components/modals/SaveAsTemplateModal';
import { ShareDashboardModal, ShareLink } from '../components/modals/ShareDashboardModal';
import { PermissionsManager, Permission } from '../components/PermissionsManager';
import { DashboardComments, Comment } from '../components/dashboard/DashboardComments';
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

// Helper to get widget type category for styling
const getWidgetTypeCategory = (type: string): string => {
  if (type === 'kpi_card') return 'kpi';
  if (['bar_chart', 'line_chart', 'pie_chart', 'donut_chart', 'area_chart', 'stacked_bar_chart', 'heatmap', 'burndown_chart', 'gantt_chart'].includes(type)) return 'chart';
  if (type === 'data_table') return 'table';
  if (type === 'progress_bar') return 'progress';
  return 'default';
};

const DashboardPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNewDashboard = id === 'new';
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

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
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Export state
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState<'pdf' | 'excel' | 'csv' | 'powerpoint'>('pdf');
  const [activeExports, setActiveExports] = useState<ExportProgress[]>([]);
  const [showDownloadManager, setShowDownloadManager] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);

  // Template state
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);

  // Sharing state
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);

  // Calculate container width for responsive grid
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth - 48); // Subtract padding
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Fetch dashboard data
  const { isLoading, refetch } = useQuery(
    ['dashboard', id],
    () => apiService.getDashboard(id!),
    {
      enabled: !isNewDashboard && !!id,
      staleTime: 0,
      cacheTime: 0,
      onSuccess: (data) => {
        if (data.success && data.dashboard) {
          setCurrentDashboard(data.dashboard);
          const layoutItems = data.dashboard.widgets?.map((widget: Widget) => ({
            i: widget.id,
            x: widget.position.x || 0,
            y: widget.position.y || 0,
            w: widget.position.w || (widget.type === 'kpi_card' ? 3 : 6),
            h: widget.position.h || (widget.type === 'data_table' ? 6 : 4),
          })) || [];
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

  // Save as template mutation
  const saveAsTemplateMutation = useMutation(
    (data: {
      dashboardId: string;
      name: string;
      description: string;
      category: string;
      tags: string[];
      isPublic: boolean;
      generateThumbnail: boolean;
    }) => apiService.createDashboardTemplate(data),
    {
      onSuccess: () => {
        toast.success('Dashboard saved as template');
        queryClient.invalidateQueries(['templates']);
        setShowSaveAsTemplate(false);
      },
      onError: () => {
        toast.error('Failed to save template');
      },
    }
  );

  // Fetch share links
  const { data: shareLinksData } = useQuery(
    ['shareLinks', id],
    () => apiService.getShareLinks(id!),
    {
      enabled: !!id && !isNewDashboard,
      onSuccess: (data) => {
        if (data.success && data.shareLinks) {
          setShareLinks(data.shareLinks);
        }
      },
    }
  );

  // Fetch permissions
  const { data: permissionsData } = useQuery(
    ['permissions', id],
    () => apiService.getDashboardPermissions(id!),
    {
      enabled: !!id && !isNewDashboard,
      onSuccess: (data) => {
        if (data.success && data.permissions) {
          setPermissions(data.permissions);
        }
      },
    }
  );

  // Fetch available users
  const { data: availableUsersData } = useQuery(
    ['availableUsers', currentWorkspace?.id],
    () => apiService.getAvailableUsers(currentWorkspace!.id, id),
    {
      enabled: !!currentWorkspace?.id && showPermissionsModal,
    }
  );

  // Fetch available teams
  const { data: availableTeamsData } = useQuery(
    ['availableTeams', currentWorkspace?.id],
    () => apiService.getAvailableTeams(currentWorkspace!.id, id),
    {
      enabled: !!currentWorkspace?.id && showPermissionsModal,
    }
  );

  // Create share link mutation
  const createShareLinkMutation = useMutation(
    (data: { expiresIn?: number; password?: string; permission: 'view' | 'edit' | 'admin' }) =>
      apiService.createShareLink(id!, data),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['shareLinks', id]);
        return data.shareLink;
      },
      onError: () => {
        toast.error('Failed to create share link');
      },
    }
  );

  // Revoke share link mutation
  const revokeShareLinkMutation = useMutation(
    (linkId: string) => apiService.revokeShareLink(linkId),
    {
      onSuccess: () => {
        toast.success('Share link revoked');
        queryClient.invalidateQueries(['shareLinks', id]);
      },
      onError: () => {
        toast.error('Failed to revoke share link');
      },
    }
  );

  // Add permission mutation
  const addPermissionMutation = useMutation(
    (data: { userId?: string; teamId?: string; role: 'viewer' | 'editor' | 'admin' }) =>
      apiService.addDashboardPermission(id!, data),
    {
      onSuccess: () => {
        toast.success('Permission added');
        queryClient.invalidateQueries(['permissions', id]);
      },
      onError: () => {
        toast.error('Failed to add permission');
      },
    }
  );

  // Update permission mutation
  const updatePermissionMutation = useMutation(
    ({ permissionId, role }: { permissionId: string; role: 'viewer' | 'editor' | 'admin' }) =>
      apiService.updateDashboardPermission(permissionId, role),
    {
      onSuccess: () => {
        toast.success('Permission updated');
        queryClient.invalidateQueries(['permissions', id]);
      },
      onError: () => {
        toast.error('Failed to update permission');
      },
    }
  );

  // Remove permission mutation
  const removePermissionMutation = useMutation(
    (permissionId: string) => apiService.removeDashboardPermission(permissionId),
    {
      onSuccess: () => {
        toast.success('Permission removed');
        queryClient.invalidateQueries(['permissions', id]);
      },
      onError: () => {
        toast.error('Failed to remove permission');
      },
    }
  );

  // Fetch comments
  const { data: commentsData } = useQuery(
    ['comments', id],
    () => apiService.getDashboardComments(id!),
    {
      enabled: !!id && !isNewDashboard,
      onSuccess: (data) => {
        if (data.success && data.comments) {
          setComments(data.comments);
        }
      },
    }
  );

  // Add comment mutation
  const addCommentMutation = useMutation(
    (data: { content: string; parentId?: string }) =>
      apiService.addDashboardComment(id!, data),
    {
      onSuccess: () => {
        toast.success('Comment added');
        queryClient.invalidateQueries(['comments', id]);
      },
      onError: () => {
        toast.error('Failed to add comment');
      },
    }
  );

  // Update comment mutation
  const updateCommentMutation = useMutation(
    ({ commentId, content }: { commentId: string; content: string }) =>
      apiService.updateDashboardComment(commentId, content),
    {
      onSuccess: () => {
        toast.success('Comment updated');
        queryClient.invalidateQueries(['comments', id]);
      },
      onError: () => {
        toast.error('Failed to update comment');
      },
    }
  );

  // Delete comment mutation
  const deleteCommentMutation = useMutation(
    (commentId: string) => apiService.deleteDashboardComment(commentId),
    {
      onSuccess: () => {
        toast.success('Comment deleted');
        queryClient.invalidateQueries(['comments', id]);
      },
      onError: () => {
        toast.error('Failed to delete comment');
      },
    }
  );

  // Handle new dashboard creation
  useEffect(() => {
    if (isNewDashboard && !hasInitiatedCreation && !createDashboardMutation.isLoading) {
      setHasInitiatedCreation(true);

      if (!currentWorkspace) {
        const fetchWorkspaces = async () => {
          try {
            const response = await apiService.getWorkspaces();
            if (response.workspaces && response.workspaces.length > 0) {
              setCurrentWorkspace(response.workspaces[0]);
              const defaultDashboard = {
                name: 'New Dashboard',
                workspaceId: response.workspaces[0].id,
                layoutConfig: [],
                globalFilters: {},
              };
              createDashboardMutation.mutate(defaultDashboard);
            } else {
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

    if (isDashboardEditMode && currentDashboard?.widgets) {
      const updates = newLayout.map((item) => ({
        id: item.i,
        position: { x: item.x, y: item.y, w: item.w, h: item.h },
      }));
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
      const dayClicked = clickedData.group || clickedData.day || clickedData.week;
      toast.success(`Clicked on ${dayClicked}: Forecast=${clickedData.forecast || 0}, Actual=${clickedData.actual || 0}`);
    }
  };

  // Handle export
  const handleExport = async (format: 'pdf' | 'excel' | 'csv' | 'powerpoint' | 'custom') => {
    if (format === 'custom') {
      setSelectedExportFormat('pdf');
      setShowExportOptions(true);
    } else {
      const options = {
        format,
        orientation: 'landscape' as const,
        paperSize: 'letter' as const,
        includeCharts: true,
        includeData: true,
        selectedWidgets: currentDashboard?.widgets?.map((w: Widget) => w.id) || [],
      };
      await initiateExport(options);
    }
  };

  const initiateExport = async (options: any) => {
    const exportId = `export-${Date.now()}`;
    const newExport: ExportProgress = {
      exportId,
      status: 'processing',
      progress: 0,
      message: 'Preparing export...',
      fileName: `${currentDashboard?.name || 'dashboard'}-${new Date().toISOString().split('T')[0]}.${options.format}`,
      startedAt: new Date().toISOString(),
    };

    setActiveExports((prev) => [...prev, newExport]);
    toast.success('Export started');

    try {
      const response = await apiService.createDashboardExport({
        dashboardId: id,
        format: options.format,
        options,
      });

      const progressSteps = [20, 40, 60, 80, 100];
      for (const progress of progressSteps) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setActiveExports((prev) =>
          prev.map((exp) =>
            exp.exportId === exportId
              ? {
                  ...exp,
                  progress,
                  message:
                    progress < 100
                      ? `Generating ${options.format.toUpperCase()}... ${progress}%`
                      : 'Export complete!',
                }
              : exp
          )
        );
      }

      const downloadUrl = response.downloadUrl || `/api/exports/${exportId}/download`;
      setActiveExports((prev) =>
        prev.map((exp) =>
          exp.exportId === exportId
            ? { ...exp, status: 'completed', progress: 100, downloadUrl }
            : exp
        )
      );

      const historyItem: ExportHistoryItem = {
        id: exportId,
        dashboardId: id!,
        dashboardName: currentDashboard?.name || 'Dashboard',
        format: options.format,
        fileName: newExport.fileName!,
        fileSize: Math.floor(Math.random() * 5000000) + 100000,
        createdAt: new Date().toISOString(),
        downloadUrl,
        status: 'available',
        downloadCount: 0,
      };
      setExportHistory((prev) => [historyItem, ...prev]);

      toast.success('Export ready for download');
    } catch (error) {
      setActiveExports((prev) =>
        prev.map((exp) =>
          exp.exportId === exportId
            ? {
                ...exp,
                status: 'failed',
                error: 'Export failed. Please try again.',
              }
            : exp
        )
      );
      toast.error('Export failed');
    }
  };

  const handleExportWithOptions = async (options: any) => {
    await initiateExport(options);
  };

  const handleDismissExport = (exportId: string) => {
    setActiveExports((prev) => prev.filter((exp) => exp.exportId !== exportId));
  };

  const handleDownloadExport = (exportId: string, url: string) => {
    window.open(url, '_blank');
    setExportHistory((prev) =>
      prev.map((exp) =>
        exp.id === exportId ? { ...exp, downloadCount: exp.downloadCount + 1 } : exp
      )
    );
    toast.success('Download started');
  };

  const handleDeleteExportHistory = (exportId: string) => {
    if (confirm('Are you sure you want to delete this export from history?')) {
      setExportHistory((prev) =>
        prev.map((exp) =>
          exp.id === exportId ? { ...exp, status: 'deleted' as const } : exp
        )
      );
      toast.success('Export deleted');
    }
  };

  const handleClearExportHistory = () => {
    if (confirm('Are you sure you want to clear all export history?')) {
      setExportHistory([]);
      toast.success('Export history cleared');
    }
  };

  const handleRetryExport = (exportId: string) => {
    const failedExport = activeExports.find((exp) => exp.exportId === exportId);
    if (failedExport) {
      setActiveExports((prev) => prev.filter((exp) => exp.exportId !== exportId));
      handleExport('pdf');
    }
  };

  // Handle save as template
  const handleSaveAsTemplate = (templateData: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    isPublic: boolean;
    generateThumbnail: boolean;
  }) => {
    saveAsTemplateMutation.mutate({
      dashboardId: id!,
      ...templateData,
    });
  };

  // Handle create share link
  const handleCreateShareLink = async (data: {
    expiresIn?: number;
    password?: string;
    permission: 'view' | 'edit' | 'admin';
  }) => {
    const result = await createShareLinkMutation.mutateAsync(data);
    return result.shareLink;
  };

  // Handle revoke share link
  const handleRevokeShareLink = (linkId: string) => {
    revokeShareLinkMutation.mutate(linkId);
  };

  // Handle copy link to clipboard
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  // Handle add permission
  const handleAddPermission = (data: {
    userId?: string;
    teamId?: string;
    role: 'viewer' | 'editor' | 'admin';
  }) => {
    addPermissionMutation.mutate(data);
  };

  // Handle update permission
  const handleUpdatePermission = (permissionId: string, role: 'viewer' | 'editor' | 'admin') => {
    updatePermissionMutation.mutate({ permissionId, role });
  };

  // Handle remove permission
  const handleRemovePermission = (permissionId: string) => {
    removePermissionMutation.mutate(permissionId);
  };

  // Handle add comment
  const handleAddComment = (content: string, parentId?: string) => {
    addCommentMutation.mutate({ content, parentId });
  };

  // Handle update comment
  const handleUpdateComment = (commentId: string, content: string) => {
    updateCommentMutation.mutate({ commentId, content });
  };

  // Handle delete comment
  const handleDeleteComment = (commentId: string) => {
    deleteCommentMutation.mutate(commentId);
  };

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowMoreMenu(false);
    if (showMoreMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMoreMenu]);

  if (isLoading || isNewDashboard) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-mesh">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentDashboard) {
    return (
      <div className="empty-state h-full bg-gradient-mesh">
        <div className="empty-state-icon">
          <LayersIcon className="w-12 h-12" />
        </div>
        <h2 className="empty-state-title">Dashboard not found</h2>
        <p className="empty-state-description">
          The dashboard you're looking for doesn't exist or has been deleted.
        </p>
        <button onClick={() => navigate('/dashboards')} className="btn btn-primary">
          Back to Dashboards
        </button>
      </div>
    );
  }

  const widgetCount = currentDashboard.widgets?.length || 0;

  return (
    <div className="h-full flex flex-col bg-gradient-mesh">
      {/* Modern Dashboard Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          {/* Left: Title & Description */}
          <div className="dashboard-title-section">
            <div>
              <h1 className="dashboard-title">{currentDashboard.name}</h1>
              {currentDashboard.description && (
                <p className="dashboard-description">{currentDashboard.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <LayersIcon className="w-4 h-4" />
              <span>{widgetCount} widget{widgetCount !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="dashboard-actions">
            {/* Primary Action Group */}
            <div className="dashboard-action-group">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn ${showFilters ? 'active' : ''}`}
                title="Toggle filters"
              >
                <FilterIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="btn"
                title="Refresh data"
              >
                <RefreshIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Export & Share Group */}
            <div className="dashboard-action-group">
              <ExportButton onExport={handleExport} disabled={widgetCount === 0} />
              <button
                onClick={() => setShowShareModal(true)}
                className="btn"
                title="Share dashboard"
              >
                <ShareIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="action-divider" />

            {/* Edit Mode Toggle */}
            <button
              onClick={() => setDashboardEditMode(!isDashboardEditMode)}
              className={`btn ${isDashboardEditMode ? 'btn-primary' : 'btn-outline'}`}
            >
              <LayoutIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{isDashboardEditMode ? 'Done' : 'Edit'}</span>
            </button>

            {/* Add Widget (only in edit mode) */}
            {isDashboardEditMode && (
              <button
                onClick={() => setShowAddWidget(true)}
                className="btn btn-primary"
              >
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Add Widget</span>
              </button>
            )}

            {/* More Menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreMenu(!showMoreMenu);
                }}
                className="btn btn-ghost btn-icon"
                title="More options"
              >
                <MoreHorizontalIcon className="w-5 h-5" />
              </button>

              {showMoreMenu && (
                <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setShowDownloadManager(true);
                      setShowMoreMenu(false);
                    }}
                    className="dropdown-item"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    Downloads {exportHistory.length > 0 && `(${exportHistory.length})`}
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveAsTemplate(true);
                      setShowMoreMenu(false);
                    }}
                    disabled={widgetCount === 0}
                    className="dropdown-item"
                  >
                    <BookmarkIcon className="w-4 h-4" />
                    Save as Template
                  </button>
                  <div className="dropdown-divider" />
                  <button
                    onClick={() => {
                      setShowPermissionsModal(true);
                      setShowMoreMenu(false);
                    }}
                    className="dropdown-item"
                  >
                    <UsersIcon className="w-4 h-4" />
                    Permissions
                  </button>
                  <button
                    onClick={() => {
                      setShowComments(true);
                      setShowMoreMenu(false);
                    }}
                    className="dropdown-item"
                  >
                    <MessageSquareIcon className="w-4 h-4" />
                    Comments {comments.length > 0 && `(${comments.length})`}
                  </button>
                  <div className="dropdown-divider" />
                  <button
                    onClick={() => {
                      queryClient.invalidateQueries();
                      refetch();
                      toast.success('Cache cleared');
                      setShowMoreMenu(false);
                    }}
                    className="dropdown-item"
                  >
                    <ClockIcon className="w-4 h-4" />
                    Clear Cache
                  </button>
                  <button
                    onClick={() => {
                      setShowSettings(true);
                      setShowMoreMenu(false);
                    }}
                    className="dropdown-item"
                  >
                    <CogIcon className="w-4 h-4" />
                    Settings
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Filter Panel */}
      {showFilters && (
        <FilterPanel
          filters={globalFilters}
          onFiltersChange={setGlobalFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Dashboard Canvas */}
      <div ref={containerRef} className="dashboard-canvas scrollbar-thin">
        {widgetCount > 0 ? (
          <GridLayout
            className="layout"
            layout={layout}
            cols={12}
            rowHeight={60}
            width={containerWidth}
            isDraggable={isDashboardEditMode}
            isResizable={isDashboardEditMode}
            onLayoutChange={isDashboardEditMode ? handleLayoutChange : undefined}
            draggableHandle=".widget-drag-handle"
            margin={[20, 20]}
          >
            {currentDashboard.widgets.map((widget: Widget, index: number) => (
              <div
                key={widget.id}
                className={`widget-container ${isDashboardEditMode ? 'is-editing' : ''}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Widget Header */}
                <div className="widget-header">
                  <div className="widget-header-title widget-drag-handle">
                    <div className={`widget-type-indicator ${getWidgetTypeCategory(widget.type)}`} />
                    <h3>{widget.title}</h3>
                  </div>
                  {isDashboardEditMode && (
                    <div className="widget-actions">
                      <button
                        onClick={() => handleEditWidget(widget)}
                        className="widget-action-btn"
                        title="Edit widget"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWidget(widget.id)}
                        className="widget-action-btn danger"
                        title="Delete widget"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Widget Body */}
                <div className={`widget-body ${widget.type === 'kpi_card' ? 'compact' : widget.type === 'data_table' ? 'large' : ''}`}>
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
          <div className="empty-state h-full animate-fadeIn">
            <div className="empty-state-icon">
              <PlusIcon className="w-12 h-12" />
            </div>
            <h3 className="empty-state-title">No widgets yet</h3>
            <p className="empty-state-description">
              Add widgets to visualize your ClickUp data and track your team's progress.
            </p>
            <button
              onClick={() => {
                setDashboardEditMode(true);
                setShowAddWidget(true);
              }}
              className="btn btn-primary btn-lg"
            >
              <PlusIcon className="w-5 h-5" />
              Add Your First Widget
            </button>
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

      <ExportOptionsModal
        isOpen={showExportOptions}
        onClose={() => setShowExportOptions(false)}
        onExport={handleExportWithOptions}
        dashboardId={id!}
        widgetList={currentDashboard?.widgets?.map((w: Widget) => ({
          id: w.id,
          title: w.title,
          type: w.type,
        })) || []}
        initialFormat={selectedExportFormat}
      />

      <DownloadManager
        isOpen={showDownloadManager}
        onClose={() => setShowDownloadManager(false)}
        exports={exportHistory}
        onDownload={handleDownloadExport}
        onDelete={handleDeleteExportHistory}
        onClearHistory={handleClearExportHistory}
      />

      <SaveAsTemplateModal
        isOpen={showSaveAsTemplate}
        onClose={() => setShowSaveAsTemplate(false)}
        onSave={handleSaveAsTemplate}
        dashboardName={currentDashboard?.name || 'Dashboard'}
      />

      <ShareDashboardModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        dashboardId={id!}
        dashboardName={currentDashboard?.name || 'Dashboard'}
        existingLinks={shareLinks}
        onCreateLink={handleCreateShareLink}
        onRevokeLink={handleRevokeShareLink}
        onCopyLink={handleCopyLink}
      />

      <PermissionsManager
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        dashboardId={id!}
        dashboardName={currentDashboard?.name || 'Dashboard'}
        permissions={permissions}
        availableUsers={availableUsersData?.users || []}
        availableTeams={availableTeamsData?.teams || []}
        onAddPermission={handleAddPermission}
        onUpdatePermission={handleUpdatePermission}
        onRemovePermission={handleRemovePermission}
        currentUserId={availableUsersData?.currentUserId || ''}
      />

      <DashboardComments
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        dashboardId={id!}
        dashboardName={currentDashboard?.name || 'Dashboard'}
        comments={comments}
        onAddComment={handleAddComment}
        onUpdateComment={handleUpdateComment}
        onDeleteComment={handleDeleteComment}
        currentUserId={availableUsersData?.currentUserId || ''}
        currentUserName={availableUsersData?.currentUserName || 'Unknown User'}
      />

      <ExportProgressBar
        exports={activeExports}
        onDismiss={handleDismissExport}
        onDownload={handleDownloadExport}
        onRetry={handleRetryExport}
      />
    </div>
  );
};

export default DashboardPage;
