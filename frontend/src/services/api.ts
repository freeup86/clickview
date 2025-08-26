import axios, { AxiosInstance, AxiosError } from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Add any auth headers here if needed
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const { status, data } = error.response;
          const message = (data as any)?.error || 'An error occurred';

          switch (status) {
            case 400:
              toast.error(`Bad Request: ${message}`);
              break;
            case 401:
              toast.error('Unauthorized. Please check your API key.');
              break;
            case 403:
              toast.error('Access forbidden.');
              break;
            case 404:
              toast.error('Resource not found.');
              break;
            case 429:
              toast.error('Too many requests. Please try again later.');
              break;
            case 500:
              toast.error('Server error. Please try again later.');
              break;
            default:
              toast.error(message);
          }
        } else if (error.request) {
          toast.error('Network error. Please check your connection.');
        } else {
          toast.error('An unexpected error occurred.');
        }

        return Promise.reject(error);
      }
    );
  }

  // Workspace endpoints
  async createWorkspace(data: { name: string; apiKey: string; clickupTeamId?: string }) {
    const response = await this.instance.post('/workspaces', data);
    return response.data;
  }

  async getWorkspaces() {
    const response = await this.instance.get('/workspaces');
    return response.data;
  }

  async getWorkspace(id: string) {
    const response = await this.instance.get(`/workspaces/${id}`);
    return response.data;
  }

  async updateWorkspace(id: string, data: Partial<{ name: string; apiKey: string; isActive: boolean }>) {
    const response = await this.instance.put(`/workspaces/${id}`, data);
    return response.data;
  }

  async deleteWorkspace(id: string) {
    const response = await this.instance.delete(`/workspaces/${id}`);
    return response.data;
  }

  async validateWorkspace(id: string) {
    const response = await this.instance.post(`/workspaces/${id}/validate`);
    return response.data;
  }

  async getWorkspaceHierarchy(id: string) {
    const response = await this.instance.get(`/workspaces/${id}/hierarchy`);
    return response.data;
  }

  // Dashboard endpoints
  async createDashboard(data: {
    workspaceId: string;
    name: string;
    description?: string;
    layoutConfig?: any[];
    globalFilters?: any;
    refreshInterval?: number;
    isTemplate?: boolean;
    templateCategory?: string;
  }) {
    const response = await this.instance.post('/dashboards', data);
    return response.data;
  }

  async getDashboards(params?: {
    workspaceId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const response = await this.instance.get('/dashboards', { params });
    return response.data;
  }

  async getDashboard(id: string) {
    const response = await this.instance.get(`/dashboards/${id}`);
    return response.data;
  }

  async updateDashboard(id: string, data: Partial<{
    name: string;
    description: string;
    layoutConfig: any[];
    globalFilters: any;
    refreshInterval: number;
  }>) {
    const response = await this.instance.put(`/dashboards/${id}`, data);
    return response.data;
  }

  async deleteDashboard(id: string) {
    const response = await this.instance.delete(`/dashboards/${id}`);
    return response.data;
  }

  async duplicateDashboard(id: string, name?: string) {
    const response = await this.instance.post(`/dashboards/${id}/duplicate`, { name });
    return response.data;
  }

  async shareDashboard(id: string, expiresIn?: number) {
    const response = await this.instance.post(`/dashboards/${id}/share`, { expiresIn });
    return response.data;
  }

  async getSharedDashboard(shareToken: string) {
    const response = await this.instance.get(`/dashboards/shared/${shareToken}`);
    return response.data;
  }

  // Widget endpoints
  async createWidget(data: {
    dashboardId: string;
    type: string;
    title: string;
    description?: string;
    position: { x: number; y: number; w: number; h: number };
    config?: any;
    dataConfig: any;
    filters?: any;
    refreshInterval?: number;
  }) {
    const response = await this.instance.post('/widgets', data);
    return response.data;
  }

  async updateWidget(id: string, data: any) {
    const response = await this.instance.put(`/widgets/${id}`, data);
    return response.data;
  }

  async deleteWidget(id: string) {
    const response = await this.instance.delete(`/widgets/${id}`);
    return response.data;
  }

  async updateWidgetPosition(id: string, position: { x: number; y: number; w: number; h: number }) {
    const response = await this.instance.put(`/widgets/${id}/position`, { position });
    return response.data;
  }

  async batchUpdateWidgets(widgets: Array<{ id: string; position?: any; config?: any }>) {
    const response = await this.instance.post('/widgets/batch-update', { widgets });
    return response.data;
  }

  // Data endpoints
  async getTasks(params: {
    workspaceId: string;
    listId?: string;
    filters?: any[];
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.instance.get('/data/tasks', { params });
    return response.data;
  }

  async getCustomFields(workspaceId: string, listId: string) {
    const response = await this.instance.get('/data/custom-fields', {
      params: { workspaceId, listId }
    });
    return response.data;
  }

  async refreshData(workspaceId: string, dashboardId?: string) {
    const response = await this.instance.post('/data/refresh', {
      workspaceId,
      dashboardId
    });
    return response.data;
  }

  async getAggregatedData(params: {
    workspaceId: string;
    sourceType: string;
    spaceId?: string;
    folderId?: string;
    listId?: string;
    filters?: any;
    aggregationType?: string;
    groupBy?: string;
    timeGroupBy?: string;
    startDate?: string;
    endDate?: string;
    dataConfig?: any;
  }) {
    const response = await this.instance.get('/data/aggregate', { params });
    return response.data;
  }

  // Tasks endpoints
  async getTasks(params: {
    workspaceId: string;
    listId?: string;
    spaceId?: string;
    status?: string;
    assignee?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.instance.get('/tasks', { params });
    return response.data;
  }

  async uploadTasks(formData: FormData) {
    const response = await this.instance.post('/tasks/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async syncTasks(data: {
    workspaceId: string;
    listId?: string;
    spaceId?: string;
    syncAll?: boolean;
  }) {
    // Use a longer timeout for sync operations as they can take a while
    const response = await this.instance.post('/tasks/sync', data, {
      timeout: 300000 // 5 minutes timeout for sync operations
    });
    return response.data;
  }

  async getTaskStats(params: {
    workspaceId: string;
    listId?: string;
    spaceId?: string;
  }) {
    const response = await this.instance.get('/tasks/stats', { params });
    return response.data;
  }

  async getTaskSyncHistory(workspaceId: string) {
    const response = await this.instance.get('/tasks/sync-history', {
      params: { workspaceId }
    });
    return response.data;
  }

  // ClickUp endpoints
  async getClickUpSpaces(workspaceId: string) {
    const response = await this.instance.get('/clickup/spaces', {
      params: { workspaceId }
    });
    return response.data;
  }

  async getClickUpLists(workspaceId: string, spaceId: string) {
    const response = await this.instance.get('/clickup/lists', {
      params: { workspaceId, spaceId }
    });
    return response.data;
  }

  // Health check
  async checkHealth() {
    const response = await this.instance.get('/health');
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;