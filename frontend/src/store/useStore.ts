import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface Workspace {
  id: string;
  name: string;
  clickup_team_id: string;
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

interface Dashboard {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  layout_config: any[];
  global_filters: any;
  refresh_interval?: number;
  last_refresh_at?: string;
  widgets?: Widget[];
}

interface Widget {
  id: string;
  dashboard_id: string;
  type: string;
  title: string;
  description?: string;
  position: { x: number; y: number; w: number; h: number };
  config: any;
  data_config: any;
  filters: any;
  data?: any;
  loading?: boolean;
  error?: string;
}

interface AppState {
  // Workspace state
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  workspaceHierarchy: any | null;
  
  // Dashboard state
  dashboards: Dashboard[];
  currentDashboard: Dashboard | null;
  isDashboardEditMode: boolean;
  
  // Widget state
  selectedWidget: Widget | null;
  widgetData: Map<string, any>;
  
  // UI state
  sidebarOpen: boolean;
  filterPanelOpen: boolean;
  globalFilters: any;
  
  // Actions - Workspace
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  removeWorkspace: (id: string) => void;
  setWorkspaceHierarchy: (hierarchy: any) => void;
  
  // Actions - Dashboard
  setDashboards: (dashboards: Dashboard[]) => void;
  setCurrentDashboard: (dashboard: Dashboard | null) => void;
  addDashboard: (dashboard: Dashboard) => void;
  updateDashboard: (id: string, updates: Partial<Dashboard>) => void;
  removeDashboard: (id: string) => void;
  setDashboardEditMode: (editMode: boolean) => void;
  
  // Actions - Widget
  addWidget: (widget: Widget) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  removeWidget: (id: string) => void;
  setSelectedWidget: (widget: Widget | null) => void;
  setWidgetData: (widgetId: string, data: any) => void;
  updateWidgetPosition: (id: string, position: { x: number; y: number; w: number; h: number }) => void;
  batchUpdateWidgetPositions: (updates: Array<{ id: string; position: any }>) => void;
  
  // Actions - UI
  setSidebarOpen: (open: boolean) => void;
  setFilterPanelOpen: (open: boolean) => void;
  setGlobalFilters: (filters: any) => void;
  
  // Actions - Reset
  reset: () => void;
}

const initialState = {
  workspaces: [],
  currentWorkspace: null,
  workspaceHierarchy: null,
  dashboards: [],
  currentDashboard: null,
  isDashboardEditMode: false,
  selectedWidget: null,
  widgetData: new Map(),
  sidebarOpen: true,
  filterPanelOpen: false,
  globalFilters: {},
};

export const useStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Workspace actions
        setWorkspaces: (workspaces) => set({ workspaces }),
        setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
        addWorkspace: (workspace) => 
          set((state) => ({ workspaces: [...state.workspaces, workspace] })),
        updateWorkspace: (id, updates) =>
          set((state) => ({
            workspaces: state.workspaces.map((w) =>
              w.id === id ? { ...w, ...updates } : w
            ),
            currentWorkspace:
              state.currentWorkspace?.id === id
                ? { ...state.currentWorkspace, ...updates }
                : state.currentWorkspace,
          })),
        removeWorkspace: (id) =>
          set((state) => ({
            workspaces: state.workspaces.filter((w) => w.id !== id),
            currentWorkspace:
              state.currentWorkspace?.id === id ? null : state.currentWorkspace,
          })),
        setWorkspaceHierarchy: (hierarchy) => set({ workspaceHierarchy: hierarchy }),

        // Dashboard actions
        setDashboards: (dashboards) => set({ dashboards }),
        setCurrentDashboard: (dashboard) => set({ currentDashboard: dashboard }),
        addDashboard: (dashboard) =>
          set((state) => ({ dashboards: [...state.dashboards, dashboard] })),
        updateDashboard: (id, updates) =>
          set((state) => ({
            dashboards: state.dashboards.map((d) =>
              d.id === id ? { ...d, ...updates } : d
            ),
            currentDashboard:
              state.currentDashboard?.id === id
                ? { ...state.currentDashboard, ...updates }
                : state.currentDashboard,
          })),
        removeDashboard: (id) =>
          set((state) => ({
            dashboards: state.dashboards.filter((d) => d.id !== id),
            currentDashboard:
              state.currentDashboard?.id === id ? null : state.currentDashboard,
          })),
        setDashboardEditMode: (editMode) => set({ isDashboardEditMode: editMode }),

        // Widget actions
        addWidget: (widget) =>
          set((state) => ({
            currentDashboard: state.currentDashboard
              ? {
                  ...state.currentDashboard,
                  widgets: [...(state.currentDashboard.widgets || []), widget],
                }
              : state.currentDashboard,
          })),
        updateWidget: (id, updates) =>
          set((state) => ({
            currentDashboard: state.currentDashboard
              ? {
                  ...state.currentDashboard,
                  widgets: (state.currentDashboard.widgets || []).map((w) =>
                    w.id === id ? { ...w, ...updates } : w
                  ),
                }
              : state.currentDashboard,
          })),
        removeWidget: (id) =>
          set((state) => ({
            currentDashboard: state.currentDashboard
              ? {
                  ...state.currentDashboard,
                  widgets: (state.currentDashboard.widgets || []).filter(
                    (w) => w.id !== id
                  ),
                }
              : state.currentDashboard,
            selectedWidget:
              state.selectedWidget?.id === id ? null : state.selectedWidget,
          })),
        setSelectedWidget: (widget) => set({ selectedWidget: widget }),
        setWidgetData: (widgetId, data) =>
          set((state) => {
            const newWidgetData = new Map(state.widgetData);
            newWidgetData.set(widgetId, data);
            return { widgetData: newWidgetData };
          }),
        updateWidgetPosition: (id, position) =>
          set((state) => ({
            currentDashboard: state.currentDashboard
              ? {
                  ...state.currentDashboard,
                  widgets: (state.currentDashboard.widgets || []).map((w) =>
                    w.id === id ? { ...w, position } : w
                  ),
                }
              : state.currentDashboard,
          })),
        batchUpdateWidgetPositions: (updates) =>
          set((state) => ({
            currentDashboard: state.currentDashboard
              ? {
                  ...state.currentDashboard,
                  widgets: (state.currentDashboard.widgets || []).map((w) => {
                    const update = updates.find((u) => u.id === w.id);
                    return update ? { ...w, position: update.position } : w;
                  }),
                }
              : state.currentDashboard,
          })),

        // UI actions
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setFilterPanelOpen: (open) => set({ filterPanelOpen: open }),
        setGlobalFilters: (filters) => set({ globalFilters: filters }),

        // Reset
        reset: () => set(initialState),
      }),
      {
        name: 'clickview-storage',
        partialize: (state) => ({
          currentWorkspace: state.currentWorkspace,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    )
  )
);

export default useStore;